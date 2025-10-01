import { Suspense } from 'react';
import FeedbackPageInner from './FeedbackPageInner';

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div>로딩 중…</div>}>
      <FeedbackPageInner />
    </Suspense>
  );
}