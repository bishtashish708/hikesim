'use client';

import { useRouter } from 'next/navigation';
import QuickPlanGenerator from './QuickPlanGenerator';

interface Hike {
  id: string;
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  difficulty?: string;
  trailType?: string;
}

interface QuickPlanGeneratorWrapperProps {
  hikes: Hike[];
  userId?: string;
}

export default function QuickPlanGeneratorWrapper({ hikes, userId }: QuickPlanGeneratorWrapperProps) {
  const router = useRouter();

  const handlePlanGenerated = () => {
    // Refresh the page to show the new plan
    router.refresh();
  };

  return (
    <QuickPlanGenerator
      hikes={hikes}
      userId={userId}
      onPlanGenerated={handlePlanGenerated}
    />
  );
}
