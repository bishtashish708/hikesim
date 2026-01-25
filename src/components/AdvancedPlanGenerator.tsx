'use client';

import { useState } from 'react';
import { getApiBase } from '@/lib/apiBase';

interface Hike {
  id: string;
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  difficulty?: string;
  trailType?: string;
}

interface AdvancedPlanGeneratorProps {
  hikes: Hike[];
  userId?: string;
  onPlanGenerated?: (plan: unknown) => void;
}

type FitnessLevel = 'beginner' | 'intermediate' | 'expert' | 'advanced';
type TrainingPreference = 'treadmill' | 'outdoor' | 'mixed';

interface GeneratedPlan {
  planTitle: string;
  planDescription: string;
  totalWeeks: number;
  weeks: Array<{
    weekNumber: number;
    weekFocus: string;
    totalMiles: number;
    totalElevation: number;
    workouts: Array<{
      day: number;
      type: string;
      title: string;
      duration: number;
      intensity: string;
      distanceMiles: number;
      elevationGainFt: number;
      description: string;
      equipment?: string;
    }>;
  }>;
}

interface PlanStats {
  totalWeeks: number;
  totalWorkouts: number;
  cardioWorkouts: number;
  strengthWorkouts: number;
  restDays: number;
  totalMiles: number;
  totalElevation: number;
  avgWorkoutsPerWeek: number;
  avgMilesPerWeek: number;
}

interface GenerationMetadata {
  saved: boolean;
  planId?: string;
  cost: number;
  tokensUsed: number;
  model: string;
  generationTime: number;
}

export default function AdvancedPlanGenerator({
  hikes,
  userId,
  onPlanGenerated,
}: AdvancedPlanGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);

  // Form state - auto-select first hike if only one is provided
  const [selectedHikeId, setSelectedHikeId] = useState(hikes.length === 1 ? hikes[0].id : '');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('intermediate');
  const [hikeDate, setHikeDate] = useState<string>('');
  const [weeksUntilHike, setWeeksUntilHike] = useState(8);

  // Advanced inputs
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [currentWeeklyMileage, setCurrentWeeklyMileage] = useState<number>(10);
  const [currentWeeklyElevation, setCurrentWeeklyElevation] = useState<number>(1000);
  const [pastExperience, setPastExperience] = useState<string>('');
  const [injuries, setInjuries] = useState<string>('');
  const [trainingPreference, setTrainingPreference] = useState<TrainingPreference>('mixed');
  const [treadmillPercentage, setTreadmillPercentage] = useState<number>(30);
  const [includeStrength, setIncludeStrength] = useState(true);
  const [specificGoals, setSpecificGoals] = useState<string>('');

  const [ambitionWarning, setAmbitionWarning] = useState<string | null>(null);

  const selectedHike = hikes.find(h => h.id === selectedHikeId) || hikes[0];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate weeks until hike from selected date
  const calculateWeeksFromDate = (dateString: string) => {
    if (!dateString) return 8;
    const selectedDate = new Date(dateString);
    const today = new Date();
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.max(4, Math.min(24, diffWeeks));
  };

  // Check if plan is overambitious
  const checkAmbition = (weeks: number, fitness: FitnessLevel, difficulty?: string) => {
    if (!difficulty) {
      setAmbitionWarning(null);
      return;
    }

    const isOverambitious =
      (difficulty === 'Hard' && fitness === 'beginner' && weeks < 12) ||
      (difficulty === 'Hard' && fitness === 'intermediate' && weeks < 8) ||
      (difficulty === 'Moderate' && fitness === 'beginner' && weeks < 8);

    if (isOverambitious) {
      setAmbitionWarning(
        `⚠️ This timeline may be too ambitious for your current fitness level and the hike difficulty. Consider selecting a later date (recommended: ${weeks < 8 ? '12+' : '16+'} weeks) for optimal preparation.`
      );
    } else {
      setAmbitionWarning(null);
    }
  };

  // Update weeks when date changes
  const handleDateChange = (dateString: string) => {
    setHikeDate(dateString);
    const weeks = calculateWeeksFromDate(dateString);
    setWeeksUntilHike(weeks);
    checkAmbition(weeks, fitnessLevel, selectedHike?.difficulty);
  };

  // Recheck ambition when fitness level changes
  const handleFitnessChange = (level: FitnessLevel) => {
    setFitnessLevel(level);
    checkAmbition(weeksUntilHike, level, selectedHike?.difficulty);
  };

  const toggleTrainingDay = (day: number) => {
    if (trainingDays.includes(day)) {
      setTrainingDays(trainingDays.filter(d => d !== day));
    } else {
      setTrainingDays([...trainingDays, day].sort());
    }
  };

  const handleGenerate = async () => {
    if (!selectedHikeId) {
      setError('Please select a hike');
      return;
    }

    if (!hikeDate) {
      setError('Please select your hike date');
      return;
    }

    if (trainingDays.length < 2) {
      setError('Please select at least 2 training days per week');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedPlan(null);

    try {
      const response = await fetch(`${getApiBase()}/api/ai/generate-advanced-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hikeId: selectedHikeId,
          userId: userId || 'anonymous',
          fitnessLevel,
          weeksUntilHike,
          trainingDays,
          currentWeeklyMileage,
          currentWeeklyElevation,
          pastExperience,
          injuries,
          trainingPreference,
          treadmillPercentage,
          includeStrength,
          specificGoals,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate plan');
      }

      setGeneratedPlan(data.plan);
      setStats(data.stats);
      setMetadata(data.metadata);

      if (onPlanGenerated) {
        onPlanGenerated(data.plan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setGeneratedPlan(null);
    setError(null);
  };

  const handleReset = () => {
    setGeneratedPlan(null);
    setError(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-6 py-3 text-white bg-emerald-600 rounded-full hover:bg-emerald-700 font-medium transition-colors"
      >
        Start Advanced Customization
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Advanced Training Plan Customization
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {!generatedPlan ? (
            <div className="space-y-6">
              {/* Hike Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Target Hike
                </label>
                {hikes.length === 1 ? (
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border-2 border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{selectedHike?.name}</div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          {selectedHike?.distanceMiles.toFixed(1)} mi, {selectedHike?.elevationGainFt.toLocaleString()} ft
                          {selectedHike?.difficulty && ` • ${selectedHike.difficulty}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedHikeId}
                    onChange={(e) => setSelectedHikeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Choose a hike...</option>
                    {hikes.map(hike => (
                      <option key={hike.id} value={hike.id}>
                        {hike.name} ({hike.distanceMiles} mi, {hike.elevationGainFt} ft)
                        {hike.difficulty ? ` - ${hike.difficulty}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Fitness Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Fitness Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['beginner', 'intermediate', 'expert', 'advanced'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => handleFitnessChange(level)}
                      className={`px-4 py-2 rounded-md border-2 transition-colors ${
                        fitnessLevel === level
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hike Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When do you plan to hike?
                </label>
                <input
                  type="date"
                  value={hikeDate}
                  min={new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  max={new Date(Date.now() + 168 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {hikeDate && (
                  <div className="mt-2 text-sm text-gray-600">
                    Training period: <strong>{weeksUntilHike} weeks</strong>
                  </div>
                )}
              </div>

              {/* Ambition Warning */}
              {ambitionWarning && (
                <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-md">
                  <p className="text-sm text-amber-800">{ambitionWarning}</p>
                </div>
              )}

              {/* Training Days Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Training Days ({trainingDays.length} days/week)
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={day}
                      onClick={() => toggleTrainingDay(index)}
                      className={`px-3 py-2 rounded-md border-2 transition-colors text-sm ${
                        trainingDays.includes(index)
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Training Volume */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Weekly Mileage
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentWeeklyMileage}
                    onChange={(e) => setCurrentWeeklyMileage(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., 10"
                  />
                  <p className="mt-1 text-xs text-gray-500">Miles per week</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Weekly Elevation Gain
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="100"
                    value={currentWeeklyElevation}
                    onChange={(e) => setCurrentWeeklyElevation(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., 1000"
                  />
                  <p className="mt-1 text-xs text-gray-500">Feet per week</p>
                </div>
              </div>

              {/* Past Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Past Training Experience
                </label>
                <textarea
                  value={pastExperience}
                  onChange={(e) => setPastExperience(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Describe your hiking/training history, recent accomplishments, etc."
                />
              </div>

              {/* Injuries/Limitations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Injuries or Physical Limitations (Optional)
                </label>
                <textarea
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Any injuries, conditions, or limitations to consider"
                />
              </div>

              {/* Training Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Environment Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['treadmill', 'outdoor', 'mixed'] as const).map(pref => (
                    <button
                      key={pref}
                      onClick={() => setTrainingPreference(pref)}
                      className={`px-4 py-2 rounded-md border-2 transition-colors ${
                        trainingPreference === pref
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {pref.charAt(0).toUpperCase() + pref.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Treadmill Percentage (if mixed) */}
              {trainingPreference === 'mixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Treadmill Percentage: {treadmillPercentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={treadmillPercentage}
                    onChange={(e) => setTreadmillPercentage(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>All Outdoor</span>
                    <span>50/50</span>
                    <span>All Treadmill</span>
                  </div>
                </div>
              )}

              {/* Strength Training */}
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStrength}
                    onChange={(e) => setIncludeStrength(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Include Strength Training</span>
                </label>
              </div>

              {/* Specific Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Goals or Preferences (Optional)
                </label>
                <textarea
                  value={specificGoals}
                  onChange={(e) => setSpecificGoals(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Any specific goals, concerns, or preferences for your training plan?"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 px-6 py-3 text-white bg-emerald-600 rounded-full hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? 'Generating Plan...' : 'Generate Training Plan'}
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Generated Plan Display - Reuse same structure as QuickPlanGenerator */
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-lg border border-emerald-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{generatedPlan.planTitle}</h3>
                <p className="text-gray-700">{generatedPlan.planDescription}</p>
              </div>

              {/* Plan Stats */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-emerald-600">{stats.totalWeeks}</div>
                    <div className="text-sm text-gray-600">Weeks</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-emerald-600">{stats.totalWorkouts}</div>
                    <div className="text-sm text-gray-600">Workouts</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-emerald-600">{stats.totalMiles.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Total Miles</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-emerald-600">{(stats.totalElevation / 1000).toFixed(1)}k</div>
                    <div className="text-sm text-gray-600">Total Elevation (ft)</div>
                  </div>
                </div>
              )}

              {/* Week-by-week breakdown */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Week-by-Week Breakdown</h4>
                {generatedPlan.weeks.map((week) => (
                  <details key={week.weekNumber} className="bg-white rounded-lg border border-gray-200">
                    <summary className="cursor-pointer p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold">Week {week.weekNumber}</span>
                          <span className="text-gray-600 ml-2">- {week.weekFocus}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {week.totalMiles.toFixed(1)} mi • {week.totalElevation} ft
                        </div>
                      </div>
                    </summary>
                    <div className="p-4 pt-0 space-y-3">
                      {week.workouts.map((workout, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-gray-900">{workout.title}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {dayNames[workout.day]} • {workout.type} • {workout.intensity}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {workout.distanceMiles.toFixed(1)} mi • {workout.elevationGainFt} ft
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{workout.description}</p>
                          {workout.equipment && (
                            <div className="mt-2 text-xs text-gray-500">Equipment: {workout.equipment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 font-medium transition-colors"
                >
                  Generate New Plan
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 font-medium transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Metadata */}
              {metadata && (
                <div className="text-xs text-gray-500 text-center">
                  Generated in {(metadata.generationTime / 1000).toFixed(2)}s • {metadata.tokensUsed.toLocaleString()} tokens
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
