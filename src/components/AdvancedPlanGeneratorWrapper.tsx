'use client';

import dynamic from 'next/dynamic';

const AdvancedPlanGenerator = dynamic(() => import('./AdvancedPlanGenerator'), {
  ssr: false,
});

export default AdvancedPlanGenerator;
