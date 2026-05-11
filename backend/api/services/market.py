from connectors.db_connector import DBConnectorFinancials
from typing import List, Dict, Optional


def get_latest_trading_day() -> Optional[str]:
    """
    Get the most recent trading day from the database

    Returns:
        str: Date string (YYYY-MM-DD) of the latest trading day, or None if no data
    """
    query = "SELECT MAX(date) FROM silver.s_stock_prices_daily"
    result = DBConnectorFinancials.query(query)
    return str(result[0][0]) if result and result[0][0] else None


def get_trading_day_offset(days_back: int) -> Optional[str]:
    """
    Get trading day N days back, automatically handling weekends/holidays

    Args:
        days_back: Number of trading days to go back (e.g., 5 for week, 20 for month)

    Returns:
        str: Date string (YYYY-MM-DD) of the trading day, or None if not found
    """
    query = """
        SELECT DISTINCT date
        FROM silver.s_stock_prices_daily
        ORDER BY date DESC
        OFFSET %s
        LIMIT 1
    """
    result = DBConnectorFinancials.query(query, [days_back])
    return str(result[0][0]) if result and result[0][0] else None


def get_winners(period: str, limit: int = 10) -> Dict:
    """
    Get top winners for specified period

    Args:
        period: One of "daily", "weekly", or "monthly"
        limit: Number of winners to return (default 10)

    Returns:
        dict: Winners data with metadata
    """
    # Determine offset based on period
    offset_map = {
        "daily": 1,
        "weekly": 5,
        "monthly": 20
    }
    offset = offset_map.get(period, 1)

    latest_date = get_latest_trading_day()
    comparison_date = get_trading_day_offset(offset)

    if not latest_date or not comparison_date:
        return {
            "period": period,
            "as_of_date": latest_date,
            "comparison_date": comparison_date,
            "count": 0,
            "winners": []
        }

    query = """
        WITH current_prices AS (
            SELECT
                symbol,
                close as current_price,
                volume,
                date
            FROM silver.s_stock_prices_daily
            WHERE date = %s
        ),
        previous_prices AS (
            SELECT
                symbol,
                close as previous_price
            FROM silver.s_stock_prices_daily
            WHERE date = %s
        )
        SELECT
            cp.symbol,
            c.companyname as company_name,
            c.sector,
            cp.current_price,
            pp.previous_price,
            (cp.current_price - pp.previous_price) as change,
            ((cp.current_price - pp.previous_price) / pp.previous_price * 100) as change_percent,
            cp.volume
        FROM current_prices cp
        INNER JOIN previous_prices pp ON cp.symbol = pp.symbol
        LEFT JOIN gold.g_company c ON cp.symbol = c.symbol
        WHERE pp.previous_price > 0  -- Avoid division by zero
        ORDER BY change_percent DESC
        LIMIT %s
    """

    results = DBConnectorFinancials.query(query, [latest_date, comparison_date, limit])

    winners = []
    for row in results:
        winners.append({
            "symbol": row[0],
            "company_name": row[1],
            "sector": row[2],
            "current_price": float(row[3]) if row[3] else None,
            "previous_price": float(row[4]) if row[4] else None,
            "change": float(row[5]) if row[5] else None,
            "change_percent": float(row[6]) if row[6] else None,
            "volume": int(row[7]) if row[7] else None
        })

    return {
        "period": period,
        "as_of_date": latest_date,
        "comparison_date": comparison_date,
        "count": len(winners),
        "winners": winners
    }
