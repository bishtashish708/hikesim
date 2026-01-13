import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });
  const preferences = await prisma.trainingPreferences.findUnique({
    where: { userId: session.user.id },
  });
  const hasLocation = Boolean(profile?.city && profile?.state);
  const hasExperience = Boolean(profile?.experience);
  const hasGoal = Boolean(profile?.goalHikeId);
  const hasPreferences = Boolean(
    preferences?.preferredDifficulty ||
      preferences?.preferredVolumeMinutes ||
      (preferences?.crossTrainingPreferences as string[] | null)?.length
  );
  if (!hasLocation || !hasExperience || !hasGoal || !hasPreferences) {
    redirect("/profile?onboarding=1&callbackUrl=/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Welcome back{session.user.name ? `, ${session.user.name}` : ""}.
          </p>
          <div className="mt-4 text-sm text-slate-700">
            <p>Location: {profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : "Not set"}</p>
            <p>Experience: {profile?.experience ?? "Not set"}</p>
            <p>Preferred volume: {preferences?.preferredVolumeMinutes ?? "Not set"} min/week</p>
            <p>Preferred difficulty: {preferences?.preferredDifficulty ?? "Not set"}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/profile"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Edit profile
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Browse hikes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
