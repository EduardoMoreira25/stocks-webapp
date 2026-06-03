from fastapi import APIRouter, HTTPException, Query
from api.services.market import get_winners, get_dashboard_data
from api.schemas.market import WinnersResponse

router = APIRouter(prefix="/api/v1/market", tags=["Market"])


@router.get("/winners/{period}", response_model=WinnersResponse)
def get_market_winners(
    period: str,
    limit: int = Query(default=10, ge=1, le=100)
):
    """
    Get top winners for specified period

    Args:
        period: One of "daily", "weekly", "monthly"
        limit: Number of winners to return (1-100, default 10)

    Returns:
        WinnersResponse: List of top performing stocks
    """
    if period not in ["daily", "weekly", "monthly"]:
        raise HTTPException(
            status_code=400,
            detail="Period must be one of: daily, weekly, monthly"
        )

    try:
        data = get_winners(period, limit)

        if not data.get("winners"):
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {period} winners"
            )

        return data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Create a separate router for the alternate /market endpoints (without /api/v1 prefix)
market_router_alt = APIRouter(prefix="/market", tags=["Market"])


@market_router_alt.get("/movers")
def get_daily_movers(limit: int = Query(default=10, ge=1, le=100)):
    """
    Get daily market movers (top winners)

    Args:
        limit: Number of movers to return (1-100, default 10)

    Returns:
        WinnersResponse: List of top performing stocks for the day
    """
    return get_market_winners("daily", limit)


@market_router_alt.get("/movers/week")
def get_weekly_movers_alt(limit: int = Query(default=20, ge=1, le=100)):
    """
    Get weekly market movers (top winners)

    Args:
        limit: Number of movers to return (1-100, default 20)

    Returns:
        WinnersResponse: List of top performing stocks for the week
    """
    return get_market_winners("weekly", limit)


@market_router_alt.get("/dashboard")
def get_dashboard(limit: int = Query(default=6, ge=1, le=20)):
    try:
        return get_dashboard_data(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@market_router_alt.get("/movers/month")
def get_monthly_movers_alt(limit: int = Query(default=20, ge=1, le=100)):
    """
    Get monthly market movers (top winners)

    Args:
        limit: Number of movers to return (1-100, default 20)

    Returns:
        WinnersResponse: List of top performing stocks for the month
    """
    return get_market_winners("monthly", limit)
