"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomHikeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [distanceMiles, setDistanceMiles] = useState(4);
  const [elevationGainFt, setElevationGainFt] = useState(800);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please name your hike.");
      return;
    }
    if (distanceMiles <= 0) {
      setError("Distance must be greater than 0.");
      return;
    }
    if (elevationGainFt < 0) {
      setError("Elevation gain must be 0 or higher.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/hikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, distanceMiles, elevationGainFt }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data?.error ?? "Unable to create hike.");
        return;
      }

      const data = await response.json();
      router.push(`/hikes/${data.id}`);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="space-y-2 text-sm font-medium text-slate-700">
        Hike name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Distance (miles)
          <input
            type="number"
            min={0.5}
            step={0.1}
            value={distanceMiles}
            onChange={(event) => setDistanceMiles(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Elevation gain (ft)
          <input
            type="number"
            min={0}
            step={50}
            value={elevationGainFt}
            onChange={(event) => setElevationGainFt(Number(event.target.value))}
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
        {isSubmitting ? "Creating hike..." : "Create hike"}
      </button>
    </form>
  );
}
