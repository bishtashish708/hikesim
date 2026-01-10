"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FitnessLevel } from "@/lib/planGenerator";

type PlanFormProps = {
  hikeId: string;
  defaultMaxSpeedMph?: number;
};

type DurationMode = "auto" | "manual";

export function PlanForm({ hikeId, defaultMaxSpeedMph = 4.5 }: PlanFormProps) {
  const router = useRouter();
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("Intermediate");
  const [durationMode, setDurationMode] = useState<DurationMode>("auto");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [packWeightLbs, setPackWeightLbs] = useState(0);
  const [minIncline, setMinIncline] = useState(0);
  const [maxIncline, setMaxIncline] = useState(12);
  const [maxSpeed, setMaxSpeed] = useState(defaultMaxSpeedMph);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (packWeightLbs < 0 || packWeightLbs > 30) {
      setError("Pack weight must be between 0 and 30 lbs.");
      return;
    }
    if (minIncline < 0 || maxIncline <= minIncline) {
      setError("Incline range must be valid and non-negative.");
      return;
    }
    if (maxSpeed < 2) {
      setError("Max speed must be at least 2.0 mph.");
      return;
    }
    if (durationMode === "manual" && durationMinutes < 20) {
      setError("Manual duration should be at least 20 minutes.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hikeId,
          fitnessLevel,
          durationMode,
          targetDurationMinutes: durationMinutes,
          packWeightLbs,
          treadmill: {
            minInclinePercent: minIncline,
            maxInclinePercent: maxIncline,
            maxSpeedMph: maxSpeed,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data?.error ?? "Unable to generate plan.");
        return;
      }

      const data = await response.json();
      router.push(`/plans/${data.id}`);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.6fr]">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Fitness level
          <select
            value={fitnessLevel}
            onChange={(event) => setFitnessLevel(event.target.value as FitnessLevel)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Target duration
          <select
            value={durationMode}
            onChange={(event) => setDurationMode(event.target.value as DurationMode)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none"
          >
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Minutes
          <input
            type="number"
            min={20}
            step={5}
            disabled={durationMode === "auto"}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none disabled:bg-slate-100"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Pack weight (lbs)
          <input
            type="number"
            min={0}
            max={30}
            value={packWeightLbs}
            onChange={(event) => setPackWeightLbs(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Min incline (%)
          <input
            type="number"
            min={0}
            max={15}
            value={minIncline}
            onChange={(event) => setMinIncline(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Max incline (%)
          <input
            type="number"
            min={2}
            max={20}
            value={maxIncline}
            onChange={(event) => setMaxIncline(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Max speed (mph)
          <input
            type="number"
            min={2}
            max={8}
            step={0.1}
            value={maxSpeed}
            onChange={(event) => setMaxSpeed(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {isSubmitting ? "Generating plan..." : "Generate treadmill plan"}
      </button>
    </form>
  );
}
