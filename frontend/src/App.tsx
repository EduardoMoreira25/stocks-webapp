import type React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import CompanyDetailPage from './pages/CompanyDetail';
import CompanyGlossary from './pages/CompanyGlossary';
import KPIDetail from './pages/KPIDetail';
import Wallet from './pages/Wallet';
import Calendar from './pages/Calendar';
import Sectors from './pages/Sectors';
import SectorDetail from './pages/SectorDetail';
import WatchlistPage from './pages/Watchlist';

function App() {
  return (
    <ThemeProvider>
      <Router basename="/stocks">
        <ScrollToTop />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Header />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/company/:symbol" element={<CompanyDetailPage />} />
            <Route path="/companies/:symbol" element={<CompanyDetailPage />} />
            <Route path="/sectors" element={<Sectors />} />
            <Route path="/sectors/:slug" element={<SectorDetail />} />
            <Route path="/glossary/company" element={<CompanyGlossary />} />
            <Route path="/glossary/company/:slug" element={<KPIDetail />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/calendar" element={<Calendar />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;