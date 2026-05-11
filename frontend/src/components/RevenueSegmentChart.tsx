import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RevenueSegmentChartProps {
  title: string;
  data: any[];
  segmentType: 'product' | 'geographic' | 'units';
}

const PRODUCT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
];

const GEOGRAPHIC_COLORS = [
  '#0ea5e9', // sky blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#8b5cf6', // violet
];

const UNITS_COLORS = [
  '#0d9488', // teal
  '#3b82f6', // blue
  '#f97316', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
];

const RevenueSegmentChart: React.FC<RevenueSegmentChartProps> = ({
  title,
  data,
  segmentType
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number>(5);

  if (!data || data.length === 0) {
    return null;
  }

  // Filter data based on selected years
  const filterDataByYears = (data: any[], years: number) => {
    if (data.length === 0) return data;

    // Get the latest fiscal year in the data
    const latestYear = Math.max(...data.map(d => d.fiscal_year));
    const cutoffYear = latestYear - years;

    return data.filter(d => d.fiscal_year > cutoffYear);
  };

  const filteredData = isExpanded ? filterDataByYears(data, selectedYears) : data;

  // Get all unique segment names from the data
  const segmentNames = Array.from(
    new Set(
      filteredData.flatMap(period => Object.keys(period).filter(key =>
        key !== 'date' && key !== 'period' && key !== 'fiscal_year' && key !== 'quarter' && key !== 'label'
      ))
    )
  ) as string[];

  const colors = segmentType === 'units'
    ? UNITS_COLORS
    : segmentType === 'product'
      ? PRODUCT_COLORS
      : GEOGRAPHIC_COLORS;

  const formatValue = (value: number) => {
    if (segmentType === 'units') {
      // Format as units sold (no currency symbol)
      return value.toFixed(0);
    }
    const absValue = Math.abs(value);
    if (absValue >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (absValue >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  const ChartContent = ({ height }: { height: number }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={filteredData}>
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
          formatter={(value: number, name: string) => [formatValue(value), name]}
          contentStyle={{ fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {segmentNames.map((segmentName, index) => (
          <Bar
            key={segmentName}
            dataKey={segmentName}
            fill={colors[index % colors.length]}
            stackId="revenue"
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
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
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
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
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

export default RevenueSegmentChart;