"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ProfileState = {
  city: string;
  state: string;
  birthDate: string;
  experience: string;
  weeklyAvailability: number[];
  goalHikeId: string;
  preferredVolumeMinutes: string;
  preferredDifficulty: string;
  crossTrainingPreferences: string;
};

type HikeOption = {
  id: string;
  name: string;
};

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [form, setForm] = useState<ProfileState>({
    city: "",
    state: "",
    birthDate: "",
    experience: "BEGINNER",
    weeklyAvailability: [],
    goalHikeId: "",
    preferredVolumeMinutes: "",
    preferredDifficulty: "",
    crossTrainingPreferences: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [hikeOptions, setHikeOptions] = useState<HikeOption[]>([]);

  useEffect(() => {
    fetch("/api/profile")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data) return;
        setForm((prev) => ({
          ...prev,
          city: data.profile?.city ?? "",
          state: data.profile?.state ?? "",
          birthDate: data.profile?.birthDate ? data.profile.birthDate.slice(0, 10) : "",
          experience: data.profile?.experience ?? "BEGINNER",
          weeklyAvailability: data.profile?.weeklyAvailability ?? [],
          goalHikeId: data.profile?.goalHikeId ?? "",
          preferredVolumeMinutes: data.preferences?.preferredVolumeMinutes?.toString() ?? "",
          preferredDifficulty: data.preferences?.preferredDifficulty ?? "",
          crossTrainingPreferences: data.preferences?.crossTrainingPreferences?.join(", ") ?? "",
        }));
      })
      .catch(() => {
        // Ignore fetch errors for now.
      });
  }, []);

  useEffect(() => {
    fetch("/api/hikes")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) return;
        setHikeOptions(data);
      })
      .catch(() => {
        // Ignore hike list errors.
      });
  }, []);

  const { progressStep, isComplete } = useMemo(() => {
    const hasLocation = Boolean(form.city.trim() && form.state);
    const hasExperience = Boolean(form.experience);
    const hasPreferences = Boolean(
      form.preferredDifficulty ||
        form.preferredVolumeMinutes ||
        form.crossTrainingPreferences.trim()
    );
    const hasGoal = Boolean(form.goalHikeId);
    const stepsCompleted = [hasLocation, hasExperience, hasPreferences].filter(Boolean).length;
    return {
      progressStep: Math.max(1, Math.min(3, stepsCompleted + 1)),
      isComplete: hasLocation && hasExperience && hasPreferences && hasGoal,
    };
  }, [form]);

  const toggleAvailability = (dayIndex: number) => {
    setForm((prev) => {
      const exists = prev.weeklyAvailability.includes(dayIndex);
      const next = exists
        ? prev.weeklyAvailability.filter((day) => day !== dayIndex)
        : [...prev.weeklyAvailability, dayIndex];
      return { ...prev, weeklyAvailability: next };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: {
          city: form.city,
          state: form.state,
          birthDate: form.birthDate || null,
          experience: form.experience,
          weeklyAvailability: form.weeklyAvailability,
          goalHikeId: form.goalHikeId || null,
        },
        preferences: {
          preferredVolumeMinutes: form.preferredVolumeMinutes
            ? Number(form.preferredVolumeMinutes)
            : null,
          preferredDifficulty: form.preferredDifficulty || null,
          crossTrainingPreferences: form.crossTrainingPreferences
            ? form.crossTrainingPreferences.split(",").map((value) => value.trim()).filter(Boolean)
            : [],
        },
      }),
    });
    if (!response.ok) {
      setStatus("Unable to save profile.");
      return;
    }
    setStatus("Profile saved.");
    if (onboarding && isComplete) {
      router.push(callbackUrl);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold text-slate-900">Profile</h1>
          {onboarding ? (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Step {progressStep} of 3 • Complete your profile to personalize your plan.
            </div>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Update your preferences to tailor training plans.
        </p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              City
              <input
                type="text"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              State
              <select
                value={form.state}
                onChange={(event) => setForm({ ...form, state: event.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Birth date
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Experience level
              <select
                value={form.experience}
                onChange={(event) => setForm({ ...form, experience: event.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Weekly availability</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleAvailability(index)}
                  className={`rounded-full border px-3 py-1 font-semibold ${
                    form.weeklyAvailability.includes(index)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Preferred weekly volume (minutes)
              <input
                type="number"
                value={form.preferredVolumeMinutes}
                onChange={(event) =>
                  setForm({ ...form, preferredVolumeMinutes: event.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Preferred difficulty
              <select
                value={form.preferredDifficulty}
                onChange={(event) =>
                  setForm({ ...form, preferredDifficulty: event.target.value })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="EASY">Easy</option>
                <option value="MODERATE">Moderate</option>
                <option value="STRENUOUS">Strenuous</option>
              </select>
            </label>
          </div>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Goal hike
            <select
              value={form.goalHikeId}
              onChange={(event) => setForm({ ...form, goalHikeId: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select a hike</option>
              {hikeOptions.map((hike) => (
                <option key={hike.id} value={hike.id}>
                  {hike.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Cross-training preferences (comma-separated)
            <input
              type="text"
              value={form.crossTrainingPreferences}
              onChange={(event) =>
                setForm({ ...form, crossTrainingPreferences: event.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
          <button
            type="submit"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Save profile
          </button>
        </form>
      </div>
    </div>
  );
}
