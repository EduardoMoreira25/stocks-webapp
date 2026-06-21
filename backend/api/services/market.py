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
    # All data comes from mart_price_snapshot — a pre-computed table rebuilt daily.
    # Replaces 8+ runtime self-joins with 4 simple indexed reads.

    PERIOD_FIELDS = {
        "day":   ("prev_day_price",   "day_change_pct"),
        "week":  ("prev_week_price",  "week_change_pct"),
        "month": ("prev_month_price", "month_change_pct"),
    }

    def fetch_movers(period: str, lim: int):
        prev_price_col, chg_col = PERIOD_FIELDS[period]
        # Column names are hardcoded constants, not user input — f-string is safe here.
        query = f"""
            (SELECT symbol, company_name, sector, image_url,
                    current_price, {prev_price_col} AS previous_price,
                    {chg_col} AS change_percent, volume
             FROM gold.mart_price_snapshot WHERE {chg_col} IS NOT NULL
             ORDER BY {chg_col} DESC LIMIT %s)
            UNION ALL
            (SELECT symbol, company_name, sector, image_url,
                    current_price, {prev_price_col} AS previous_price,
                    {chg_col} AS change_percent, volume
             FROM gold.mart_price_snapshot WHERE {chg_col} IS NOT NULL
             ORDER BY {chg_col} ASC LIMIT %s)
        """
        rows = DBConnectorFinancials.query(query, [lim, lim])

        def to_mover(r):
            return {
                "symbol":         r[0],
                "company_name":   r[1],
                "sector":         r[2],
                "image_url":      r[3],
                "current_price":  float(r[4]) if r[4] else None,
                "previous_price": float(r[5]) if r[5] else None,
                "change_percent": float(r[6]) if r[6] else None,
                "volume":         int(r[7])   if r[7] else None,
            }

        half = len(rows) // 2
        return [to_mover(r) for r in rows[:half]], [to_mover(r) for r in rows[half:]]

    vol_rows = DBConnectorFinancials.query("""
        SELECT symbol, company_name, sector, image_url,
               current_price, prev_day_price AS previous_price,
               volume, day_change_pct AS change_percent
        FROM gold.mart_price_snapshot
        WHERE volume IS NOT NULL
        ORDER BY volume DESC
        LIMIT 3
    """)
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

    # Grab comparison dates from the mart (single row, all dates pre-computed)
    meta = DBConnectorFinancials.query("""
        SELECT price_date, prev_day_date, prev_week_date, prev_month_date
        FROM gold.mart_price_snapshot
        WHERE prev_day_date IS NOT NULL
        LIMIT 1
    """)
    as_of_date  = str(meta[0][0]) if meta else get_latest_trading_day()
    daily_comp  = str(meta[0][1]) if meta and meta[0][1] else None
    week_comp   = str(meta[0][2]) if meta and meta[0][2] else None
    month_comp  = str(meta[0][3]) if meta and meta[0][3] else None

    today_w, today_l = fetch_movers("day",   limit)
    week_w,  week_l  = fetch_movers("week",  limit)
    month_w, month_l = fetch_movers("month", limit)

    return {
        "as_of_date": as_of_date,
        "today": {
            "comparison_date": daily_comp,
            "winners": today_w,
            "losers":  today_l,
            "volume":  volume,
        },
        "week": {
            "comparison_date": week_comp,
            "winners": week_w,
            "losers":  week_l,
        },
        "month": {
            "comparison_date": month_comp,
            "winners": month_w,
            "losers":  month_l,
        },
    }
