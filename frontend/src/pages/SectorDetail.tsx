import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import type { CompanyKpiData } from '../types';

interface SectorCompany {
  symbol: string;
  company_name: string;
  image_url?: string;
  industry?: string;
  market_cap?: number | null;
}

interface IndustryGroup {
  name: string;
  total_market_cap: number;
  companies: SectorCompany[];
}

const SECTOR_META: Record<string, { emoji: string; name: string }> = {
  'real-estate':            { emoji: '🏠', name: 'Real Estate' },
  'healthcare':             { emoji: '🏥', name: 'Healthcare' },
  'basic-materials':        { emoji: '🧪', name: 'Basic Materials' },
  'industrials':            { emoji: '⚙️', name: 'Industrials' },
  'consumer-cyclical':      { emoji: '🛍️', name: 'Consumer Cyclical' },
  'energy':                 { emoji: '⚡', name: 'Energy' },
  'utilities':              { emoji: '🚰', name: 'Utilities' },
  'technology':             { emoji: '💻', name: 'Technology' },
  'consumer-defensive':     { emoji: '🍞', name: 'Consumer Defensive' },
  'financial-services':     { emoji: '🏦', name: 'Financial Services' },
  'communication-services': { emoji: '📡', name: 'Communication Services' },
};

function formatMarketCap(value: number | null | undefined): string | null {
  if (!value) return null;
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

// ─── KPI Filter types & config ─────────────────────────────────────────────

type Operator = '>' | '>=' | '<' | '<=' | '=';

interface FilterRow {
  id: number;
  kpi: keyof CompanyKpiData;
  op: Operator;
  value: string;
}

interface KpiOption {
  value: keyof CompanyKpiData;
  label: string;
  unit: string;
  scale: number; // user input × scale = DB value
}

const KPI_OPTIONS: KpiOption[] = [
  // Profitability
  { value: 'net_margin',              label: 'Net Margin',           unit: '%',  scale: 0.01 },
  { value: 'gross_margin',            label: 'Gross Margin',         unit: '%',  scale: 0.01 },
  { value: 'operating_margin',        label: 'Operating Margin',     unit: '%',  scale: 0.01 },
  { value: 'roe',                     label: 'ROE',                  unit: '%',  scale: 0.01 },
  { value: 'roa',                     label: 'ROA',                  unit: '%',  scale: 0.01 },
  { value: 'roic',                    label: 'ROIC',                 unit: '%',  scale: 0.01 },
  // Liquidity
  { value: 'current_ratio',           label: 'Current Ratio',        unit: 'x',  scale: 1 },
  { value: 'cash_ratio',              label: 'Cash Ratio',           unit: 'x',  scale: 1 },
  // Leverage
  { value: 'debt_to_equity',          label: 'Debt / Equity',        unit: 'x',  scale: 1 },
  { value: 'debt_to_assets',          label: 'Debt / Assets',        unit: 'x',  scale: 1 },
  // Cash Flow
  { value: 'fcf_ttm',                 label: 'FCF Yield (TTM)',      unit: '%',  scale: 0.01 },
  { value: 'sbc_impact_on_fcf',       label: 'SBC Impact on FCF',   unit: '%',  scale: 0.01 },
  // Valuation
  { value: 'pe_ratio_ttm',            label: 'P/E Ratio (TTM)',      unit: 'x',  scale: 1 },
  { value: 'pb_ratio',                label: 'P/B Ratio',            unit: 'x',  scale: 1 },
  { value: 'ev_to_ebitda_ttm',        label: 'EV / EBITDA (TTM)',    unit: 'x',  scale: 1 },
  { value: 'market_cap',              label: 'Market Cap',           unit: 'B',  scale: 1e9 },
  // Financials (FY, in billions)
  { value: 'revenue',                 label: 'Revenue (FY)',         unit: 'B',  scale: 1e9 },
  { value: 'net_income',              label: 'Net Income (FY)',      unit: 'B',  scale: 1e9 },
  { value: 'ebitda',                  label: 'EBITDA (FY)',          unit: 'B',  scale: 1e9 },
  { value: 'operating_expenses',      label: 'OpEx (FY)',            unit: 'B',  scale: 1e9 },
  { value: 'free_cash_flow',          label: 'Free Cash Flow (FY)',  unit: 'B',  scale: 1e9 },
  { value: 'eps_diluted',             label: 'EPS Diluted (FY)',     unit: '$',  scale: 1 },
  // Balance Sheet
  { value: 'cash_and_cash_equivalents', label: 'Cash & Equiv. (FY)', unit: 'B', scale: 1e9 },
  { value: 'total_debt',              label: 'Total Debt (FY)',      unit: 'B',  scale: 1e9 },
  { value: 'net_debt',                label: 'Net Debt (FY)',        unit: 'B',  scale: 1e9 },
];

const OPERATORS: { value: Operator; label: string }[] = [
  { value: '>=', label: '>=' },
  { value: '>',  label: '>' },
  { value: '<=', label: '<=' },
  { value: '<',  label: '<' },
  { value: '=',  label: '=' },
];

function passesFilter(dbValue: number | null, op: Operator, userInput: number, scale: number): boolean {
  if (dbValue === null) return false;
  const threshold = userInput * scale;
  switch (op) {
    case '>':  return dbValue > threshold;
    case '>=': return dbValue >= threshold;
    case '<':  return dbValue < threshold;
    case '<=': return dbValue <= threshold;
    case '=':  return Math.abs(dbValue - threshold) <= Math.abs(threshold) * 1e-6 + 1e-12;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

const SectorDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [companies, setCompanies] = useState<SectorCompany[]>([]);
  const [companyKpis, setCompanyKpis] = useState<Record<string, CompanyKpiData>>({});
  const [loading, setLoading] = useState(true);
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [nextId, setNextId] = useState(0);

  const meta = SECTOR_META[slug ?? ''];
  const sectorName = meta?.name ?? (slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ?? '');

  useEffect(() => {
    if (!sectorName) return;
    setLoading(true);
    setCompanyKpis({});
    setFilters([]);

    Promise.all([
      apiService.getCompaniesBySector(sectorName),
      apiService.getSectorCompanyKpis(sectorName),
    ])
      .then(([companiesData, kpisData]) => {
        setCompanies(companiesData);
        const map: Record<string, CompanyKpiData> = {};
        kpisData.forEach(k => { map[k.symbol] = k; });
        setCompanyKpis(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sectorName]);

  const toggleIndustry = (name: string) => {
    setExpandedIndustries(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  // Active filters: rows with a valid numeric value
  const activeFilters = filters.filter(f => f.value.trim() !== '' && !isNaN(parseFloat(f.value)));

  // Group companies by industry, applying KPI filters first
  const industryGroups: IndustryGroup[] = React.useMemo(() => {
    const activeF = filters.filter(f => f.value.trim() !== '' && !isNaN(parseFloat(f.value)));

    const visible = activeF.length === 0
      ? companies
      : companies.filter(c => {
          const kpi = companyKpis[c.symbol];
          if (!kpi) return false;
          return activeF.every(f => {
            const opt = KPI_OPTIONS.find(o => o.value === f.kpi)!;
            const dbVal = kpi[f.kpi] as number | null;
            return passesFilter(dbVal, f.op, parseFloat(f.value), opt.scale);
          });
        });

    const map: Record<string, IndustryGroup> = {};
    for (const c of visible) {
      const key = c.industry ?? 'Other';
      if (!map[key]) map[key] = { name: key, total_market_cap: 0, companies: [] };
      map[key].companies.push(c);
      map[key].total_market_cap += c.market_cap ?? 0;
    }
    return Object.values(map)
      .sort((a, b) => b.total_market_cap - a.total_market_cap)
      .map(g => ({
        ...g,
        companies: [...g.companies].sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0)),
      }));
  }, [companies, companyKpis, filters]);

  const sectorTotal = industryGroups.reduce((sum, g) => sum + g.total_market_cap, 0);
  const maxIndustryMC = industryGroups[0]?.total_market_cap ?? 0;
  const filteredCount = industryGroups.reduce((sum, g) => sum + g.companies.length, 0);

  const addFilter = () => {
    setFilters(prev => [...prev, { id: nextId, kpi: 'net_margin', op: '>=', value: '' }]);
    setNextId(n => n + 1);
  };

  const updateFilter = (id: number, patch: Partial<FilterRow>) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const removeFilter = (id: number) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/sectors"
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          {meta && <span className="text-3xl">{meta.emoji}</span>}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sectorName}</h1>
            {!loading && sectorTotal > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatMarketCap(sectorTotal)} total · {companies.length} companies · {industryGroups.length} industries
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI Filter Panel */}
      {!loading && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              KPI Filters
            </span>
            <button
              onClick={addFilter}
              className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Filter
            </button>
          </div>

          {filters.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No filters active. Click "Add Filter" to narrow companies by financial metrics.
            </p>
          ) : (
            <div className="space-y-2">
              {filters.map(f => {
                const opt = KPI_OPTIONS.find(o => o.value === f.kpi)!;
                return (
                  <div key={f.id} className="flex items-center gap-2 flex-wrap">
                    {/* KPI selector */}
                    <select
                      value={f.kpi}
                      onChange={e => updateFilter(f.id, { kpi: e.target.value as keyof CompanyKpiData })}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {KPI_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    {/* Operator selector */}
                    <select
                      value={f.op}
                      onChange={e => updateFilter(f.id, { op: e.target.value as Operator })}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 w-16 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {OPERATORS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    {/* Value input */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={f.value}
                        onChange={e => updateFilter(f.id, { value: e.target.value })}
                        placeholder="0"
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-4">{opt.unit}</span>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFilter(f.id)}
                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      aria-label="Remove filter"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeFilters.length > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">{filteredCount}</span>
                {' '}of{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">{companies.length}</span>
                {' '}companies match
              </p>
              <button
                onClick={() => setFilters([])}
                className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No companies found in this sector.
        </div>
      ) : industryGroups.length === 0 && activeFilters.length > 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400 gap-2">
          <p>No companies match the active filters.</p>
          <button
            onClick={() => setFilters([])}
            className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {industryGroups.map(group => {
            const barPct = maxIndustryMC > 0 ? (group.total_market_cap / maxIndustryMC) * 100 : 0;
            const sectorPct = sectorTotal > 0 ? (group.total_market_cap / sectorTotal * 100).toFixed(1) : '0';
            const isExpanded = expandedIndustries.has(group.name);

            return (
              <div key={group.name} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Industry header — clickable to collapse */}
                <button
                  onClick={() => toggleIndustry(group.name)}
                  className="w-full px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{group.companies.length} companies</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{formatMarketCap(group.total_market_cap)}</span>
                      <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">{sectorPct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 dark:bg-teal-400 rounded-full"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </button>

                {/* Company list */}
                {isExpanded && (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
                    {group.companies.map(company => (
                      <li key={company.symbol}>
                        <Link
                          to={`/company/${company.symbol}`}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex-shrink-0">
                            {company.image_url ? (
                              <img
                                src={company.image_url}
                                alt={company.symbol}
                                className="w-9 h-9 rounded object-contain bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-1"
                                onError={e => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-9 h-9 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 ${company.image_url ? 'hidden' : ''}`}>
                              {company.symbol.slice(0, 2)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{company.company_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{company.symbol}</div>
                          </div>

                          {company.market_cap && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                              {formatMarketCap(company.market_cap)}
                            </div>
                          )}

                          <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SectorDetail;