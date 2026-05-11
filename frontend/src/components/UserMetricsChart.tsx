import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserMetric {
  name: string;
  data: {
    date: string;
    fiscal_year: string;
    period: string;
    quarter: string;
    value: number;
  }[];
}

interface UserMetricsChartProps {
  metrics: UserMetric[];
}

// Same color palette as RevenueSegmentChart
const METRIC_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

const formatMetricName = (name: string): string => {
  // Convert camelCase to readable format
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

const formatValue = (value: number): string => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
};

const UserMetricsChart: React.FC<UserMetricsChartProps> = ({ metrics }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number>(5);

  if (!metrics || metrics.length === 0) {
    return null;
  }

  // Transform data for chart - combine all metrics into chart data points
  const transformData = (years: number) => {
    const dataMap = new Map<string, any>();

    metrics.forEach((metric) => {
      // Filter by years
      const latestYear = Math.max(...metric.data.map(d => parseInt(d.fiscal_year)));
      const cutoffYear = latestYear - years;

      metric.data
        .filter(d => parseInt(d.fiscal_year) > cutoffYear)
        .forEach(point => {
          const key = `${point.fiscal_year} ${point.quarter}`;

          if (!dataMap.has(key)) {
            dataMap.set(key, {
              label: key,
              fiscal_year: point.fiscal_year,
              quarter: point.quarter,
            });
          }

          dataMap.get(key)[metric.name] = point.value;
        });
    });

    // Sort by fiscal year and quarter
    return Array.from(dataMap.values()).sort((a, b) => {
      const yearDiff = parseInt(a.fiscal_year) - parseInt(b.fiscal_year);
      if (yearDiff !== 0) return yearDiff;

      const quarterOrder: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4, FY: 5 };
      return (quarterOrder[a.quarter] || 0) - (quarterOrder[b.quarter] || 0);
    });
  };

  const chartData = transformData(isExpanded ? selectedYears : 5);

  const ChartContent = ({ height }: { height: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={formatValue}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatValue(value), formatMetricName(name)]}
          contentStyle={{ fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {metrics.map((metric, index) => (
          <Bar
            key={metric.name}
            dataKey={metric.name}
            name={formatMetricName(metric.name)}
            fill={METRIC_COLORS[index % METRIC_COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-8"
        onClick={() => setIsExpanded(false)}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Metrics</h3>
            <div className="flex items-center gap-4">
              {/* Year filter buttons */}
              <div className="flex gap-2">
                {[1, 2, 3, 5].map((years) => (
                  <button
                    key={years}
                    onClick={() => setSelectedYears(years)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      selectedYears === years
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {years}Y
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
          <ChartContent height={600} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 relative transition-colors duration-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">User Metrics</h3>
        <button
          onClick={() => setIsExpanded(true)}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          title="Expand chart"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
      <ChartContent height={250} />
    </div>
  );
};

export default UserMetricsChart;
