import React from 'react';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = 'md' }) => {
  let colorClass = '';
  
  // The Open LLM Leaderboard aggregate scores cluster roughly ~16-61.
  // These thresholds keep the UI visually informative on real data.
  if (score >= 50) {
    colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (score >= 40) {
    colorClass = 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (score >= 30) {
    colorClass = 'bg-amber-100 text-amber-800 border-amber-200';
  } else {
    colorClass = 'bg-rose-100 text-rose-800 border-rose-200';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1 font-semibold'
  };

  return (
    <span className={`inline-flex items-center justify-center rounded-full border ${colorClass} ${sizeClasses[size]} font-medium`}>
      {score.toFixed(1)}
    </span>
  );
};
