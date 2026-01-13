# Changelog

## v0.1.2
- Add recovery day selection and align training plan scheduling/validation to honor recovery slots.
- Treat unallocated days as explicit rest days with zero-duration workouts for clarity.
- Refine strength add-on behavior and preferred-day scheduling to better match session requirements.
- Handle zero-minute formatting in UI/outputs.

## v0.1.1
- Refactor training plan logic into `buildTrainingPlan`, `validators`, and shared types.
- Remove standalone treadmill plan UI/routes in favor of unified training plan flow.
- Fix training plan preview CSV to include all workouts and improve hover/selection stability.
- Add/update unit tests for training plan generation and validation.

## v0.1.0
- Initial HikeSim MVP with hikes, elevation profile, treadmill plan generation, and training plan builder.
