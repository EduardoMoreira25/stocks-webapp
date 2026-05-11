import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import MoverCard from '../components/MoverCard';
import type { MarketMoversResponse } from '../types';

const Dashboard: React.FC = () => {
  const [todayMovers, setTodayMovers] = useState<MarketMoversResponse | null>(null);
  const [weekMovers, setWeekMovers] = useState<MarketMoversResponse | null>(null);
  const [monthMovers, setMonthMovers] = useState<MarketMoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarketData();
  }, []);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      const [today, week, month] = await Promise.all([
        apiService.getMarketMovers(7),
        apiService.getWeeklyMovers(7),
        apiService.getMonthlyMovers(7),
      ]);
      
      setTodayMovers(today);
      setWeekMovers(week);
      setMonthMovers(month);
      setError(null);
    } catch (err) {
      console.error('Failed to load market data:', err);
      setError('Failed to load market data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Movers Today - 60% viewport */}
        <section className="mb-12" style={{ minHeight: '60vh' }}>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Top Movers Today</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Date: {todayMovers?.as_of_date}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-500 mb-4">📈 Top Gainers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayMovers?.winners.map((mover) => (
                <MoverCard key={mover.symbol} mover={mover} />
              ))}
            </div>
          </div>
        </section>

        {/* Top Movers This Week */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Top Movers This Week</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Date: {weekMovers?.as_of_date}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-500 mb-4">📈 Top Gainers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekMovers?.winners.map((mover) => (
                <MoverCard key={mover.symbol} mover={mover} />
              ))}
            </div>
          </div>
        </section>

        {/* Top Movers This Month */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Top Movers This Month</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Date: {monthMovers?.as_of_date}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-500 mb-4">📈 Top Gainers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthMovers?.winners.map((mover) => (
                <MoverCard key={mover.symbol} mover={mover} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;