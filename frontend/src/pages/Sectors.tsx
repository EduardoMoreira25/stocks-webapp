import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { apiService } from '../services/api';
import type { SectorOverview, SectorMarketCap, SectorHistory, SeriesInfo } from '../types';

// ── constants ────────────────────────────────────────────────────────────────

const SECTOR_META: Record<string, { emoji: string; slug: string }> = {
  'Real Estate':             { emoji: '🏠', slug: 'real-estate' },
  'Healthcare':              { emoji: '🏥', slug: 'healthcare' },
  'Basic Materials':         { emoji: '🧪', slug: 'basic-materials' },
  'Industrials':             { emoji: '⚙️', slug: 'industrials' },
  'Consumer Cyclical':       { emoji: '🛍️', slug: 'consumer-cyclical' },
  'Energy':                  { emoji: '⚡', slug: 'energy' },
  'Utilities':               { emoji: '🚰', slug: 'utilities' },
  'Technology':              { emoji: '💻', slug: 'technology' },
  'Consumer Defensive':      { emoji: '🍞', slug: 'consumer-defensive' },
  'Financial Services':      { emoji: '🏦', slug: 'financial-services' },
  'Communication Services':  { emoji: '📡', slug: 'communication-services' },
};

// 11 maximally distinct hues spread across the color wheel
const SECTOR_COLORS: Record<string, string> = {
  'Technology':             '#2563eb',  // blue        ~217°
  'Financial Services':     '#059669',  // emerald     ~161°
  'Healthcare':             '#d97706',  // amber        ~38°
  'Consumer Cyclical':      '#7c3aed',  // violet      ~262°
  'Industrials':            '#64748b',  // slate-gray  neutral
  'Communication Services': '#db2777',  // pink        ~328°
  'Consumer Defensive':     '#65a30d',  // lime         ~84°
  'Energy':                 '#ea580c',  // deep orange  ~21°
  'Basic Materials':        '#0d9488',  // teal        ~175°
  'Utilities':              '#0284c7',  // sky blue    ~199°
  'Real Estate':            '#dc2626',  // red           ~0°
};

const PERIODS = ['1W', '1M', '6M', '1Y', '2Y', '5Y', '10Y', '15Y'] as const;
type Period = typeof PERIODS[number];
type View   = 'sector' | 'industry';

// ── color utils ───────────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function getIndustryColor(sectorHex: string, idx: number, total: number): string {
  const [h, s] = hexToHsl(sectorHex);
  const t = total <= 1 ? 0.5 : idx / (total - 1);
  // Span ±15° of hue around the sector base, lightness 36–64%
  const newH = (h - 15 + t * 30 + 360) % 360;
  const newL = 36 + t * 28;
  const newS = Math.max(s, 55);
  return hslToHex(newH, newS, newL);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`;
  return `$${value.toLocaleString()}`;
}

function fmtAxisCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(0)}T`;
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(0)}B`;
  return `$${value}`;
}

function fmtDate(dateStr: string, period: Period): string {
  const d = new Date(dateStr);
  if (period === '1W' || period === '1M')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (period === '6M' || period === '1Y')
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-US', { year: 'numeric' });
}

// ── component ─────────────────────────────────────────────────────────────────

const Sectors: React.FC = () => {
  const [overview, setOverview]           = useState<SectorOverview | null>(null);
  const [history, setHistory]             = useState<SectorHistory | null>(null);
  const [period, setPeriod]               = useState<Period>('1Y');
  const [view, setView]                   = useState<View>('sector');
  const [hidden, setHidden]               = useState<Set<string>>(new Set());
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [historyLoading, setHistoryLoading]   = useState(true);

  useEffect(() => {
    apiService.getSectorOverview()
      .then(setOverview)
      .catch(console.error)
      .finally(() => setOverviewLoading(false));
  }, []);

  useEffect(() => {
    setHistoryLoading(true);
    setHidden(new Set());
    apiService.getSectorHistory(period, view)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, [period, view]);

  const maxMarketCap = overview
    ? Math.max(...overview.sectors.map(s => s.total_market_cap))
    : 0;

  // Group series by sector (preserves API order within each sector)
  const seriesBySector = useMemo(() => {
    const map = new Map<string, SeriesInfo[]>();
    for (const s of history?.series ?? []) {
      if (!map.has(s.sector)) map.set(s.sector, []);
      map.get(s.sector)!.push(s);
    }
    return map;
  }, [history]);

  // Pre-compute a color for every series key
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (view === 'sector') {
      for (const s of history?.series ?? [])
        map.set(s.key, SECTOR_COLORS[s.key] ?? '#64748b');
    } else {
      for (const [sectorName, sectorSeries] of seriesBySector.entries()) {
        const base = SECTOR_COLORS[sectorName] ?? '#64748b';
        sectorSeries.forEach((s, idx) =>
          map.set(s.key, getIndustryColor(base, idx, sectorSeries.length))
        );
      }
    }
    return map;
  }, [history, view, seriesBySector]);

  const visibleSeries = useMemo(
    () => (history?.series ?? []).filter(s => !hidden.has(s.key)),
    [history, hidden]
  );

  const toggleSeries = (key: string) =>
    setHidden(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleSector = (sectorName: string) => {
    const keys = seriesBySector.get(sectorName)?.map(s => s.key) ?? [];
    const allHidden = keys.every(k => hidden.has(k));
    setHidden(prev => {
      const next = new Set(prev);
      allHidden
        ? keys.forEach(k => next.delete(k))
        : keys.forEach(k => next.add(k));
      return next;
    });
  };

  const allKeys   = history?.series.map(s => s.key) ?? [];
  const allHidden = allKeys.length > 0 && allKeys.every(k => hidden.has(k));
  const toggleAll = () => setHidden(allHidden ? new Set() : new Set(allKeys));

  const hasHistory = history && history.snapshots.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sectors</h1>
        {overview && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Total: {fmtCap(overview.total_market_cap)}
          </span>
        )}
      </div>

      {/* Chart card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mb-6">

        {/* Top controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">

          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 text-xs font-medium">
            {(['sector', 'industry'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md capitalize transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Period selector */}
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  period === p
                    ? 'bg-teal-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {historyLoading ? (
          <div className="h-72 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            Loading...
          </div>
        ) : !hasHistory ? (
          <div className="h-72 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No historical data yet — run the backfill to populate.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history!.snapshots} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis
                dataKey="date"
                tickFormatter={d => fmtDate(d, period)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={fmtAxisCap}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const sorted = [...payload].sort(
                    (a, b) => (b.value as number) - (a.value as number)
                  );
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl max-w-xs max-h-80 overflow-y-auto">
                      <p className="text-gray-400 mb-2">
                        {label ? fmtDate(String(label), period) : ''}
                      </p>
                      {sorted.map(entry => (
                        <div key={entry.dataKey as string} className="flex items-center justify-between gap-4 py-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                            <span className="text-gray-300 truncate">{entry.dataKey as string}</span>
                          </div>
                          <span className="text-white font-medium flex-shrink-0">
                            {fmtCap(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {visibleSeries.map(s => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={colorMap.get(s.key) ?? '#64748b'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Filter panel */}
        {hasHistory && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {view === 'sector' ? 'Sectors' : 'Industries'}
              </span>
              <button
                onClick={toggleAll}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {allHidden ? 'Show all' : 'Hide all'}
              </button>
            </div>

            {view === 'sector' ? (
              /* Sector view: simple 3-col checklist */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-0.5">
                {(history?.series ?? []).map(s => {
                  const isHidden = hidden.has(s.key);
                  const color = colorMap.get(s.key) ?? '#64748b';
                  return (
                    <button
                      key={s.key}
                      onClick={() => toggleSeries(s.key)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                    >
                      <span
                        className="flex-shrink-0 w-3 h-3 rounded-sm transition-opacity"
                        style={{ background: color, opacity: isHidden ? 0.2 : 1 }}
                      />
                      <span className={`text-sm truncate ${
                        isHidden ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {s.key}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Industry view: hierarchical grouped list */
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {Array.from(seriesBySector.entries()).map(([sectorName, sectorSeries]) => {
                  const base = SECTOR_COLORS[sectorName] ?? '#64748b';
                  const allSectorHidden  = sectorSeries.every(s => hidden.has(s.key));
                  const someSectorHidden = sectorSeries.some(s => hidden.has(s.key));
                  return (
                    <div key={sectorName}>
                      {/* Sector header — click to toggle all industries in this sector */}
                      <button
                        onClick={() => toggleSector(sectorName)}
                        className="flex items-center gap-2 w-full text-left py-0.5"
                      >
                        <span
                          className="flex-shrink-0 w-3 h-3 rounded-sm"
                          style={{
                            background: base,
                            opacity: allSectorHidden ? 0.2 : someSectorHidden ? 0.5 : 1,
                          }}
                        />
                        <span className={`text-xs font-semibold uppercase tracking-wide ${
                          allSectorHidden
                            ? 'text-gray-400 dark:text-gray-600'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {sectorName}
                        </span>
                        <span className="ml-auto text-xs text-gray-300 dark:text-gray-600">
                          {sectorSeries.length}
                        </span>
                      </button>
                      {/* Industries nested beneath */}
                      <div className="ml-5 mt-0.5 grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                        {sectorSeries.map(s => {
                          const isHidden = hidden.has(s.key);
                          const color = colorMap.get(s.key) ?? base;
                          return (
                            <button
                              key={s.key}
                              onClick={() => toggleSeries(s.key)}
                              className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                            >
                              <span
                                className="flex-shrink-0 w-2 h-2 rounded-full"
                                style={{ background: color, opacity: isHidden ? 0.2 : 1 }}
                              />
                              <span className={`text-xs truncate ${
                                isHidden ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'
                              }`}>
                                {s.key}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current snapshot bars */}
      {overviewLoading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
          Loading sector data...
        </div>
      ) : (
        <div className="space-y-3">
          {(overview?.sectors ?? []).map((sector: SectorMarketCap) => {
            const meta   = SECTOR_META[sector.name] ?? { emoji: '📊', slug: sector.name.toLowerCase().replace(/ /g, '-') };
            const barPct = maxMarketCap > 0 ? (sector.total_market_cap / maxMarketCap) * 100 : 0;

            return (
              <Link
                key={sector.name}
                to={`/sectors/${meta.slug}`}
                className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-5 py-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{sector.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{sector.company_count} co.</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{fmtCap(sector.total_market_cap)}</span>
                    <span className="ml-3 text-sm text-gray-400 dark:text-gray-500">{sector.market_cap_pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%`, background: SECTOR_COLORS[sector.name] ?? '#14b8a6' }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Sectors;
