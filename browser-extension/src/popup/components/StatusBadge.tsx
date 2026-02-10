import React from 'react';

interface Props {
  status: 'submitted' | 'saved_local' | 'draft';
}

const BADGE_STYLES: Record<string, string> = {
  submitted: 'bg-green-100 text-green-700',
  saved_local: 'bg-blue-100 text-blue-700',
  draft: 'bg-yellow-100 text-yellow-700',
};

const BADGE_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  saved_local: 'Local',
  draft: 'Draft',
};

export function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${BADGE_STYLES[status]}`}>
      {BADGE_LABELS[status]}
    </span>
  );
}
