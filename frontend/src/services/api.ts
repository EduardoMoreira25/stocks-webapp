import axios from 'axios';
import type { Company, MarketMoversResponse, CompanyDetail, KPIHistory, ChartDataPoint, FinancialData, CashFlowMetrics, ValuationMetrics, Portfolio, PortfolioHoldings, Transaction, SymbolTransaction, EarningsEvent, PortfolioPerformance, SectorOverview, SectorHistory } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const apiService = {
  // Market data
  getMarketMovers: async (limit: number = 10): Promise<MarketMoversResponse> => {
    const response = await api.get(`/market/movers?limit=${limit}`);
    return response.data;
  },

  // Company search
  searchCompanies: async (query: string, limit: number = 10): Promise<Company[]> => {
    const response = await api.get(`/companies/search?query=${query}&limit=${limit}`);
    return response.data;
  },

  // Company details
  getCompanyDetail: async (symbol: string): Promise<CompanyDetail> => {
    const response = await api.get(`/companies/${symbol}`);
    return response.data;
  },

  // Weekly and monthly movers
  getWeeklyMovers: async (limit: number = 20): Promise<MarketMoversResponse> => {
    const response = await api.get(`/market/movers/week?limit=${limit}`);
    return response.data;
  },

  getMonthlyMovers: async (limit: number = 20): Promise<MarketMoversResponse> => {
    const response = await api.get(`/market/movers/month?limit=${limit}`);
    return response.data;
  },

  // Company financials
  getCompanyFinancials: async (
    symbol: string, 
    period: string = 'FY', 
    years: number = 5
  ): Promise<{ data: FinancialData[] }> => {
    const response = await api.get(`/companies/${symbol}/financials?period=${period}&years=${years}`);
    return response.data;
  },

  // KPI history
  getKPIHistory: async (
    symbol: string,
    kpi: string,
    period: string = 'FY',
    years: number = 5
  ): Promise<{ symbol: string; kpi: string; period: string; data: KPIHistory[] }> => {
    const response = await api.get(
      `/companies/${symbol}/kpi-history?kpi=${kpi}&period=${period}&years=${years}`
    );
    return response.data;
  },

  // Price chart data
  getChartData: async (symbol: string, period: string = '1Y'): Promise<{ data: ChartDataPoint[] }> => {
    const response = await api.get(`/prices/${symbol}/chart?period=${period}`);
    return response.data;
  },

  // Revenue segments
  getRevenueSegments: async (symbol: string, limit: number = 200): Promise<any> => {
    const response = await api.get(`/segments/${symbol}?limit=${limit}`);
    return response.data;
  },

  // User segments (subscribers, memberships, etc.)
  getUserSegments: async (symbol: string, limit: number = 100): Promise<any> => {
    const response = await api.get(`/segments/${symbol}/users?limit=${limit}`);
    return response.data;
  },

  // Cash flow metrics with SBC data
  getCashFlowMetrics: async (symbol: string): Promise<CashFlowMetrics> => {
    const response = await api.get(`/api/v1/companies/${symbol}/cashflow`);
    return response.data;
  },

  // Valuation metrics with current price
  getValuationMetrics: async (symbol: string): Promise<ValuationMetrics> => {
    const response = await api.get(`/api/v1/companies/${symbol}/valuation`);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // ==================== Portfolio API ====================

  // Get all portfolios
  getPortfolios: async (): Promise<{ portfolios: Portfolio[] }> => {
    const response = await api.get('/api/v1/portfolios');
    return response.data;
  },

  // Create a new portfolio
  createPortfolio: async (name: string, description?: string): Promise<Portfolio> => {
    const response = await api.post('/api/v1/portfolios', { name, description });
    return response.data;
  },

  // Update a portfolio
  updatePortfolio: async (id: number, name?: string, description?: string): Promise<Portfolio> => {
    const response = await api.put(`/api/v1/portfolios/${id}`, { name, description });
    return response.data;
  },

  // Delete a portfolio
  deletePortfolio: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/portfolios/${id}`);
  },

  // Get portfolio holdings with P/L
  getPortfolioHoldings: async (portfolioId: number): Promise<PortfolioHoldings> => {
    const response = await api.get(`/api/v1/portfolios/${portfolioId}/holdings`);
    return response.data;
  },

  // Get portfolio transactions
  getPortfolioTransactions: async (portfolioId: number): Promise<{ transactions: Transaction[] }> => {
    const response = await api.get(`/api/v1/portfolios/${portfolioId}/transactions`);
    return response.data;
  },

  // Add a transaction
  addTransaction: async (
    portfolioId: number,
    data: {
      symbol: string;
      transaction_type: 'BUY' | 'SELL';
      quantity: number;
      price_per_share: number;
      transaction_date: string;
      notes?: string;
    }
  ): Promise<Transaction> => {
    const response = await api.post(`/api/v1/portfolios/${portfolioId}/transactions`, data);
    return response.data;
  },

  // Delete a transaction
  deleteTransaction: async (portfolioId: number, transactionId: number): Promise<void> => {
    await api.delete(`/api/v1/portfolios/${portfolioId}/transactions/${transactionId}`);
  },

  // Get transactions by symbol (for chart markers)
  getTransactionsBySymbol: async (symbol: string): Promise<{ symbol: string; transactions: SymbolTransaction[] }> => {
    const response = await api.get(`/api/v1/portfolios/symbol/${symbol}/transactions`);
    return response.data;
  },

  // Get portfolio performance over time periods
  getPortfolioPerformance: async (portfolioId: number): Promise<PortfolioPerformance> => {
    const response = await api.get(`/api/v1/portfolios/${portfolioId}/performance`);
    return response.data;
  },

  // ==================== Calendar API ====================

  // Get earnings calendar events
  getEarningsCalendar: async (startDate: string, endDate: string): Promise<{ events: EarningsEvent[] }> => {
    const response = await api.get(`/calendar/earnings?start_date=${startDate}&end_date=${endDate}`);
    return response.data;
  },

  // ==================== Sectors API ====================

  // Get all sectors with market cap overview
  getSectorOverview: async (): Promise<SectorOverview> => {
    const response = await api.get('/sectors/overview');
    return response.data;
  },

  // Get sector market cap history for trend chart
  getSectorHistory: async (period: string = '1Y', view: string = 'sector'): Promise<SectorHistory> => {
    const response = await api.get(`/sectors/history?period=${period}&view=${view}`);
    return response.data;
  },

  // Get companies by sector
  getCompaniesBySector: async (sector: string): Promise<{ symbol: string; company_name: string; image_url?: string; industry?: string; market_cap?: number | null }[]> => {
    const response = await api.get(`/sectors/${encodeURIComponent(sector)}/companies`);
    return response.data;
  },
};

export default apiService;