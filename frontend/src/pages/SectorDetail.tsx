import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';

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

const SectorDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [companies, setCompanies] = useState<SectorCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());

  const meta = SECTOR_META[slug ?? ''];
  const sectorName = meta?.name ?? (slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ?? '');

  useEffect(() => {
    if (!sectorName) return;
    setLoading(true);
    apiService.getCompaniesBySector(sectorName)
      .then(data => {
        setCompanies(data);
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

  // Group companies by industry, sort industries by total market cap
  const industryGroups: IndustryGroup[] = React.useMemo(() => {
    const map: Record<string, IndustryGroup> = {};
    for (const c of companies) {
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
  }, [companies]);

  const sectorTotal = industryGroups.reduce((sum, g) => sum + g.total_market_cap, 0);
  const maxIndustryMC = industryGroups[0]?.total_market_cap ?? 0;

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

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No companies found in this sector.
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
