from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Literal, Optional, Tuple


FitnessLevel = Literal["Beginner", "Intermediate", "Advanced"]
WorkoutType = Literal[
    "Treadmill intervals",
    "Zone 2 incline walk",
    "Strength",
    "Outdoor long hike",
    "Recovery / mobility",
    "Rest day",
]


@dataclass
class ProfilePoint:
    distance_miles: float
    elevation_ft: float


@dataclass
class PlanSegment:
    segment: int
    minutes: float
    incline_percent: float
    speed_mph: float
    notes: str


def build_training_plan(payload: dict, hike: dict) -> dict:
    inputs = _build_inputs(payload, hike)
    return _build_plan(inputs)


def _build_inputs(payload: dict, hike: dict) -> dict:
    profile = [
        ProfilePoint(distance_miles=p["distanceMiles"], elevation_ft=p["elevationFt"])
        for p in hike.get("profile_points", []) or []
    ]
    return {
        "hike": {
            "distance_miles": hike["distance_miles"],
            "elevation_gain_ft": hike["elevation_gain_ft"],
            "profile_points": profile,
        },
        "fitness_level": payload["fitness_level"],
        "training_start_date": payload["training_start_date"],
        "target_date": payload["target_date"],
        "days_per_week": payload["days_per_week"],
        "preferred_days": payload.get("preferred_days", []),
        "any_days": payload.get("any_days", True),
        "baseline_minutes": payload.get("baseline_minutes", 30),
        "constraints": {
            "treadmill_max_incline_percent": payload["treadmill_max_incline_percent"],
            "treadmill_sessions_per_week": payload["treadmill_sessions_per_week"],
            "outdoor_hikes_per_week": payload["outdoor_hikes_per_week"],
            "max_speed_mph": payload["max_speed_mph"],
        },
        "strength_sessions_per_week": payload["strength_sessions_per_week"],
        "include_strength": payload.get("include_strength", True),
        "strength_on_cardio_days": payload.get("strength_on_cardio_days", False),
        "fill_active_recovery_days": payload.get("fill_active_recovery_days", False),
    }


def _build_plan(inputs: dict) -> dict:
    start_date = _to_start_of_day(_parse_local_date(inputs["training_start_date"]))
    target_date = _to_start_of_day(_parse_local_date(inputs["target_date"]))
    total_weeks = max(1, ((target_date - start_date).days + 1 + 6) // 7)
    warnings: List[str] = []

    if total_weeks < 2:
        warnings.append(
            "Less than two weeks to your target date. Keep sessions short and stay fresh."
        )

    hike_demands = _derive_hike_demands(inputs["hike"])
    min_prep_weeks = _get_min_prep_weeks(
        inputs["hike"]["distance_miles"], inputs["hike"]["elevation_gain_ft"]
    )
    if total_weeks < min_prep_weeks:
        warnings.append(
            f"This hike typically requires at least {min_prep_weeks} weeks of preparation. "
            "Your plan may not fully prepare you."
        )

    if (
        inputs["baseline_minutes"] <= 30
        and inputs["constraints"]["treadmill_sessions_per_week"]
        + inputs["constraints"]["outdoor_hikes_per_week"]
        >= inputs["days_per_week"]
    ):
        warnings.append("Ambitious plan: recommended only if you already train consistently.")

    peak_targets = _build_peak_targets(hike_demands, total_weeks)
    adjusted_baseline = round(inputs["baseline_minutes"])
    adjusted_weekly_target = round(peak_targets["weekly_volume_target"])
    week_volumes = _build_weekly_volumes(adjusted_baseline, total_weeks, adjusted_weekly_target)
    picked_days = _pick_training_days(
        inputs["days_per_week"], inputs["preferred_days"], inputs["any_days"]
    )
    average_weekly_minutes = sum(week_volumes) / max(len(week_volumes), 1)

    last_long_hike_minutes = round(adjusted_baseline * 0.4)
    peak_week_index = max(total_weeks - 2, 0) if total_weeks > 1 else 0
    weeks = []

    for index, week_volume in enumerate(week_volumes):
        week_start = start_date + timedelta(days=index * 7)
        week_end = week_start + timedelta(days=6)
        is_adaptation_week = inputs["baseline_minutes"] <= 30 and index < 2
        week_note_text = _week_notes(is_adaptation_week, index + 1, total_weeks)
        week_focus = _week_focus_line(is_adaptation_week, index + 1, total_weeks)
        effective_days_per_week = inputs["days_per_week"]

        sessions = _enforce_session_invariant(
            days_per_week=effective_days_per_week,
            treadmill_sessions_per_week=inputs["constraints"]["treadmill_sessions_per_week"],
            outdoor_hikes_per_week=inputs["constraints"]["outdoor_hikes_per_week"],
            strength_sessions_per_week=inputs["strength_sessions_per_week"]
            if inputs["include_strength"]
            else 0,
            strength_on_cardio_days=inputs["strength_on_cardio_days"],
        )

        if (
            sessions["treadmill_sessions_per_week"]
            != inputs["constraints"]["treadmill_sessions_per_week"]
            or sessions["outdoor_hikes_per_week"]
            != inputs["constraints"]["outdoor_hikes_per_week"]
            or sessions["strength_sessions_per_week"]
            != (
                inputs["strength_sessions_per_week"] if inputs["include_strength"] else 0
            )
        ):
            warnings.append("Cardio + strength sessions cannot exceed training days.")

        weeks_until_event = total_weeks - (index + 1)
        is_event_prep_week = weeks_until_event <= 1
        strength_phase = _get_strength_phase(is_adaptation_week, index + 1, total_weeks)
        workouts_for_week = _build_week_workouts(
            week_number=index + 1,
            total_weeks=total_weeks,
            week_volume=week_volume,
            days_per_week=inputs["days_per_week"],
            treadmill_sessions_per_week=sessions["treadmill_sessions_per_week"],
            outdoor_hikes_per_week=sessions["outdoor_hikes_per_week"],
            strength_sessions_per_week=sessions["strength_sessions_per_week"],
            include_strength=inputs["include_strength"],
            strength_on_cardio_days=inputs["strength_on_cardio_days"],
            is_event_prep_week=is_event_prep_week,
            fill_active_recovery_days=inputs["fill_active_recovery_days"],
        )

        long_session_target = _build_long_session_target(
            baseline_minutes=inputs["baseline_minutes"],
            peak_long_target=peak_targets["long_session_target"],
            week_number=index + 1,
            total_weeks=total_weeks,
            is_adaptation_week=is_adaptation_week,
        )
        week_incline_cap = _build_week_incline_cap(
            peak_incline_target=peak_targets["sustained_incline_target"],
            week_number=index + 1,
            total_weeks=total_weeks,
            is_adaptation_week=is_adaptation_week,
            max_incline=inputs["constraints"]["treadmill_max_incline_percent"],
        )
        adjusted_incline_cap = _clamp(
            week_incline_cap,
            0,
            inputs["constraints"]["treadmill_max_incline_percent"],
        )

        required_sessions = (
            sessions["treadmill_sessions_per_week"]
            + sessions["outdoor_hikes_per_week"]
            + (
                sessions["strength_sessions_per_week"]
                if inputs["include_strength"] and not inputs["strength_on_cardio_days"]
                else 0
            )
        )
        scheduled_days = _schedule_week_days(
            week_start=week_start,
            week_end=week_end,
            days_per_week=effective_days_per_week,
            preferred_days=inputs["preferred_days"],
            any_days=inputs["any_days"],
            required_sessions=required_sessions,
        )
        if scheduled_days.get("warning"):
            warnings.append(scheduled_days["warning"])

        days = []
        for position, day_date in enumerate(scheduled_days["days"]):
            workout_type = (
                workouts_for_week[position] if position < len(workouts_for_week) else "Rest day"
            )
            is_long_session = workout_type == "Outdoor long hike" or (
                workout_type == "Zone 2 incline walk"
                and sessions["outdoor_hikes_per_week"] == 0
                and position == 0
            )
            workout = _build_workout(
                week_number=index + 1,
                workout_type=workout_type,
                week_volume=week_volume,
                fitness_level=inputs["fitness_level"],
                hike=inputs["hike"],
                constraints=inputs["constraints"],
                long_hike_minutes=last_long_hike_minutes,
                is_taper_week=index + 1 == total_weeks,
                is_deload_week=(index + 1) % 4 == 0,
                is_adaptation_week=is_adaptation_week,
                strength_phase=strength_phase,
                long_session_minutes=long_session_target,
                incline_cap=adjusted_incline_cap,
                is_long_session=is_long_session,
                is_event_prep_week=is_event_prep_week,
            )
            if workout["type"] == "Outdoor long hike":
                last_long_hike_minutes = workout["durationMinutes"]

            days.append(
                {
                    "date": _to_iso_date(day_date),
                    "dayName": _day_name(day_date),
                    "workouts": [workout],
                }
            )

        if inputs["include_strength"] and inputs["strength_on_cardio_days"]:
            strength_count = sessions["strength_sessions_per_week"]
            if strength_count > 0:
                cardio_count = (
                    sessions["treadmill_sessions_per_week"]
                    + sessions["outdoor_hikes_per_week"]
                )
                if cardio_count > 0:
                    strength_count = min(strength_count, cardio_count)
                    _attach_strength_addons(
                        days,
                        count=strength_count,
                        phase=strength_phase,
                        training_days_per_week=effective_days_per_week,
                        week_volume=week_volume,
                        is_event_prep_week=is_event_prep_week,
                    )

        if (
            inputs["include_strength"]
            and inputs["strength_on_cardio_days"]
            and sessions["strength_sessions_per_week"] > 0
            and _has_consecutive_high_intensity_days(days)
        ):
            warnings.append(
                "Stacked sessions create consecutive high-intensity days. Consider reducing sessions or extending your timeline."
            )

        total_minutes = sum(
            workout["durationMinutes"] for day in days for workout in day["workouts"]
        )

        final_notes = week_note_text
        if index == peak_week_index:
            peak_long_session = max(
                workout["durationMinutes"] for day in days for workout in day["workouts"]
            )
            meets_long = peak_long_session >= round(hike_demands["estimated_duration_minutes"] * 0.7)
            meets_volume = total_minutes >= round(hike_demands["estimated_duration_minutes"] * 1.5)
            meets_incline = week_incline_cap >= hike_demands["average_grade_pct"] * 0.6
            if not meets_long or not meets_volume or not meets_incline:
                final_notes = (
                    f"{final_notes} This plan does not fully reach hike-specific demands "
                    "due to limited time or availability."
                )

        if index > 0:
            prev_volume = week_volumes[index - 1]
            delta = round(((week_volume - prev_volume) / prev_volume) * 100) if prev_volume else 0
            if delta > 0:
                final_notes = f"{final_notes} Progression: +{delta}% volume vs last week."
            elif delta < 0:
                final_notes = f"{final_notes} Volume {delta}% vs last week."

        if inputs["include_strength"]:
            final_notes = f"{final_notes} Strength focus: {strength_phase}."

        weeks.append(
            {
                "weekNumber": index + 1,
                "startDate": _to_iso_date(week_start),
                "endDate": _to_iso_date(week_end),
                "totalMinutes": total_minutes,
                "notes": final_notes,
                "focus": week_focus,
                "days": days,
            }
        )

    return {
        "totalWeeks": total_weeks,
        "warnings": warnings,
        "summary": {
            "daysPerWeek": inputs["days_per_week"],
            "preferredDays": picked_days,
            "averageWeeklyMinutes": round(average_weekly_minutes),
        },
        "weeks": weeks,
    }


def _build_weekly_volumes(baseline_minutes: int, total_weeks: int, weekly_target: int) -> List[int]:
    if total_weeks <= 1:
        initial = 45 if baseline_minutes <= 30 else max(20, round(baseline_minutes * 0.85))
        return [initial]

    volumes: List[int] = []
    last_build = 45 if baseline_minutes <= 30 else max(30, baseline_minutes)
    peak_week_index = max(total_weeks - 1, 1)

    for week in range(1, total_weeks + 1):
        if week == total_weeks:
            peak = max(volumes + [last_build])
            volumes.append(round(peak * 0.55))
            continue
        if week % 4 == 0:
            volumes.append(round(last_build * 0.78))
            continue
        remaining = max(peak_week_index - week + 1, 1)
        target_step = (weekly_target - last_build) / remaining
        min_growth = last_build * 1.05
        max_growth = last_build * 1.1
        step_target = last_build + target_step
        unclamped = min(max_growth, max(min_growth, step_target))
        next_build = min(unclamped, weekly_target)
        last_build = round(next_build)
        volumes.append(last_build)

    if baseline_minutes <= 30:
        volumes[0] = min(volumes[0], 60)
        if len(volumes) > 1:
            volumes[1] = min(volumes[1], 75)

    return volumes


def _build_week_workouts(
    week_number: int,
    total_weeks: int,
    week_volume: int,
    days_per_week: int,
    treadmill_sessions_per_week: int,
    outdoor_hikes_per_week: int,
    strength_sessions_per_week: int,
    include_strength: bool,
    strength_on_cardio_days: bool,
    is_event_prep_week: bool,
    fill_active_recovery_days: bool,
) -> List[WorkoutType]:
    day_count = max(1, days_per_week)
    outdoor_count = min(outdoor_hikes_per_week, day_count)
    treadmill_count = min(treadmill_sessions_per_week, day_count)
    strength_count = (
        min(strength_sessions_per_week, day_count) if include_strength and not strength_on_cardio_days else 0
    )

    is_deload_week = week_number % 4 == 0
    is_taper_week = week_number == total_weeks
    is_early_week = week_number <= 2
    requires_treadmill_long = outdoor_count == 0 and treadmill_count > 0
    slots: List[Optional[WorkoutType]] = [None] * day_count
    cardio_workouts: List[WorkoutType] = []

    for _ in range(outdoor_count):
        cardio_workouts.append("Outdoor long hike")

    for i in range(treadmill_count):
        if is_event_prep_week:
            cardio_workouts.append("Outdoor long hike")
            continue
        if requires_treadmill_long and i == 0:
            cardio_workouts.append("Zone 2 incline walk")
            continue
        if is_deload_week or is_taper_week or is_early_week:
            cardio_workouts.append("Zone 2 incline walk")
        elif i == 0:
            cardio_workouts.append("Treadmill intervals")
        else:
            cardio_workouts.append("Zone 2 incline walk")

    if is_event_prep_week and outdoor_count == 0 and treadmill_count > 0:
        cardio_workouts.insert(0, "Outdoor long hike")

    _place_workouts(slots, ["Strength"] * strength_count, lambda t: t == "Strength")

    high_volume = [t for t in cardio_workouts if _is_high_volume_cardio(t)]
    low_volume = [t for t in cardio_workouts if not _is_high_volume_cardio(t)]
    _place_workouts(slots, high_volume, _is_high_volume_cardio)
    _place_workouts(slots, low_volume, lambda _: False)

    fallback = "Recovery / mobility" if fill_active_recovery_days else "Rest day"
    return [slot if slot else fallback for slot in slots]


def _is_high_volume_cardio(workout_type: WorkoutType) -> bool:
    return workout_type in ("Outdoor long hike", "Treadmill intervals")


def _build_alternating_order(length: int) -> List[int]:
    evens = [i for i in range(length) if i % 2 == 0]
    odds = [i for i in range(length) if i % 2 == 1]
    return evens + odds


def _has_adjacent_match(index: int, slots: List[Optional[WorkoutType]], should_avoid) -> bool:
    prev = slots[index - 1] if index > 0 else None
    nxt = slots[index + 1] if index < len(slots) - 1 else None
    return (prev and should_avoid(prev)) or (nxt and should_avoid(nxt)) or False


def _place_workouts(slots: List[Optional[WorkoutType]], workouts: List[WorkoutType], should_avoid):
    order = _build_alternating_order(len(slots))
    for workout in workouts:
        placed = False
        for index in order:
            if slots[index] is not None:
                continue
            if _has_adjacent_match(index, slots, should_avoid):
                continue
            slots[index] = workout
            placed = True
            break
        if placed:
            continue
        for index in order:
            if slots[index] is None:
                slots[index] = workout
                break


def _has_consecutive_high_intensity_days(days: List[Dict[str, Any]]) -> bool:
    for i in range(len(days) - 1):
        if _is_high_intensity_day(days[i]) and _is_high_intensity_day(days[i + 1]):
            return True
    return False


def _is_high_intensity_day(day: Dict[str, Any]) -> bool:
    return any(
        workout["type"] in ("Outdoor long hike", "Treadmill intervals")
        for workout in day["workouts"]
    )


def _build_workout(
    week_number: int,
    workout_type: WorkoutType,
    week_volume: int,
    fitness_level: FitnessLevel,
    hike: dict,
    constraints: dict,
    long_hike_minutes: int,
    is_taper_week: bool,
    is_deload_week: bool,
    is_adaptation_week: bool,
    strength_phase: str,
    long_session_minutes: int,
    incline_cap: float,
    is_long_session: bool,
    is_event_prep_week: bool,
) -> Dict[str, Any]:
    allocations = _allocate_durations(week_volume, workout_type)
    duration = _clamp(allocations, 15, 25) if is_adaptation_week else allocations
    incline_cap = (
        min(constraints["treadmill_max_incline_percent"], 3)
        if is_adaptation_week
        else incline_cap
    )

    if workout_type == "Treadmill intervals":
        plan = _generate_plan(
            hike["profile_points"],
            hike["distance_miles"],
            hike["elevation_gain_ft"],
            {
                "fitness_level": fitness_level,
                "target_duration_minutes": _clamp_duration(duration, fitness_level),
                "pack_weight_lbs": 0,
                "treadmill": {
                    "min_incline_percent": 0,
                    "max_incline_percent": incline_cap,
                    "max_speed_mph": constraints["max_speed_mph"],
                },
            },
        )
        interval_segments = _apply_interval_pattern(plan["segments"], constraints, incline_cap)
        return {
            "id": _workout_id(week_number, workout_type),
            "type": workout_type,
            "durationMinutes": plan["total_minutes"],
            "notes": "Shorter intervals, keep effort smooth."
            if is_deload_week or is_taper_week
            else "Incline intervals based on hike profile.",
            "segments": _to_training_segments(interval_segments),
        }

    if workout_type == "Zone 2 incline walk":
        incline_target = _clamp_average_grade(hike["profile_points"], 2, incline_cap)
        target_minutes = max(duration, long_session_minutes) if is_long_session else round(duration * 0.9)
        plan = _generate_plan(
            hike["profile_points"],
            hike["distance_miles"],
            hike["elevation_gain_ft"],
            {
                "fitness_level": fitness_level,
                "target_duration_minutes": _clamp_duration(target_minutes, fitness_level),
                "pack_weight_lbs": 0,
                "treadmill": {
                    "min_incline_percent": 0,
                    "max_incline_percent": incline_cap,
                    "max_speed_mph": constraints["max_speed_mph"],
                },
            },
        )
        steady_segments = _smooth_segment_inclines(plan["segments"], 5)
        return {
            "id": _workout_id(week_number, workout_type),
            "type": workout_type,
            "durationMinutes": plan["total_minutes"],
            "inclineTarget": incline_target,
            "notes": "Steady state, nose-breathing effort.",
            "segments": _to_training_segments(steady_segments),
        }

    if workout_type == "Strength":
        duration_minutes = _strength_duration_for_week(week_volume, strength_phase, is_event_prep_week)
        return {
            "id": _workout_id(week_number, workout_type),
            "type": workout_type,
            "durationMinutes": duration_minutes,
            "notes": (
                "Reduced strength load; focus on mobility and activation. Intensity: light."
                if is_event_prep_week
                else "Bodyweight squats, lunges, step-ups, core. Intensity: moderate."
            ),
        }

    if workout_type == "Outdoor long hike":
        target = max(long_session_minutes, long_hike_minutes)
        capped = min(target, long_hike_minutes + 20)
        long_minutes = max(capped, 60) if is_event_prep_week else capped
        return {
            "id": _workout_id(week_number, workout_type),
            "type": workout_type,
            "durationMinutes": long_minutes,
            "notes": (
                "Long outdoor hike with a light weighted pack. Keep effort steady."
                if is_event_prep_week
                else f"Focus on time-on-feet with {round(hike['elevation_gain_ft'] * 0.3)} ft of climbing."
            ),
        }

    if workout_type == "Rest day":
        return {
            "id": _workout_id(week_number, workout_type),
            "type": workout_type,
            "durationMinutes": 0,
            "notes": "Rest day.",
        }

    if workout_type == "Recovery / mobility":
        return {
            "id": _workout_id(week_number, workout_type),
            "type": workout_type,
            "durationMinutes": 25,
            "notes": "Active recovery: 30–60% max HR. Mobility, stretching, easy walk.",
        }

    return {
        "id": _workout_id(week_number, workout_type),
        "type": workout_type,
        "durationMinutes": 20,
        "notes": "Easy mobility, light stretching.",
    }


def _allocate_durations(week_volume: int, workout_type: WorkoutType) -> int:
    weight_map = {
        "Outdoor long hike": 0.35,
        "Treadmill intervals": 0.25,
        "Zone 2 incline walk": 0.25,
        "Strength": 0.15,
        "Recovery / mobility": 0.1,
        "Rest day": 0,
    }
    return max(20, round(week_volume * weight_map[workout_type]))


def _clamp_duration(duration: int, fitness_level: FitnessLevel) -> int:
    max_by_level = {"Beginner": 60, "Intermediate": 75, "Advanced": 90}[fitness_level]
    return min(max(duration, 25), max_by_level)


def _clamp_average_grade(points: List[ProfilePoint], min_grade: float, max_grade: float) -> float:
    if len(points) < 2:
        return min_grade
    total_grade = 0
    count = 0
    for idx in range(1, len(points)):
        delta = points[idx].elevation_ft - points[idx - 1].elevation_ft
        distance = max(points[idx].distance_miles - points[idx - 1].distance_miles, 0.01)
        total_grade += (delta / (distance * 5280)) * 100
        count += 1
    average = total_grade / max(count, 1)
    return min(max(average, min_grade), max_grade)


def _pick_training_days(days_per_week: int, preferred_days: List[int], any_days: bool) -> List[int]:
    ordered = [0, 2, 4, 5, 1, 3, 6]
    safe_preferred = [day for day in preferred_days if 0 <= day <= 6]
    selection: List[int] = []
    if not any_days and safe_preferred:
        for day in safe_preferred:
            if day not in selection:
                selection.append(day)
            if len(selection) >= days_per_week:
                break
    for day in ordered:
        if len(selection) >= days_per_week:
            break
        if day not in selection:
            selection.append(day)
    return selection[:days_per_week]


def _week_notes(is_adaptation: bool, week_number: int, total_weeks: int) -> str:
    if is_adaptation and week_number <= 2:
        return "Adaptation week: focus on consistency and easy effort."
    if week_number == total_weeks:
        return "Taper week: reduce volume, keep a little intensity."
    if week_number % 4 == 0:
        return "Deload week: reduce volume and focus on recovery."
    return "Build week: small volume increase."


def _week_focus_line(is_adaptation: bool, week_number: int, total_weeks: int) -> str:
    if is_adaptation and week_number <= 2:
        return "Adaptation: building consistency"
    if week_number == total_weeks:
        return "Taper: reduce volume, stay sharp"
    if week_number % 4 == 0:
        return "Deload: emphasize recovery"
    if week_number == total_weeks - 1:
        return "Peak: hike-specific endurance"
    return "Build: increasing time-on-feet"


def _get_strength_phase(is_adaptation: bool, week_number: int, total_weeks: int) -> str:
    if week_number == total_weeks:
        return "light mobility for recovery"
    if is_adaptation and week_number <= 2:
        return "movement prep & injury prevention"
    if week_number == total_weeks - 1:
        return "maintenance strength"
    return "leg strength + core"


def _derive_hike_demands(hike: dict) -> dict:
    estimated_minutes = round(
        (hike["distance_miles"] / 3 + (hike["elevation_gain_ft"] / 1000) * 0.5) * 60
    )
    average_grade_pct, max_sustained_grade_pct = _compute_grade_stats(hike["profile_points"])
    return {
        "estimated_duration_minutes": estimated_minutes,
        "total_elevation_gain_ft": hike["elevation_gain_ft"],
        "average_grade_pct": average_grade_pct,
        "max_sustained_grade_pct": max_sustained_grade_pct,
    }


def _build_peak_targets(demands: dict, total_weeks: int) -> dict:
    duration_factor = 0.85 if total_weeks >= 8 else 0.78 if total_weeks >= 4 else 0.7
    long_target = round(demands["estimated_duration_minutes"] * duration_factor)
    sustained_target = _clamp(demands["average_grade_pct"] * (0.8 if total_weeks >= 8 else 0.7), 2, 12)
    volume_multiplier = 1.8 if total_weeks >= 8 else 1.5
    weekly_target = round(demands["estimated_duration_minutes"] * volume_multiplier)
    return {
        "long_session_target": long_target,
        "sustained_incline_target": sustained_target,
        "weekly_volume_target": weekly_target,
    }


def _build_long_session_target(
    baseline_minutes: int,
    peak_long_target: int,
    week_number: int,
    total_weeks: int,
    is_adaptation_week: bool,
) -> int:
    if is_adaptation_week:
        return _clamp(peak_long_target * 0.25, 15, 30)
    peak_week = max(total_weeks - 1, 1)
    progress = min(week_number / peak_week, 1)
    baseline_long = max(20, baseline_minutes * 0.4)
    return round(baseline_long + (peak_long_target - baseline_long) * progress)


def _build_week_incline_cap(
    peak_incline_target: float,
    week_number: int,
    total_weeks: int,
    is_adaptation_week: bool,
    max_incline: int,
) -> float:
    if is_adaptation_week:
        return min(max_incline, 3)
    peak_week = max(total_weeks - 1, 1)
    progress = min(week_number / peak_week, 1)
    base = 3
    target = base + (peak_incline_target - base) * progress
    return min(max_incline, max(base, target))


def _compute_grade_stats(points: List[ProfilePoint]) -> Tuple[float, float]:
    if len(points) < 2:
        return 0, 0
    grades: List[float] = []
    for idx in range(1, len(points)):
        delta = points[idx].elevation_ft - points[idx - 1].elevation_ft
        distance = max(points[idx].distance_miles - points[idx - 1].distance_miles, 0.01)
        grades.append((delta / (distance * 5280)) * 100)
    average = sum(grades) / len(grades)
    window = 3
    max_sustained = average
    for i in range(len(grades)):
        slice_ = grades[i : i + window]
        if not slice_:
            continue
        avg = sum(slice_) / len(slice_)
        max_sustained = max(max_sustained, avg)
    return average, max_sustained


def _schedule_week_days(
    week_start: date,
    week_end: date,
    days_per_week: int,
    preferred_days: List[int],
    any_days: bool,
    required_sessions: int,
) -> Dict[str, Any]:
    days: List[date] = []
    preferred = [day for day in preferred_days if 0 <= day <= 6]
    week_dates = _build_week_dates(week_start, week_end)

    if any_days or not preferred:
        step = max(1, len(week_dates) // days_per_week)
        for i in range(days_per_week):
            idx = min(i * step, len(week_dates) - 1)
            days.append(week_dates[idx])
        return {"days": _dedupe_dates(days)}

    for current in week_dates:
        weekday = (current.weekday() + 1) % 7
        if weekday in preferred:
            days.append(current)
        if len(days) >= days_per_week:
            break

    if len(days) < required_sessions:
        return {
            "days": days,
            "warning": "Not enough preferred days this week; some sessions may be skipped.",
        }

    if len(days) < days_per_week:
        for current in week_dates:
            if len(days) >= days_per_week:
                break
            weekday = (current.weekday() + 1) % 7
            if weekday not in preferred:
                days.append(current)

    return {"days": days}


def _build_week_dates(start: date, end: date) -> List[date]:
    dates = []
    cursor = start
    while cursor <= end:
        dates.append(cursor)
        cursor += timedelta(days=1)
    return dates


def _dedupe_dates(dates: List[date]) -> List[date]:
    seen = set()
    result = []
    for dt in dates:
        key = dt.isoformat()
        if key in seen:
            continue
        seen.add(key)
        result.append(dt)
    return result


def _attach_strength_addons(
    days: List[Dict[str, Any]],
    count: int,
    phase: str,
    training_days_per_week: int,
    week_volume: int,
    is_event_prep_week: bool,
):
    remaining = count
    cardio_days = [
        day
        for day in days
        if any(
            workout["type"] in ("Outdoor long hike", "Treadmill intervals", "Zone 2 incline walk")
            for workout in day["workouts"]
        )
    ]

    if training_days_per_week <= 2:
        remaining = min(2, len(cardio_days))
    else:
        remaining = min(remaining, 2, len(cardio_days))

    for day in cardio_days:
        if remaining <= 0:
            break
        day["workouts"].insert(
            0,
            {
                "id": f"{day['date']}-strength-addon",
                "type": "Strength",
                "durationMinutes": _strength_duration_for_week(
                    week_volume, phase, is_event_prep_week
                ),
                "notes": f"{_strength_notes_for_phase(phase)} Do strength first, then cardio 6+ hours later.",
            },
        )
        remaining -= 1


def _strength_duration_for_week(
    week_volume: int, phase: str, is_event_prep_week: bool
) -> int:
    base = _allocate_durations(week_volume, "Strength")
    multiplier = 1
    if "mobility" in phase or "recovery" in phase:
        multiplier = 0.7
    elif "maintenance" in phase:
        multiplier = 0.85
    if is_event_prep_week:
        multiplier = min(multiplier, 0.7)
    duration = max(12, round(base * multiplier))
    return min(duration, 15) if is_event_prep_week else duration


def _strength_notes_for_phase(phase: str) -> str:
    if "mobility" in phase:
        return "Movement prep & injury prevention. Intensity: light."
    if "maintenance" in phase:
        return "Maintain strength, avoid fatigue. Intensity: moderate."
    if "recovery" in phase:
        return "Strength reduced for recovery. Intensity: light."
    return "Strength to support climbing endurance. Intensity: moderate."


def _get_min_prep_weeks(distance_miles: float, elevation_gain_ft: int) -> int:
    if distance_miles <= 5 and elevation_gain_ft <= 1000:
        return 4
    if distance_miles <= 8 or elevation_gain_ft <= 3000:
        return 6
    if distance_miles >= 12 or elevation_gain_ft >= 4500:
        return 12
    return 8


def _enforce_session_invariant(
    days_per_week: int,
    treadmill_sessions_per_week: int,
    outdoor_hikes_per_week: int,
    strength_sessions_per_week: int,
    strength_on_cardio_days: bool,
) -> Dict[str, int]:
    treadmill = max(treadmill_sessions_per_week, 0)
    outdoor = max(outdoor_hikes_per_week, 0)
    strength_addons = max(strength_sessions_per_week, 0)
    strength = 0 if strength_on_cardio_days else strength_addons
    max_sessions = max(days_per_week, 0)
    total = treadmill + outdoor + strength
    if total <= max_sessions:
        return {
            "treadmill_sessions_per_week": treadmill,
            "outdoor_hikes_per_week": outdoor,
            "strength_sessions_per_week": strength_addons,
        }
    overage = total - max_sessions
    if strength > 0:
        reduction = min(strength, overage)
        strength -= reduction
        overage -= reduction
    if outdoor > 0 and overage > 0:
        reduction = min(outdoor, overage)
        outdoor -= reduction
        overage -= reduction
    if overage > 0:
        treadmill = max(treadmill - overage, 0)
    return {
        "treadmill_sessions_per_week": treadmill,
        "outdoor_hikes_per_week": outdoor,
        "strength_sessions_per_week": strength_addons if strength_on_cardio_days else strength,
    }


def _workout_id(week_number: int, workout_type: str) -> str:
    return f"{week_number}-{workout_type.replace(' ', '-').lower()}"


def _to_training_segments(segments: List[PlanSegment]) -> List[Dict[str, Any]]:
    return [
        {
            "index": segment.segment,
            "minutes": segment.minutes,
            "inclinePct": round(segment.incline_percent, 1),
            "speedMph": round(segment.speed_mph, 1),
            "note": segment.notes or None,
        }
        for segment in segments
    ]


def _smooth_segment_inclines(segments: List[PlanSegment], window_size: int) -> List[PlanSegment]:
    if not segments:
        return segments
    smoothed = [PlanSegment(**segment.__dict__) for segment in segments]
    grades = [segment.incline_percent for segment in segments]
    for idx, segment in enumerate(smoothed):
        start = max(0, idx - window_size // 2)
        end = min(len(grades), idx + (window_size + 1) // 2)
        window = grades[start:end]
        avg = sum(window) / len(window)
        segment.incline_percent = round(avg, 1)
    return smoothed


def _apply_interval_pattern(
    segments: List[PlanSegment], constraints: dict, incline_cap: float
) -> List[PlanSegment]:
    if len(segments) <= 2:
        return segments
    updated = []
    for idx, segment in enumerate(segments):
        if segment.segment == 0 or "Cool-down" in segment.notes:
            updated.append(segment)
            continue
        is_hard = idx % 2 == 1
        factor = 1.15 if is_hard else 0.85
        adjusted_incline = _clamp(
            _round_to_step(_clamp(segment.incline_percent * factor, 0, incline_cap), 0.5),
            0,
            incline_cap,
        )
        adjusted_speed = _clamp(
            _round_to_step(
                _clamp(segment.speed_mph * (0.92 if is_hard else 1.05), 1.8, constraints["max_speed_mph"]),
                0.1,
            ),
            0,
            constraints["max_speed_mph"],
        )
        updated.append(
            PlanSegment(
                segment=segment.segment,
                minutes=segment.minutes,
                incline_percent=adjusted_incline,
                speed_mph=adjusted_speed,
                notes=segment.notes or ("Hard interval" if is_hard else "Recovery"),
            )
        )
    return updated


def _generate_plan(profile_points: List[ProfilePoint], distance_miles: float, elevation_gain_ft: int, settings: dict):
    base_duration = (
        _estimate_duration_minutes(distance_miles, elevation_gain_ft, settings["fitness_level"])
        if settings["target_duration_minutes"] == "auto"
        else settings["target_duration_minutes"]
    )
    total_minutes = max(base_duration, 20)
    main_duration = max(total_minutes - 10, 5)
    base_segments = _build_segments(profile_points)
    normalized = _normalize_segment_count(base_segments)
    smoothed = _smooth_grades([seg["grade_percent"] for seg in normalized])

    effort_scores = []
    for seg in normalized:
        distance_weight = seg["distance_miles"]
        elevation_weight = max(seg["elevation_delta_ft"], 0) / 1000 * 1.4
        effort_scores.append(distance_weight + elevation_weight)

    total_effort = sum(effort_scores) or 1
    segments: List[PlanSegment] = []
    pack_note = f"Pack weight {settings['pack_weight_lbs']} lbs" if settings["pack_weight_lbs"] > 0 else ""

    accumulated = 0
    for idx, seg in enumerate(normalized):
        portion = effort_scores[idx] / total_effort
        raw_minutes = (
            main_duration - accumulated
            if idx == len(normalized) - 1
            else main_duration * portion
        )
        minutes = _round_to_step(raw_minutes, 0.5)
        accumulated += minutes
        incline = _clamp(
            smoothed[idx],
            settings["treadmill"]["min_incline_percent"],
            settings["treadmill"]["max_incline_percent"],
        )
        speed = _compute_speed(
            incline,
            settings["fitness_level"],
            settings["treadmill"]["max_speed_mph"],
            settings["pack_weight_lbs"],
        )
        rounded_incline = _clamp(
            _round_to_step(incline, 0.5),
            settings["treadmill"]["min_incline_percent"],
            settings["treadmill"]["max_incline_percent"],
        )
        rounded_speed = _clamp(
            _round_to_step(speed, 0.1), 0, settings["treadmill"]["max_speed_mph"]
        )
        segments.append(
            PlanSegment(
                segment=idx + 1,
                minutes=_round_to_step(minutes, 0.5),
                incline_percent=rounded_incline,
                speed_mph=rounded_speed,
                notes=pack_note,
            )
        )

    warm_speed = _warm_up_speed_for(settings["fitness_level"])
    cool_speed = max(warm_speed - 0.2, _fitness_speeds()[settings["fitness_level"]]["min"])
    warm_incline = _clamp(
        _round_to_step(
            _clamp(1, settings["treadmill"]["min_incline_percent"], settings["treadmill"]["max_incline_percent"]),
            0.5,
        ),
        settings["treadmill"]["min_incline_percent"],
        settings["treadmill"]["max_incline_percent"],
    )
    warm_speed = _clamp(
        _round_to_step(_clamp(warm_speed, 1.8, settings["treadmill"]["max_speed_mph"]), 0.1),
        0,
        settings["treadmill"]["max_speed_mph"],
    )
    warm_up = PlanSegment(segment=0, minutes=5, incline_percent=warm_incline, speed_mph=warm_speed, notes="Warm-up")

    cool_incline = _clamp(
        _round_to_step(
            _clamp(0.5, settings["treadmill"]["min_incline_percent"], settings["treadmill"]["max_incline_percent"]),
            0.5,
        ),
        settings["treadmill"]["min_incline_percent"],
        settings["treadmill"]["max_incline_percent"],
    )
    cool_speed = _clamp(
        _round_to_step(_clamp(cool_speed, 1.6, settings["treadmill"]["max_speed_mph"]), 0.1),
        0,
        settings["treadmill"]["max_speed_mph"],
    )
    cool_down = PlanSegment(
        segment=len(segments) + 1, minutes=5, incline_percent=cool_incline, speed_mph=cool_speed, notes="Cool-down"
    )
    return {"total_minutes": total_minutes, "segments": [warm_up] + segments + [cool_down]}


def _estimate_duration_minutes(distance_miles: float, elevation_gain_ft: int, fitness_level: FitnessLevel) -> int:
    base_speed = {"Beginner": 2.4, "Intermediate": 3.2, "Advanced": 4.0}[fitness_level]
    flat_minutes = (distance_miles / base_speed) * 60
    elevation_penalty = (elevation_gain_ft / 1000) * {
        "Beginner": 12,
        "Intermediate": 9,
        "Advanced": 7,
    }[fitness_level]
    return round(flat_minutes + elevation_penalty)


def _build_segments(points: List[ProfilePoint]) -> List[Dict[str, float]]:
    if len(points) < 2:
        return []
    segments = []
    for idx in range(1, len(points)):
        current = points[idx]
        previous = points[idx - 1]
        distance = max(current.distance_miles - previous.distance_miles, 0.01)
        elevation_delta = current.elevation_ft - previous.elevation_ft
        grade = (elevation_delta / (distance * 5280)) * 100
        segments.append(
            {
                "distance_miles": distance,
                "elevation_delta_ft": elevation_delta,
                "grade_percent": grade,
            }
        )
    return segments


def _normalize_segment_count(segments: List[Dict[str, float]]) -> List[Dict[str, float]]:
    if not segments:
        return []
    normalized = list(segments)
    while len(normalized) < 10:
        expanded = []
        for seg in normalized:
            half_distance = seg["distance_miles"] / 2
            half_elevation = seg["elevation_delta_ft"] / 2
            expanded.extend(
                [
                    {
                        "distance_miles": half_distance,
                        "elevation_delta_ft": half_elevation,
                        "grade_percent": seg["grade_percent"],
                    },
                    {
                        "distance_miles": half_distance,
                        "elevation_delta_ft": half_elevation,
                        "grade_percent": seg["grade_percent"],
                    },
                ]
            )
        normalized = expanded

    while len(normalized) > 30:
        grouped = []
        group_size = (len(normalized) + 29) // 30
        for i in range(0, len(normalized), group_size):
            group = normalized[i : i + group_size]
            distance = sum(seg["distance_miles"] for seg in group)
            elevation = sum(seg["elevation_delta_ft"] for seg in group)
            grade = 0 if distance == 0 else (elevation / (distance * 5280)) * 100
            grouped.append(
                {
                    "distance_miles": distance,
                    "elevation_delta_ft": elevation,
                    "grade_percent": grade,
                }
            )
        normalized = grouped
    return normalized


def _smooth_grades(grades: List[float]) -> List[float]:
    if not grades:
        return []
    smoothed = []
    for idx in range(len(grades)):
        window = grades[max(0, idx - 1) : min(len(grades), idx + 2)]
        smoothed.append(sum(window) / len(window))
    return smoothed


def _fitness_speeds() -> Dict[str, Dict[str, float]]:
    return {
        "Beginner": {"min": 2.0, "max": 3.2},
        "Intermediate": {"min": 2.8, "max": 4.2},
        "Advanced": {"min": 3.2, "max": 5.0},
    }


def _compute_speed(
    incline: float, fitness_level: FitnessLevel, max_speed: float, pack_weight_lbs: float
) -> float:
    speeds = _fitness_speeds()[fitness_level]
    range_ = speeds["max"] - speeds["min"]
    grade_penalty = max(incline, 0) * 0.08
    downhill_boost = min(abs(incline) * 0.03, range_ * 0.3) if incline < 0 else 0
    speed = speeds["max"] - grade_penalty + downhill_boost
    if pack_weight_lbs > 0:
        speed -= pack_weight_lbs * 0.01
    speed = _clamp(speed, speeds["min"], min(max_speed, speeds["max"]))
    return speed


def _warm_up_speed_for(fitness_level: FitnessLevel) -> float:
    return {"Beginner": 2.0, "Intermediate": 2.6, "Advanced": 3.0}[fitness_level]


def _round_to_step(value: float, step: float) -> float:
    return round(value / step) * step


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return min(max(value, min_value), max_value)


def _to_start_of_day(dt: date) -> date:
    return dt


def _parse_local_date(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return datetime.fromisoformat(value).date()


def _to_iso_date(dt: date) -> str:
    return dt.isoformat()


def _day_name(dt: date) -> str:
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return day_names[dt.weekday()]
