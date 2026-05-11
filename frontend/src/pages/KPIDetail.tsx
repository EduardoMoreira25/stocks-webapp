import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadKPIContent, type ParsedKPI } from '../utils/kpiParser';

const KPIDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<ParsedKPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      if (!slug) return;

      setLoading(true);
      const kpiData = await loadKPIContent(slug);
      setContent(kpiData);
      setLoading(false);
    }

    fetchContent();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Fallback content for "debt-to-assets" if file not found
  const fallbackContent: Record<string, any> = {
    'debt-to-assets': {
      title: 'Debt to Assets Ratio',
      description: 'Measures what percentage of a companys assets are financed by debt. It shows how leveraged a company is and what portion of assets would need to be sold to pay off all debt',
      formula: {
        title: 'The formula is:',
        equation: 'Debt to Assets Ratio = Total Debt / Total Assets'
      },
      explanation: 'Expressed as a decimal or percentage, it shows how much a company assets are funded by borrowing.',
      example: {
        title: 'If a company has:',
        items: [
          'Total Debt: 400,000$',
          'Total Assets: 1,000,000$',
          'Debt to Assets: 400,000/1,000,000 = 0.4 or 40%'
        ],
        conclusion: 'This means 40% of the company assets are financed by debt and 60% by equity'
      },
      whatIsGood: {
        title: 'Whats considered good?',
        items: [
          'Below 0.3(30%) - Conservative, low leverage',
          '0.3 to 0.6(30-60%) - Moderate, healthy for most companies',
          '0.6 to 0.8(60-80%) - High leveragem increased risk'
        ]
      },
      whyMatters: {
        title: 'Why it matters',
        items: [
          { label: 'Solvency indicator', description: 'Lower ratio = more financial cushion' },
          { label: 'Asset coverage', description: 'Shows how much assets could decline before equity is wiped out' },
          { label: 'Credit risk', description: 'Lenders use this to assess loan safety' },
          { label: 'Financial flexibility', description: 'High ratio limits ability to borrow more' }
        ]
      }
    }
  };

  // Use fallback if no content loaded from file
  const displayContent = content || fallbackContent[slug || ''];

  if (!displayContent) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">KPI Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The content for this KPI is not available yet.</p>
          <Link to="/glossary/company" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
            ← Back to KPIs list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link to="/glossary/company" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
          ← Back to KPIs
        </Link>
      </div>

      {/* KPI Content - Light theme with colored headings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        {/* Title */}
        <h1 className="text-4xl font-bold text-orange-600 dark:text-orange-500 mb-6">{displayContent.title}</h1>

        {/* Description */}
        <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg leading-relaxed">{displayContent.description}</p>

        {/* Formula Section */}
        {displayContent.formula && (
          <div className="mb-8">
            <p className="text-gray-700 dark:text-gray-300 mb-2">{displayContent.formula.title}</p>
            <div className="bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500 p-4 rounded">
              <code className="text-gray-900 dark:text-gray-100 text-base">{displayContent.formula.equation}</code>
            </div>
          </div>
        )}

        {/* Explanation */}
        {displayContent.explanation && (
          <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">{displayContent.explanation}</p>
        )}

        {/* Example Section */}
        {displayContent.example && (
          <div className="mb-8">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6 border border-green-200 dark:border-green-700">
              <p className="text-green-700 dark:text-green-400 font-semibold mb-3">{displayContent.example.title}</p>
              <ul className="space-y-2 mb-4">
                {displayContent.example.items.map((item: string, index: number) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">• {item}</li>
                ))}
              </ul>
              {displayContent.example.conclusion && (
                <p className="text-gray-700 dark:text-gray-300 italic">{displayContent.example.conclusion}</p>
              )}
            </div>
          </div>
        )}

        {/* Components Section */}
        {displayContent.components && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-4">{displayContent.components.title}</h2>
            <ul className="space-y-3">
              {displayContent.components.items.map((item: any, index: number) => (
                <li key={index} className="text-gray-700 dark:text-gray-300">
                  • <span className="text-orange-600 dark:text-orange-400 font-semibold">{item.label}</span>
                  {item.description && ` - ${item.description}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What's considered good */}
        {displayContent.whatIsGood && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-4">{displayContent.whatIsGood.title}</h2>
            <ul className="space-y-2">
              {displayContent.whatIsGood.items.map((item: string, index: number) => (
                <li key={index} className="text-gray-700 dark:text-gray-300">• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Why it matters */}
        {displayContent.whyMatters && (
          <div>
            <h2 className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-4">{displayContent.whyMatters.title}</h2>
            <ul className="space-y-3">
              {displayContent.whyMatters.items.map((item: any, index: number) => (
                <li key={index} className="text-gray-700 dark:text-gray-300">
                  • <span className="text-orange-600 dark:text-orange-400 font-semibold">{item.label}</span>
                  {item.description && ` - ${item.description}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPIDetail;
