import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ElevationChart } from "@/components/ElevationChart";
import { TrainingPlanBuilder } from "@/components/TrainingPlanBuilder";
import QuickPlanGeneratorWrapper from "@/components/QuickPlanGeneratorWrapper";
import { prisma } from "@/lib/db";
import type { ProfilePoint } from "@/lib/planGenerator";

type HikeDetailPageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function HikeDetailPage({ params }: HikeDetailPageProps) {
  const { id } = await Promise.resolve(params);
  if (!id) {
    notFound();
  }

  // Get session
  const session = await getServerSession(authOptions);
  let userId: string | undefined;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = user?.id;
  }

  // Fetch hike from database
  const stored = await prisma.hike.findUnique({
    where: { id },
    include: {
      trainingPlans: userId
        ? {
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
          }
        : false,
    },
  });

  if (!stored) {
    notFound();
  }

  const hike = {
    id: stored.id,
    name: stored.name,
    distanceMiles: stored.distanceMiles,
    elevationGainFt: stored.elevationGainFt,
    difficulty: stored.difficulty,
    trailType: stored.trailType,
    description: stored.description,
    profilePoints: stored.profilePoints as unknown as ProfilePoint[],
  };

  const profilePoints = hike.profilePoints;
  const existingPlans = userId && 'trainingPlans' in stored ? stored.trainingPlans : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <main className="mx-auto px-4 py-8 w-full max-w-6xl">
        {/* Back Button */}
        <Link
          href="/hikes"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Hikes
        </Link>

        {/* Hike Header */}
        <header className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{hike.name}</h1>

              <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="font-medium">{hike.distanceMiles.toFixed(1)} miles</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="font-medium">{hike.elevationGainFt.toLocaleString()} ft gain</span>
                </div>
                {hike.difficulty && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{hike.difficulty}</span>
                  </div>
                )}
                {hike.trailType && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span className="font-medium">{hike.trailType}</span>
                  </div>
                )}
              </div>

              {hike.description && (
                <p className="text-gray-700 max-w-2xl">{hike.description}</p>
              )}
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <div className="font-medium">Profile Data</div>
              <div>{profilePoints.length} elevation points</div>
            </div>
          </div>
        </header>

        {/* Elevation Chart */}
        <section className="mb-8">
          <ElevationChart points={profilePoints} />
        </section>

        {/* Existing Plans (if any) */}
        {existingPlans.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Training Plans for This Hike
            </h2>
            <div className="space-y-3">
              {existingPlans.map((plan) => {
                const today = new Date();
                const targetDate = new Date(plan.targetDate);
                const isCompleted = today > targetDate;

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">
                            {(plan.settings as any)?.planTitle || 'Training Plan'}
                          </h3>
                          {plan.aiGenerated && (
                            <span className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full">
                              💜 AI
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                              ✓ Done
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Created {new Date(plan.createdAt).toLocaleDateString()}
                          {' • '}
                          Target: {targetDate.toLocaleDateString()}
                        </div>
                      </div>
                      <Link
                        href={`/training-plans/${plan.id}`}
                        className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors"
                      >
                        View Plan
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Plan Generation Section */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Generate Your Training Plan
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              Choose how you want to create your personalized training plan
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Plan (AI) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-indigo-200 hover:border-indigo-300 transition-all">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Quick Plan (AI-Powered)
                    </h3>
                    <p className="text-sm text-gray-600">
                      Answer 3 quick questions and let AI generate your plan in seconds
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Generates in 5-10 seconds</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>AI optimizes for your goals</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Week-by-week breakdown</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Cost: ~$0.002 per plan</span>
                  </li>
                </ul>

                <QuickPlanGeneratorWrapper
                  hikes={[{
                    id: hike.id,
                    name: hike.name,
                    distanceMiles: hike.distanceMiles,
                    elevationGainFt: hike.elevationGainFt,
                    difficulty: hike.difficulty || undefined,
                    trailType: hike.trailType || undefined,
                  }]}
                  userId={userId}
                />
              </div>

              {/* Custom Plan */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-emerald-200 hover:border-emerald-300 transition-all">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    ⚙️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Custom Plan
                    </h3>
                    <p className="text-sm text-gray-600">
                      Full control with 15-step wizard for detailed customization
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Complete customization</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Choose specific days to train</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Treadmill vs outdoor control</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>100% free, no AI costs</span>
                  </li>
                </ul>

                <a
                  href="#custom-plan-builder"
                  className="block w-full text-center px-6 py-3 text-white bg-emerald-600 rounded-full hover:bg-emerald-700 font-medium transition-colors"
                >
                  Start Custom Plan Builder
                </a>
              </div>
            </div>

            {/* Comparison Table */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Need help choosing? Compare features →
              </summary>
              <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3">Feature</th>
                      <th className="text-center py-2 px-3">Quick Plan (AI)</th>
                      <th className="text-center py-2 px-3">Custom Plan</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3">Setup Time</td>
                      <td className="text-center py-2 px-3">~30 seconds</td>
                      <td className="text-center py-2 px-3">~5 minutes</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3">Questions to Answer</td>
                      <td className="text-center py-2 px-3">3</td>
                      <td className="text-center py-2 px-3">15</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3">AI-Powered</td>
                      <td className="text-center py-2 px-3">✓</td>
                      <td className="text-center py-2 px-3">-</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3">Fine-tune Details</td>
                      <td className="text-center py-2 px-3">Limited</td>
                      <td className="text-center py-2 px-3">Full Control</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Best For</td>
                      <td className="text-center py-2 px-3">Beginners</td>
                      <td className="text-center py-2 px-3">Advanced Users</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </section>

        {/* Custom Plan Builder (below) */}
        <section id="custom-plan-builder">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Custom Plan Builder
              </h2>
              <p className="text-gray-600">
                Create a detailed, personalized training plan with full control over every parameter
              </p>
            </div>

            <TrainingPlanBuilder
              hike={{
                id: hike.id,
                name: hike.name,
                distanceMiles: hike.distanceMiles,
                elevationGainFt: hike.elevationGainFt,
                profilePoints,
              }}
              fitnessLevel="Intermediate"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
