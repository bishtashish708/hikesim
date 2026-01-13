"use client";

import { useState } from "react";

export default function WorkoutFeedbackPage() {
  const [form, setForm] = useState({
    date: "",
    workoutType: "",
    completed: true,
    perceivedDifficulty: 5,
    actualMinutes: "",
    notes: "",
  });
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/workout-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        workoutType: form.workoutType,
        completed: form.completed,
        perceivedDifficulty: Number(form.perceivedDifficulty),
        actualMinutes: form.actualMinutes ? Number(form.actualMinutes) : null,
        notes: form.notes,
      }),
    });
    setStatus(response.ok ? "Feedback saved." : "Unable to save feedback.");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Workout feedback</h1>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Date
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Workout type
            <input
              type="text"
              value={form.workoutType}
              onChange={(event) => setForm({ ...form, workoutType: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.completed}
              onChange={(event) => setForm({ ...form, completed: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            Completed
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Perceived difficulty (1-10)
            <input
              type="number"
              min={1}
              max={10}
              value={form.perceivedDifficulty}
              onChange={(event) =>
                setForm({ ...form, perceivedDifficulty: Number(event.target.value) })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Actual minutes
            <input
              type="number"
              value={form.actualMinutes}
              onChange={(event) => setForm({ ...form, actualMinutes: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              rows={3}
            />
          </label>
          {status ? <p className="text-xs text-slate-600">{status}</p> : null}
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Save feedback
          </button>
        </form>
      </div>
    </div>
  );
}
