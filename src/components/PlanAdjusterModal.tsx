'use client';

import { useState, useEffect } from 'react';

type AdjustmentType = 'easier' | 'harder' | 'more_strength' | 'less_strength' | 'custom';

interface PlanAdjusterModalProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlanId?: string) => void;
}

type ModalState = 'idle' | 'generating' | 'preview' | 'saving' | 'success' | 'error';

interface PlanStats {
  totalWorkouts: number;
  totalMiles: number;
  totalElevation: number;
  avgWorkoutsPerWeek: number;
}

interface AdjustmentResponse {
  success: boolean;
  adjustedPlan: {
    weeks: any[];
    settings: any;
  };
  stats: PlanStats;
  metadata: {
    saved: boolean;
    planId?: string;
    savedAsNew: boolean;
    adjustmentType: string;
    cost: number;
    tokensUsed: number;
    model: string;
    generationTime: number;
  };
  validation: {
    valid: boolean;
    warnings: string[];
  };
}

export default function PlanAdjusterModal({
  planId,
  isOpen,
  onClose,
  onSuccess,
}: PlanAdjusterModalProps) {
  const [state, setState] = useState<ModalState>('idle');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('easier');
  const [feedback, setFeedback] = useState('');
  const [saveAsNew, setSaveAsNew] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustmentResponse, setAdjustmentResponse] = useState<AdjustmentResponse | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setState('idle');
      setAdjustmentType('easier');
      setFeedback('');
      setSaveAsNew(true);
      setError(null);
      setAdjustmentResponse(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const adjustmentTypeOptions: { value: AdjustmentType; label: string }[] = [
    { value: 'easier', label: 'Make it easier' },
    { value: 'harder', label: 'Make it harder' },
    { value: 'more_strength', label: 'More strength training' },
    { value: 'less_strength', label: 'Less strength training' },
    { value: 'custom', label: 'Custom request' },
  ];

  const placeholders: Record<AdjustmentType, string> = {
    easier: 'e.g., Reduce weekly mileage by 20%',
    harder: 'e.g., Add hill intervals to long runs',
    more_strength: 'e.g., Include core exercises 3x/week',
    less_strength: 'e.g., Focus only on hiking-specific workouts',
    custom: 'Describe what you\'d like to change...',
  };

  const handleGeneratePreview = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback for the adjustment.');
      return;
    }

    setState('generating');
    setError(null);

    try {
      const response = await fetch('/api/ai/adjust-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          feedback: feedback.trim(),
          adjustmentType,
          saveAsNew: false, // Don't save yet, just preview
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate adjusted plan');
      }

      setAdjustmentResponse(data);
      setState('preview');
    } catch (err) {
      console.error('Adjustment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate adjusted plan');
      setState('error');
    }
  };

  const handleSavePlan = async () => {
    if (!adjustmentResponse) return;

    setState('saving');
    setError(null);

    try {
      const response = await fetch('/api/ai/adjust-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          feedback: feedback.trim(),
          adjustmentType,
          saveAsNew,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save adjusted plan');
      }

      setState('success');

      // Wait a moment for user to see success, then trigger callback
      setTimeout(() => {
        onSuccess(data.metadata.savedAsNew ? data.metadata.planId : undefined);
      }, 1000);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save adjusted plan');
      setState('error');
    }
  };

  const handleAdjustAgain = () => {
    setState('idle');
    setFeedback('');
    setError(null);
    setAdjustmentResponse(null);
  };

  const handleClose = () => {
    if (state !== 'generating' && state !== 'saving') {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Adjust Training Plan</h2>
            <button
              onClick={handleClose}
              disabled={state === 'generating' || state === 'saving'}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && state === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-900">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {state === 'success' && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-emerald-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-emerald-900">Plan adjusted successfully!</h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    {saveAsNew ? 'New plan created. Redirecting...' : 'Plan updated. Refreshing...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {(state === 'idle' || state === 'generating' || state === 'error') && (
            <>
              {/* Section 1: Adjustment Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Adjustment Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {adjustmentTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAdjustmentType(option.value)}
                      disabled={state === 'generating'}
                      className={`px-4 py-2 rounded-full border-2 font-medium transition-all disabled:opacity-50 ${
                        adjustmentType === option.value
                          ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2: Feedback Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
                  disabled={state === 'generating'}
                  placeholder={placeholders[adjustmentType]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 disabled:bg-gray-50"
                  rows={4}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Describe what you'd like to change about your training plan.
                  </p>
                  <p className="text-xs text-gray-500">
                    {feedback.length}/500
                  </p>
                </div>
              </div>

              {/* Section 3: Save Options */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Save Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={saveAsNew}
                      onChange={() => setSaveAsNew(true)}
                      disabled={state === 'generating'}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Create new plan (recommended)</div>
                      <div className="text-sm text-gray-600">
                        Saves as a new plan, preserving your original plan unchanged.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={!saveAsNew}
                      onChange={() => setSaveAsNew(false)}
                      disabled={state === 'generating'}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Update current plan</div>
                      <div className="text-sm text-gray-600">
                        Replaces your current plan with the adjusted version. Creates a revision for history.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={state === 'generating'}
                  className="px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGeneratePreview}
                  disabled={state === 'generating' || !feedback.trim()}
                  className="flex-1 px-6 py-3 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {state === 'generating' ? (
                    <>
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                      Generating Preview...
                    </>
                  ) : (
                    'Generate Preview'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Preview State */}
          {(state === 'preview' || state === 'saving') && adjustmentResponse && (
            <>
              {/* Section 4: Preview */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Preview Changes</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Adjusted Plan
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {adjustmentResponse.stats.totalWorkouts}
                        </div>
                        <div className="text-xs text-gray-600">Total Workouts</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-600">
                          {Math.round(adjustmentResponse.stats.totalMiles)} mi
                        </div>
                        <div className="text-xs text-gray-600">Total Miles</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-orange-600">
                          {Math.round(adjustmentResponse.stats.totalElevation).toLocaleString()} ft
                        </div>
                        <div className="text-xs text-gray-600">Total Elevation</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-emerald-600">
                          {adjustmentResponse.stats.avgWorkoutsPerWeek.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600">Avg Workouts/Week</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
                      Adjustment Details
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-indigo-600 font-medium">Type:</span>{' '}
                        <span className="text-indigo-900 capitalize">
                          {adjustmentResponse.metadata.adjustmentType.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-indigo-600 font-medium">Feedback:</span>{' '}
                        <span className="text-indigo-900">{feedback}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 5: Cost & Metadata */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                    AI Generation Details
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs">Cost</div>
                      <div className="font-medium text-gray-900">
                        ${adjustmentResponse.metadata.cost.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Tokens</div>
                      <div className="font-medium text-gray-900">
                        {adjustmentResponse.metadata.tokensUsed.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Model</div>
                      <div className="font-medium text-gray-900">
                        {adjustmentResponse.metadata.model}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Generation Time</div>
                      <div className="font-medium text-gray-900">
                        {(adjustmentResponse.metadata.generationTime / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Warnings */}
                {adjustmentResponse.validation.warnings.length > 0 && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="text-sm font-medium text-amber-900 mb-2">Warnings:</div>
                    <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                      {adjustmentResponse.validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Preview Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleAdjustAgain}
                  disabled={state === 'saving'}
                  className="px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adjust Again
                </button>
                <button
                  onClick={handleSavePlan}
                  disabled={state === 'saving'}
                  className="flex-1 px-6 py-3 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {state === 'saving' ? (
                    <>
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                      Saving Plan...
                    </>
                  ) : (
                    <>Save Plan</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
