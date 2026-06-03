import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import MoverCard from '../components/MoverCard';
import VolumeCard from '../components/VolumeCard';
import type { DashboardData, Mover } from '../types';

// ─── Reusable section ────────────────────────────────────────────────────────

const MoversSection: React.FC<{
  title: string;
  date: string;
  winners: Mover[];
  losers: Mover[];
  volume?: Mover[];
}> = ({ title, date, winners, losers, volume }) => (
  <section className="mb-12">
    <div className="flex items-baseline gap-3 mb-1">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      <span className="text-sm text-gray-400 dark:text-gray-500">{date}</span>
    </div>

    {/* Winners + Losers side by side */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      {/* Gainers */}
      <div>
        <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <span>📈</span> Top Gainers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {winners.map(m => <MoverCard key={m.symbol} mover={m} />)}
        </div>
      </div>

      {/* Losers */}
      <div>
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <span>📉</span> Top Losers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {losers.map(m => <MoverCard key={m.symbol} mover={m} />)}
        </div>
      </div>
    </div>

    {/* Volume — today only */}
    {volume && volume.length > 0 && (
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <span>🔥</span> Most Traded
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {volume.map(m => <VolumeCard key={m.symbol} mover={m} />)}
        </div>
      </div>
    )}
  </section>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiService.getDashboardData(6)
      .then(setData)
      .catch(err => {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load market data. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading market data…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-xl text-red-600 dark:text-red-400">{error ?? 'No data available.'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MoversSection
          title="Top Movers Today"
          date={data.as_of_date}
          winners={data.today.winners}
          losers={data.today.losers}
          volume={data.today.volume}
        />
        <MoversSection
          title="Top Movers This Week"
          date={data.week.comparison_date ? `vs ${data.week.comparison_date}` : ''}
          winners={data.week.winners}
          losers={data.week.losers}
        />
        <MoversSection
          title="Top Movers This Month"
          date={data.month.comparison_date ? `vs ${data.month.comparison_date}` : ''}
          winners={data.month.winners}
          losers={data.month.losers}
        />
      </div>
    </div>
  );
};

export default Dashboard;