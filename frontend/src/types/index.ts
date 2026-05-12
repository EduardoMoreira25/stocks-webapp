export interface Company {
  symbol: string;
  company_name: string;
  sector: string;
  industry: string;
  image_url?: string;
  current_price?: number;
  day_change?: number;
  week_change?: number;
  month_change?: number;
}

export interface Mover {
  symbol: string;
  company_name: string;
  sector: string | null;
  image_url?: string;
  current_price: number;
  previous_price: number;
  change: number;
  change_percent: number;
  volume: number;
}

export interface MarketMoversResponse {
  period: string;
  as_of_date: string;
  comparison_date: string;
  count: number;
  winners: Mover[];
}

export interface CompanyKPIs {
  profitability: {
    net_margin: number | null;
    roe: number | null;
    roa: number | null;
    gross_margin: number | null;
    operating_margin: number | null;
    roic: number | null;
  };
  liquidity: {
    current_ratio: number | null;
    cash_ratio: number | null;
  };
  leverage: {
    debt_to_equity: number | null;
    debt_to_assets: number | null;
  };
  cash_flow: {
    ttm_fcf_yield: number | null;
    sbc_impact_on_fcf: number | null;
  };
  valuation: {
    market_cap: number | null;
    ttm_pe_ratio: number | null;
    pb_ratio: number | null;
    ttm_ev_ebitda: number | null;
  };
}

export interface CompanyDetail extends Company {
  price_date?: string;
  kpis?: CompanyKPIs | null;
}

export interface KPIHistory {
  fiscal_year: number;
  period: string;
  value: number;
  calculation_date: string;
}

export interface ChartDataPoint {
  date: string;
  close: number;
  volume?: number;
}


export interface FinancialData {
  fiscal_year: number;
  period: string;
  statement_date: string;

  // Income Statement
  revenue: number;
  net_income: number;
  eps: number;
  eps_diluted: number;
  gross_profit: number;
  operating_income: number;
  ebitda: number;
  operating_expenses: number;

  // Balance Sheet
  cash_and_cash_equivalents: number;
  total_debt: number;
  net_debt: number;
  total_assets: number;
  total_stockholders_equity: number;

  // Cash Flow Statement
  free_cash_flow: number;
  operating_cash_flow: number;
  dividends_paid: number;
  capital_expenditure: number;

  // Shares
  shares_outstanding: number;

  // Calculated KPIs
  roa: number | null;
}

export interface RevenueSegment {
  name: string;
  revenue: number;
  revenue_percentage: number;
}

export interface RevenueSegmentData {
  symbol: string;
  date: string;
  period: string;
  product?: RevenueSegment[];
  geographic?: RevenueSegment[];
}

export interface RevenueSegmentHistory {
  date: string;
  period: string;
  fiscal_year: number;
  quarter?: string;
  [key: string]: any; // Dynamic keys for each segment name
}

export interface CashFlowMetrics {
  symbol: string;
  ttm_free_cash_flow: number | null;
  ttm_operating_cash_flow: number | null;
  ttm_fcf_margin: number | null;
  ttm_fcf_per_share: number | null;
  cash_flow_to_debt_ratio: number | null;

  // SBC-adjusted metrics
  ttm_stock_based_compensation: number | null;
  ttm_sbc_adjusted_fcf: number | null;
  ttm_sbc_adjusted_fcf_margin: number | null;
  ttm_sbc_adjusted_fcf_per_share: number | null;
  ttm_sbc_impact_pct: number | null;

  // Yield metrics
  ttm_fcf_yield: number | null;
  ttm_fcf_per_share_to_price: number | null;

  data_quality: {
    quarters_available: number;
    has_sbc_data: boolean;
    has_current_price: boolean;
  };
}

export interface ValuationMetrics {
  symbol: string;
  as_of_date: string | null;
  current_price: number | null;
  market_cap: number | null;
  ttm_pe_ratio: number | null;
  ttm_price_to_sales: number | null;
  ttm_price_to_ebitda: number | null;
  price_to_book: number | null;
  data_quality: {
    quarters_available: number;
    has_current_price: boolean;
  };
}

// ==================== Portfolio Types ====================

export interface Portfolio {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  portfolio_id: number;
  symbol: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price_per_share: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

export interface Holding {
  symbol: string;
  company_name?: string;
  sector?: string;
  shares: number;
  avg_cost: number;
  total_cost: number;
  current_price?: number;
  current_value?: number;
  unrealized_pl?: number;
  unrealized_pl_percent?: number;
}

export interface PortfolioHoldings {
  portfolio_id: number;
  portfolio_name: string;
  holdings: Holding[];
  total_cost: number;
  total_value: number;
  total_unrealized_pl: number;
  total_unrealized_pl_percent: number;
  realized_pl: number;
}

export interface SymbolTransaction {
  id: number;
  portfolio_id: number;
  portfolio_name: string;
  symbol: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price_per_share: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

export interface PeriodPerformance {
  start_date: string;
  start_value: number;
  current_value: number;
  change: number;
  change_percent: number;
}

export interface PortfolioPerformance {
  portfolio_id: number;
  portfolio_name: string;
  current_value: number;
  performance: {
    YTD: PeriodPerformance | null;
    '1Y': PeriodPerformance | null;
    '2Y': PeriodPerformance | null;
    '5Y': PeriodPerformance | null;
  };
}

// ==================== Sector KPI Filter Types ====================

export interface CompanyKpiData {
  symbol: string;
  net_margin: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  current_ratio: number | null;
  cash_ratio: number | null;
  debt_to_equity: number | null;
  debt_to_assets: number | null;
  fcf_ttm: number | null;
  sbc_impact_on_fcf: number | null;
  pe_ratio_ttm: number | null;
  pb_ratio: number | null;
  ev_to_ebitda_ttm: number | null;
  market_cap: number | null;
  revenue: number | null;
  net_income: number | null;
  ebitda: number | null;
  operating_expenses: number | null;
  eps_diluted: number | null;
  cash_and_cash_equivalents: number | null;
  total_debt: number | null;
  net_debt: number | null;
  free_cash_flow: number | null;
}

// ==================== Sector Types ====================

export interface IndustryMarketCap {
  name: string;
  total_market_cap: number;
  company_count: number;
  market_cap_pct: number;
}

export interface SectorMarketCap {
  name: string;
  total_market_cap: number;
  company_count: number;
  market_cap_pct: number;
  industries: IndustryMarketCap[];
}

export interface SectorOverview {
  total_market_cap: number;
  sectors: SectorMarketCap[];
}

export interface SeriesInfo {
  key: string;
  sector: string;
}

export interface SectorHistorySnapshot {
  date: string;
  [key: string]: number | string;
}

export interface SectorHistory {
  period: string;
  view: 'sector' | 'industry';
  series: SeriesInfo[];
  snapshots: SectorHistorySnapshot[];
}

// ==================== Watchlist Types ====================

export interface WatchlistItem {
  id: number;
  symbol: string;
  company_name?: string | null;
  sector?: string | null;
  industry?: string | null;
  image_url?: string | null;
  current_price?: number | null;
  market_cap?: number | null;
  buy_price?: number | null;
  sell_price?: number | null;
  note?: string | null;
  added_at?: string | null;
  updated_at?: string | null;
}

// ==================== Calendar Types ====================

export interface EarningsEvent {
  symbol: string;
  company_name: string;
  image_url?: string;
  report_date: string;
  expected_filing_date?: string;
  fiscal_year: number;
  fiscal_period: string;
  form_type: string;
  is_filed: boolean;
  market_cap?: number;
}