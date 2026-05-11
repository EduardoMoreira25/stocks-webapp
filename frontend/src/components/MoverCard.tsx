import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Mover } from '../types';

interface MoverCardProps {
  mover: Mover;
}

const MoverCard: React.FC<MoverCardProps> = ({ mover }) => {
  const navigate = useNavigate();
  const changePercent = mover.change_percent ?? 0;
  const currentPrice = mover.current_price ?? 0;
  const volume = mover.volume ?? 0;
  const isPositive = changePercent >= 0;

  return (
    <button
      onClick={() => navigate(`/company/${mover.symbol}`)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-200 dark:border-gray-700 w-full text-left"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {mover.image_url && (
            <img
              src={mover.image_url}
              alt={mover.company_name}
              className="w-12 h-12 rounded object-contain bg-white dark:bg-gray-100 border border-gray-200 dark:border-gray-600 p-1 flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {mover.symbol}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {mover.company_name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {mover.sector || 'N/A'}
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
            ${currentPrice.toFixed(2)}
          </div>
          <div className={`text-sm font-medium ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
        Volume: {(volume / 1000000).toFixed(2)}M
      </div>
    </button>
  );
};

export default MoverCard;