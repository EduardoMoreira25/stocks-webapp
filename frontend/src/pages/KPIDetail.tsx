import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../services/api';

// Slug → display title fallback (used when DB has no entry yet)
const SLUG_TITLES: Record<string, string> = {
  'net-margin':        'Net Margin',
  'roe':               'ROE (Return on Equity)',
  'roa':               'ROA (Return on Assets)',
  'gross-margin':      'Gross Margin',
  'operating-margin':  'Operating Margin',
  'roic':              'ROIC (Return on Invested Capital)',
  'free-cash-flow':    'Free Cash Flow',
  'fcf-yield':         'FCF Yield',
  'sbc-impact-on-fcf': 'SBC Impact on FCF',
  'pe-ratio':          'P/E Ratio (Price-to-Earnings)',
  'pb-ratio':          'P/B Ratio (Price-to-Book)',
  'ebitda':            'EBITDA',
  'ev':                'EV (Enterprise Value)',
  'debt-to-equity':    'Debt to Equity Ratio',
  'debt-to-assets':    'Debt to Assets Ratio',
  'current-ratio':     'Current Ratio',
  'cash-ratio':        'Cash Ratio',
  'revenue':           'Revenue',
  'net-income':        'Net Income',
  'operating-expenses':'Operating Expenses',
  'cash-and-debt':     'Cash & Debt',
  'eps':               'EPS (Earnings Per Share)',
  'market-cap':        'Market Cap',
};

function slugToTitle(slug: string): string {
  return SLUG_TITLES[slug] ?? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Markdown renderer with styled elements ───────────────────────────────────

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    components={{
      h1: ({ children }) => (
        <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-500 mt-8 mb-4 first:mt-0">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-6 mb-3">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-5 mb-2">{children}</h3>
      ),
      p: ({ children }) => (
        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{children}</p>
      ),
      ul: ({ children }) => (
        <ul className="space-y-2 mb-4 ml-4">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="space-y-2 mb-4 ml-4 list-decimal">{children}</ol>
      ),
      li: ({ children }) => (
        <li className="text-gray-700 dark:text-gray-300 flex gap-2">
          <span className="text-orange-500 mt-0.5 flex-shrink-0">•</span>
          <span>{children}</span>
        </li>
      ),
      code: ({ children, className }) => {
        const isBlock = className?.includes('language-');
        return isBlock ? (
          <pre className="bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500 p-4 rounded my-4 overflow-x-auto">
            <code className="text-gray-900 dark:text-gray-100 text-sm font-mono">{children}</code>
          </pre>
        ) : (
          <code className="bg-gray-100 dark:bg-gray-700 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
        );
      },
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-teal-500 pl-4 py-1 my-4 bg-teal-50 dark:bg-teal-900/20 rounded-r">
          {children}
        </blockquote>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-orange-600 dark:text-orange-400">{children}</strong>
      ),
      hr: () => <hr className="border-gray-200 dark:border-gray-700 my-6" />,
      table: ({ children }) => (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded text-sm">{children}</table>
        </div>
      ),
      th: ({ children }) => (
        <th className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold text-left border-b border-gray-200 dark:border-gray-600">{children}</th>
      ),
      td: ({ children }) => (
        <td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">{children}</td>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const KPIDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [contentMd, setContentMd]   = useState('');
  const [title, setTitle]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [hasContent, setHasContent] = useState(false);

  const [editing, setEditing]       = useState(false);
  const [draftMd, setDraftMd]       = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setHasContent(false);
    setContentMd('');
    setEditing(false);

    apiService.getKpiContent(slug)
      .then(data => {
        setTitle(data.title);
        setContentMd(data.content_md);
        setHasContent(true);
      })
      .catch(() => {
        // No content yet — will show empty state
        setTitle(slugToTitle(slug));
        setContentMd('');
        setHasContent(false);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const openEditor = () => {
    setDraftTitle(title || slugToTitle(slug ?? ''));
    setDraftMd(contentMd);
    setSaveError(null);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!slug) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await apiService.saveKpiContent(slug, draftTitle, draftMd);
      setTitle(saved.title);
      setContentMd(saved.content_md);
      setHasContent(true);
      setEditing(false);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Editor view ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Editor header */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              type="text"
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              placeholder="KPI title…"
              className="flex-1 text-xl font-bold border-b-2 border-orange-400 dark:border-orange-500 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none pb-1"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saveError && <span className="text-sm text-red-500">{saveError}</span>}
            <button
              onClick={cancelEdit}
              className="px-4 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm rounded-md bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Split pane: editor left, preview right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 'calc(100vh - 160px)' }}>
          {/* Left: markdown textarea */}
          <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Markdown
            </div>
            <textarea
              ref={textareaRef}
              value={draftMd}
              onChange={e => setDraftMd(e.target.value)}
              placeholder={`# ${draftTitle}\n\nWrite your KPI explanation here using markdown…\n\n## Formula\n\n\`Net Margin = Net Income / Revenue × 100\`\n\n## What is it?\n\nA description…\n\n## What's considered good?\n\n- Below 10% — low\n- 10–20% — healthy\n- Above 20% — excellent`}
              className="flex-1 p-4 font-mono text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>

          {/* Right: live preview */}
          <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Preview
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
              {draftMd.trim() ? (
                <MarkdownContent content={draftMd} />
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-sm italic">Start typing to see a preview…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Read view ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/glossary/company" className="text-sm text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to KPIs
        </Link>
        <button
          onClick={openEditor}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        {hasContent && contentMd.trim() ? (
          <MarkdownContent content={contentMd} />
        ) : (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">{title}</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">No content yet for this KPI.</p>
            <button
              onClick={openEditor}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Write content
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPIDetail;