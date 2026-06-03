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


def get_dashboard_data(limit: int = 6) -> Dict:
    latest_date = get_latest_trading_day()
    daily_comp   = get_trading_day_offset(1)
    weekly_comp  = get_trading_day_offset(5)
    monthly_comp = get_trading_day_offset(20)

    if not latest_date:
        return {}

    def fetch_movers(comp_date: Optional[str], lim: int):
        if not comp_date:
            return [], []
        query = """
            WITH changes AS (
                SELECT
                    cp.symbol,
                    c.companyname  AS company_name,
                    c.sector,
                    c.image_url,
                    cp.current_price,
                    pp.previous_price,
                    (cp.current_price - pp.previous_price)                          AS change,
                    ((cp.current_price - pp.previous_price) / pp.previous_price * 100) AS change_percent,
                    cp.volume
                FROM (
                    SELECT symbol, close AS current_price, volume
                    FROM silver.s_stock_prices_daily WHERE date = %s
                ) cp
                JOIN (
                    SELECT symbol, close AS previous_price
                    FROM silver.s_stock_prices_daily WHERE date = %s
                ) pp ON cp.symbol = pp.symbol
                LEFT JOIN gold.g_company c ON cp.symbol = c.symbol
                WHERE pp.previous_price > 0
            )
            (SELECT *, 'w' AS mtype FROM changes ORDER BY change_percent DESC LIMIT %s)
            UNION ALL
            (SELECT *, 'l' AS mtype FROM changes ORDER BY change_percent ASC  LIMIT %s)
        """
        rows = DBConnectorFinancials.query(query, [latest_date, comp_date, lim, lim])

        def to_mover(r):
            return {
                "symbol":         r[0],
                "company_name":   r[1],
                "sector":         r[2],
                "image_url":      r[3],
                "current_price":  float(r[4]) if r[4] else None,
                "previous_price": float(r[5]) if r[5] else None,
                "change":         float(r[6]) if r[6] else None,
                "change_percent": float(r[7]) if r[7] else None,
                "volume":         int(r[8])   if r[8] else None,
            }

        winners = [to_mover(r) for r in rows if r[9] == 'w']
        losers  = [to_mover(r) for r in rows if r[9] == 'l']
        return winners, losers

    # Top 3 by volume today, enriched with today's price change
    vol_query = """
        SELECT
            cp.symbol,
            c.companyname AS company_name,
            c.sector,
            c.image_url,
            cp.close AS current_price,
            pp.close AS previous_price,
            cp.volume,
            CASE WHEN pp.close > 0
                 THEN ((cp.close - pp.close) / pp.close * 100)
                 ELSE NULL END AS change_percent
        FROM silver.s_stock_prices_daily cp
        LEFT JOIN gold.g_company c ON cp.symbol = c.symbol
        LEFT JOIN (
            SELECT symbol, close
            FROM silver.s_stock_prices_daily WHERE date = %s
        ) pp ON cp.symbol = pp.symbol
        WHERE cp.date = %s
        ORDER BY cp.volume DESC
        LIMIT 3
    """
    vol_rows = DBConnectorFinancials.query(vol_query, [daily_comp, latest_date])
    volume = [
        {
            "symbol":         r[0],
            "company_name":   r[1],
            "sector":         r[2],
            "image_url":      r[3],
            "current_price":  float(r[4]) if r[4] else None,
            "previous_price": float(r[5]) if r[5] else None,
            "volume":         int(r[6])   if r[6] else None,
            "change_percent": float(r[7]) if r[7] else None,
        }
        for r in vol_rows
    ]

    today_w, today_l = fetch_movers(daily_comp,   limit)
    week_w,  week_l  = fetch_movers(weekly_comp,  limit)
    month_w, month_l = fetch_movers(monthly_comp, limit)

    return {
        "as_of_date": latest_date,
        "today": {
            "comparison_date": daily_comp,
            "winners": today_w,
            "losers":  today_l,
            "volume":  volume,
        },
        "week": {
            "comparison_date": weekly_comp,
            "winners": week_w,
            "losers":  week_l,
        },
        "month": {
            "comparison_date": monthly_comp,
            "winners": month_w,
            "losers":  month_l,
        },
    }
