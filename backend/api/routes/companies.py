from fastapi import APIRouter, HTTPException
from api.services.company_metrics import (
    get_valuation_metrics,
    get_dividend_metrics,
    get_cashflow_metrics,
    get_margin_metrics,
    get_balance_metrics,
    get_company_overview
)
from api.schemas.company import (
    ValuationMetrics,
    DividendMetrics,
    CashFlowMetrics,
    MarginMetrics,
    BalanceMetrics,
    CompanyOverview
)

router = APIRouter(prefix="/api/v1/companies", tags=["Companies"])


@router.get("/{symbol}/overview", response_model=CompanyOverview)
def get_overview(symbol: str):
    """
    Get complete company overview with all metrics

    Args:
        symbol: Stock ticker symbol (e.g., AAPL, MSFT)

    Returns:
        CompanyOverview: Complete financial metrics for the company
    """
    try:
        data = get_company_overview(symbol)
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {symbol}"
            )
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/valuation", response_model=ValuationMetrics)
def get_valuation(symbol: str):
    """
    Get valuation metrics for a company

    Args:
        symbol: Stock ticker symbol

    Returns:
        ValuationMetrics: Market cap, P/E, P/S, P/EBITDA, P/B ratios
    """
    try:
        data = get_valuation_metrics(symbol)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/dividends", response_model=DividendMetrics)
def get_dividends(symbol: str):
    """
    Get dividend metrics for a company

    Args:
        symbol: Stock ticker symbol

    Returns:
        DividendMetrics: Dividend yield, total paid, payout ratio
    """
    try:
        data = get_dividend_metrics(symbol)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/cashflow", response_model=CashFlowMetrics)
def get_cashflow(symbol: str):
    """
    Get cash flow metrics for a company

    Args:
        symbol: Stock ticker symbol

    Returns:
        CashFlowMetrics: FCF, OCF, FCF margin, FCF per share
    """
    try:
        data = get_cashflow_metrics(symbol)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/margins", response_model=MarginMetrics)
def get_margins(symbol: str):
    """
    Get margin and growth metrics for a company

    Args:
        symbol: Stock ticker symbol

    Returns:
        MarginMetrics: Profit, operating, gross, EBITDA margins plus YoY growth
    """
    try:
        data = get_margin_metrics(symbol)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/balance", response_model=BalanceMetrics)
def get_balance(symbol: str):
    """
    Get balance sheet metrics for a company

    Args:
        symbol: Stock ticker symbol

    Returns:
        BalanceMetrics: Cash, debt, current ratio, debt/equity ratio
    """
    try:
        data = get_balance_metrics(symbol)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
