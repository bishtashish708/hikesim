import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/');
  }

  // Fetch user's training plans
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      trainingPlans: {
        include: {
          hike: {
            select: {
              id: true,
              name: true,
              distanceMiles: true,
              elevationGainFt: true,
              difficulty: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!user) {
    redirect('/');
  }

  const plans = user.trainingPlans;
  const activePlans = plans.filter(p => {
    const targetDate = new Date(p.targetDate);
    return targetDate >= new Date();
  });

  // Calculate upcoming workouts from active plans
  const upcomingWorkouts: Array<{
    planId: string;
    hikeName: string;
    weekNumber: number;
    day: number;
    workout: {
      title: string;
      type: string;
      duration: number;
      day: number;
    };
  }> = [];

  activePlans.forEach(plan => {
    const weeks = plan.weeks as any[];
    if (Array.isArray(weeks)) {
      // Get current week based on start date
      const startDate = new Date(plan.trainingStartDate);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentWeekIndex = Math.floor(daysDiff / 7);

      if (currentWeekIndex >= 0 && currentWeekIndex < weeks.length) {
        const currentWeek = weeks[currentWeekIndex];
        if (currentWeek?.workouts) {
          currentWeek.workouts.forEach((workout: any) => {
            upcomingWorkouts.push({
              planId: plan.id,
              hikeName: plan.hike.name,
              weekNumber: currentWeekIndex + 1,
              day: workout.day,
              workout,
            });
          });
        }
      }
    }
  });

  // Sort by day
  upcomingWorkouts.sort((a, b) => a.day - b.day);

  const userName = user.name || session.user.name || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Your training dashboard
          </p>
        </div>

        {/* Primary CTA */}
        <div className="mb-8">
          <Link
            href="/hikes"
            className="block w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
          >
            <span className="mr-2">🎯</span>
            Generate New Training Plan
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Total Plans</div>
            <div className="text-3xl font-bold text-gray-900">{plans.length}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Active Plans</div>
            <div className="text-3xl font-bold text-emerald-600">{activePlans.length}</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">AI Generated</div>
            <div className="text-3xl font-bold text-indigo-600">
              {plans.filter(p => p.aiGenerated).length}
            </div>
          </div>
        </div>

        {/* Training Plans Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Your Training Plans
            </h2>
            {plans.length > 0 && (
              <Link
                href="/training-plans"
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View All →
              </Link>
            )}
          </div>

          {plans.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-6xl mb-4">🏔️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No training plans yet
              </h3>
              <p className="text-gray-600 mb-6">
                Generate your first AI-powered training plan in under 2 minutes!
              </p>
              <Link
                href="/hikes"
                className="inline-flex items-center px-6 py-3 text-white bg-emerald-600 rounded-full hover:bg-emerald-700 font-medium transition-colors"
              >
                Browse Hikes & Generate Plan
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.slice(0, 5).map((plan) => {
                const startDate = new Date(plan.trainingStartDate);
                const targetDate = new Date(plan.targetDate);
                const today = new Date();

                const totalDays = Math.floor(
                  (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const daysPassed = Math.floor(
                  (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                const totalWeeks = Math.ceil(totalDays / 7);
                const currentWeek = Math.min(Math.floor(daysPassed / 7) + 1, totalWeeks);
                const isCompleted = today > targetDate;

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {plan.hike.name}
                          </h3>
                          {plan.aiGenerated && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full">
                              💜 AI Generated
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          {plan.hike.distanceMiles} mi • {plan.hike.elevationGainFt} ft
                          {plan.hike.difficulty && ` • ${plan.hike.difficulty}`}
                        </div>
                        {!isCompleted && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>Week {currentWeek} of {totalWeeks}</span>
                              <span>{Math.round((currentWeek / totalWeeks) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-emerald-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min((currentWeek / totalWeeks) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Created {new Date(plan.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <Link
                          href={`/training-plans/${plan.id}`}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors"
                        >
                          View Plan
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Workouts */}
        {upcomingWorkouts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              This Week's Workouts
            </h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="space-y-3">
                {upcomingWorkouts.slice(0, 5).map((item, idx) => (
                  <div
                    key={`${item.planId}-${item.weekNumber}-${item.day}-${idx}`}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        Day {item.day}: {item.workout.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.hikeName} • Week {item.weekNumber} • {item.workout.duration} min
                      </div>
                    </div>
                    <Link
                      href={`/training-plans/${item.planId}`}
                      className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors"
                    >
                      Start
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/hikes"
            className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-2">🏔️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Browse Hikes</h3>
            <p className="text-sm text-gray-600">
              Discover new trails and mountains to conquer
            </p>
          </Link>
          <Link
            href="/training-plans"
            className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">All Plans</h3>
            <p className="text-sm text-gray-600">
              View and manage all your training plans
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
