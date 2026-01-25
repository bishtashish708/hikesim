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

interface QuickPlanGeneratorProps {
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

export default function QuickPlanGenerator({
  hikes,
  userId,
  onPlanGenerated,
}: QuickPlanGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);

  // Form state - auto-select first hike if only one is provided
  const [selectedHikeId, setSelectedHikeId] = useState(hikes.length === 1 ? hikes[0].id : '');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('intermediate');
  const [weeksUntilHike, setWeeksUntilHike] = useState(8);
  const [trainingPreference, setTrainingPreference] = useState<TrainingPreference>('mixed');
  const [includeStrength, setIncludeStrength] = useState(true);
  const [daysPerWeek, setDaysPerWeek] = useState(4);

  const selectedHike = hikes.find(h => h.id === selectedHikeId) || hikes[0];

  const handleGenerate = async () => {
    if (!selectedHikeId) {
      setError('Please select a hike');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedPlan(null);

    try {
      const response = await fetch(`${getApiBase()}/api/ai/generate-quick-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hikeId: selectedHikeId,
          userId: userId || 'anonymous',
          fitnessLevel,
          weeksUntilHike,
          trainingPreference,
          includeStrength,
          daysPerWeek,
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
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Generate Quick Plan with AI
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Generate Training Plan
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
                  // Show as read-only when single hike (from detail page)
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
                  // Show dropdown when multiple hikes
                  <>
                    <select
                      value={selectedHikeId}
                      onChange={(e) => setSelectedHikeId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a hike...</option>
                      {hikes.map(hike => (
                        <option key={hike.id} value={hike.id}>
                          {hike.name} ({hike.distanceMiles} mi, {hike.elevationGainFt} ft)
                          {hike.difficulty ? ` - ${hike.difficulty}` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedHike && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm text-gray-700">
                        <strong>{selectedHike.name}</strong>: {selectedHike.distanceMiles} miles, {selectedHike.elevationGainFt} ft elevation gain
                        {selectedHike.difficulty && ` • ${selectedHike.difficulty}`}
                        {selectedHike.trailType && ` • ${selectedHike.trailType}`}
                      </div>
                    )}
                  </>
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
                      onClick={() => setFitnessLevel(level)}
                      className={`px-4 py-2 rounded-md border-2 transition-colors ${
                        fitnessLevel === level
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weeks Until Hike */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weeks Until Hike: {weeksUntilHike}
                </label>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={weeksUntilHike}
                  onChange={(e) => setWeeksUntilHike(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>4 weeks</span>
                  <span>24 weeks</span>
                </div>
              </div>

              {/* Training Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['treadmill', 'outdoor', 'mixed'] as const).map(pref => (
                    <button
                      key={pref}
                      onClick={() => setTrainingPreference(pref)}
                      className={`px-4 py-2 rounded-md border-2 transition-colors ${
                        trainingPreference === pref
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {pref.charAt(0).toUpperCase() + pref.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days Per Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days Per Week: {daysPerWeek}
                </label>
                <input
                  type="range"
                  min="3"
                  max="6"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3 days</span>
                  <span>6 days</span>
                </div>
              </div>

              {/* Include Strength */}
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStrength}
                    onChange={(e) => setIncludeStrength(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Include Strength Training
                  </span>
                </label>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !selectedHikeId}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Generating Plan...' : 'Generate Training Plan'}
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {loading && (
                <div className="text-center text-sm text-gray-500">
                  This may take 10-15 seconds...
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plan Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {generatedPlan.planTitle}
                </h3>
                <p className="text-gray-700 mb-4">
                  {generatedPlan.planDescription}
                </p>
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Total Workouts</div>
                      <div className="text-xl font-bold text-gray-900">{stats.totalWorkouts}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Miles</div>
                      <div className="text-xl font-bold text-gray-900">{stats.totalMiles}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Elevation</div>
                      <div className="text-xl font-bold text-gray-900">{stats.totalElevation} ft</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Avg/Week</div>
                      <div className="text-xl font-bold text-gray-900">{stats.avgWorkoutsPerWeek}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Weekly Breakdown */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900">Weekly Breakdown</h4>
                {generatedPlan.weeks.map(week => (
                  <div key={week.weekNumber} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-bold text-gray-900">Week {week.weekNumber}</h5>
                        <p className="text-sm text-gray-600">{week.weekFocus}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>{week.totalMiles} mi</div>
                        <div>{week.totalElevation} ft</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {week.workouts.map((workout, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-md text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-medium text-gray-900">
                              Day {workout.day}: {workout.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {workout.duration} min • {workout.intensity}
                            </div>
                          </div>
                          <p className="text-gray-600 text-xs mb-1">{workout.description}</p>
                          {(workout.distanceMiles > 0 || workout.elevationGainFt > 0) && (
                            <div className="text-xs text-gray-500">
                              {workout.distanceMiles > 0 && `${workout.distanceMiles} mi`}
                              {workout.distanceMiles > 0 && workout.elevationGainFt > 0 && ' • '}
                              {workout.elevationGainFt > 0 && `${workout.elevationGainFt} ft gain`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Metadata */}
              {metadata && (
                <div className="bg-gray-50 p-4 rounded-md text-xs text-gray-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Generated in {(metadata.generationTime / 1000).toFixed(1)}s</div>
                    <div>Cost: ${metadata.cost.toFixed(4)}</div>
                    <div>Model: {metadata.model}</div>
                    <div>{metadata.saved ? `Saved (ID: ${metadata.planId?.substring(0, 8)}...)` : 'Not saved'}</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Generate Another Plan
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
