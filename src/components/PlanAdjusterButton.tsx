'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PlanAdjusterModal from './PlanAdjusterModal';

interface PlanAdjusterButtonProps {
  planId: string;
}

export default function PlanAdjusterButton({ planId }: PlanAdjusterButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = (newPlanId?: string) => {
    if (newPlanId) {
      // New plan created - redirect to new plan
      router.push(`/training-plans/${newPlanId}`);
    } else {
      // Plan updated - refresh current page
      router.refresh();
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-6 py-2.5 text-center text-indigo-700 bg-indigo-50 rounded-full hover:bg-indigo-100 font-medium transition-colors"
      >
        Adjust with AI ✨
      </button>

      <PlanAdjusterModal
        planId={planId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
