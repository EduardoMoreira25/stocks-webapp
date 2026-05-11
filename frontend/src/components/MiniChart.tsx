import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MiniChartProps {
  title: string;
  data: any[];
  dataKey: string | string[]; // Support multiple data keys for stacked charts
  color: string | string[]; // Support multiple colors
  formatValue?: (value: number) => string;
  stacked?: boolean;
  glossarySlug?: string; // Optional link to glossary page
}

const MiniChart: React.FC<MiniChartProps> = ({
  title,
  data,
  dataKey,
  color,
  formatValue,
  stacked = false,
  glossarySlug
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultFormatter = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (absValue >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (absValue >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatter = formatValue || defaultFormatter;

  const ChartContent = ({ height }: { height: number }) => {
    const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey];
    const colors = Array.isArray(color) ? color : [color];

    // Add period label to each data point for display
    const dataWithLabels = data.map(item => ({
      ...item,
      period_label: item.period === 'FY' ? `FY${item.fiscal_year}` : `${item.fiscal_year}${item.period}`
    }));

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={dataWithLabels}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period_label"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatter}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatter(value), name]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                const item = payload[0].payload;
                return item.period === 'FY'
                  ? `FY ${item.fiscal_year}`
                  : `${item.fiscal_year} ${item.period}`;
              }
              return label;
            }}
          />
          {dataKeys.length > 1 && <Legend />}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index] || colors[0]}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-8"
        onClick={() => setIsExpanded(false)}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
          <ChartContent height={500} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 relative transition-colors duration-200">
      <div className="flex justify-between items-center mb-2">
        {glossarySlug ? (
          <Link
            to={`/glossary/company/${glossarySlug}`}
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:underline"
          >
            {title}
          </Link>
        ) : (
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
        )}
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
      <ChartContent height={180} />
    </div>
  );
};

export default MiniChart;