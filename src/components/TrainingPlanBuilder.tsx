"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
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
import type { TrainingPlanOutput, TrainingWorkout } from "@/lib/training/types";
import type { FitnessLevel, ProfilePoint } from "@/lib/planGenerator";
import { getApiBase } from "@/lib/apiBase";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_ALIASES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

type WizardStepId =
  | "trainingStartDate"
  | "targetDate"
  | "daysPerWeek"
  | "fitnessLevel"
  | "baselineMinutes"
  | "maxIncline"
  | "maxSpeed"
  | "treadmillSessions"
  | "outdoorHikes"
  | "trainingFocus"
  | "strengthSessions"
  | "strengthOnCardioDays"
  | "fillActiveRecoveryDays"
  | "preferredDays"
  | "review";

type WizardStep = {
  id: WizardStepId;
  title: string;
  helper?: string;
  placeholder?: string;
  presets?: string[];
};

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

type PlanChangeLogEntry = {
  id: string;
  action: string;
  timestamp: string;
  detail?: string;
};

type PlanSummarySource = {
  settings?: {
    daysPerWeek?: number;
    preferredDays?: number[];
  };
};

export function TrainingPlanBuilder({ hike, fitnessLevel }: TrainingPlanBuilderProps) {
  const initialStartDate = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const base = hours >= 18 ? addDays(now, 1) : now;
    return toInputDate(base);
  }, []);
  const [trainingStartDate, setTrainingStartDate] = useState<string>(initialStartDate);
  const [targetDate, setTargetDate] = useState<string>(() => toInputDate(addDays(new Date(), 42)));
  const [planMode, setPlanMode] = useState<"quick" | "custom" | null>(null);
  const [selectedFitnessLevel, setSelectedFitnessLevel] = useState<FitnessLevel>(fitnessLevel);
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
  const [planId, setPlanId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<TrainingPlanOutput[]>([]);
  const [editFuture, setEditFuture] = useState<TrainingPlanOutput[]>([]);
  const [originalPlan, setOriginalPlan] = useState<TrainingPlanOutput | null>(null);
  const [changeLog, setChangeLog] = useState<PlanChangeLogEntry[]>([]);
  const [editWarnings, setEditWarnings] = useState<string[]>([]);
  const [swapTarget, setSwapTarget] = useState<{
    weekIndex: number;
    dayIndex: number;
    workoutIndex: number;
  } | null>(null);
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
  const [timelineWarningAcked, setTimelineWarningAcked] = useState(false);
  const [compressedWarningAcked, setCompressedWarningAcked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardInput, setWizardInput] = useState("");
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardTouched, setWizardTouched] = useState(false);
  const apiBase = getApiBase();
  const useBackend = Boolean(apiBase);
  const editStorageKey = `trainingPlanEdits:${hike.id}`;
  const planIdStorageKey = `trainingPlanId:${hike.id}`;
  const revisionSaveTimerRef = useRef<number | null>(null);
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

  const wizardSteps: WizardStep[] = useMemo(
    () => [
      {
        id: "trainingStartDate",
        title: "When do you want to start training?",
        helper: "Type a date (YYYY-MM-DD) or say “today”, “tomorrow”, or “next Monday”.",
        placeholder: "e.g., 2026-02-01 or next monday",
        presets: ["today", "tomorrow", "next monday"],
      },
      {
        id: "targetDate",
        title: "What is your target hike date?",
        helper: "We use this to calculate weeks available for training.",
        placeholder: "e.g., 2026-04-15",
      },
      {
        id: "daysPerWeek",
        title: "How many days per week can you train?",
        helper: planMode === "quick"
          ? "Quick-start recommends 3–5 days. Max 6 in this mode."
          : "Enter a number between 1 and 7.",
        placeholder: "e.g., 4",
        presets: ["3", "4", "5"],
      },
      {
        id: "fitnessLevel",
        title: "What is your experience level?",
        helper: "Choose Beginner, Intermediate, or Advanced.",
        placeholder: "e.g., Intermediate",
        presets: ["Beginner", "Intermediate", "Advanced"],
      },
      {
        id: "baselineMinutes",
        title: "How many minutes do you currently train per week?",
        helper: "If you are starting out, enter 0. Range: 0–2000 minutes.",
        placeholder: "e.g., 120",
        presets: ["0", "60", "120", "180"],
      },
      {
        id: "maxIncline",
        title: "What is your treadmill max incline (%)?",
        helper: "We’ll cap incline in the plan to this. Range: 0–20.",
        placeholder: "e.g., 12",
        presets: ["8", "12", "15"],
      },
      {
        id: "maxSpeed",
        title: "What is your max treadmill speed (mph)?",
        helper: "Range: 1–8 mph.",
        placeholder: "e.g., 4.5",
        presets: ["3.5", "4.5", "5.5"],
      },
      {
        id: "treadmillSessions",
        title: "How many treadmill sessions per week?",
        helper: "Treadmill + outdoor sessions should be at least 1.",
        placeholder: "e.g., 2",
        presets: ["1", "2", "3"],
      },
      {
        id: "outdoorHikes",
        title: "How many outdoor hikes per week?",
        helper: "Treadmill + outdoor sessions should be at least 1.",
        placeholder: "e.g., 1",
        presets: ["0", "1", "2"],
      },
      {
        id: "trainingFocus",
        title: "Do you want cardio only, or cardio + strength?",
        helper: "Choose one.",
        placeholder: "e.g., cardio + strength",
        presets: ["cardio only", "cardio + strength"],
      },
      {
        id: "strengthSessions",
        title: "How many strength sessions per week?",
        helper: includeStrength
          ? "Must fit within your total training days."
          : "You chose cardio only. Enter 0 or switch focus.",
        placeholder: "e.g., 2",
        presets: ["0", "1", "2"],
      },
      {
        id: "strengthOnCardioDays",
        title: "Mix strength on cardio days?",
        helper: "Answer yes or no. If yes, we’ll stack sessions on the same day.",
        placeholder: "e.g., yes",
        presets: ["yes", "no"],
      },
      {
        id: "fillActiveRecoveryDays",
        title: "Fill unused days with active recovery?",
        helper: "Answer yes or no.",
        placeholder: "e.g., yes",
        presets: ["yes", "no"],
      },
      {
        id: "preferredDays",
        title: "Any preferred training days?",
        helper: "Type “any” or list days like Mon, Wed, Fri.",
        placeholder: "e.g., any or Mon, Wed, Fri",
        presets: ["any", "Mon, Wed, Fri"],
      },
      {
        id: "review",
        title: "Review your plan settings",
      },
    ],
    [includeStrength, planMode]
  );

  const hikeDifficulty = getHikeDifficulty(hike.distanceMiles, hike.elevationGainFt);
  const recommendedDays = getRecommendedDaysByDifficulty(hikeDifficulty);
  const summaryCounts = useMemo(() => {
    if (plan) {
      return getPlanCounts(plan);
    }
    return {
      cardio: totalCardio,
      strength: totalStrength,
      activeRecovery: activeRecoveryDays,
      rest: restDays,
    };
  }, [plan, totalCardio, totalStrength, activeRecoveryDays, restDays]);
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
      fitnessLevel: selectedFitnessLevel,
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
    selectedFitnessLevel,
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
    setSelectedFitnessLevel(fitnessLevel);
  }, [fitnessLevel]);

  useEffect(() => {
    if (!planMode) return;
    try {
      window.localStorage.setItem(`planMode:${hike.id}`, planMode);
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [planMode, hike.id]);

  useEffect(() => {
    if (planMode) return;
    try {
      const stored = window.localStorage.getItem(`planMode:${hike.id}`);
      if (stored === "quick" || stored === "custom") {
        setPlanMode(stored);
      }
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [planMode, hike.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (plan) return;
    try {
      const storedPlanId = window.localStorage.getItem(planIdStorageKey);
      if (storedPlanId) {
        setPlanId(storedPlanId);
      }
      const storedEdits = window.localStorage.getItem(editStorageKey);
      if (storedEdits) {
        const parsed = JSON.parse(storedEdits) as {
          plan: TrainingPlanOutput;
          originalPlan?: TrainingPlanOutput | null;
          history?: TrainingPlanOutput[];
          future?: TrainingPlanOutput[];
          changeLog?: PlanChangeLogEntry[];
        };
        setPlan(parsed.plan);
        setOriginalPlan(parsed.originalPlan ?? parsed.plan);
        setEditHistory(parsed.history ?? []);
        setEditFuture(parsed.future ?? []);
        setChangeLog(parsed.changeLog ?? []);
        setIsEditing(true);
        return;
      }
      if (storedPlanId) {
        fetch(`/api/training-plans/${storedPlanId}`)
          .then((response) => response.ok ? response.json() : null)
          .then((data) => {
            if (!data?.plan) return;
            const loaded = (data.revision?.weeks ?? data.plan.weeks) as TrainingPlanOutput["weeks"];
            const loadedPlan: TrainingPlanOutput = {
              ...planFromWeeks(data.plan, loaded),
            };
            setPlan(loadedPlan);
            setOriginalPlan(planFromWeeks(data.plan, data.plan.weeks));
            setIsEditing(false);
          })
          .catch(() => {
            // Ignore load failures.
          });
      }
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [plan, editStorageKey, planIdStorageKey]);

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

  const handleGenerate = async () => {
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

    const payload = {
      hike_id: Number(hike.id),
      hike: {
        distance_miles: hike.distanceMiles,
        elevation_gain_ft: hike.elevationGainFt,
        profile_points: hike.profilePoints.map((point) => ({
          distanceMiles: point.distanceMiles,
          elevationFt: point.elevationFt,
        })),
      },
      training_start_date: trainingStartDate,
      target_date: targetDate,
      days_per_week: daysPerWeek,
      fitness_level: selectedFitnessLevel,
      treadmill_sessions_per_week: treadmillSessions,
      outdoor_hikes_per_week: outdoorHikes,
      strength_sessions_per_week: strengthSessions,
      treadmill_max_incline_percent: maxIncline,
      max_speed_mph: maxSpeed,
      include_strength: includeStrength,
      strength_on_cardio_days: strengthOnCardioDays,
      baseline_minutes: baselineMinutes,
      fill_active_recovery_days: fillActiveRecoveryDays,
      preferred_days: preferredDays,
      any_days: anyDays,
    };

    let output = null;
    if (useBackend) {
      try {
        const response = await fetch(`${apiBase}/plans/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Unable to generate plan.");
        }
        const data = await response.json();
        output = data.plan ?? null;
      } catch (err) {
        setError("Unable to generate plan from the backend.");
        return;
      }
    } else {
      output = buildTrainingPlan({
        hike: {
          distanceMiles: hike.distanceMiles,
          elevationGainFt: hike.elevationGainFt,
          profilePoints: hike.profilePoints,
        },
        fitnessLevel: selectedFitnessLevel,
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
    }

    if (trainingStartDate === toInputDate(new Date()) && new Date().getHours() >= 18) {
      setStartDateNote("Starting today schedules workouts immediately; consider “Start tomorrow”.");
    }

    if (output) {
      setPlan(output);
      if (!originalPlan) {
        setOriginalPlan(output);
      }
    }
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

  useEffect(() => {
    if (!plan || !isEditing) return;
    try {
      const payload = JSON.stringify({
        plan,
        originalPlan,
        history: editHistory,
        future: editFuture,
        changeLog,
      });
      window.localStorage.setItem(editStorageKey, payload);
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [plan, isEditing, originalPlan, editHistory, editFuture, changeLog, editStorageKey]);

  useEffect(() => {
    if (!plan || !planId || !isEditing) return;
    if (revisionSaveTimerRef.current) {
      window.clearTimeout(revisionSaveTimerRef.current);
    }
    revisionSaveTimerRef.current = window.setTimeout(() => {
      fetch(`/api/training-plans/${planId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: settingsPayload,
          weeks: plan.weeks,
          changeLog,
        }),
      }).catch(() => {
        // Ignore revision errors; local storage still keeps edits.
      });
    }, 800);
  }, [plan, planId, isEditing, settingsPayload, changeLog]);

  useEffect(() => {
    setTimelineWarningAcked(false);
    setCompressedWarningAcked(false);
  }, [trainingStartDate, targetDate, daysPerWeek]);

  const weeksUntilHike = trainingStartDate && targetDate
    ? Math.ceil(
        (new Date(targetDate).getTime() - new Date(trainingStartDate).getTime() + 24 * 60 * 60 * 1000) /
          (7 * 24 * 60 * 60 * 1000)
      )
    : 0;
  const minPrepWeeks = getMinPrepWeeks(hike.distanceMiles, hike.elevationGainFt);
  const suggestedTargetDate = trainingStartDate
    ? toInputDate(addDays(new Date(trainingStartDate), minPrepWeeks * 7))
    : null;
  const showAdequacyWarning = weeksUntilHike > 0 && weeksUntilHike < minPrepWeeks && !timelineWarningAcked;
  const showOvertrainingWarning = restDays < 1 || totalPlannedSessions > 5;
  const showAmbitiousDaysWarning =
    planMode === "custom" && daysPerWeek > 6 && !ambitiousDismissed;
  const showCompressedWarning = weeksUntilHike > 0 && daysPerWeek > weeksUntilHike && !compressedWarningAcked;
  const averageGradePct =
    hike.distanceMiles > 0
      ? (hike.elevationGainFt / (hike.distanceMiles * 5280)) * 100
      : 0;
  const showEquipmentLimitWarning =
    planMode === "custom" && maxIncline > 0 && averageGradePct > maxIncline;

  const warningTrackedRef = useRef<Record<string, boolean>>({});

  const trackPlanModeSelection = useCallback((mode: "quick" | "custom") => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("planModeSelected", { detail: { mode, hikeId: hike.id } })
    );
    console.info(`[analytics] plan mode selected: ${mode}`, { hikeId: hike.id });
  }, [hike.id]);

  const trackWarningShown = useCallback((type: string, detail?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("planWarningShown", { detail: { type, hikeId: hike.id, ...detail } })
    );
    console.info(`[analytics] plan warning: ${type}`, { hikeId: hike.id, ...detail });
  }, [hike.id]);

  useEffect(() => {
    if (showAdequacyWarning && !warningTrackedRef.current.adequacy) {
      warningTrackedRef.current.adequacy = true;
      trackWarningShown("timeline_misalignment", {
        weeksUntilHike,
        recommendedWeeks: minPrepWeeks,
        difficulty: hikeDifficulty,
      });
    }
  }, [showAdequacyWarning, weeksUntilHike, minPrepWeeks, hikeDifficulty, trackWarningShown]);

  useEffect(() => {
    if (showCompressedWarning && !warningTrackedRef.current.compressed) {
      warningTrackedRef.current.compressed = true;
      trackWarningShown("compressed_schedule", { weeksUntilHike, daysPerWeek });
    }
  }, [showCompressedWarning, weeksUntilHike, daysPerWeek, trackWarningShown]);

  useEffect(() => {
    if (showEquipmentLimitWarning && !warningTrackedRef.current.equipment) {
      warningTrackedRef.current.equipment = true;
      trackWarningShown("equipment_limit", {
        averageGradePct: Number(averageGradePct.toFixed(1)),
        maxIncline,
      });
    }
  }, [showEquipmentLimitWarning, averageGradePct, maxIncline, trackWarningShown]);

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

  const getQuickStartAllocation = useCallback((days: number) => {
    let cardio = 1;
    let strength = 0;
    if (days >= 5) {
      cardio = 3;
      strength = 2;
    } else if (days === 4) {
      cardio = 3;
      strength = 1;
    } else if (days === 3) {
      cardio = 2;
      strength = 1;
    } else if (days === 2) {
      cardio = 2;
      strength = 0;
    }
    const outdoor = cardio > 0 ? 1 : 0;
    const treadmill = Math.max(cardio - outdoor, 0);
    return { treadmill, outdoor, strength };
  }, []);

  const applyQuickStartDefaults = useCallback((nextDays: number) => {
    const allocation = getQuickStartAllocation(nextDays);
    setIncludeStrength(allocation.strength > 0);
    setStrengthSessions(allocation.strength);
    setStrengthOnCardioDays(false);
    setTreadmillTouched(true);
    setTreadmillSessions(allocation.treadmill);
    setOutdoorHikes(allocation.outdoor);
    setAnyDays(true);
    setPreferredDays([]);
    setBaselineMinutes(0);
    setFillActiveRecoveryDays(true);
    setSessionInvariantNote(null);
  }, [getQuickStartAllocation]);

  const normalizeInput = (value: string) => value.trim().toLowerCase();

  const parseDateInput = (value: string) => {
    const normalized = normalizeInput(value);
    if (!normalized) {
      return { ok: false, error: "Please enter a date." };
    }
    if (normalized === "today") {
      return { ok: true, value: toInputDate(new Date()) };
    }
    if (normalized === "tomorrow") {
      return { ok: true, value: toInputDate(addDays(new Date(), 1)) };
    }
    if (normalized === "next monday") {
      return { ok: true, value: toInputDate(getNextMonday(new Date())) };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return { ok: false, error: "Use YYYY-MM-DD or a shortcut like “next Monday”." };
    }
    const dateValue = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(dateValue.getTime())) {
      return { ok: false, error: "That date looks invalid." };
    }
    return { ok: true, value: normalized };
  };

  const parseNumberInput = (value: string, min: number, max: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return { ok: false, error: "Please enter a number." };
    }
    if (numeric < min || numeric > max) {
      return { ok: false, error: `Enter a value between ${min} and ${max}.` };
    }
    return { ok: true, value: numeric };
  };

  const parseYesNo = (value: string) => {
    const normalized = normalizeInput(value);
    if (["yes", "y", "true"].includes(normalized)) {
      return { ok: true, value: true };
    }
    if (["no", "n", "false"].includes(normalized)) {
      return { ok: true, value: false };
    }
    return { ok: false, error: "Please answer yes or no." };
  };

  const parseFitnessLevel = (value: string) => {
    const normalized = normalizeInput(value);
    if (normalized.startsWith("begin")) return { ok: true, value: "Beginner" as FitnessLevel };
    if (normalized.startsWith("inter")) return { ok: true, value: "Intermediate" as FitnessLevel };
    if (normalized.startsWith("adv") || normalized.startsWith("exp")) {
      return { ok: true, value: "Advanced" as FitnessLevel };
    }
    return { ok: false, error: "Choose Beginner, Intermediate, or Advanced." };
  };

  const parseTrainingFocus = (value: string) => {
    const normalized = normalizeInput(value);
    if (normalized.includes("cardio") && normalized.includes("strength")) {
      return { ok: true, value: true };
    }
    if (normalized.includes("cardio")) {
      return { ok: true, value: false };
    }
    return { ok: false, error: "Type “cardio only” or “cardio + strength”." };
  };

  const parsePreferredDaysInput = (value: string) => {
    const normalized = normalizeInput(value);
    if (!normalized || normalized === "any") {
      return { ok: true, anyDays: true, days: [] };
    }
    const tokens = normalized
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const selected = new Set<number>();
    tokens.forEach((token) => {
      const dayIndex = DAY_ALIASES.findIndex((alias) => alias.startsWith(token));
      if (dayIndex >= 0) {
        selected.add(dayIndex);
      }
    });
    if (selected.size === 0) {
      return { ok: false, error: "List days like Mon, Wed, Fri or type “any”." };
    }
    return { ok: true, anyDays: false, days: Array.from(selected).sort((a, b) => a - b) };
  };

  const getWizardPrefill = (id: WizardStepId) => {
    switch (id) {
      case "trainingStartDate":
        return trainingStartDate;
      case "targetDate":
        return targetDate;
      case "daysPerWeek":
        return String(daysPerWeek);
      case "fitnessLevel":
        return selectedFitnessLevel;
      case "baselineMinutes":
        return String(baselineMinutes);
      case "maxIncline":
        return String(maxIncline);
      case "maxSpeed":
        return String(maxSpeed);
      case "treadmillSessions":
        return String(treadmillSessions);
      case "outdoorHikes":
        return String(outdoorHikes);
      case "trainingFocus":
        return includeStrength ? "cardio + strength" : "cardio only";
      case "strengthSessions":
        return String(strengthSessions);
      case "strengthOnCardioDays":
        return strengthOnCardioDays ? "yes" : "no";
      case "fillActiveRecoveryDays":
        return fillActiveRecoveryDays ? "yes" : "no";
      case "preferredDays":
        return anyDays ? "any" : preferredDays.map((index) => DAY_LABELS[index]).join(", ");
      default:
        return "";
    }
  };

  const applyWizardAnswer = (id: WizardStepId, rawValue: string) => {
    switch (id) {
      case "trainingStartDate": {
        const parsed = parseDateInput(rawValue);
        if (!parsed.ok) return parsed;
        const parsedValue = parsed.value as string;
        if (targetDate) {
          const targetDateValue = targetDate as string;
          if (new Date(parsedValue) > new Date(targetDateValue)) {
            return { ok: false, error: "Start date must be before the target date." };
          }
        }
        setTrainingStartDate(parsedValue);
        return { ok: true };
      }
      case "targetDate": {
        const parsed = parseDateInput(rawValue);
        if (!parsed.ok) return parsed;
        const parsedValue = parsed.value as string;
        if (trainingStartDate) {
          const startDateValue = trainingStartDate as string;
          if (new Date(parsedValue) < new Date(startDateValue)) {
            return { ok: false, error: "Target date must be after the start date." };
          }
        }
        setTargetDate(parsedValue);
        return { ok: true };
      }
      case "daysPerWeek": {
        const maxDays = planMode === "quick" ? 6 : 7;
        const parsed = parseNumberInput(rawValue, 1, maxDays);
        if (!parsed.ok) return parsed;
        setDaysPerWeek(Math.round(parsed.value as number));
        return { ok: true };
      }
      case "fitnessLevel": {
        const parsed = parseFitnessLevel(rawValue);
        if (!parsed.ok) return parsed;
        setSelectedFitnessLevel(parsed.value as FitnessLevel);
        return { ok: true };
      }
      case "baselineMinutes": {
        const parsed = parseNumberInput(rawValue, 0, 2000);
        if (!parsed.ok) return parsed;
        setBaselineMinutes(Math.round(parsed.value as number));
        return { ok: true };
      }
      case "maxIncline": {
        const parsed = parseNumberInput(rawValue, 0, 20);
        if (!parsed.ok) return parsed;
        setMaxIncline(parsed.value as number);
        return { ok: true };
      }
      case "maxSpeed": {
        const parsed = parseNumberInput(rawValue, 1, 8);
        if (!parsed.ok) return parsed;
        setMaxSpeed(parsed.value as number);
        return { ok: true };
      }
      case "treadmillSessions": {
        const parsed = parseNumberInput(rawValue, 0, 7);
        if (!parsed.ok) return parsed;
        const nextValue = Math.round(parsed.value as number);
        const strengthLoad = includeStrength && !strengthOnCardioDays ? strengthSessions : 0;
        if (nextValue + outdoorHikes + strengthLoad > daysPerWeek) {
          return {
            ok: false,
            error: "Cardio + strength sessions cannot exceed training days.",
          };
        }
        if (nextValue + outdoorHikes === 0) {
          return { ok: false, error: "Choose at least 1 treadmill or outdoor session." };
        }
        setTreadmillTouched(true);
        setTreadmillSessions(nextValue);
        setSessionInvariantNote(null);
        return { ok: true };
      }
      case "outdoorHikes": {
        const parsed = parseNumberInput(rawValue, 0, 7);
        if (!parsed.ok) return parsed;
        const nextValue = Math.round(parsed.value as number);
        const strengthLoad = includeStrength && !strengthOnCardioDays ? strengthSessions : 0;
        if (nextValue + treadmillSessions + strengthLoad > daysPerWeek) {
          return {
            ok: false,
            error: "Cardio + strength sessions cannot exceed training days.",
          };
        }
        if (nextValue + treadmillSessions === 0) {
          return { ok: false, error: "Choose at least 1 treadmill or outdoor session." };
        }
        setOutdoorHikes(nextValue);
        setSessionInvariantNote(null);
        return { ok: true };
      }
      case "trainingFocus": {
        const parsed = parseTrainingFocus(rawValue);
        if (!parsed.ok) return parsed;
        setIncludeStrength(parsed.value as boolean);
        if (!parsed.value) {
          setStrengthSessions(0);
          setStrengthOnCardioDays(false);
        }
        return { ok: true };
      }
      case "strengthSessions": {
        const parsed = parseNumberInput(rawValue, 0, 7);
        if (!parsed.ok) return parsed;
        const nextValue = Math.round(parsed.value as number);
        if (!includeStrength && nextValue > 0) {
          return { ok: false, error: "Switch to cardio + strength to add strength sessions." };
        }
        const cardioLoad = treadmillSessions + outdoorHikes;
        const totalLoad = strengthOnCardioDays ? cardioLoad : cardioLoad + nextValue;
        if (totalLoad > daysPerWeek) {
          return { ok: false, error: "Sessions exceed your training days per week." };
        }
        if (strengthOnCardioDays && nextValue > cardioLoad) {
          return { ok: false, error: "Strength sessions must fit within cardio days." };
        }
        setStrengthSessions(nextValue);
        setSessionInvariantNote(null);
        return { ok: true };
      }
      case "strengthOnCardioDays": {
        const parsed = parseYesNo(rawValue);
        if (!parsed.ok) return parsed;
        const nextValue = parsed.value as boolean;
        setStrengthOnCardioDays(nextValue);
        return { ok: true };
      }
      case "fillActiveRecoveryDays": {
        const parsed = parseYesNo(rawValue);
        if (!parsed.ok) return parsed;
        setFillActiveRecoveryDays(parsed.value as boolean);
        return { ok: true };
      }
      case "preferredDays": {
        const parsed = parsePreferredDaysInput(rawValue);
        if (!parsed.ok) return parsed;
        const anyDays = parsed.anyDays as boolean;
        const days = (parsed.days || []) as number[];
        if (!anyDays && days.length > daysPerWeek) {
          return { ok: false, error: `Pick up to ${daysPerWeek} days.` };
        }
        setAnyDays(anyDays);
        setPreferredDays(days);
        setPreferredDayLimitNote(null);
        return { ok: true };
      }
      default:
        return { ok: true };
    }
  };

  useEffect(() => {
    const current = wizardSteps[wizardStep];
    if (!current) return;
    setWizardInput(getWizardPrefill(current.id));
    setWizardError(null);
    setWizardTouched(false);
  }, [
    wizardStep,
    wizardSteps,
    trainingStartDate,
    targetDate,
    daysPerWeek,
    selectedFitnessLevel,
    baselineMinutes,
    maxIncline,
    maxSpeed,
    treadmillSessions,
    outdoorHikes,
    includeStrength,
    strengthSessions,
    strengthOnCardioDays,
    fillActiveRecoveryDays,
    preferredDays,
    anyDays,
  ]);

  const handleSelectPlanMode = (mode: "quick" | "custom") => {
    setPlanMode(mode);
    trackPlanModeSelection(mode);
    if (mode === "quick") {
      const nextDays = Math.min(Math.max(recommendedDays, 1), 6);
      setDaysPerWeek(nextDays);
      applyQuickStartDefaults(nextDays);
    }
  };

  useEffect(() => {
    if (planMode === "quick") {
      applyQuickStartDefaults(daysPerWeek);
    }
  }, [planMode, daysPerWeek, applyQuickStartDefaults]);

  useEffect(() => {
    if (planMode) {
      setWizardStep(0);
    }
  }, [planMode]);

  const handleChangePlanMode = () => {
    setPlanMode(null);
    try {
      window.localStorage.removeItem(`planMode:${hike.id}`);
    } catch {
      // Ignore storage errors in restricted environments.
    }
  };

  const modeSelector = !planMode ? (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900">How would you like to create your plan?</h2>
        <p className="text-sm text-slate-600">Pick a quick-start flow or customize every detail.</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Quick-Start (Beginner)</h3>
          <p className="mt-2 text-xs text-slate-600">
            Choose training days/week and experience level. We’ll auto-generate a balanced cardio + strength plan.
          </p>
          <button
            type="button"
            onClick={() => handleSelectPlanMode("quick")}
            className="mt-4 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
          >
            Quick-Start
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-800">Custom Plan (Advanced)</h3>
          <p className="mt-2 text-xs text-slate-600">
            Configure treadmill sessions, outdoor hikes, strength, incline limits, and more.
          </p>
          <button
            type="button"
            onClick={() => handleSelectPlanMode("custom")}
            className="mt-4 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
          >
            Customize
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (!planMode) {
    return modeSelector;
  }

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

  const currentWizardStep = wizardSteps[wizardStep];
  const isReviewStep = currentWizardStep?.id === "review";

  const handleWizardNext = () => {
    if (!currentWizardStep || isReviewStep) return;
    const result = applyWizardAnswer(currentWizardStep.id, wizardInput);
    if (!result.ok) {
      setWizardError((result as { error?: string }).error ?? "Please check your answer.");
      setWizardTouched(true);
      return;
    }
    setWizardError(null);
    setWizardTouched(false);
    setWizardStep(Math.min(wizardStep + 1, wizardSteps.length - 1));
  };

  const handleWizardBack = () => {
    setWizardStep(Math.max(wizardStep - 1, 0));
  };

  const handleWizardJump = (stepId: WizardStepId) => {
    const index = wizardSteps.findIndex((step) => step.id === stepId);
    if (index >= 0) {
      setWizardStep(index);
    }
  };

  const reviewRows: { id: WizardStepId; label: string; value: string }[] = [
    {
      id: "trainingStartDate",
      label: "Start date",
      value: trainingStartDate,
    },
    {
      id: "targetDate",
      label: "Target date",
      value: targetDate,
    },
    {
      id: "daysPerWeek",
      label: "Training days/week",
      value: `${daysPerWeek} days`,
    },
    {
      id: "fitnessLevel",
      label: "Experience level",
      value: selectedFitnessLevel,
    },
    {
      id: "baselineMinutes",
      label: "Baseline minutes/week",
      value: `${baselineMinutes} min`,
    },
    {
      id: "maxIncline",
      label: "Max incline",
      value: `${maxIncline}%`,
    },
    {
      id: "maxSpeed",
      label: "Max speed",
      value: `${maxSpeed} mph`,
    },
    {
      id: "treadmillSessions",
      label: "Treadmill sessions",
      value: `${treadmillSessions}/week`,
    },
    {
      id: "outdoorHikes",
      label: "Outdoor hikes",
      value: `${outdoorHikes}/week`,
    },
    {
      id: "trainingFocus",
      label: "Training focus",
      value: includeStrength ? "Cardio + strength" : "Cardio only",
    },
    {
      id: "strengthSessions",
      label: "Strength sessions",
      value: includeStrength ? `${strengthSessions}/week` : "None",
    },
    {
      id: "strengthOnCardioDays",
      label: "Mix sessions",
      value: strengthOnCardioDays ? "Yes" : "No",
    },
    {
      id: "fillActiveRecoveryDays",
      label: "Fill unused days",
      value: fillActiveRecoveryDays ? "Active recovery" : "Rest days",
    },
    {
      id: "preferredDays",
      label: "Preferred days",
      value: anyDays ? "Any days" : preferredDays.map((index) => DAY_LABELS[index]).join(", "),
    },
  ];

  const handleUndoTrainingDays = () => {
    if (!autoAdjustedDays) return;
    setDaysPerWeek(autoAdjustedDays.from);
    setAutoAdjustedDays(null);
    setAmbitiousDismissed(false);
  };

  const pushEditState = (nextPlan: TrainingPlanOutput, action: string, detail?: string) => {
    if (!plan) return;
    setEditHistory((prev) => [plan, ...prev].slice(0, 50));
    setEditFuture([]);
    setPlan(nextPlan);
    setIsEditing(true);
    setEditWarnings(validateEditedPlan(nextPlan));
    setChangeLog((prev) => [
      { id: cryptoRandomId(), action, detail, timestamp: new Date().toISOString() },
      ...prev,
    ].slice(0, 50));
  };

  const handleUndoEdit = () => {
    setEditHistory((prev) => {
      if (prev.length === 0 || !plan) return prev;
      const [next, ...rest] = prev;
      setEditFuture((future) => [plan, ...future]);
      setPlan(next);
      setEditWarnings(validateEditedPlan(next));
      return rest;
    });
  };

  const handleRedoEdit = () => {
    setEditFuture((prev) => {
      if (prev.length === 0 || !plan) return prev;
      const [next, ...rest] = prev;
      setEditHistory((history) => [plan, ...history].slice(0, 50));
      setPlan(next);
      setEditWarnings(validateEditedPlan(next));
      return rest;
    });
  };

  const handleResetPlan = () => {
    if (!originalPlan) return;
    const confirmed = window.confirm("Reset plan to the original version?");
    if (!confirmed) return;
    setPlan(originalPlan);
    setEditHistory([]);
    setEditFuture([]);
    setEditWarnings(validateEditedPlan(originalPlan));
    setChangeLog((prev) => [
      { id: cryptoRandomId(), action: "reset", timestamp: new Date().toISOString() },
      ...prev,
    ].slice(0, 50));
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    weekIndex: number,
    dayIndex: number,
    workoutIndex: number
  ) => {
    if (!isEditing) return;
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ weekIndex, dayIndex, workoutIndex })
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDropWorkout = (
    event: DragEvent<HTMLDetailsElement>,
    targetWeekIndex: number,
    targetDayIndex: number
  ) => {
    if (!plan) return;
    const payload = event.dataTransfer.getData("text/plain");
    if (!payload) return;
    const parsed = JSON.parse(payload) as {
      weekIndex: number;
      dayIndex: number;
      workoutIndex: number;
    };
    if (Math.abs(targetWeekIndex - parsed.weekIndex) > 1) {
      setError("You can only move a session within the same or adjacent week.");
      return;
    }
    if (parsed.weekIndex === targetWeekIndex && parsed.dayIndex === targetDayIndex) {
      return;
    }
    const nextPlan = clonePlan(plan);
    const sourceDay = nextPlan.weeks[parsed.weekIndex]?.days[parsed.dayIndex];
    const targetDay = nextPlan.weeks[targetWeekIndex]?.days[targetDayIndex];
    if (!sourceDay || !targetDay) return;
    const moved = sourceDay.workouts.splice(parsed.workoutIndex, 1)[0];
    if (!moved) return;
    const moveCategory = getWorkoutCategory(moved.type);
    const targetCategories = targetDay.workouts.map((workout) => getWorkoutCategory(workout.type));

    if (moveCategory === "cardio" && targetCategories.includes("cardio")) {
      setError("Only one cardio session per day is allowed.");
      sourceDay.workouts.splice(parsed.workoutIndex, 0, moved);
      return;
    }
    if (moveCategory === "strength" && targetCategories.includes("strength")) {
      setError("Only one strength session per day is allowed.");
      sourceDay.workouts.splice(parsed.workoutIndex, 0, moved);
      return;
    }
    if (moveCategory === "recovery" && targetCategories.length > 0) {
      setError("Active recovery should replace a rest day, not stack with workouts.");
      sourceDay.workouts.splice(parsed.workoutIndex, 0, moved);
      return;
    }
    if (moveCategory === "rest" && targetCategories.length > 0) {
      setError("Rest days should replace a workout day.");
      sourceDay.workouts.splice(parsed.workoutIndex, 0, moved);
      return;
    }

    if (targetCategories.length === 1 && (targetCategories[0] === "rest" || targetCategories[0] === "recovery")) {
      targetDay.workouts = [];
    }

    if (moveCategory === "strength") {
      targetDay.workouts.unshift(moved);
    } else {
      targetDay.workouts.push(moved);
    }
    targetDay.workouts = orderDayWorkouts(targetDay.workouts);

    if (sourceDay.workouts.length === 0) {
      sourceDay.workouts.push(createFallbackWorkout(fillActiveRecoveryDays));
    }

    const recalculated = recalculatePlan(nextPlan);
    const hasConsecutive = hasConsecutiveStrengthDays(recalculated.weeks[parsed.weekIndex]) ||
      hasConsecutiveStrengthDays(recalculated.weeks[targetWeekIndex]);
    if (hasConsecutive) {
      const confirmed = window.confirm(
        "This move makes strength sessions consecutive. Proceed anyway?"
      );
      if (!confirmed) {
        setError("Move canceled to avoid consecutive strength days.");
        return;
      }
    }

    pushEditState(recalculated, "move", "Moved a session via drag and drop.");
  };

  const handleSwapType = (nextType: "cardio" | "strength") => {
    if (!swapTarget || !plan) return;
    const nextPlan = clonePlan(plan);
    const workout = nextPlan.weeks[swapTarget.weekIndex]?.days[swapTarget.dayIndex]?.workouts[
      swapTarget.workoutIndex
    ];
    if (!workout) return;

    const week = nextPlan.weeks[swapTarget.weekIndex];
    const nextWorkout = swapWorkoutType(workout, nextType, week.totalMinutes, selectedFitnessLevel);
    const { cardioCount, strengthCount } = getWeekCounts(week);
    const adjustedCardio = nextType === "cardio" ? cardioCount + 1 - (getWorkoutCategory(workout.type) === "cardio" ? 1 : 0) : cardioCount - (getWorkoutCategory(workout.type) === "cardio" ? 1 : 0);
    const adjustedStrength = nextType === "strength" ? strengthCount + 1 - (getWorkoutCategory(workout.type) === "strength" ? 1 : 0) : strengthCount - (getWorkoutCategory(workout.type) === "strength" ? 1 : 0);

    if (planMode === "custom") {
      if (adjustedCardio > totalCardio || adjustedStrength > totalStrength) {
        const confirmed = window.confirm(
          "This swap exceeds your weekly session targets. Proceed anyway?"
        );
        if (!confirmed) {
          setSwapTarget(null);
          return;
        }
      }
    } else if (adjustedCardio === 0) {
      const confirmed = window.confirm("This removes all cardio from the week. Proceed anyway?");
      if (!confirmed) {
        setSwapTarget(null);
        return;
      }
    }

    const day = nextPlan.weeks[swapTarget.weekIndex].days[swapTarget.dayIndex];
    day.workouts[swapTarget.workoutIndex] = nextWorkout;
    day.workouts = orderDayWorkouts(day.workouts);
    const recalculated = recalculatePlan(nextPlan);
    pushEditState(recalculated, "swap", `Swapped to ${nextType}.`);
    setSwapTarget(null);
  };

  const handleDurationChange = (
    weekIndex: number,
    dayIndex: number,
    workoutIndex: number,
    nextMinutes: number
  ) => {
    if (!plan) return;
    const nextPlan = clonePlan(plan);
    const workout = nextPlan.weeks[weekIndex]?.days[dayIndex]?.workouts[workoutIndex];
    if (!workout) return;
    const bounds = getDurationBounds(workout.type, selectedFitnessLevel);
    const clamped = Math.min(Math.max(nextMinutes, bounds.min), bounds.max);
    const previous = workout.durationMinutes;
    const delta = previous > 0 ? Math.abs(clamped - previous) / previous : 0;
    if (delta > 0.25) {
      const confirmed = window.confirm(
        "This change exceeds 25% of the original duration. Proceed anyway?"
      );
      if (!confirmed) {
        return;
      }
    }
    workout.durationMinutes = clamped;
    workout.notes = workout.notes ? `${workout.notes} (Edited duration)` : "Edited duration.";
    applyDurationAdjustment(nextPlan, weekIndex, workout.type, previous, clamped, selectedFitnessLevel);
    const recalculated = recalculatePlan(nextPlan);
    pushEditState(recalculated, "duration", `Adjusted duration to ${clamped} min.`);
  };

  const handleConvertWorkout = (
    weekIndex: number,
    dayIndex: number,
    workoutIndex: number,
    target: "rest" | "recovery"
  ) => {
    if (!plan) return;
    const nextPlan = clonePlan(plan);
    const day = nextPlan.weeks[weekIndex]?.days[dayIndex];
    if (!day) return;
    day.workouts[workoutIndex] = createRecoveryOrRest(target);
    day.workouts = orderDayWorkouts(day.workouts);
    const recalculated = recalculatePlan(nextPlan);
    pushEditState(recalculated, "convert", `Converted to ${target}.`);
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

      const data = (await response.json()) as { id?: string };
      if (data?.id) {
        setPlanId(data.id);
        try {
          window.localStorage.setItem(planIdStorageKey, data.id);
        } catch {
          // Ignore storage errors in restricted environments.
        }
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span>
          Plan mode: {planMode === "quick" ? "Quick-Start (Beginner)" : "Custom Plan (Advanced)"}
        </span>
        <button
          type="button"
          onClick={handleChangePlanMode}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
        >
          Change mode
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {visiblePlan ? (
          <div className="space-y-3">
            <div className="font-semibold">
              {visiblePlan.totalWeeks} weeks starting {formatDate(trainingStartDate)} •{" "}
              {visiblePlan.summary.daysPerWeek} days/week • {summaryCounts.cardio} cardio •{" "}
              {summaryCounts.strength > 0 ? `${summaryCounts.strength} strength • ` : ""}{" "}
              {summaryCounts.activeRecovery > 0
                ? `${summaryCounts.activeRecovery} active recovery • `
                : ""}
              {summaryCounts.rest > 0 ? `${summaryCounts.rest} rest • ` : ""}~
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

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
              Guided setup
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">
              Step {wizardStep + 1} of {wizardSteps.length}
            </h3>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {currentWizardStep?.title ?? "Plan setup"}
          </div>
        </div>

        {!isReviewStep && currentWizardStep ? (
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{currentWizardStep.title}</p>
              {currentWizardStep.helper ? (
                <p className="mt-1 text-xs text-slate-500">{currentWizardStep.helper}</p>
              ) : null}
            </div>
            <input
              type="text"
              value={wizardInput}
              onChange={(event) => {
                setWizardInput(event.target.value);
                setWizardTouched(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleWizardNext();
                }
              }}
              placeholder={currentWizardStep.placeholder}
              className={`w-full rounded-xl border px-4 py-3 text-sm shadow-sm focus:outline-none ${
                wizardError && wizardTouched
                  ? "border-rose-300 focus:border-rose-400"
                  : "border-slate-200 focus:border-emerald-400"
              }`}
            />
            {currentWizardStep.presets ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {currentWizardStep.presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setWizardInput(preset);
                      setWizardTouched(true);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:border-slate-300"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            ) : null}
            {wizardError && wizardTouched ? (
              <p className="text-xs text-rose-700">{wizardError}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Confirm your inputs</p>
            <div className="grid gap-3 md:grid-cols-2">
              {reviewRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-700">{row.label}</p>
                    <p className="text-slate-600">{row.value || "Not set"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleWizardJump(row.id)}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600 hover:border-slate-300"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
            {Object.keys(liveErrors).length > 0 ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                Some inputs still need attention. Review the highlighted fields before generating.
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleWizardBack}
            disabled={wizardStep === 0}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {!isReviewStep ? (
              <button
                type="button"
                onClick={handleWizardNext}
                className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white"
              >
                {wizardStep === wizardSteps.length - 2 ? "Review" : "Next"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white"
              >
                Generate plan
              </button>
            )}
          </div>
        </div>
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
          There are only {weeksUntilHike} weeks until your hike. Most people need at least {minPrepWeeks} weeks to
          prepare for a {hikeDifficulty} hike. Consider a later date (earliest suggested:{" "}
          {suggestedTargetDate ?? "later"}) or an easier hike.
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTimelineWarningAcked(true);
                trackWarningShown("timeline_acknowledged", { weeksUntilHike, minPrepWeeks });
              }}
              className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
            >
              Proceed anyway
            </button>
          </div>
        </div>
      ) : null}
      {showCompressedWarning ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Training {daysPerWeek} days/week with only {weeksUntilHike} weeks left is aggressive. Consider reducing
          sessions or extending the training window.
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCompressedWarningAcked(true);
                trackWarningShown("compressed_acknowledged", { weeksUntilHike, daysPerWeek });
              }}
              className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
            >
              Proceed anyway
            </button>
          </div>
        </div>
      ) : null}
      {showEquipmentLimitWarning ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This hike averages about {averageGradePct.toFixed(1)}% grade, which exceeds your treadmill limit of{" "}
          {maxIncline}%. The plan will cap inclines to your max.
        </div>
      ) : null}
      {showAmbitiousDaysWarning ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {daysPerWeek} training days/week is ambitious and leaves little recovery time.
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
              Keep {daysPerWeek} days
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
              {plan.totalWeeks} weeks • {plan.summary.daysPerWeek} days/week • {summaryCounts.cardio} cardio •{" "}
              {summaryCounts.strength > 0 ? `${summaryCounts.strength} strength • ` : ""}{" "}
              {summaryCounts.activeRecovery > 0
                ? `${summaryCounts.activeRecovery} active recovery • `
                : ""}
              {summaryCounts.rest > 0 ? `${summaryCounts.rest} rest • ` : ""}~
              {plan.summary.averageWeeklyMinutes} min/week
            </div>
            {plan.warnings.map((warning, index) => (
              <p key={`${index}-${warning}`} className="mt-1 text-xs text-emerald-800">
                {warning}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                if (!originalPlan && plan) {
                  setOriginalPlan(plan);
                }
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:border-slate-300"
            >
              {isEditing ? "Editing enabled" : "Edit plan"}
            </button>
            <button
              type="button"
              onClick={handleUndoEdit}
              disabled={editHistory.length === 0}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleRedoEdit}
              disabled={editFuture.length === 0}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Redo
            </button>
            <button
              type="button"
              onClick={handleResetPlan}
              disabled={!originalPlan}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Reset plan
            </button>
            <button
              type="button"
              onClick={() => plan && setEditWarnings(validateEditedPlan(plan))}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:border-slate-300"
            >
              Check plan health
            </button>
          </div>
          {editWarnings.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <p className="font-semibold">Plan checks</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {editWarnings.map((warning, index) => (
                  <li key={`${index}-${warning}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

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
                {plan.weeks.map((week, weekIndex) => (
                  <tr key={week.weekNumber} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold text-slate-700">Week {week.weekNumber}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {week.startDate} – {week.endDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {week.days.map((day, dayIndex) => (
                          <details
                            key={day.date}
                            className="rounded-lg border border-slate-200 bg-white p-2"
                            onDragOver={(event) => {
                              if (!isEditing) return;
                              event.preventDefault();
                            }}
                            onDrop={(event) => {
                              if (!isEditing) return;
                              event.preventDefault();
                              handleDropWorkout(event, weekIndex, dayIndex);
                            }}
                          >
                            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                              {day.dayName}: {day.workouts[0].type}
                              {day.workouts.length > 1 ? ` +${day.workouts.length - 1}` : ""} (
                              {formatMinutes(
                                day.workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0)
                              )}{" "}
                              min)
                            </summary>
                            <div className="mt-2 space-y-2 text-xs text-slate-600">
                              {day.workouts.map((workout, workoutIndex) => (
                                <div
                                  key={`${day.date}-${workout.id}`}
                                  className="space-y-1"
                                  draggable={isEditing}
                                  onDragStart={(event) =>
                                    handleDragStart(event, weekIndex, dayIndex, workoutIndex)
                                  }
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-700">
                                      {workout.type} ({formatMinutes(workout.durationMinutes)} min)
                                    </p>
                                    {isEditing ? (
                                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSwapTarget({ weekIndex, dayIndex, workoutIndex })
                                          }
                                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:border-slate-300"
                                        >
                                          Swap type
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleConvertWorkout(weekIndex, dayIndex, workoutIndex, "rest")
                                          }
                                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:border-slate-300"
                                        >
                                          Convert to rest
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleConvertWorkout(
                                              weekIndex,
                                              dayIndex,
                                              workoutIndex,
                                              "recovery"
                                            )
                                          }
                                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:border-slate-300"
                                        >
                                          Convert to active recovery
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                  {isEditing ? (
                                    <label className="flex items-center gap-2 text-[11px] text-slate-500">
                                      Duration
                                      <input
                                        type="number"
                                        min={5}
                                        max={180}
                                        value={workout.durationMinutes}
                                        onChange={(event) =>
                                          handleDurationChange(
                                            weekIndex,
                                            dayIndex,
                                            workoutIndex,
                                            Number(event.target.value)
                                          )
                                        }
                                        className="w-16 rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-700"
                                      />
                                      min
                                    </label>
                                  ) : null}
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
          {swapTarget ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <h3 className="text-sm font-semibold text-slate-800">Swap session type</h3>
                <p className="mt-2 text-xs text-slate-600">
                  Replace this workout with another type. Weekly balance checks will apply.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwapType("cardio")}
                    className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Replace with Cardio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwapType("strength")}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
                  >
                    Replace with Strength
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwapTarget(null)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 hover:border-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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

function getHikeDifficulty(distanceMiles: number, elevationGainFt: number) {
  if (distanceMiles < 5 && elevationGainFt < 1000) return "easy";
  if (distanceMiles <= 8 || elevationGainFt <= 2000) return "moderate";
  return "strenuous";
}

function getRecommendedDaysByDifficulty(difficulty: string) {
  if (difficulty === "easy") return 3;
  if (difficulty === "moderate") return 4;
  return 5;
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function clonePlan(plan: TrainingPlanOutput): TrainingPlanOutput {
  return JSON.parse(JSON.stringify(plan)) as TrainingPlanOutput;
}

function planFromWeeks(planData: PlanSummarySource, weeks: TrainingPlanOutput["weeks"]) {
  const daysPerWeek = planData.settings?.daysPerWeek ?? weeks[0]?.days?.length ?? 0;
  const preferredDays = planData.settings?.preferredDays ?? [];
  const totalMinutes = weeks.reduce((sum, week) => sum + week.totalMinutes, 0);
  return {
    totalWeeks: weeks.length,
    warnings: [],
    summary: {
      daysPerWeek,
      preferredDays,
      averageWeeklyMinutes: Math.round(totalMinutes / Math.max(weeks.length, 1)),
    },
    weeks,
  };
}

function getWorkoutCategory(type: string) {
  if (type.includes("Treadmill") || type.includes("Zone 2") || type === "Outdoor long hike") {
    return "cardio";
  }
  if (type === "Strength") return "strength";
  if (type === "Recovery / mobility") return "recovery";
  if (type === "Rest day") return "rest";
  return "other";
}

function orderDayWorkouts(workouts: TrainingPlanOutput["weeks"][number]["days"][number]["workouts"]) {
  const strength = workouts.filter((workout) => getWorkoutCategory(workout.type) === "strength");
  const cardio = workouts.filter((workout) => getWorkoutCategory(workout.type) === "cardio");
  const rest = workouts.filter((workout) => getWorkoutCategory(workout.type) === "rest");
  const recovery = workouts.filter((workout) => getWorkoutCategory(workout.type) === "recovery");
  const other = workouts.filter((workout) => getWorkoutCategory(workout.type) === "other");
  return [...strength, ...cardio, ...recovery, ...rest, ...other];
}

function createFallbackWorkout(fillActiveRecoveryDays: boolean) {
  return fillActiveRecoveryDays
    ? createRecoveryOrRest("recovery")
    : createRecoveryOrRest("rest");
}

function createRecoveryOrRest(type: "recovery" | "rest"): TrainingWorkout {
  if (type === "rest") {
    return {
      id: cryptoRandomId(),
      type: "Rest day" as const,
      durationMinutes: 0,
      notes: "Rest day.",
    };
  }
  return {
    id: cryptoRandomId(),
    type: "Recovery / mobility" as const,
    durationMinutes: 25,
    notes: "Active recovery: 30–60% max HR. Mobility, stretching, easy walk.",
  };
}

function hasConsecutiveStrengthDays(week: TrainingPlanOutput["weeks"][number]) {
  for (let i = 0; i < week.days.length - 1; i += 1) {
    const current = week.days[i].workouts.some((workout) => workout.type === "Strength");
    const next = week.days[i + 1].workouts.some((workout) => workout.type === "Strength");
    if (current && next) return true;
  }
  return false;
}

function recalculatePlan(plan: TrainingPlanOutput): TrainingPlanOutput {
  const weeks = plan.weeks.map((week) => {
    const totalMinutes = week.days.reduce(
      (sum, day) =>
        sum + day.workouts.reduce((daySum, workout) => daySum + workout.durationMinutes, 0),
      0
    );
    return { ...week, totalMinutes };
  });
  const totalMinutes = weeks.reduce((sum, week) => sum + week.totalMinutes, 0);
  return {
    ...plan,
    weeks,
    summary: {
      ...plan.summary,
      averageWeeklyMinutes: Math.round(totalMinutes / Math.max(weeks.length, 1)),
    },
  };
}

function getPlanCounts(plan: TrainingPlanOutput) {
  let cardio = 0;
  let strength = 0;
  let activeRecovery = 0;
  let rest = 0;
  plan.weeks.forEach((week) => {
    week.days.forEach((day) => {
      const categories = day.workouts.map((workout) => getWorkoutCategory(workout.type));
      if (categories.includes("cardio")) cardio += 1;
      if (categories.includes("strength")) strength += 1;
      if (categories.includes("recovery")) activeRecovery += 1;
      if (categories.includes("rest")) rest += 1;
    });
  });
  const divisor = Math.max(plan.weeks.length, 1);
  return {
    cardio: Math.round(cardio / divisor),
    strength: Math.round(strength / divisor),
    activeRecovery: Math.round(activeRecovery / divisor),
    rest: Math.round(rest / divisor),
  };
}

function getWeekCounts(week: TrainingPlanOutput["weeks"][number]) {
  let cardioCount = 0;
  let strengthCount = 0;
  week.days.forEach((day) => {
    if (day.workouts.some((workout) => getWorkoutCategory(workout.type) === "cardio")) {
      cardioCount += 1;
    }
    if (day.workouts.some((workout) => getWorkoutCategory(workout.type) === "strength")) {
      strengthCount += 1;
    }
  });
  return { cardioCount, strengthCount };
}

function swapWorkoutType(
  workout: TrainingPlanOutput["weeks"][number]["days"][number]["workouts"][number],
  nextType: "cardio" | "strength",
  weekMinutes: number,
  fitnessLevel: FitnessLevel
): TrainingWorkout {
  if (nextType === "strength") {
    return {
      ...workout,
      type: "Strength" as const,
      durationMinutes: getDefaultDuration("strength", weekMinutes, fitnessLevel),
      notes: "Edited: swapped to strength. Intensity: moderate.",
    };
  }
  return {
    ...workout,
    type: "Zone 2 incline walk" as const,
    durationMinutes: getDefaultDuration("cardio", weekMinutes, fitnessLevel),
    notes: "Edited: swapped to cardio. Keep effort steady.",
  };
}

function getDefaultDuration(
  type: "cardio" | "strength",
  weekMinutes: number,
  fitnessLevel: FitnessLevel
) {
  const base = Math.max(20, Math.round(weekMinutes * (type === "cardio" ? 0.25 : 0.15)));
  const max = {
    Beginner: 60,
    Intermediate: 75,
    Advanced: 90,
  }[fitnessLevel];
  return Math.min(base, max);
}

function getDurationBounds(type: string, fitnessLevel: FitnessLevel) {
  const isCardio = getWorkoutCategory(type) === "cardio";
  const min = isCardio ? 15 : 20;
  const max = {
    Beginner: 90,
    Intermediate: 120,
    Advanced: 150,
  }[fitnessLevel];
  return { min, max };
}

function applyDurationAdjustment(
  plan: TrainingPlanOutput,
  weekIndex: number,
  workoutType: string,
  previous: number,
  next: number,
  fitnessLevel: FitnessLevel
) {
  if (previous <= 0) return;
  const ratio = next / previous;
  if (ratio === 1) return;
  for (let i = weekIndex + 1; i < plan.weeks.length; i += 1) {
    const week = plan.weeks[i];
    const workout = week.days.flatMap((day) => day.workouts).find((entry) => entry.type === workoutType);
    if (!workout) continue;
    const bounds = getDurationBounds(workout.type, fitnessLevel);
    const adjusted = Math.min(Math.max(Math.round(workout.durationMinutes * ratio), bounds.min), bounds.max);
    workout.durationMinutes = adjusted;
    workout.notes = workout.notes ? `${workout.notes} (Adjusted for progression)` : "Adjusted for progression.";
  }
}

function validateEditedPlan(plan: TrainingPlanOutput) {
  const warnings: string[] = [];
  for (let i = 0; i < plan.weeks.length; i += 1) {
    const week = plan.weeks[i];
    const recoveryCount = week.days.filter((day) =>
      day.workouts.some((workout) => {
        const category = getWorkoutCategory(workout.type);
        return category === "recovery" || category === "rest";
      })
    ).length;
    if (hasConsecutiveStrengthDays(week)) {
      warnings.push(`Week ${week.weekNumber}: strength sessions are consecutive.`);
    }
    const { cardioCount } = getWeekCounts(week);
    if (cardioCount === 0) {
      warnings.push(`Week ${week.weekNumber}: no cardio sessions scheduled.`);
    }
    if (recoveryCount > 2) {
      warnings.push(`Week ${week.weekNumber}: more than two recovery/rest days may slow progress.`);
    }
    if (i > 0) {
      const prev = plan.weeks[i - 1];
      const prevMinutes = prev.totalMinutes || 1;
      const change = (week.totalMinutes - prevMinutes) / prevMinutes;
      if (change > 0.1) {
        warnings.push(`Week ${week.weekNumber}: weekly volume increases more than 10%.`);
      }
    }
  }
  if (plan.weeks.length > 1) {
    const last = plan.weeks[plan.weeks.length - 1];
    const prev = plan.weeks[plan.weeks.length - 2];
    if (last.totalMinutes >= prev.totalMinutes) {
      warnings.push("Final week should taper with lower volume.");
    }
  }
  return warnings;
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
