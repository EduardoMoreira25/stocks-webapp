import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import MiniChart from '../components/MiniChart';
import RevenueSegmentChart from '../components/RevenueSegmentChart';
import UserMetricsChart from '../components/UserMetricsChart';
import type { CompanyDetail, ChartDataPoint, FinancialData, SymbolTransaction } from '../types';

type TimePeriod = '1W' | '1M' | '6M' | '1Y' | '5Y';

const CompanyDetailPage: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [priceData, setPriceData] = useState<ChartDataPoint[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [revenueSegments, setRevenueSegments] = useState<any>(null);
  const [userSegments, setUserSegments] = useState<any>(null);
  const [transactions, setTransactions] = useState<SymbolTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1Y');
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SymbolTransaction | null>(null);
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    if (symbol) {
      loadCompanyData(symbol);
      apiService.getWatchlistStatus(symbol)
        .then(s => setOnWatchlist(s.on_watchlist))
        .catch(() => {});
    }
  }, [symbol]);

  const loadCompanyData = async (sym: string) => {
    try {
      setLoading(true);
      const [companyData, chartData, financials, segments, users, txData] = await Promise.all([
        apiService.getCompanyDetail(sym),
        apiService.getChartData(sym, selectedPeriod),
        apiService.getCompanyFinancials(sym, 'ALL', 10),
        apiService.getRevenueSegments(sym).catch(() => null),
        apiService.getUserSegments(sym).catch(() => null),
        apiService.getTransactionsBySymbol(sym).catch(() => ({ transactions: [] })),
      ]);

      setCompany(companyData);
      setPriceData(chartData.data);
      // Data already comes in ASC order (oldest to newest) from API
      setFinancialData(financials.data);
      setRevenueSegments(segments);
      setUserSegments(users);
      setTransactions(txData.transactions || []);
    } catch (error) {
      console.error('Failed to load company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchlist = async () => {
    if (!symbol || watchlistLoading) return;
    setWatchlistLoading(true);
    try {
      if (onWatchlist) {
        await apiService.removeFromWatchlist(symbol);
        setOnWatchlist(false);
      } else {
        await apiService.addToWatchlist(symbol);
        setOnWatchlist(true);
      }
    } catch (err) {
      console.error('Watchlist toggle failed:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handlePeriodChange = async (period: TimePeriod) => {
    if (!symbol || period === selectedPeriod) return;

    try {
      setLoadingChart(true);
      setSelectedPeriod(period);
      const chartData = await apiService.getChartData(symbol, period);
      setPriceData(chartData.data);
    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setLoadingChart(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading company data...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600 dark:text-red-400">Company not found</div>
      </div>
    );
  }

  // Calculate percentage change based on selected period
  const calculatePeriodChange = () => {
    if (priceData.length < 2) return 0;

    // Use the last price in the chart data as the current price
    const latestPrice = priceData[priceData.length - 1]?.close ?? 0;
    const oldestPrice = priceData[0]?.close ?? 0;

    if (oldestPrice === 0 || latestPrice === 0) return 0;

    return ((latestPrice - oldestPrice) / oldestPrice) * 100;
  };

  const periodChange = calculatePeriodChange();
  const isPositive = periodChange >= 0;

  // Transform revenue segments data for charts - literal approach, use DB data as-is
  const transformSegmentData = (segments: any, segmentType: 'product' | 'geographic' | 'units') => {
    if (!segments || !segments.periods) return [];

    const transformed: any[] = [];

    segments.periods.forEach((periodData: any) => {
      const segmentData = periodData.data[segmentType];
      if (!segmentData || !segmentData.segments || segmentData.segments.length === 0) return;

      // Get fiscal_year and quarter directly from database (first segment has this info)
      const firstSegment = segmentData.segments[0];
      const fiscalYear = firstSegment.fiscal_year;
      const quarter = firstSegment.quarter; // Will be "FY", "Q1", "Q2", "Q3", or "Q4"

      // Use the quarter value directly from DB - it's already "FY" or "Q1", etc.
      const label = `${fiscalYear} ${quarter}`;

      const dataPoint: any = {
        date: periodData.date,
        fiscal_year: fiscalYear,
        quarter: quarter,
        label: label,
      };

      // Add each segment revenue as a property
      segmentData.segments.forEach((segment: any) => {
        dataPoint[segment.name] = segment.revenue;
      });

      transformed.push(dataPoint);
    });

    // Database returns DESC (newest first), reverse to get ASC (oldest first) for charts
    return transformed.reverse();
  };

  const productSegmentData = revenueSegments ? transformSegmentData(revenueSegments, 'product') : [];
  const geographicSegmentData = revenueSegments ? transformSegmentData(revenueSegments, 'geographic') : [];
  const unitsSegmentData = revenueSegments ? transformSegmentData(revenueSegments, 'units') : [];

  // Get transactions that fall within the current chart period
  const getTransactionsInPeriod = () => {
    if (!priceData.length || !transactions.length) return [];

    const chartStartDate = priceData[0]?.date;
    const chartEndDate = priceData[priceData.length - 1]?.date;

    return transactions.filter(tx => {
      const txDate = tx.transaction_date;
      return txDate >= chartStartDate && txDate <= chartEndDate;
    });
  };

  const visibleTransactions = getTransactionsInPeriod();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Company Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 transition-colors duration-200">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            {company.image_url && (
              <img
                src={company.image_url}
                alt={company.company_name}
                className="w-16 h-16 rounded-lg object-contain bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(company.company_name + ' company')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-3xl font-bold text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400 hover:underline transition-colors"
              >
                {company.company_name}
              </a>
              <div className="text-lg text-gray-600 dark:text-gray-400 mt-1">{company.symbol}</div>
              <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                <Link
                  to={`/sectors/${company.sector?.toLowerCase().replace(/\s+/g, '-')}`}
                  className="hover:text-teal-600 dark:hover:text-teal-400 hover:underline transition-colors"
                >
                  {company.sector}
                </Link>
                {' '}• {company.industry}
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              ${company.current_price?.toFixed(2) ?? 'N/A'}
            </div>
            <div className={`text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{periodChange.toFixed(2)}%
            </div>
            <button
              onClick={toggleWatchlist}
              disabled={watchlistLoading}
              title={onWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              className={`mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                onWatchlist
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-yellow-300 dark:hover:border-yellow-700 hover:text-yellow-500 dark:hover:text-yellow-400'
              } disabled:opacity-50`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill={onWatchlist ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {onWatchlist ? 'Watching' : 'Watch'}
            </button>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 transition-colors duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Price History</h2>
          <div className="flex gap-2">
            {(['1W', '1M', '6M', '1Y', '5Y'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                disabled={loadingChart}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } ${loadingChart ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {period === '1W' ? '1W' : period === '1M' ? '1M' : period === '6M' ? '6M' : period === '1Y' ? '1Y' : '5Y'}
              </button>
            ))}
          </div>
        </div>
        {loadingChart ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-gray-600 dark:text-gray-400">Loading chart...</div>
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" className="dark:opacity-30" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  tick={{ fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis
                  tick={{ fill: 'currentColor' }}
                  className="text-gray-600 dark:text-gray-400"
                  domain={[
                    (dataMin: number) => Math.floor(dataMin * 0.95),
                    (dataMax: number) => Math.ceil(dataMax * 1.05)
                  ]}
                />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                  contentStyle={{ backgroundColor: 'var(--tooltip-bg, white)', borderColor: 'var(--tooltip-border, #e5e7eb)' }}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    // Check if there's a transaction on this date
                    const tx = visibleTransactions.find(t => {
                      const txDate = t.transaction_date;
                      const pointDate = payload.date;
                      return txDate === pointDate ||
                        (new Date(txDate).toDateString() === new Date(pointDate).toDateString());
                    });

                    if (tx) {
                      const isBuy = tx.transaction_type === 'BUY';
                      const isSelected = selectedTransaction?.id === tx.id;
                      return (
                        <g key={`tx-${tx.id}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedTransaction(isSelected ? null : tx)}>
                          {/* Invisible larger circle for easier clicking */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={20}
                            fill="transparent"
                          />
                          {/* Visible dot */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isSelected ? 6 : 5}
                            fill={isBuy ? '#22c55e' : '#ef4444'}
                            stroke={isSelected ? '#000' : '#fff'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                        </g>
                      );
                    }
                    return <g key={`empty-${props.index}`} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Transaction info box */}
            {selectedTransaction && (
              <div
                className="absolute top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 z-10 min-w-[220px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedTransaction.transaction_type === 'BUY'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {selectedTransaction.transaction_type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(selectedTransaction.transaction_date).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedTransaction.quantity}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400">Price:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">${selectedTransaction.price_per_share.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400">Total:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      ${(selectedTransaction.quantity * selectedTransaction.price_per_share).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400">Portfolio:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedTransaction.portfolio_name}</span>
                  </div>
                  {selectedTransaction.notes && (
                    <div className="pt-1 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{selectedTransaction.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Company KPIs - Compact Layout */}
      {company.kpis && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Profitability Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">Profitability Metrics</h3>
            <div className="space-y-2">
              <CompactMetric label="Net Margin:" value={company.kpis.profitability.net_margin} suffix="%" slug="net-margin" />
              <CompactMetric label="ROE:" value={company.kpis.profitability.roe} suffix="%" slug="roe" />
              <CompactMetric label="ROA:" value={company.kpis.profitability.roa} suffix="%" slug="roa" />
              <CompactMetric label="Gross Margin:" value={company.kpis.profitability.gross_margin} suffix="%" slug="gross-margin" />
              <CompactMetric label="Operating Margin:" value={company.kpis.profitability.operating_margin} suffix="%" slug="operating-margin" />
              <CompactMetric label="ROIC:" value={company.kpis.profitability.roic} suffix="%" slug="roic" />
            </div>
          </div>

          {/* Liquidity Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">Liquidity Metrics</h3>
            <div className="space-y-2">
              <CompactMetric label="Current Ratio:" value={company.kpis.liquidity.current_ratio} slug="current-ratio" />
              <CompactMetric label="Cash Ratio:" value={company.kpis.liquidity.cash_ratio} slug="cash-ratio" />
            </div>
          </div>

          {/* Leverage/Solvency Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">Leverage/Solvency Metrics</h3>
            <div className="space-y-2">
              <CompactMetric label="Debt-to-Equity:" value={company.kpis.leverage.debt_to_equity} slug="debt-to-equity" />
              <CompactMetric label="Debt-to-Assets:" value={company.kpis.leverage.debt_to_assets} slug="debt-to-assets" />
            </div>
          </div>

          {/* Cash Flow Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">Cash Flow Metrics</h3>
            <div className="space-y-2">
              <CompactMetric label="FCF Yield:" value={company.kpis.cash_flow.ttm_fcf_yield} suffix="%" slug="fcf-yield" />
              <CompactMetric label="SBC Impact on FCF:" value={company.kpis.cash_flow.sbc_impact_on_fcf} suffix="%" slug="sbc-impact-on-fcf" />
            </div>
            {/* Warning for high SBC impact */}
            {company.kpis.cash_flow.sbc_impact_on_fcf && company.kpis.cash_flow.sbc_impact_on_fcf > 20 && (
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-800 dark:text-amber-300">
                <strong>⚠️ High SBC Impact:</strong> SBC represents{' '}
                {company.kpis.cash_flow.sbc_impact_on_fcf.toFixed(1)}% of FCF
              </div>
            )}
          </div>

          {/* Valuation Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">Valuation Metrics</h3>
            <div className="space-y-2">
              <CompactMetric label="Market Cap:" value={company.kpis.valuation.market_cap} formatFn={formatMarketCap} slug="market-cap" />
              <CompactMetric label="P/E Ratio:" value={company.kpis.valuation.ttm_pe_ratio} slug="pe-ratio" />
              <CompactMetric label="P/B Ratio:" value={company.kpis.valuation.pb_ratio} slug="pb-ratio" />
              <CompactMetric label="EV/EBITDA:" value={company.kpis.valuation.ttm_ev_ebitda} slug="ebitda" />
            </div>
          </div>
        </div>
      )}

      {/* Financial Charts */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Financial Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MiniChart
            title="Revenue"
            data={financialData}
            dataKey="revenue"
            color="#f97316"
            glossarySlug="revenue"
          />
          <MiniChart
            title="Net Income"
            data={financialData}
            dataKey="net_income"
            color="#3b82f6"
            glossarySlug="net-income"
          />
          <MiniChart
            title="EBITDA"
            data={financialData}
            dataKey="ebitda"
            color="#06b6d4"
            glossarySlug="ebitda"
          />
          <MiniChart
            title="Operating Expenses"
            data={financialData}
            dataKey="operating_expenses"
            color="#f59e0b"
            glossarySlug="operating-expenses"
          />
          <MiniChart
            title="EPS"
            data={financialData}
            dataKey="eps_diluted"
            color="#10b981"
            formatValue={(value) => `$${value.toFixed(2)}`}
            glossarySlug="eps"
          />
          <MiniChart
            title="ROA (Return on Assets)"
            data={financialData}
            dataKey="roa"
            color="#a855f7"
            formatValue={(value) => `${value.toFixed(2)}%`}
            glossarySlug="roa"
          />
          <MiniChart
            title="Cash & Debt"
            data={financialData}
            dataKey={["cash_and_cash_equivalents", "total_debt"]}
            color={["#14b8a6", "#ef4444"]}
            stacked={false}
            glossarySlug="cash-and-debt"
          />
          <MiniChart
            title="Free Cash Flow"
            data={financialData}
            dataKey="free_cash_flow"
            color="#8b5cf6"
            glossarySlug="free-cash-flow"
          />
          <MiniChart
            title="Dividends"
            data={financialData.map(d => ({
              ...d,
              dividends_paid_positive: Math.abs(d.dividends_paid || 0)
            }))}
            dataKey="dividends_paid_positive"
            color="#ec4899"
          />
        </div>
      </div>

      {/* Revenue Segments */}
      {(productSegmentData.length > 0 || geographicSegmentData.length > 0 || unitsSegmentData.length > 0) && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productSegmentData.length > 0 && (
              <RevenueSegmentChart
                title="Revenue by Product"
                data={productSegmentData}
                segmentType="product"
              />
            )}
            {geographicSegmentData.length > 0 && (
              <RevenueSegmentChart
                title="Revenue by Geography"
                data={geographicSegmentData}
                segmentType="geographic"
              />
            )}
            {unitsSegmentData.length > 0 && (
              <RevenueSegmentChart
                title="Units Sold"
                data={unitsSegmentData}
                segmentType="units"
              />
            )}
          </div>
        </div>
      )}

      {/* User Metrics (Subscribers, Memberships, etc.) */}
      {userSegments && userSegments.metrics && userSegments.metrics.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">User Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UserMetricsChart metrics={userSegments.metrics} />
          </div>
        </div>
      )}
    </div>
  );
};

const formatMarketCap = (marketCap: number | null | undefined) => {
  if (!marketCap) return 'N/A';
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
  return `$${marketCap.toLocaleString()}`;
};

interface CompactMetricProps {
  label: string;
  value?: number | null;
  suffix?: string;
  slug?: string;
  formatFn?: (value: number) => string;
}

const CompactMetric: React.FC<CompactMetricProps> = ({ label, value, suffix = '', slug, formatFn }) => {
  const hasValue = value !== null && value !== undefined;
  const displayValue = hasValue
    ? (formatFn ? formatFn(value) : `${value.toFixed(2)}${suffix}`)
    : 'N/A';

  return (
    <div className="flex justify-between items-center text-xs">
      {slug ? (
        <Link
          to={`/glossary/company/${slug}`}
          className="text-gray-600 dark:text-gray-400 hover:underline"
        >
          {label}
        </Link>
      ) : (
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
      )}
      <span className={`font-semibold ${hasValue ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
        {displayValue}
      </span>
    </div>
  );
};

export default CompanyDetailPage;