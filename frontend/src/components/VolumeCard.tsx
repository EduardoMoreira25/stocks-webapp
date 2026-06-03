import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Mover } from '../types';

const VolumeCard: React.FC<{ mover: Mover }> = ({ mover }) => {
  const navigate = useNavigate();
  const changePercent = mover.change_percent ?? 0;
  const isPositive = changePercent >= 0;
  const volume = mover.volume ?? 0;

  const formatVolume = (v: number) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toString();
  };

  return (
    <button
      onClick={() => navigate(`/company/${mover.symbol}`)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-200 dark:border-gray-700 w-full text-left"
    >
      <div className="flex items-start gap-3">
        {mover.image_url && (
          <img
            src={mover.image_url}
            alt={mover.company_name}
            className="w-10 h-10 rounded object-contain bg-white dark:bg-gray-100 border border-gray-200 dark:border-gray-600 p-1 flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-100">{mover.symbol}</span>
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{mover.company_name}</div>
          <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-orange-500 dark:text-orange-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {formatVolume(volume)}
          </div>
        </div>
      </div>
    </button>
  );
};

export default VolumeCard;