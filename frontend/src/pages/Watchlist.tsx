import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import type { WatchlistItem } from '../types';

function formatPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return `$${v.toFixed(2)}`;
}

function formatMarketCap(v: number | null | undefined): string {
  if (!v) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  return `$${(v / 1e6).toFixed(2)}M`;
}

function priceDiff(current: number | null | undefined, target: number | null | undefined) {
  if (current == null || target == null) return null;
  return ((current - target) / target) * 100;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const LogoCell = ({ item }: { item: WatchlistItem }) => (
  <div className="flex-shrink-0">
    {item.image_url ? (
      <img
        src={item.image_url}
        alt={item.symbol}
        className="w-9 h-9 rounded object-contain bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-1"
        onError={e => {
          e.currentTarget.style.display = 'none';
          (e.currentTarget.nextSibling as HTMLElement)?.classList.remove('hidden');
        }}
      />
    ) : null}
    <div className={`w-9 h-9 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 ${item.image_url ? 'hidden' : ''}`}>
      {item.symbol.slice(0, 2)}
    </div>
  </div>
);

const NoteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ─── Row ──────────────────────────────────────────────────────────────────────

const WatchlistRow: React.FC<{
  item: WatchlistItem;
  onRemove: (symbol: string) => Promise<void>;
  onUpdate: (symbol: string, buy: number | null, sell: number | null, note: string | null) => Promise<void>;
}> = ({ item, onRemove, onUpdate }) => {
  const [buyVal,  setBuyVal]  = useState(item.buy_price?.toString()  ?? '');
  const [sellVal, setSellVal] = useState(item.sell_price?.toString() ?? '');
  const [noteVal, setNoteVal] = useState(item.note ?? '');
  const [noteOpen, setNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (buy: string, sell: string, note: string) => {
    setSaving(true);
    await onUpdate(
      item.symbol,
      buy.trim()  !== '' && !isNaN(parseFloat(buy))  ? parseFloat(buy)  : null,
      sell.trim() !== '' && !isNaN(parseFloat(sell)) ? parseFloat(sell) : null,
      note.trim() !== '' ? note.trim() : null,
    );
    setSaving(false);
  }, [item.symbol, onUpdate]);

  const diffToBuy  = priceDiff(item.current_price, item.buy_price);
  const diffToSell = priceDiff(item.current_price, item.sell_price);

  const addedDate = item.added_at
    ? new Date(item.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const noteButtonClass = `p-1.5 rounded-md transition-colors ${
    noteOpen || noteVal
      ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30'
      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
  }`;

  const inputClass = "w-full text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-teal-500";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* ── Desktop row (sm+) ──────────────────────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-3">
        <LogoCell item={item} />

        <div className="w-40 min-w-0">
          <Link to={`/company/${item.symbol}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate block">
            {item.company_name ?? item.symbol}
          </Link>
          <div className="text-xs text-gray-500 dark:text-gray-400">{item.symbol}</div>
        </div>

        <div className="w-24 text-right flex-shrink-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatPrice(item.current_price)}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{formatMarketCap(item.market_cap)}</div>
        </div>

        <div className="w-32 flex-shrink-0">
          <label className="text-xs text-gray-400 dark:text-gray-500 block mb-0.5">Buy target</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">$</span>
            <input type="number" value={buyVal} onChange={e => setBuyVal(e.target.value)} onBlur={() => save(buyVal, sellVal, noteVal)} placeholder="—" className={inputClass} />
          </div>
          {diffToBuy !== null && (
            <div className={`text-xs mt-0.5 ${diffToBuy <= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
              {diffToBuy <= 0 ? '▼' : '▲'} {Math.abs(diffToBuy).toFixed(1)}% {diffToBuy <= 0 ? 'below' : 'above'} target
            </div>
          )}
        </div>

        <div className="w-32 flex-shrink-0">
          <label className="text-xs text-gray-400 dark:text-gray-500 block mb-0.5">Sell target</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">$</span>
            <input type="number" value={sellVal} onChange={e => setSellVal(e.target.value)} onBlur={() => save(buyVal, sellVal, noteVal)} placeholder="—" className={inputClass} />
          </div>
          {diffToSell !== null && (
            <div className={`text-xs mt-0.5 ${diffToSell >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {diffToSell >= 0 ? '▲' : '▼'} {Math.abs(diffToSell).toFixed(1)}% {diffToSell >= 0 ? 'above' : 'below'} target
            </div>
          )}
        </div>

        <div className="flex-1 text-xs text-gray-400 dark:text-gray-500 text-center">{addedDate}</div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && <span className="text-xs text-gray-400 dark:text-gray-500">saving…</span>}
          <button onClick={() => setNoteOpen(o => !o)} title={noteOpen ? 'Hide note' : 'Show note'} className={noteButtonClass}>
            <NoteIcon />
          </button>
          <button onClick={() => onRemove(item.symbol)} title="Remove" className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* ── Mobile card (<sm) ──────────────────────────────────────────────── */}
      <div className="sm:hidden px-4 py-3 space-y-3">

        {/* Row 1: logo + name + price + actions */}
        <div className="flex items-center gap-2">
          <LogoCell item={item} />
          <div className="flex-1 min-w-0">
            <Link to={`/company/${item.symbol}`} className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate block">
              {item.company_name ?? item.symbol}
            </Link>
            <div className="text-xs text-gray-500 dark:text-gray-400">{item.symbol}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatPrice(item.current_price)}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{formatMarketCap(item.market_cap)}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {saving && <span className="text-xs text-gray-400">…</span>}
            <button onClick={() => setNoteOpen(o => !o)} title={noteOpen ? 'Hide note' : 'Show note'} className={noteButtonClass}>
              <NoteIcon />
            </button>
            <button onClick={() => onRemove(item.symbol)} title="Remove" className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Buy target */}
        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Buy target</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">$</span>
            <input type="number" value={buyVal} onChange={e => setBuyVal(e.target.value)} onBlur={() => save(buyVal, sellVal, noteVal)} placeholder="—" className={inputClass} />
          </div>
          {diffToBuy !== null && (
            <div className={`text-xs mt-0.5 ${diffToBuy <= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
              {diffToBuy <= 0 ? '▼' : '▲'} {Math.abs(diffToBuy).toFixed(1)}% {diffToBuy <= 0 ? 'below' : 'above'} target
            </div>
          )}
        </div>

        {/* Sell target */}
        <div>
          <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Sell target</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">$</span>
            <input type="number" value={sellVal} onChange={e => setSellVal(e.target.value)} onBlur={() => save(buyVal, sellVal, noteVal)} placeholder="—" className={inputClass} />
          </div>
          {diffToSell !== null && (
            <div className={`text-xs mt-0.5 ${diffToSell >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {diffToSell >= 0 ? '▲' : '▼'} {Math.abs(diffToSell).toFixed(1)}% {diffToSell >= 0 ? 'above' : 'below'} target
            </div>
          )}
        </div>

        {/* Note — inline on mobile */}
        {noteOpen && (
          <textarea
            value={noteVal}
            onChange={e => setNoteVal(e.target.value)}
            onBlur={() => save(buyVal, sellVal, noteVal)}
            placeholder="Add a note about this company…"
            rows={3}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
          />
        )}
      </div>

      {/* Desktop note panel */}
      {noteOpen && (
        <div className="hidden sm:block px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2">
          <textarea
            value={noteVal}
            onChange={e => setNoteVal(e.target.value)}
            onBlur={() => save(buyVal, sellVal, noteVal)}
            placeholder="Add a note about this company…"
            rows={3}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
          />
        </div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const WatchlistPage: React.FC = () => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getWatchlist()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (symbol: string) => {
    await apiService.removeFromWatchlist(symbol);
    setItems(prev => prev.filter(i => i.symbol !== symbol));
  };

  const handleUpdate = async (
    symbol: string,
    buy_price: number | null,
    sell_price: number | null,
    note: string | null,
  ) => {
    await apiService.updateWatchlistItem(symbol, { buy_price, sell_price, note });
    setItems(prev => prev.map(i =>
      i.symbol === symbol ? { ...i, buy_price, sell_price, note } : i
    ));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Watchlist</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">{items.length} {items.length === 1 ? 'company' : 'companies'}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          Loading watchlist…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500 gap-3">
          <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-sm">Your watchlist is empty.</p>
          <p className="text-xs">Click the star on any company page to add it here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column headers — desktop only */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            <div className="w-9 flex-shrink-0" />
            <div className="w-40">Company</div>
            <div className="w-24 text-right">Price</div>
            <div className="w-32">Buy target</div>
            <div className="w-32">Sell target</div>
            <div className="flex-1 text-center">Added</div>
            <div className="w-20 text-right">Actions</div>
          </div>

          {items.map(item => (
            <WatchlistRow
              key={item.symbol}
              item={item}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchlistPage;