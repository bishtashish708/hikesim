import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function TrainingPlansPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/');
  }

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
              trailType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    redirect('/');
  }

  const plans = user.trainingPlans;

  // Categorize plans
  const today = new Date();
  const activePlans = plans.filter(p => new Date(p.targetDate) >= today);
  const completedPlans = plans.filter(p => new Date(p.targetDate) < today);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                My Training Plans
              </h1>
              <p className="text-lg text-gray-600">
                Manage and track all your hiking training plans
              </p>
            </div>
            <Link
              href="/hikes"
              className="px-6 py-3 text-white bg-emerald-600 rounded-full hover:bg-emerald-700 font-medium transition-colors"
            >
              + New Plan
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {plans.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No training plans yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first AI-powered training plan in under 2 minutes! Choose from Quick Plan or Custom Plan.
            </p>
            <Link
              href="/hikes"
              className="inline-flex items-center px-6 py-3 text-white bg-emerald-600 rounded-full hover:bg-emerald-700 font-medium transition-colors"
            >
              Browse Hikes & Create Plan
            </Link>
          </div>
        )}

        {/* Active Plans */}
        {activePlans.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Active Plans ({activePlans.length})
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {activePlans.map((plan) => {
                const startDate = new Date(plan.trainingStartDate);
                const targetDate = new Date(plan.targetDate);
                const totalDays = Math.floor(
                  (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const daysPassed = Math.floor(
                  (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const totalWeeks = Math.ceil(totalDays / 7);
                const currentWeek = Math.min(Math.max(1, Math.floor(daysPassed / 7) + 1), totalWeeks);
                const progress = Math.min((currentWeek / totalWeeks) * 100, 100);

                const settings = plan.settings as any;
                const weeks = plan.weeks as any[];

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        {/* Title & Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {plan.hike.name}
                          </h3>
                          {plan.aiGenerated && (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full">
                              💜 AI Generated
                            </span>
                          )}
                        </div>

                        {/* Hike Details */}
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {plan.hike.distanceMiles} mi
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            {plan.hike.elevationGainFt} ft
                          </span>
                          {plan.hike.difficulty && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {plan.hike.difficulty}
                            </span>
                          )}
                        </div>

                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                            <span className="font-medium">Week {currentWeek} of {totalWeeks}</span>
                            <span>{Math.round(progress)}% Complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-emerald-600 h-3 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div>
                            <span className="font-medium">Start:</span>{' '}
                            {startDate.toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Target:</span>{' '}
                            {targetDate.toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Plan Info */}
                        {settings && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {settings.fitnessLevel && (
                              <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                                {settings.fitnessLevel}
                              </span>
                            )}
                            {settings.planTitle && (
                              <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                                {settings.planTitle}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex md:flex-col gap-2">
                        <Link
                          href={`/training-plans/${plan.id}`}
                          className="flex-1 md:flex-none px-6 py-2.5 text-center text-white bg-emerald-600 rounded-full hover:bg-emerald-700 font-medium transition-colors"
                        >
                          View Plan
                        </Link>
                        <Link
                          href={`/hikes/${plan.hike.id}`}
                          className="flex-1 md:flex-none px-6 py-2.5 text-center text-emerald-700 bg-emerald-50 rounded-full hover:bg-emerald-100 font-medium transition-colors"
                        >
                          View Hike
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Plans */}
        {completedPlans.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Completed Plans ({completedPlans.length})
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {completedPlans.map((plan) => {
                const settings = plan.settings as any;
                const weeks = plan.weeks as any[];

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow opacity-75"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {plan.hike.name}
                          </h3>
                          <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                            ✓ Completed
                          </span>
                          {plan.aiGenerated && (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full">
                              💜 AI
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                          <span>{plan.hike.distanceMiles} mi</span>
                          <span>{plan.hike.elevationGainFt} ft</span>
                          {plan.hike.difficulty && <span>{plan.hike.difficulty}</span>}
                        </div>

                        <div className="text-sm text-gray-500">
                          Completed on {new Date(plan.targetDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <Link
                          href={`/training-plans/${plan.id}`}
                          className="flex-1 md:flex-none px-6 py-2.5 text-center text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 font-medium transition-colors"
                        >
                          View Plan
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
