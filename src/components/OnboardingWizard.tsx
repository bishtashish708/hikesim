"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExperienceLevel, DifficultyPreference } from "@prisma/client";

interface Hike {
  id: string;
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  difficulty?: string;
  city?: string;
  stateCode?: string;
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [experience, setExperience] = useState<ExperienceLevel>(ExperienceLevel.BEGINNER);
  const [weeklyDays, setWeeklyDays] = useState(3);
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [preferredDifficulty, setPreferredDifficulty] = useState<DifficultyPreference>(
    DifficultyPreference.EASY
  );
  const [recommendedHikes, setRecommendedHikes] = useState<Hike[]>([]);
  const [selectedHike, setSelectedHike] = useState<string | null>(null);

  const totalSteps = 4;

  const handleNext = async () => {
    setError(null);

    // Step 2 -> Step 3: Fetch recommended hikes
    if (currentStep === 2) {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/hikes/recommended?experience=${experience}`
        );
        if (!response.ok) throw new Error("Failed to fetch hikes");
        const data = await response.json();
        setRecommendedHikes(data.hikes || []);
        setCurrentStep(3);
      } catch (err) {
        setError("Failed to load recommended hikes. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 3 -> Step 4: Validate hike selection
    if (currentStep === 3) {
      if (!selectedHike) {
        setError("Please select a goal hike to continue.");
        return;
      }
      setCurrentStep(4);
      return;
    }

    // Step 4: Complete onboarding
    if (currentStep === 4) {
      await handleComplete();
      return;
    }

    // Otherwise just go to next step
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      // Save user profile
      const profileResponse = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience,
          weeklyAvailability: {
            daysPerWeek: weeklyDays,
            minutesPerDay: dailyMinutes,
          },
          goalHikeId: selectedHike,
          preferredVolumeMinutes: dailyMinutes,
          preferredDifficulty,
          trainingVolumeLabel: `${weeklyDays} days/week`,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to save profile");
      }

      // Mark onboarding as complete
      onComplete();

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Failed to save your preferences. Please try again.");
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Step {currentStep} of {totalSteps}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Skip for now
          </button>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Fitness Level */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            What's your hiking experience?
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            This helps us recommend suitable trails and create personalized training plans.
          </p>

          <div className="space-y-3">
            {[
              {
                level: ExperienceLevel.BEGINNER,
                label: "Beginner",
                description: "New to hiking or occasional hiker (0-2 hikes/year)",
              },
              {
                level: ExperienceLevel.INTERMEDIATE,
                label: "Intermediate",
                description: "Regular hiker with some experience (3-10 hikes/year)",
              },
              {
                level: ExperienceLevel.ADVANCED,
                label: "Advanced",
                description: "Experienced hiker with significant trail time (10+ hikes/year)",
              },
            ].map((option) => (
              <button
                key={option.level}
                type="button"
                onClick={() => setExperience(option.level)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  experience === option.level
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-300"
                }`}
              >
                <div className="font-semibold text-slate-900">{option.label}</div>
                <div className="text-sm text-slate-600 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Training Availability */}
      {currentStep === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            How much time can you train?
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            We'll build your training plan around your schedule.
          </p>

          <div className="space-y-6">
            {/* Days per week */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Training days per week
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setWeeklyDays(days)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                      weeklyDays === days
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {days}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes per day */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Minutes per training session
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[20, 30, 45, 60, 75, 90].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setDailyMinutes(minutes)}
                    className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                      dailyMinutes === minutes
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {minutes}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty preference */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Preferred workout difficulty
              </label>
              <div className="space-y-2">
                {[
                  { value: DifficultyPreference.EASY, label: "Easy - Build gradually" },
                  { value: DifficultyPreference.MODERATE, label: "Moderate - Balanced challenge" },
                  { value: DifficultyPreference.STRENUOUS, label: "Strenuous - Push my limits" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPreferredDifficulty(option.value)}
                    className={`w-full text-left py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                      preferredDifficulty === option.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Hike Selection */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Choose your goal hike
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Based on your {experience.toLowerCase()} level, we recommend these trails.
          </p>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-4 text-sm text-slate-600">Loading recommendations...</p>
            </div>
          ) : recommendedHikes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No recommendations available.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recommendedHikes.map((hike) => (
                <button
                  key={hike.id}
                  type="button"
                  onClick={() => setSelectedHike(hike.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedHike === hike.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{hike.name}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {hike.distanceMiles.toFixed(1)} mi · {hike.elevationGainFt.toLocaleString()} ft gain
                        {hike.difficulty && ` · ${hike.difficulty}`}
                      </div>
                      {(hike.city || hike.stateCode) && (
                        <div className="text-xs text-slate-500 mt-1">
                          {hike.city && hike.stateCode
                            ? `${hike.city}, ${hike.stateCode}`
                            : hike.stateCode || hike.city}
                        </div>
                      )}
                    </div>
                    {selectedHike === hike.id && (
                      <svg
                        className="w-6 h-6 text-emerald-600 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 4 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            You're all set!
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            We'll save your preferences and take you to your dashboard where you can generate your first training plan.
          </p>

          <div className="bg-slate-50 rounded-lg p-6 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Experience Level
              </div>
              <div className="text-slate-900 font-medium">
                {experience.charAt(0) + experience.slice(1).toLowerCase()}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Training Schedule
              </div>
              <div className="text-slate-900 font-medium">
                {weeklyDays} days/week · {dailyMinutes} min/session
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Goal Hike
              </div>
              <div className="text-slate-900 font-medium">
                {recommendedHikes.find((h) => h.id === selectedHike)?.name || "Selected"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1 || loading}
          className="px-6 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="px-6 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
              Loading...
            </span>
          ) : currentStep === totalSteps ? (
            "Complete Setup"
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
