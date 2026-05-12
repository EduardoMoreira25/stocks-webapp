from fastapi import APIRouter, HTTPException, Query
from api.services.company_data import (
    get_company_basic_info,
    get_company_financials,
    get_price_chart,
    search_companies,
    get_companies_by_sector,
    get_sector_overview,
    get_sector_history,
    get_revenue_segments,
    get_user_segments,
    get_earnings_calendar,
    get_sector_company_kpis
)
from typing import List, Dict, Optional

router = APIRouter(tags=["Company Data"])


@router.get("/companies/search")
def search(
    query: str = Query(..., min_length=1),
    limit: int = Query(default=10, ge=1, le=50)
):
    """
    Search for companies by name or symbol

    Args:
        query: Search query string
        limit: Maximum number of results (1-50, default 10)

    Returns:
        list: Matching companies with symbol, name, sector, industry
    """
    try:
        data = search_companies(query, limit)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/{symbol}")
def get_company(symbol: str):
    """
    Get basic company information including current price and changes

    Args:
        symbol: Stock ticker symbol (e.g., AAPL, MSFT)

    Returns:
        dict: Company basic info with current price, sector, industry, and price changes
    """
    try:
        data = get_company_basic_info(symbol)
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"Company {symbol.upper()} not found"
            )
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/{symbol}/financials")
def get_financials(
    symbol: str,
    period: str = Query(default='ALL', regex='^(FY|Q|ALL)$'),
    years: int = Query(default=5, ge=1, le=10)
):
    """
    Get financial statements for a company

    Args:
        symbol: Stock ticker symbol
        period: 'FY' for annual only, 'Q' for quarterly only, 'ALL' for both (default)
        years: Number of years of data (1-10, default 5)

    Returns:
        dict: Financial data wrapped in 'data' key
    """
    try:
        data = get_company_financials(symbol, period, years)
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No financial data found for {symbol.upper()}"
            )
        return {"data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prices/{symbol}/chart")
def get_chart(
    symbol: str,
    period: str = Query(default='1Y', regex='^(1W|1M|6M|1Y|5Y)$')
):
    """
    Get historical price data for charting

    Args:
        symbol: Stock ticker symbol
        period: Time period ('1W', '1M', '6M', '1Y', '5Y')

    Returns:
        dict: Price data wrapped in 'data' key
    """
    try:
        data = get_price_chart(symbol, period)
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No price data found for {symbol.upper()}"
            )
        return {"data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/segments/{symbol}")
def get_segments(
    symbol: str,
    limit: int = Query(default=200, ge=1, le=500)
):
    """
    Get revenue segment breakdown (product and geographic)

    Args:
        symbol: Stock ticker symbol
        limit: Maximum number of periods to return (1-500, default 200)

    Returns:
        dict: Revenue segments data grouped by period
    """
    try:
        data = get_revenue_segments(symbol, limit)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/segments/{symbol}/users")
def get_users(
    symbol: str,
    limit: int = Query(default=100, ge=1, le=200)
):
    """
    Get user/subscriber segment data (memberships, paid subscribers, etc.)

    Args:
        symbol: Stock ticker symbol
        limit: Maximum number of data points to return (1-200, default 100)

    Returns:
        dict: User segment metrics with historical data
    """
    try:
        data = get_user_segments(symbol, limit)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calendar/earnings")
def get_calendar(
    start_date: str = Query(..., regex=r'^\d{4}-\d{2}-\d{2}$'),
    end_date: str = Query(..., regex=r'^\d{4}-\d{2}-\d{2}$')
):
    """
    Get earnings calendar events for a date range

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format

    Returns:
        dict: Earnings events with company info
    """
    try:
        data = get_earnings_calendar(start_date, end_date)
        return {"events": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sectors/history")
def get_sectors_history(
    period: str = Query(default='1Y', pattern='^(1W|1M|6M|1Y|2Y|5Y|10Y|15Y)$'),
    view:   str = Query(default='sector', pattern='^(sector|industry)$')
):
    try:
        return get_sector_history(period, view)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sectors/overview")
def get_sectors_overview():
    """
    Get all sectors with total market cap and industry breakdown
    """
    try:
        return get_sector_overview()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sectors/{sector}/companies")
def get_sector_companies(sector: str):
    """
    Get all companies in a specific sector

    Args:
        sector: Sector name (e.g., Technology, Healthcare)

    Returns:
        list: Companies in the sector
    """
    try:
        data = get_companies_by_sector(sector)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sectors/{sector}/companies/kpis")
def get_sector_companies_kpis(sector: str):
    """
    Get latest KPI data for all companies in a sector for client-side filtering.

    Args:
        sector: Sector name (e.g., Technology, Healthcare)

    Returns:
        list: KPI data per company symbol
    """
    try:
        data = get_sector_company_kpis(sector)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
