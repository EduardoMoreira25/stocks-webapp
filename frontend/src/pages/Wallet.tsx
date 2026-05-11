import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { apiService } from '../services/api';
import type { Portfolio, PortfolioHoldings, Transaction, PortfolioPerformance } from '../types';

// Colors for the pie chart
const CHART_COLORS = [
  '#f97316', // orange-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#ef4444', // red-500
  '#6366f1', // indigo-500
];

// Performance Card Component with time period filters
type PerformancePeriod = 'YTD' | '1Y' | '2Y' | '5Y';

interface PerformanceCardProps {
  performance: PortfolioPerformance | null;
  formatCurrency: (value: number | undefined | null) => string;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({ performance, formatCurrency }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PerformancePeriod>('YTD');

  if (!performance) return null;

  const periods: PerformancePeriod[] = ['YTD', '1Y', '2Y', '5Y'];
  const currentPerf = performance.performance[selectedPeriod];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Portfolio Performance</h2>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {currentPerf ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Invested ({selectedPeriod})</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(currentPerf.start_value)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              since {new Date(currentPerf.start_date).toLocaleDateString()}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Value</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(currentPerf.current_value)}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Return ({selectedPeriod})</p>
            <p className={`text-xl font-bold ${currentPerf.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentPerf.change_percent >= 0 ? '+' : ''}{currentPerf.change_percent.toFixed(2)}%
            </p>
            <p className={`text-sm ${currentPerf.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentPerf.change >= 0 ? '+' : ''}{formatCurrency(currentPerf.change)}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No transactions in {selectedPeriod} period</p>
        </div>
      )}
    </div>
  );
};

// Allocation Chart Component with toggle between stocks and sectors
interface AllocationChartProps {
  holdings: PortfolioHoldings;
  navigate: (path: string) => void;
  formatCurrency: (value: number | undefined | null) => string;
}

const AllocationChart: React.FC<AllocationChartProps> = ({ holdings, navigate, formatCurrency }) => {
  const [viewMode, setViewMode] = useState<'stocks' | 'sectors'>('stocks');

  // Calculate sector allocation
  const sectorData = React.useMemo(() => {
    const sectorMap: { [key: string]: number } = {};

    holdings.holdings.forEach((holding) => {
      const sector = holding.sector || 'Unknown';
      sectorMap[sector] = (sectorMap[sector] || 0) + (holding.current_value || 0);
    });

    return Object.entries(sectorMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [holdings.holdings]);

  const stockData = holdings.holdings.map((h) => ({
    name: h.symbol,
    value: h.current_value || 0,
    company_name: h.company_name,
  }));

  const chartData = viewMode === 'stocks' ? stockData : sectorData;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 p-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Portfolio Allocation</h2>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('stocks')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'stocks'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            By Stock
          </button>
          <button
            onClick={() => setViewMode('sectors')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'sectors'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            By Sector
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Pie Chart */}
        <div className="w-full md:w-1/2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                onClick={(data) => viewMode === 'stocks' && navigate(`/company/${data.name}`)}
                style={{ cursor: viewMode === 'stocks' ? 'pointer' : 'default' }}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="w-full md:w-1/2">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {chartData.map((item, index) => {
              const percentage = holdings.total_value > 0
                ? (item.value / holdings.total_value * 100).toFixed(1)
                : '0.0';
              return (
                <div
                  key={item.name}
                  onClick={() => viewMode === 'stocks' && navigate(`/company/${item.name}`)}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    viewMode === 'stocks'
                      ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.name}
                      </span>
                      {viewMode === 'stocks' && 'company_name' in item && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 truncate">
                          {(item as typeof stockData[0]).company_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {percentage}%
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [holdings, setHoldings] = useState<PortfolioHoldings | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showNewPortfolioModal, setShowNewPortfolioModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');

  // Transaction form state
  const [txSymbol, setTxSymbol] = useState('');
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [txQuantity, setTxQuantity] = useState('');
  const [txPrice, setTxPrice] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNotes, setTxNotes] = useState('');

  // Load portfolios on mount
  useEffect(() => {
    loadPortfolios();
  }, []);

  // Load holdings when portfolio changes
  useEffect(() => {
    if (selectedPortfolioId) {
      loadPortfolioData(selectedPortfolioId);
    }
  }, [selectedPortfolioId]);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPortfolios();
      setPortfolios(data.portfolios);
      if (data.portfolios.length > 0 && !selectedPortfolioId) {
        setSelectedPortfolioId(data.portfolios[0].id);
      }
    } catch (err) {
      setError('Failed to load portfolios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolioData = async (portfolioId: number) => {
    try {
      setLoading(true);
      const [holdingsData, txData, perfData] = await Promise.all([
        apiService.getPortfolioHoldings(portfolioId),
        apiService.getPortfolioTransactions(portfolioId),
        apiService.getPortfolioPerformance(portfolioId).catch(() => null)
      ]);
      setHoldings(holdingsData);
      setTransactions(txData.transactions);
      setPerformance(perfData);
    } catch (err) {
      setError('Failed to load portfolio data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    try {
      const portfolio = await apiService.createPortfolio(
        newPortfolioName,
        newPortfolioDescription || undefined
      );
      setPortfolios([portfolio, ...portfolios]);
      setSelectedPortfolioId(portfolio.id);
      setShowNewPortfolioModal(false);
      setNewPortfolioName('');
      setNewPortfolioDescription('');
    } catch (err) {
      setError('Failed to create portfolio');
      console.error(err);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolioId) return;
    if (!confirm('Are you sure you want to delete this portfolio and all its transactions?')) return;

    try {
      await apiService.deletePortfolio(selectedPortfolioId);
      const remaining = portfolios.filter(p => p.id !== selectedPortfolioId);
      setPortfolios(remaining);
      setSelectedPortfolioId(remaining.length > 0 ? remaining[0].id : null);
      setHoldings(null);
      setTransactions([]);
    } catch (err) {
      setError('Failed to delete portfolio');
      console.error(err);
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedPortfolioId || !txSymbol || !txQuantity || !txPrice) return;

    try {
      await apiService.addTransaction(selectedPortfolioId, {
        symbol: txSymbol.toUpperCase(),
        transaction_type: txType,
        quantity: parseFloat(txQuantity),
        price_per_share: parseFloat(txPrice),
        transaction_date: txDate,
        notes: txNotes || undefined
      });

      // Reload portfolio data
      await loadPortfolioData(selectedPortfolioId);

      // Reset form
      setShowAddTransactionModal(false);
      setTxSymbol('');
      setTxQuantity('');
      setTxPrice('');
      setTxNotes('');
      setTxType('BUY');
    } catch (err) {
      setError('Failed to add transaction');
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!selectedPortfolioId) return;
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await apiService.deleteTransaction(selectedPortfolioId, transactionId);
      await loadPortfolioData(selectedPortfolioId);
    } catch (err) {
      setError('Failed to delete transaction');
      console.error(err);
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatPL = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(value)}`;
  };

  const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Get the most recent transaction date
  const lastInvestmentDate = transactions.length > 0
    ? transactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())[0].transaction_date
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Wallet</h1>
        <div className="flex gap-3">
          {/* Portfolio Selector */}
          <select
            value={selectedPortfolioId || ''}
            onChange={(e) => setSelectedPortfolioId(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {portfolios.length === 0 && <option value="">No portfolios</option>}
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* New Portfolio Button */}
          <button
            onClick={() => setShowNewPortfolioModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            + New Portfolio
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {loading && portfolios.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No portfolios yet. Create one to get started!</p>
          <button
            onClick={() => setShowNewPortfolioModal(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Create Your First Portfolio
          </button>
        </div>
      ) : (
        <>
          {/* Portfolio Summary */}
          {holdings && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Investment</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {lastInvestmentDate ? formatDateLong(lastInvestmentDate) : '-'}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(holdings.total_cost)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Unrealized P/L</p>
                <p className={`text-2xl font-bold ${holdings.total_unrealized_pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPL(holdings.total_unrealized_pl)}
                  <span className="text-sm ml-1">({formatPercent(holdings.total_unrealized_pl_percent)})</span>
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Realized P/L</p>
                <p className={`text-2xl font-bold ${holdings.realized_pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPL(holdings.realized_pl)}
                </p>
              </div>
            </div>
          )}

          {/* Performance Card */}
          <PerformanceCard performance={performance} formatCurrency={formatCurrency} />

          {/* Holdings Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Holdings</h2>
              <button
                onClick={() => setShowAddTransactionModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                + Add Transaction
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shares</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P/L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P/L %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {holdings?.holdings.map((holding) => (
                    <tr key={holding.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4">
                        <div
                          onClick={() => navigate(`/company/${holding.symbol}`)}
                          className="cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                        >
                          <div className="font-semibold text-gray-900 dark:text-gray-100 hover:text-orange-600 dark:hover:text-orange-400">{holding.symbol}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-300">{holding.company_name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-900 dark:text-gray-100">{holding.shares.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right text-gray-900 dark:text-gray-100">{formatCurrency(holding.avg_cost)}</td>
                      <td className="px-4 py-4 text-right text-gray-900 dark:text-gray-100">{formatCurrency(holding.current_price)}</td>
                      <td className="px-4 py-4 text-right text-gray-900 dark:text-gray-100">{formatCurrency(holding.current_value)}</td>
                      <td className={`px-4 py-4 text-right font-semibold ${(holding.unrealized_pl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPL(holding.unrealized_pl)}
                      </td>
                      <td className={`px-4 py-4 text-right font-semibold ${(holding.unrealized_pl_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(holding.unrealized_pl_percent)}
                      </td>
                    </tr>
                  ))}
                  {holdings?.holdings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No holdings yet. Add a transaction to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Portfolio Allocation Pie Chart */}
          {holdings && holdings.holdings.length > 0 && (
            <AllocationChart
              holdings={holdings}
              navigate={navigate}
              formatCurrency={formatCurrency}
            />
          )}

          {/* Transaction History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Transaction History</h2>
              <button
                onClick={handleDeletePortfolio}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Delete Portfolio
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{tx.transaction_date}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          tx.transaction_type === 'BUY'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{tx.symbol}</td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{tx.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(tx.price_per_share)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(tx.quantity * tx.price_per_share)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{tx.notes || '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* New Portfolio Modal */}
      {showNewPortfolioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Portfolio</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="e.g., Retirement, Growth, Dividends"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  value={newPortfolioDescription}
                  onChange={(e) => setNewPortfolioDescription(e.target.value)}
                  placeholder="Brief description of this portfolio"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewPortfolioModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePortfolio}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Transaction</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setTxType('BUY')}
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    txType === 'BUY'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setTxType('SELL')}
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    txType === 'SELL'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  SELL
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol</label>
                <input
                  type="text"
                  value={txSymbol}
                  onChange={(e) => setTxSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={txQuantity}
                    onChange={(e) => setTxQuantity(e.target.value)}
                    placeholder="10"
                    step="0.000001"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price per Share</label>
                  <input
                    type="number"
                    value={txPrice}
                    onChange={(e) => setTxPrice(e.target.value)}
                    placeholder="150.00"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g., Q4 earnings play"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddTransactionModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTransaction}
                className={`px-4 py-2 text-white rounded-lg ${
                  txType === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {txType === 'BUY' ? 'Buy' : 'Sell'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
