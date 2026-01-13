"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatIncline, formatMinutes, formatSpeed } from "@/lib/formatters";
import {
  buildTrainingPlan,
  getMinPrepWeeks,
  getNextMonday,
} from "@/lib/training/buildTrainingPlan";
import {
  getPlanIntensity,
  sanitizeNumber,
  trimPreferredDays,
  validateTrainingForm,
} from "@/lib/training/validators";
import type { TrainingPlanOutput } from "@/lib/training/types";
import type { FitnessLevel, ProfilePoint } from "@/lib/planGenerator";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TrainingPlanBuilderProps = {
  hike: {
    id: string;
    name: string;
    distanceMiles: number;
    elevationGainFt: number;
    profilePoints: ProfilePoint[];
  };
  fitnessLevel: FitnessLevel;
};

export function TrainingPlanBuilder({ hike, fitnessLevel }: TrainingPlanBuilderProps) {
  const initialStartDate = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const base = hours >= 18 ? addDays(now, 1) : now;
    return toInputDate(base);
  }, []);
  const [trainingStartDate, setTrainingStartDate] = useState(initialStartDate);
  const [targetDate, setTargetDate] = useState(() => toInputDate(addDays(new Date(), 42)));
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [anyDays, setAnyDays] = useState(true);
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 3, 5]);
  const [baselineMinutes, setBaselineMinutes] = useState(180);
  const [maxIncline, setMaxIncline] = useState(12);
  const [treadmillSessions, setTreadmillSessions] = useState(2);
  const [treadmillTouched, setTreadmillTouched] = useState(false);
  const [outdoorHikes, setOutdoorHikes] = useState(1);
  const [maxSpeed, setMaxSpeed] = useState(4.5);
  const [includeStrength, setIncludeStrength] = useState(false);
  const [strengthSessions, setStrengthSessions] = useState(0);
  const [strengthOnCardioDays, setStrengthOnCardioDays] = useState(true);
  const [fillActiveRecoveryDays, setFillActiveRecoveryDays] = useState(true);
  const [plan, setPlan] = useState<TrainingPlanOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferredDayLimitNote, setPreferredDayLimitNote] = useState<string | null>(null);
  const [sessionInvariantNote, setSessionInvariantNote] = useState<string | null>(null);
  const [daysAdjustedNote, setDaysAdjustedNote] = useState<string | null>(null);
  const [frequencyAck, setFrequencyAck] = useState<"adjusted" | "kept" | null>(null);
  const [startDateNote, setStartDateNote] = useState<string | null>(null);
  const [ambitiousDismissed, setAmbitiousDismissed] = useState(false);
  const [autoAdjustedDays, setAutoAdjustedDays] = useState<{
    from: number;
    to: number;
    note: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const totalCardio = treadmillSessions + outdoorHikes;
  const totalStrength = includeStrength ? strengthSessions : 0;
  const requiredDays =
    totalCardio + (includeStrength && !strengthOnCardioDays ? totalStrength : 0);
  const unusedDays = Math.max(daysPerWeek - requiredDays, 0);
  const activeRecoveryDays = fillActiveRecoveryDays ? unusedDays : 0;
  const restDays = fillActiveRecoveryDays ? 0 : unusedDays;
  const totalPlannedSessions = totalCardio + totalStrength;
  const planIntensity = getPlanIntensity(baselineMinutes, totalCardio);
  const isAggressive = planIntensity === "aggressive";
  const isModerate = planIntensity === "moderate";
  const liveErrors = useMemo(
    () =>
      validateTrainingForm({
        trainingStartDate,
        targetDate,
        daysPerWeek,
        preferredDays,
        anyDays,
        baselineMinutes,
        treadmillMaxInclinePercent: maxIncline,
        maxSpeedMph: maxSpeed,
        treadmillSessionsPerWeek: treadmillSessions,
        outdoorHikesPerWeek: outdoorHikes,
        strengthSessionsPerWeek: strengthSessions,
        includeStrength,
        strengthOnCardioDays,
        fillActiveRecoveryDays,
      }),
    [
      trainingStartDate,
      targetDate,
      daysPerWeek,
      preferredDays,
      anyDays,
      baselineMinutes,
      maxIncline,
      maxSpeed,
      treadmillSessions,
      outdoorHikes,
      strengthSessions,
      includeStrength,
      strengthOnCardioDays,
      fillActiveRecoveryDays,
    ]
  );
  const isFormValid = Object.keys(liveErrors).length === 0;

  const settingsPayload = useMemo(
    () => ({
      targetDate,
      trainingStartDate,
      daysPerWeek,
      anyDays,
      preferredDays,
      baselineMinutes,
      constraints: {
        treadmillMaxInclinePercent: maxIncline,
        treadmillSessionsPerWeek: treadmillSessions,
        outdoorHikesPerWeek: outdoorHikes,
        maxSpeedMph: maxSpeed,
      },
      strengthSessionsPerWeek: strengthSessions,
      strength: {
        includeStrength,
        strengthOnCardioDays,
      },
      fillActiveRecoveryDays,
    }),
    [
      targetDate,
      trainingStartDate,
      daysPerWeek,
      anyDays,
      preferredDays,
      baselineMinutes,
      maxIncline,
      treadmillSessions,
      outdoorHikes,
      maxSpeed,
      includeStrength,
      strengthSessions,
      strengthOnCardioDays,
      fillActiveRecoveryDays,
    ]
  );

  const previewPlan = useMemo(() => {
    if (!trainingStartDate || !targetDate || !isFormValid) return null;
    return buildTrainingPlan({
      hike: {
        distanceMiles: hike.distanceMiles,
        elevationGainFt: hike.elevationGainFt,
        profilePoints: hike.profilePoints,
      },
      fitnessLevel,
      targetDate,
      trainingStartDate,
      daysPerWeek,
      preferredDays,
      anyDays,
      baselineMinutes,
      constraints: settingsPayload.constraints,
      strengthSessionsPerWeek: strengthSessions,
      includeStrength,
      strengthOnCardioDays,
      fillActiveRecoveryDays,
    });
  }, [
    trainingStartDate,
    targetDate,
    isFormValid,
    hike.distanceMiles,
    hike.elevationGainFt,
    hike.profilePoints,
    fitnessLevel,
    daysPerWeek,
    preferredDays,
    anyDays,
    baselineMinutes,
    settingsPayload.constraints,
    strengthSessions,
    includeStrength,
    strengthOnCardioDays,
    fillActiveRecoveryDays,
  ]);

  const visiblePlan = plan ?? previewPlan;

  const nextTreadmillWorkout = visiblePlan
    ? visiblePlan.weeks
        .flatMap((week) => week.days)
        .flatMap((day) =>
          day.workouts.map((workout) => ({
            dayName: day.dayName,
            date: day.date,
            workout,
          }))
        )
        .find((entry) => entry.workout.segments && entry.workout.segments.length > 0)
    : null;

  const previewSegments = nextTreadmillWorkout?.workout.segments ?? [];
  const warmUpSegment = previewSegments.find((segment) => segment.note?.includes("Warm-up"));
  const coolDownSegment = [...previewSegments]
    .reverse()
    .find((segment) => segment.note?.includes("Cool-down"));
  const mainSegments = previewSegments.filter(
    (segment) => !segment.note?.includes("Warm-up") && !segment.note?.includes("Cool-down")
  );
  const avgMainIncline =
    mainSegments.length > 0
      ? mainSegments.reduce((sum, segment) => sum + segment.inclinePct, 0) / mainSegments.length
      : 0;


  const treadmillOptions = useMemo(() => {
    const maxSessions = Math.min(daysPerWeek, 6);
    return Array.from({ length: maxSessions + 1 }, (_, index) => index);
  }, [daysPerWeek]);

  const adjustedTreadmill = treadmillSessions > daysPerWeek;
  const outdoorOptions = treadmillOptions;
  const strengthOptions = useMemo(() => {
    return Array.from({ length: daysPerWeek + 1 }, (_, index) => index);
  }, [daysPerWeek]);

  const previousDaysRef = useRef(daysPerWeek);
  useEffect(() => {
    if (previousDaysRef.current === daysPerWeek) return;
    previousDaysRef.current = daysPerWeek;
    const total = treadmillSessions + outdoorHikes + (includeStrength ? strengthSessions : 0);
    if (total <= daysPerWeek) {
      setDaysAdjustedNote(null);
      return;
    }
    let nextTreadmill = treadmillSessions;
    let nextOutdoor = outdoorHikes;
    let nextStrength = includeStrength ? strengthSessions : 0;
    while (nextTreadmill + nextOutdoor + nextStrength > daysPerWeek) {
      if (nextStrength > 0) {
        nextStrength -= 1;
      } else if (nextOutdoor > 0) {
        nextOutdoor -= 1;
      } else if (nextTreadmill > 0) {
        nextTreadmill -= 1;
      } else {
        break;
      }
    }
    setTreadmillSessions(nextTreadmill);
    setOutdoorHikes(nextOutdoor);
    setStrengthSessions(nextStrength);
    setDaysAdjustedNote(`Adjusted sessions to fit ${daysPerWeek} days/week.`);
  }, [daysPerWeek, treadmillSessions, outdoorHikes, strengthSessions, includeStrength]);

  useEffect(() => {
    if (!includeStrength && strengthSessions !== 0) {
      setStrengthSessions(0);
    }
  }, [includeStrength, strengthSessions]);

  useEffect(() => {
    if (includeStrength && strengthOnCardioDays && strengthSessions > totalCardio) {
      setStrengthSessions(totalCardio);
    }
  }, [includeStrength, strengthOnCardioDays, strengthSessions, totalCardio]);

  useEffect(() => {
    if (daysPerWeek < 7 && ambitiousDismissed) {
      setAmbitiousDismissed(false);
    }
  }, [daysPerWeek, ambitiousDismissed]);

  useEffect(() => {
    if (autoAdjustedDays && daysPerWeek !== autoAdjustedDays.to) {
      setAutoAdjustedDays(null);
    }
  }, [autoAdjustedDays, daysPerWeek]);

  useEffect(() => {
    if (anyDays) {
      if (preferredDays.length > 0) {
        setPreferredDays([]);
      }
      if (preferredDayLimitNote) {
        setPreferredDayLimitNote(null);
      }
      return;
    }
    if (preferredDays.length > daysPerWeek) {
      setPreferredDays(trimPreferredDays(preferredDays, daysPerWeek));
      setPreferredDayLimitNote(`Adjusted preferred days to match ${daysPerWeek} days/week.`);
    } else {
      setPreferredDayLimitNote(null);
    }
  }, [anyDays, daysPerWeek, preferredDays, preferredDayLimitNote]);

  useEffect(() => {
    if (treadmillSessions > daysPerWeek) {
      setTreadmillSessions(daysPerWeek);
    }
    if (treadmillTouched) return;
    if (baselineMinutes <= 30) {
      setTreadmillSessions(Math.min(2, daysPerWeek));
    } else if (baselineMinutes <= 90) {
      setTreadmillSessions(Math.min(3, daysPerWeek));
    } else {
      setTreadmillSessions(Math.min(3, daysPerWeek));
    }
  }, [baselineMinutes, daysPerWeek, treadmillSessions, treadmillTouched]);

  useEffect(() => {
    if (!isAggressive) {
      setFrequencyAck(null);
    }
  }, [isAggressive]);

  const handleGenerate = () => {
    setError(null);
    setSaveStatus(null);
    setStartDateNote(null);

    if (!targetDate) {
      setError("Please select a target date.");
      return;
    }
    if (!trainingStartDate) {
      setError("Please select a training start date.");
      return;
    }
    if (new Date(trainingStartDate) > new Date(targetDate)) {
      setError("Training start date must be before the target hike date.");
      return;
    }
    if (daysPerWeek < 1 || daysPerWeek > 7) {
      setError("Training days per week should be between 1 and 7.");
      return;
    }

    const validation = liveErrors;
    if (Object.keys(validation).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    const output = buildTrainingPlan({
      hike: {
        distanceMiles: hike.distanceMiles,
        elevationGainFt: hike.elevationGainFt,
        profilePoints: hike.profilePoints,
      },
      fitnessLevel,
      targetDate,
      trainingStartDate,
      daysPerWeek,
      preferredDays,
      anyDays,
      baselineMinutes,
      constraints: settingsPayload.constraints,
      strengthSessionsPerWeek: strengthSessions,
      includeStrength,
      strengthOnCardioDays,
      fillActiveRecoveryDays,
    });

    if (trainingStartDate === toInputDate(new Date()) && new Date().getHours() >= 18) {
      setStartDateNote("Starting today schedules workouts immediately; consider “Start tomorrow”.");
    }

    setPlan(output);
  };

  useEffect(() => {
    setPlan(null);
  }, [
    trainingStartDate,
    targetDate,
    daysPerWeek,
    preferredDays,
    anyDays,
    baselineMinutes,
    maxIncline,
    maxSpeed,
    treadmillSessions,
    outdoorHikes,
    strengthSessions,
    includeStrength,
    strengthOnCardioDays,
    fillActiveRecoveryDays,
  ]);

  const weeksUntilHike = trainingStartDate && targetDate
    ? Math.ceil(
        (new Date(targetDate).getTime() - new Date(trainingStartDate).getTime() + 24 * 60 * 60 * 1000) /
          (7 * 24 * 60 * 60 * 1000)
      )
    : 0;
  const minPrepWeeks = getMinPrepWeeks(hike.distanceMiles, hike.elevationGainFt);
  const showAdequacyWarning = weeksUntilHike > 0 && weeksUntilHike < minPrepWeeks;
  const showOvertrainingWarning = restDays < 1 || totalPlannedSessions > 5;
  const showAmbitiousDaysWarning = daysPerWeek >= 7 && !ambitiousDismissed;

  const handleAdjustSessions = () => {
    const recommendedTotal = baselineMinutes <= 30 ? 3 : baselineMinutes <= 90 ? 4 : 5;
    const targetTotal = Math.min(recommendedTotal, daysPerWeek);
    const ratio = totalCardio > 0 ? treadmillSessions / totalCardio : 1;
    const nextTreadmill = Math.min(targetTotal, Math.max(0, Math.round(targetTotal * ratio)));
    const nextOutdoor = Math.max(targetTotal - nextTreadmill, 0);
    setTreadmillSessions(nextTreadmill);
    setOutdoorHikes(nextOutdoor);
    if (includeStrength && nextTreadmill + nextOutdoor + strengthSessions > daysPerWeek) {
      setStrengthSessions(Math.max(daysPerWeek - (nextTreadmill + nextOutdoor), 0));
    }
    setFrequencyAck("adjusted");
    setSessionInvariantNote(null);
  };

  const handleAdjustTrainingDays = () => {
    const cardioSessions = totalCardio;
    const strengthSessionsTotal = includeStrength ? strengthSessions : 0;
    const minRestDays = includeStrength ? 2 : 1;
    let restDays = includeStrength ? 2 : 2;
    let targetDays = cardioSessions + strengthSessionsTotal + restDays;

    if (targetDays > 7) {
      restDays = Math.max(minRestDays, 7 - (cardioSessions + strengthSessionsTotal));
      targetDays = Math.min(7, cardioSessions + strengthSessionsTotal + restDays);
    }

    if (targetDays > daysPerWeek) {
      const availableRest = daysPerWeek - (cardioSessions + strengthSessionsTotal);
      restDays = Math.max(minRestDays, availableRest);
      targetDays = Math.min(daysPerWeek, cardioSessions + strengthSessionsTotal + restDays);
    }

    if (targetDays === daysPerWeek) {
      setAmbitiousDismissed(true);
      setAutoAdjustedDays(null);
      return;
    }

    const actualRestDays = Math.max(targetDays - (cardioSessions + strengthSessionsTotal), 0);
    const note =
      actualRestDays < minRestDays
        ? "Rest days reduced to fit your selected capacity. This plan is aggressive."
        : "Training days recalculated for sustainability.";

    setAutoAdjustedDays({ from: daysPerWeek, to: targetDays, note });
    setDaysPerWeek(targetDays);
    setAmbitiousDismissed(true);
  };

  const handleUndoTrainingDays = () => {
    if (!autoAdjustedDays) return;
    setDaysPerWeek(autoAdjustedDays.from);
    setAutoAdjustedDays(null);
    setAmbitiousDismissed(false);
  };

  const handleFocusChange = (nextFocus: "cardio" | "cardio-strength") => {
    const nextIncludeStrength = nextFocus === "cardio-strength";
    setIncludeStrength(nextIncludeStrength);
    if (!nextIncludeStrength) {
      setStrengthSessions(0);
      setStrengthOnCardioDays(true);
      return;
    }
    if (strengthSessions === 0) {
      const available = Math.max(daysPerWeek - totalCardio, 0);
      setStrengthSessions(available > 0 ? Math.min(2, available) : 0);
    }
  };

  const handleRecommendedSplit = () => {
    setIncludeStrength(true);
    setStrengthOnCardioDays(false);
    setDaysPerWeek((current) => Math.max(current, 7));
    setTreadmillTouched(true);
    setTreadmillSessions(2);
    setOutdoorHikes(1);
    setStrengthSessions(2);
    setSessionInvariantNote(null);
  };

  const hasDateError =
    !trainingStartDate ||
    !targetDate ||
    new Date(trainingStartDate).getTime() > new Date(targetDate).getTime();

  const isGenerateDisabled = hasDateError || (isAggressive && !frequencyAck) || !isFormValid;

  const handleSave = async () => {
    if (!plan) return;
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const response = await fetch("/api/training-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hikeId: hike.id,
          targetDate,
          trainingStartDate,
          settings: settingsPayload,
          weeks: plan.weeks,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data?.error ?? "Unable to save training plan.");
        return;
      }

      setSaveStatus("Training plan saved.");
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save training plan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Training Plan</h2>
        <p className="text-sm text-slate-600">
          Build a progressive plan leading into your target hike date. Adjust training
          days and treadmill availability to match your schedule.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {visiblePlan ? (
          <div className="space-y-3">
            <div className="font-semibold">
              {visiblePlan.totalWeeks} weeks starting {formatDate(trainingStartDate)} •{" "}
              {visiblePlan.summary.daysPerWeek} days/week • {totalCardio} cardio •{" "}
              {includeStrength ? `${totalStrength} strength • ` : ""}{" "}
              {activeRecoveryDays > 0 ? `${activeRecoveryDays} active recovery • ` : ""}
              {restDays > 0 ? `${restDays} rest • ` : ""}~
              {visiblePlan.summary.averageWeeklyMinutes} min/week
            </div>
            {nextTreadmillWorkout ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  {nextTreadmillWorkout.dayName}: {nextTreadmillWorkout.workout.type} —{" "}
                  {formatMinutes(nextTreadmillWorkout.workout.durationMinutes)} min
                </p>
                <div className="text-xs text-slate-600">
                  {warmUpSegment ? (
                    <p>
                      Warm-up: {formatMinutes(warmUpSegment.minutes)} min @{" "}
                      {formatIncline(warmUpSegment.inclinePct)} @{" "}
                      {formatSpeed(warmUpSegment.speedMph)}
                    </p>
                  ) : null}
                  <p>
                    Main: {mainSegments.length} segments, avg incline{" "}
                    {formatIncline(avgMainIncline)}
                  </p>
                  {coolDownSegment ? (
                    <p>
                      Cool-down: {formatMinutes(coolDownSegment.minutes)} min @{" "}
                      {formatIncline(coolDownSegment.inclinePct)} @{" "}
                      {formatSpeed(coolDownSegment.speedMph)}
                    </p>
                  ) : null}
                </div>
                <a href="#training-plan-table" className="text-xs font-semibold text-emerald-700">
                  Scroll to plan
                </a>
              </div>
            ) : (
              <p className="text-xs text-amber-700">
                No treadmill sessions scheduled—raise treadmill sessions/week.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-slate-800">What you’ll get</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
              <li>Week-by-week schedule</li>
              <li>Treadmill sessions with segments</li>
              <li>Deload + taper built in</li>
            </ul>
            <p className="text-xs text-slate-500">Generate your plan below.</p>
          </div>
        )}
        {startDateNote ? <p className="mt-2 text-xs text-amber-700">{startDateNote}</p> : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Training start date
          <input
            type="date"
            value={trainingStartDate}
            onChange={(event) => setTrainingStartDate(event.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
              liveErrors.trainingStartDate ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
            }`}
          />
          {liveErrors.trainingStartDate ? (
            <p className="text-xs text-rose-700">{liveErrors.trainingStartDate}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setTrainingStartDate(toInputDate(new Date()))}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:border-slate-300"
            >
              Start today
            </button>
            <button
              type="button"
              onClick={() => setTrainingStartDate(toInputDate(addDays(new Date(), 1)))}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:border-slate-300"
            >
              Start tomorrow
            </button>
            <button
              type="button"
              onClick={() => setTrainingStartDate(toInputDate(getNextMonday(new Date())))}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:border-slate-300"
            >
              Start next Monday
            </button>
          </div>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Target hike date
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
              liveErrors.targetDate ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
            }`}
          />
          {liveErrors.targetDate ? (
            <p className="text-xs text-rose-700">{liveErrors.targetDate}</p>
          ) : null}
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          Training days per week
          <select
            value={daysPerWeek}
            onChange={(event) => setDaysPerWeek(Number(event.target.value))}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
              liveErrors.daysPerWeek ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
            }`}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((value) => (
              <option key={value} value={value}>
                {value} days
              </option>
            ))}
          </select>
          {liveErrors.daysPerWeek ? (
            <p className="text-xs text-rose-700">{liveErrors.daysPerWeek}</p>
          ) : null}
          <p className="text-xs font-normal text-slate-500">
            How many days can you realistically train?
          </p>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>Preferred training days</span>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={anyDays}
              onChange={(event) => setAnyDays(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            Any days
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAY_LABELS.map((day, index) => {
            const atLimit = !anyDays && preferredDays.length >= daysPerWeek;
            const isSelected = preferredDays.includes(index);
            return (
            <label
              key={day}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                anyDays
                  ? "border-slate-200 bg-slate-100 text-slate-400"
                  : isSelected
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <input
                type="checkbox"
                disabled={anyDays || (!isSelected && atLimit)}
                checked={isSelected}
                onChange={() => toggleDay(index, preferredDays, setPreferredDays)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              {day}
            </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">Select up to {daysPerWeek} days.</p>
        {preferredDayLimitNote ? (
          <p className="mt-1 text-xs text-slate-500">{preferredDayLimitNote}</p>
        ) : null}
        {!anyDays && preferredDays.length >= daysPerWeek ? (
          <p className="mt-1 text-xs text-amber-700">
            You selected {daysPerWeek} days/week — unselect a day to choose another.
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Current weekly hiking or treadmill time (minutes)
          <input
            type="number"
            min={0}
            max={2000}
            step={5}
            value={baselineMinutes}
            inputMode="numeric"
            onChange={(event) =>
              setBaselineMinutes(sanitizeNumber(event.target.value, 0, 2000, 5))
            }
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
              liveErrors.baselineMinutes ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
            }`}
          />
          {liveErrors.baselineMinutes ? (
            <p className="text-xs text-rose-700">{liveErrors.baselineMinutes}</p>
          ) : null}
          <p className="text-xs font-normal text-slate-500">
            If you’re just starting out, enter 0 — we’ll ease you in.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {[0, 30, 60, 120].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBaselineMinutes(preset)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:border-slate-300"
              >
                {preset}
              </button>
            ))}
          </div>
        </label>

        <div className="grid gap-3">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Treadmill max incline (%)
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={maxIncline}
              inputMode="decimal"
              onChange={(event) =>
                setMaxIncline(sanitizeNumber(event.target.value, 0, 20, 0.5))
              }
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
                liveErrors.treadmillMaxInclinePercent ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
              }`}
            />
            {liveErrors.treadmillMaxInclinePercent ? (
              <p className="text-xs text-rose-700">{liveErrors.treadmillMaxInclinePercent}</p>
            ) : null}
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Max treadmill speed (mph)
            <input
              type="number"
              min={1}
              max={8}
              step={0.1}
              value={maxSpeed}
              inputMode="decimal"
              onChange={(event) =>
                setMaxSpeed(sanitizeNumber(event.target.value, 1, 8, 0.1))
              }
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
                liveErrors.maxSpeedMph ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
              }`}
            />
            {liveErrors.maxSpeedMph ? (
              <p className="text-xs text-rose-700">{liveErrors.maxSpeedMph}</p>
            ) : null}
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Treadmill sessions/week
          <select
            value={treadmillSessions}
            onChange={(event) => {
              setTreadmillTouched(true);
              const nextValue = Number(event.target.value);
              if (nextValue + outdoorHikes + totalStrength > daysPerWeek) {
                setSessionInvariantNote(
                  "Cardio + strength sessions cannot exceed training days."
                );
                return;
              }
              if (nextValue + outdoorHikes === 0) {
                setSessionInvariantNote("Choose at least 1 treadmill or outdoor session per week.");
                return;
              }
              setSessionInvariantNote(null);
              setTreadmillSessions(nextValue);
            }}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
              liveErrors.treadmillSessionsPerWeek ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
            }`}
          >
            {treadmillOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {liveErrors.treadmillSessionsPerWeek ? (
            <p className="text-xs text-rose-700">{liveErrors.treadmillSessionsPerWeek}</p>
          ) : null}
          {adjustedTreadmill ? (
            <p className="text-xs text-slate-500">Adjusted to match training days/week.</p>
          ) : null}
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Outdoor hikes/week
          <select
            value={outdoorHikes}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (nextValue + treadmillSessions + totalStrength > daysPerWeek) {
                setSessionInvariantNote(
                  "Cardio + strength sessions cannot exceed training days."
                );
                return;
              }
              if (nextValue + treadmillSessions === 0) {
                setSessionInvariantNote("Choose at least 1 treadmill or outdoor session per week.");
                return;
              }
              setSessionInvariantNote(null);
              setOutdoorHikes(nextValue);
            }}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
              liveErrors.outdoorHikesPerWeek ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
            }`}
          >
            {outdoorOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {liveErrors.outdoorHikesPerWeek ? (
            <p className="text-xs text-rose-700">{liveErrors.outdoorHikesPerWeek}</p>
          ) : null}
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Cardio helper: Treadmill + outdoor sessions are your main hike conditioning.
      </p>
      {sessionInvariantNote ? (
        <div className="mt-2 text-xs text-amber-700">{sessionInvariantNote}</div>
      ) : null}
      {daysAdjustedNote ? (
        <div className="mt-2 text-xs text-slate-500">{daysAdjustedNote}</div>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Training focus</p>
            <p className="text-xs text-slate-500">
              Pick cardio-only or a blend with strength sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecommendedSplit}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
          >
            Use recommended split
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <input
              type="radio"
              name="training-focus"
              checked={!includeStrength}
              onChange={() => handleFocusChange("cardio")}
              className="h-4 w-4 border-slate-300 text-emerald-600"
            />
            Cardio only
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <input
              type="radio"
              name="training-focus"
              checked={includeStrength}
              onChange={() => handleFocusChange("cardio-strength")}
              className="h-4 w-4 border-slate-300 text-emerald-600"
            />
            Cardio + strength
          </label>
        </div>

        {includeStrength ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Strength sessions/week
              <select
                value={strengthSessions}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  if (nextValue + totalCardio > daysPerWeek) {
                    setSessionInvariantNote(
                      "Cardio + strength sessions cannot exceed training days."
                    );
                    return;
                  }
                  if (strengthOnCardioDays && nextValue > totalCardio) {
                    setSessionInvariantNote(
                      "Strength sessions must fit within your cardio sessions."
                    );
                    return;
                  }
                  setSessionInvariantNote(null);
                  setStrengthSessions(nextValue);
                }}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none ${
                  liveErrors.strengthSessionsPerWeek ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400"
                }`}
              >
                {strengthOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {liveErrors.strengthSessionsPerWeek ? (
                <p className="text-xs text-rose-700">{liveErrors.strengthSessionsPerWeek}</p>
              ) : null}
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={strengthOnCardioDays}
                onChange={(event) => setStrengthOnCardioDays(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              Mix sessions on same day
            </label>
          </div>
        ) : null}
        {includeStrength ? (
          <p className="mt-2 text-xs text-slate-500">
            When stacking, do strength first and cardio 6+ hours later.
          </p>
        ) : null}
        <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={fillActiveRecoveryDays}
            onChange={(event) => setFillActiveRecoveryDays(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
          />
          Fill unused days with active recovery
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Unassigned days become {fillActiveRecoveryDays ? "active recovery" : "rest"} days.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {liveErrors.preferredDaysLimit ? (
        <div className="mt-2 text-xs text-rose-700">{liveErrors.preferredDaysLimit}</div>
      ) : null}
      {!error && baselineMinutes <= 30 ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Starting from zero is totally fine — we’ll begin with short treadmill walks and build
          gradually.
        </div>
      ) : null}
      {!error && baselineMinutes > 30 && baselineMinutes < 60 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          We’ll start conservatively and ramp up week by week.
        </div>
      ) : null}
      {hasDateError && !error ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Training start date must be before the target hike date.
        </div>
      ) : null}
      {showAdequacyWarning ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This hike typically requires at least {minPrepWeeks} weeks of preparation. Your plan may not fully
          prepare you.
        </div>
      ) : null}
      {showAmbitiousDaysWarning ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          7 training days/week is ambitious and leaves no rest days.
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAdjustTrainingDays}
              className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
            >
              Adjust automatically (recommended)
            </button>
            <button
              type="button"
              onClick={() => setAmbitiousDismissed(true)}
              className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
            >
              Keep 7 days
            </button>
          </div>
        </div>
      ) : null}
      {autoAdjustedDays ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Adjusted training days from {autoAdjustedDays.from} to {autoAdjustedDays.to}. {autoAdjustedDays.note}
          <button
            type="button"
            onClick={handleUndoTrainingDays}
            className="ml-3 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
          >
            Undo
          </button>
        </div>
      ) : null}
      {showOvertrainingWarning ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Overtraining risk: training every day or stacking too many intense sessions can increase injury risk.
          {fillActiveRecoveryDays
            ? " Consider at least one full rest day per week."
            : " Aim for at least one rest day per week."}
        </div>
      ) : null}
      {isAggressive ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ambitious plan: recommended only if you already train consistently.
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAdjustSessions}
              className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
            >
              Adjust automatically (recommended)
            </button>
            <button
              type="button"
              onClick={() => setFrequencyAck("kept")}
              className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
            >
              Keep my plan
            </button>
          </div>
        </div>
      ) : null}
      {isModerate ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Starting with {totalPlannedSessions} sessions/week is ambitious. Consider 3–4 sessions while you build
          consistency.
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerateDisabled}
          className="rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          Generate training plan
        </button>
        {plan ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save training plan"}
            </button>
            <button
              type="button"
              onClick={() => exportTrainingPlanCsv(hike.name, plan)}
              className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
            >
              Export training plan CSV
            </button>
          </>
        ) : null}
      </div>

      {saveStatus ? <p className="mt-3 text-sm text-emerald-600">{saveStatus}</p> : null}

      {plan ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="font-semibold">
              {plan.totalWeeks} weeks • {plan.summary.daysPerWeek} days/week • {totalCardio} cardio •{" "}
              {includeStrength ? `${totalStrength} strength • ` : ""}{" "}
              {activeRecoveryDays > 0 ? `${activeRecoveryDays} active recovery • ` : ""}
              {restDays > 0 ? `${restDays} rest • ` : ""}~
              {plan.summary.averageWeeklyMinutes} min/week
            </div>
            {plan.warnings.map((warning, index) => (
              <p key={`${index}-${warning}`} className="mt-1 text-xs text-emerald-800">
                {warning}
              </p>
            ))}
          </div>

          <div
            id="training-plan-table"
            className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Date range</th>
                  <th className="px-4 py-3">Workouts</th>
                  <th className="px-4 py-3">Total min</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {plan.weeks.map((week) => (
                  <tr key={week.weekNumber} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold text-slate-700">Week {week.weekNumber}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {week.startDate} – {week.endDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {week.days.map((day) => (
                          <details key={day.date} className="rounded-lg border border-slate-200 bg-white p-2">
                            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                              {day.dayName}: {day.workouts[0].type}
                              {day.workouts.length > 1 ? ` +${day.workouts.length - 1}` : ""} (
                              {formatMinutes(
                                day.workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0)
                              )}{" "}
                              min)
                            </summary>
                            <div className="mt-2 space-y-2 text-xs text-slate-600">
                              {day.workouts.map((workout) => (
                                <div key={`${day.date}-${workout.id}`} className="space-y-1">
                                  <p className="text-xs font-semibold text-slate-700">
                                    {workout.type} ({formatMinutes(workout.durationMinutes)} min)
                                  </p>
                                  {workout.notes ? <p>{workout.notes}</p> : null}
                                  {workout.inclineTarget ? (
                                    <p>Target incline: {formatIncline(workout.inclineTarget)}</p>
                                  ) : null}
                                  {workout.segments ? (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                                          <tr>
                                            <th className="py-1 pr-2">Segment</th>
                                            <th className="py-1 pr-2">Minutes</th>
                                            <th className="py-1 pr-2">Incline</th>
                                            <th className="py-1 pr-2">Speed</th>
                                            <th className="py-1">Notes</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {workout.segments.map((segment) => (
                                            <tr
                                              key={`${day.date}-${workout.id}-${segment.index}`}
                                              className="border-t border-slate-100"
                                            >
                                              <td className="py-1 pr-2">{segment.index}</td>
                                              <td className="py-1 pr-2">
                                                {formatMinutes(segment.minutes)}
                                              </td>
                                              <td className="py-1 pr-2">
                                                {formatIncline(segment.inclinePct)}
                                              </td>
                                              <td className="py-1 pr-2">{formatSpeed(segment.speedMph)}</td>
                                              <td className="py-1">{segment.note ?? "—"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatMinutes(week.totalMinutes)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <div className="text-xs font-semibold text-slate-600">{week.focus}</div>
                      <div className="mt-1 text-xs text-slate-500">{week.notes}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toggleDay(dayIndex: number, selected: number[], setSelected: (next: number[]) => void) {
  if (selected.includes(dayIndex)) {
    setSelected(selected.filter((day) => day !== dayIndex));
  } else {
    setSelected([...selected, dayIndex]);
  }
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function exportTrainingPlanCsv(hikeName: string, plan: TrainingPlanOutput) {
  const rows = [
    ["Date", "Workout Type", "Duration (min)", "Incline Target", "Notes", "Segments"],
    ...plan.weeks.flatMap((week) =>
      week.days.flatMap((day) =>
        day.workouts.map((workout) => [
          day.date,
          workout.type,
          workout.durationMinutes.toString(),
          workout.inclineTarget ? `${workout.inclineTarget}%` : "",
          workout.notes ?? "",
          workout.segments ? JSON.stringify(workout.segments) : "",
        ])
      )
    ),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${slugify(hikeName)}-training-plan.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
