import React from 'react';
import { Link } from 'react-router-dom';

const CompanyGlossary: React.FC = () => {
  const kpis = [
    { name: "Net Margin", slug: "net-margin" },
    { name: "ROE", slug: "roe" },
    { name: "ROA", slug: "roa" },
    { name: "Gross Margin", slug: "gross-margin" },
    { name: "Operating Margin", slug: "operating-margin" },
    { name: "ROIC", slug: "roic" },
    { name: "Free Cash Flow", slug: "free-cash-flow" },
    { name: "FCF Yield", slug: "fcf-yield" },
    { name: "SBC Impact on FCF", slug: "sbc-impact-on-fcf" },
    { name: "P/E Ratio", slug: "pe-ratio" },
    { name: "P/B Ratio", slug: "pb-ratio" },
    { name: "EBITDA", slug: "ebitda" },
    { name: "EV", slug: "ev" },
    { name: "Debt to Equity", slug: "debt-to-equity" },
    { name: "Debt to Assets", slug: "debt-to-assets" },
    { name: "Current Ratio", slug: "current-ratio" },
    { name: "Cash Ratio", slug: "cash-ratio" },
    { name: "Revenue", slug: "revenue" },
    { name: "Net Income", slug: "net-income" },
    { name: "Operating Expenses", slug: "operating-expenses" },
    { name: "Cash & Debt", slug: "cash-and-debt" },
    { name: "EPS", slug: "eps" }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Company KPIs Glossary</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Click on any KPI to learn more
        </p>
      </div>

      {/* KPIs Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">KPIs</h2>
        </div>

        <div className="px-6 py-4">
          <ul className="space-y-3">
            {kpis.map((kpi) => (
              <li key={kpi.slug}>
                <Link
                  to={`/glossary/company/${kpi.slug}`}
                  className="text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 hover:underline text-base transition-colors"
                >
                  {kpi.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CompanyGlossary;
