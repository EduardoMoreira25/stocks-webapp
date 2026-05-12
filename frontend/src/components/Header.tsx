import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Company } from '../types';

const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCompaniesOpen, setIsCompaniesOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await apiService.searchCompanies(query, 8);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCompany = (symbol: string) => {
    setSearchQuery('');
    setSearchResults([]);
    navigate(`/company/${symbol}`);
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Section - Hamburger Menu */}
          <div className="flex-1 flex justify-start items-center gap-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              aria-label="Menu"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              type="button"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>

          {/* Center - Logo */}
          <Link to="/" className="flex-shrink-0">
            <div className="bg-orange-600 px-6 py-2 rounded">
              <span className="text-white font-bold text-xl tracking-wide">INSIGHTS</span>
            </div>
          </Link>

          {/* Right Section - Search Bar */}
          <div className="flex-1 flex justify-end">
            <div className="relative w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search companies..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent"
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {searchResults.map((company) => (
                  <button
                    key={company.symbol}
                    onClick={() => handleSelectCompany(company.symbol)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3"
                  >
                    {company.image_url && (
                      <img
                        src={company.image_url}
                        alt={company.company_name}
                        className="w-10 h-10 rounded object-contain bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-1 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{company.symbol}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{company.company_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">{company.sector}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
                Searching...
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-2">
                  {/* Home */}
                  <li>
                    <Link
                      to="/"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Home</span>
                    </Link>
                  </li>

                  {/* Companies */}
                  <li>
                    <button
                      onClick={() => setIsCompaniesOpen(!isCompaniesOpen)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100">Companies</span>
                      <svg
                        className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isCompaniesOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Companies Submenu */}
                    {isCompaniesOpen && (
                      <ul className="ml-8 mt-2 space-y-2">
                        <li>
                          <Link
                            to="/sectors"
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            Sectors
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/watchlist"
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            Watchlist
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>

                  {/* Wallet */}
                  <li>
                    <Link
                      to="/wallet"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Wallet</span>
                    </Link>
                  </li>

                  {/* Calendar */}
                  <li>
                    <Link
                      to="/calendar"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Calendar</span>
                    </Link>
                  </li>

                  {/* Glossary */}
                  <li>
                    <button
                      onClick={() => setIsGlossaryOpen(!isGlossaryOpen)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100">Glossary</span>
                      <svg
                        className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isGlossaryOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Glossary Submenu */}
                    {isGlossaryOpen && (
                      <ul className="ml-8 mt-2 space-y-2">
                        <li>
                          <Link
                            to="/glossary/company"
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            Company
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/glossary/indices"
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            Indices
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;