import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import PlanAdjusterButton from '@/components/PlanAdjusterButton';

type Params = {
  params: Promise<{ id: string }>;
};

export default async function TrainingPlanDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/');
  }

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      hike: true,
      revisions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!plan) {
    redirect('/training-plans');
  }

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
  const currentWeek = Math.min(Math.max(1, Math.floor(daysPassed / 7) + 1), totalWeeks);
  const isCompleted = today > targetDate;
  const progress = Math.min((currentWeek / totalWeeks) * 100, 100);

  const settings = plan.settings as any;
  const weeks = plan.weeks as any[];

  // Calculate total stats
  let totalWorkouts = 0;
  let totalMiles = 0;
  let totalElevation = 0;

  if (Array.isArray(weeks)) {
    weeks.forEach(week => {
      if (week.workouts && Array.isArray(week.workouts)) {
        totalWorkouts += week.workouts.length;
        week.workouts.forEach((w: any) => {
          totalMiles += w.distanceMiles || 0;
          totalElevation += w.elevationGainFt || 0;
        });
      }
    });
  }

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Link
          href="/training-plans"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Plans
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {settings?.planTitle || `Training Plan for ${plan.hike.name}`}
                </h1>
                {plan.aiGenerated && (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-full">
                    💜 AI Generated
                  </span>
                )}
                {isCompleted && (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded-full">
                    ✓ Completed
                  </span>
                )}
              </div>

              {settings?.planDescription && (
                <p className="text-gray-700 mb-4">{settings.planDescription}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">{plan.hike.name}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>{plan.hike.distanceMiles} miles</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span>{plan.hike.elevationGainFt} ft gain</span>
                </div>
                {plan.hike.difficulty && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{plan.hike.difficulty}</span>
                  </div>
                )}
              </div>

              {!isCompleted && (
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
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Start:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {startDate.toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Target:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {targetDate.toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href={`/hikes/${plan.hike.id}`}
                className="px-6 py-2.5 text-center text-emerald-700 bg-emerald-50 rounded-full hover:bg-emerald-100 font-medium transition-colors"
              >
                View Hike
              </Link>
              {plan.aiGenerated && (
                <PlanAdjusterButton planId={plan.id} />
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">{totalWeeks}</div>
            <div className="text-sm text-gray-600">Total Weeks</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-1">{totalWorkouts}</div>
            <div className="text-sm text-gray-600">Workouts</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{Math.round(totalMiles)}</div>
            <div className="text-sm text-gray-600">Total Miles</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {Math.round(totalElevation).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Elevation (ft)</div>
          </div>
        </div>

        {/* Weekly Breakdown */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Weekly Breakdown</h2>

          {Array.isArray(weeks) && weeks.map((week, weekIndex) => {
            const weekNum = week.weekNumber || weekIndex + 1;
            const isCurrentWeek = weekNum === currentWeek && !isCompleted;

            return (
              <div
                key={weekIndex}
                className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                  isCurrentWeek
                    ? 'border-emerald-500 ring-2 ring-emerald-100'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Week {weekNum}
                      {isCurrentWeek && (
                        <span className="ml-2 text-sm font-medium text-emerald-600">
                          Current Week
                        </span>
                      )}
                    </h3>
                    {week.weekFocus && (
                      <p className="text-sm text-gray-600 mt-1">{week.weekFocus}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    {week.totalMiles > 0 && <div>{week.totalMiles} mi</div>}
                    {week.totalElevation > 0 && <div>{week.totalElevation} ft</div>}
                  </div>
                </div>

                {week.workouts && Array.isArray(week.workouts) && (
                  <div className="space-y-3">
                    {week.workouts.map((workout: any, workoutIndex: number) => (
                      <div
                        key={workoutIndex}
                        className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-500">
                                {workout.day <= 7 ? daysOfWeek[workout.day - 1] : `Day ${workout.day}`}:
                              </span>
                              <span className="font-bold text-gray-900">{workout.title}</span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                workout.type === 'cardio'
                                  ? 'bg-blue-100 text-blue-700'
                                  : workout.type === 'strength'
                                  ? 'bg-orange-100 text-orange-700'
                                  : workout.type === 'rest'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {workout.type}
                              </span>
                            </div>
                            {workout.description && (
                              <p className="text-sm text-gray-600 mb-2">{workout.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>{workout.duration} min</span>
                              <span className="capitalize">{workout.intensity}</span>
                              {workout.distanceMiles > 0 && <span>{workout.distanceMiles} mi</span>}
                              {workout.elevationGainFt > 0 && <span>{workout.elevationGainFt} ft gain</span>}
                              {workout.equipment && <span>Equipment: {workout.equipment}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Metadata (if AI generated) */}
        {plan.aiGenerated && plan.generationMetadata && (
          <div className="mt-8 bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-lg font-bold text-indigo-900 mb-3">AI Generation Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {plan.aiModel && (
                <div>
                  <div className="text-indigo-600 font-medium">Model</div>
                  <div className="text-indigo-900">{plan.aiModel}</div>
                </div>
              )}
              {(plan.generationMetadata as any).costUSD !== undefined && (
                <div>
                  <div className="text-indigo-600 font-medium">Cost</div>
                  <div className="text-indigo-900">${(plan.generationMetadata as any).costUSD.toFixed(4)}</div>
                </div>
              )}
              {(plan.generationMetadata as any).tokensUsed && (
                <div>
                  <div className="text-indigo-600 font-medium">Tokens</div>
                  <div className="text-indigo-900">{(plan.generationMetadata as any).tokensUsed}</div>
                </div>
              )}
              {(plan.generationMetadata as any).generationTime && (
                <div>
                  <div className="text-indigo-600 font-medium">Generation Time</div>
                  <div className="text-indigo-900">
                    {((plan.generationMetadata as any).generationTime / 1000).toFixed(1)}s
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revisions (if any) */}
        {plan.revisions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Plan History</h3>
            <div className="space-y-2">
              {plan.revisions.map((revision) => (
                <div
                  key={revision.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      Revised on {new Date(revision.createdAt).toLocaleDateString()}
                    </span>
                    {(revision.changeLog as any)?.adjustmentType && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {(revision.changeLog as any).adjustmentType}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
