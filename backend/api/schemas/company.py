from pydantic import BaseModel
from typing import Optional
from datetime import date


class ValuationMetrics(BaseModel):
    """Valuation metrics for a company"""
    symbol: str
    as_of_date: Optional[str] = None
    current_price: Optional[float] = None
    market_cap: Optional[float] = None
    ttm_pe_ratio: Optional[float] = None
    ttm_price_to_sales: Optional[float] = None
    ttm_price_to_ebitda: Optional[float] = None
    price_to_book: Optional[float] = None
    data_quality: dict


class DividendMetrics(BaseModel):
    """Dividend metrics for a company"""
    symbol: str
    ttm_dividend_yield: Optional[float] = None
    ttm_net_dividends_paid: Optional[float] = None
    ttm_payout_ratio: Optional[float] = None
    data_quality: dict


class CashFlowMetrics(BaseModel):
    """Cash flow metrics for a company"""
    symbol: str
    ttm_free_cash_flow: Optional[float] = None
    ttm_operating_cash_flow: Optional[float] = None
    ttm_fcf_margin: Optional[float] = None
    ttm_fcf_per_share: Optional[float] = None
    cash_flow_to_debt_ratio: Optional[float] = None
    # SBC metrics
    ttm_stock_based_compensation: Optional[float] = None
    ttm_sbc_adjusted_fcf: Optional[float] = None
    ttm_sbc_adjusted_fcf_margin: Optional[float] = None
    ttm_sbc_adjusted_fcf_per_share: Optional[float] = None
    ttm_sbc_impact_pct: Optional[float] = None
    # Yield metrics
    ttm_fcf_yield: Optional[float] = None
    ttm_fcf_per_share_to_price: Optional[float] = None
    data_quality: dict


class MarginMetrics(BaseModel):
    """Margin and growth metrics for a company"""
    symbol: str
    ttm_profit_margin: Optional[float] = None
    ttm_operating_margin: Optional[float] = None
    ttm_gross_margin: Optional[float] = None
    ttm_ebitda_margin: Optional[float] = None
    quarterly_earnings_yoy: Optional[float] = None
    quarterly_revenue_yoy: Optional[float] = None
    data_quality: dict


class BalanceMetrics(BaseModel):
    """Balance sheet metrics for a company"""
    symbol: str
    balance_sheet_date: Optional[str] = None
    cash_and_equivalents: Optional[float] = None
    total_debt: Optional[float] = None
    net_cash_debt: Optional[float] = None
    current_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    data_quality: dict


class CompanyOverview(BaseModel):
    """Complete company overview with all metrics"""
    symbol: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    valuation: ValuationMetrics
    dividends: DividendMetrics
    cashflow: CashFlowMetrics
    margins: MarginMetrics
    balance: BalanceMetrics
