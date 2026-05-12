"""Service for company data endpoints (company details, financials, prices, segments)"""

from connectors.db_connector import DBConnectorFinancials, DBConnectorAPP
from typing import Dict, List, Optional
from datetime import date, timedelta


def get_company_basic_info(symbol: str) -> Optional[Dict]:
    """
    Get basic company information (name, sector, industry, image, current price, changes)

    Args:
        symbol: Stock symbol

    Returns:
        dict: Company basic info or None if not found
    """
    # Get company metadata
    company_query = """
        SELECT symbol, companyname, sector, industry, image_url
        FROM gold.g_company
        WHERE symbol = %s
    """

    company_result = DBConnectorFinancials.query(company_query, [symbol.upper()])

    if not company_result:
        return None

    _, company_name, sector, industry, image_url = company_result[0]

    # Get current price and market cap
    price_query = """
        SELECT close, date, market_cap
        FROM silver.s_stock_prices_daily
        WHERE symbol = %s
        ORDER BY date DESC
        LIMIT 1
    """

    price_result = DBConnectorFinancials.query(price_query, [symbol.upper()])
    current_price = float(price_result[0][0]) if price_result and price_result[0][0] else None
    price_date = price_result[0][1] if price_result else None
    market_cap = float(price_result[0][2]) if price_result and price_result[0][2] else None

    # Get price changes (day, week, month)
    changes_query = """
        WITH price_points AS (
            SELECT
                close,
                date,
                LAG(close, 1) OVER (ORDER BY date) as prev_day_close,
                LAG(close, 5) OVER (ORDER BY date) as prev_week_close,
                LAG(close, 20) OVER (ORDER BY date) as prev_month_close
            FROM silver.s_stock_prices_daily
            WHERE symbol = %s
            ORDER BY date DESC
            LIMIT 1
        )
        SELECT
            close as current_price,
            CASE
                WHEN prev_day_close IS NOT NULL AND prev_day_close > 0
                THEN ((close - prev_day_close) / prev_day_close * 100)
                ELSE NULL
            END as day_change,
            CASE
                WHEN prev_week_close IS NOT NULL AND prev_week_close > 0
                THEN ((close - prev_week_close) / prev_week_close * 100)
                ELSE NULL
            END as week_change,
            CASE
                WHEN prev_month_close IS NOT NULL AND prev_month_close > 0
                THEN ((close - prev_month_close) / prev_month_close * 100)
                ELSE NULL
            END as month_change
        FROM price_points
    """

    changes_result = DBConnectorFinancials.query(changes_query, [symbol.upper()])

    day_change = None
    week_change = None
    month_change = None

    if changes_result and changes_result[0]:
        _, day_change, week_change, month_change = changes_result[0]

    # Get pre-calculated KPIs from the new table
    # Strategy: Prefer FY data from current fiscal year, otherwise use latest quarter
    kpis_query = """
        WITH latest_fiscal_year AS (
            SELECT MAX(fiscal_year) as max_fy
            FROM gold.g_calculated_kpis
            WHERE symbol = %s
        ),
        fy_current_year AS (
            SELECT *
            FROM gold.g_calculated_kpis
            WHERE symbol = %s
                AND period = 'FY'
                AND fiscal_year = (SELECT max_fy FROM latest_fiscal_year)
            LIMIT 1
        ),
        latest_quarter AS (
            SELECT *
            FROM gold.g_calculated_kpis
            WHERE symbol = %s
            ORDER BY date DESC
            LIMIT 1
        )
        SELECT
            net_margin,
            gross_margin,
            operating_margin,
            roe,
            roa,
            roic,
            current_ratio,
            cash_ratio,
            debt_to_equity,
            debt_to_assets,
            fcf_ttm                   as ttm_fcf_yield,
            sbc_impact_on_fcf,
            pe_ratio_ttm              as ttm_pe_ratio,
            pb_ratio,
            ev_to_ebitda_ttm          as ttm_ev_ebitda
        FROM (
            SELECT * FROM fy_current_year
            UNION ALL
            SELECT * FROM latest_quarter
        ) combined
        LIMIT 1
    """

    kpis_result = DBConnectorFinancials.query(kpis_query, [symbol.upper(), symbol.upper(), symbol.upper()])

    # Structure KPIs into categories
    kpis = None
    if kpis_result and kpis_result[0]:
        (net_margin, gross_margin, operating_margin, roe, roa, roic,
         curr_ratio, cash_ratio, debt_eq, debt_assets, fcf_yield,
         sbc_impact, pe, pb, ev_ebitda) = kpis_result[0]

        kpis = {
            "profitability": {
                "net_margin": float(net_margin) if net_margin is not None else None,
                "roe": float(roe) if roe is not None else None,
                "roa": float(roa) if roa is not None else None,
                "gross_margin": float(gross_margin) if gross_margin is not None else None,
                "operating_margin": float(operating_margin) if operating_margin is not None else None,
                "roic": float(roic) if roic is not None else None
            },
            "liquidity": {
                "current_ratio": float(curr_ratio) if curr_ratio is not None else None,
                "cash_ratio": float(cash_ratio) if cash_ratio is not None else None
            },
            "leverage": {
                "debt_to_equity": float(debt_eq) if debt_eq is not None else None,
                "debt_to_assets": float(debt_assets) if debt_assets is not None else None
            },
            "cash_flow": {
                "ttm_fcf_yield": float(fcf_yield) if fcf_yield is not None else None,
                "sbc_impact_on_fcf": float(sbc_impact) if sbc_impact is not None else None
            },
            "valuation": {
                "market_cap": market_cap,
                "ttm_pe_ratio": float(pe) if pe is not None else None,
                "pb_ratio": float(pb) if pb is not None else None,
                "ttm_ev_ebitda": float(ev_ebitda) if ev_ebitda is not None else None
            }
        }

    return {
        "symbol": symbol.upper(),
        "company_name": company_name,
        "sector": sector,
        "industry": industry,
        "image_url": image_url,
        "current_price": current_price,
        "day_change": float(day_change) if day_change else None,
        "week_change": float(week_change) if week_change else None,
        "month_change": float(month_change) if month_change else None,
        "price_date": str(price_date) if price_date else None,
        "kpis": kpis
    }


def get_company_financials(symbol: str, period: str = 'ALL', years: int = 5) -> List[Dict]:
    """
    Get financial statements for a company

    Args:
        symbol: Stock symbol
        period: 'FY' for annual only, 'Q' for quarterly only, 'ALL' for both (default)
        years: Number of years of data

    Returns:
        list: Financial data points
    """
    if period == 'FY':
        period_filter = "('FY')"
    elif period == 'Q':
        period_filter = "('Q1', 'Q2', 'Q3', 'Q4')"
    else:  # ALL - include both quarterly and annual
        period_filter = "('Q1', 'Q2', 'Q3', 'Q4', 'FY')"

    query = f"""
        SELECT
            i.fiscal_year,
            i.period,
            i.date as statement_date,
            i.revenue,
            i.net_income,
            i.eps,
            i.eps_diluted,
            i.gross_profit,
            i.operating_income,
            i.ebitda,
            i.operating_expenses,
            b.cash_and_cash_equivalents,
            b.total_debt,
            (b.cash_and_cash_equivalents - COALESCE(b.total_debt, 0)) as net_debt,
            b.total_assets,
            b.total_equity as total_stockholders_equity,
            cf.free_cash_flow,
            cf.operating_cash_flow,
            cf.net_dividends_paid as dividends_paid,
            cf.capital_expenditure,
            i.weighted_average_shs_out_dil as shares_outstanding,
            kpi.roa
        FROM gold.g_financial_statement_income i
        LEFT JOIN gold.g_financial_statement_balance b
            ON i.symbol = b.symbol AND i.date = b.date AND i.period = b.period
        LEFT JOIN gold.g_financial_statement_cashflow cf
            ON i.symbol = cf.symbol AND i.date = cf.date AND i.period = cf.period
        LEFT JOIN gold.g_calculated_kpis kpi
            ON i.symbol = kpi.symbol AND i.date = kpi.date AND i.period = kpi.period
        WHERE i.symbol = %s
            AND i.period IN {period_filter}
            AND i.fiscal_year::integer >= EXTRACT(YEAR FROM CURRENT_DATE)::integer - %s
        ORDER BY i.date ASC,
            CASE i.period
                WHEN 'Q1' THEN 1
                WHEN 'Q2' THEN 2
                WHEN 'Q3' THEN 3
                WHEN 'Q4' THEN 4
                WHEN 'FY' THEN 5
                ELSE 6
            END
        LIMIT 200
    """

    result = DBConnectorFinancials.query(query, [symbol.upper(), years])

    financials = []
    for row in result:
        financials.append({
            "fiscal_year": row[0],
            "period": row[1],
            "statement_date": str(row[2]) if row[2] else None,
            "revenue": float(row[3]) if row[3] else None,
            "net_income": float(row[4]) if row[4] else None,
            "eps": float(row[5]) if row[5] else None,
            "eps_diluted": float(row[6]) if row[6] else None,
            "gross_profit": float(row[7]) if row[7] else None,
            "operating_income": float(row[8]) if row[8] else None,
            "ebitda": float(row[9]) if row[9] else None,
            "operating_expenses": float(row[10]) if row[10] else None,
            "cash_and_cash_equivalents": float(row[11]) if row[11] else None,
            "total_debt": float(row[12]) if row[12] else None,
            "net_debt": float(row[13]) if row[13] else None,
            "total_assets": float(row[14]) if row[14] else None,
            "total_stockholders_equity": float(row[15]) if row[15] else None,
            "free_cash_flow": float(row[16]) if row[16] else None,
            "operating_cash_flow": float(row[17]) if row[17] else None,
            "dividends_paid": float(row[18]) if row[18] else None,
            "capital_expenditure": float(row[19]) if row[19] else None,
            "shares_outstanding": float(row[20]) if row[20] else None,
            "roa": float(row[21]) if row[21] else None
        })

    return financials


def get_price_chart(symbol: str, period: str = '1Y') -> List[Dict]:
    """
    Get historical price data for charting

    Args:
        symbol: Stock symbol
        period: Time period ('1W', '1M', '6M', '1Y', '5Y')

    Returns:
        list: Price data points
    """
    # Map period to days
    period_days = {
        '1W': 7,
        '1M': 30,
        '6M': 180,
        '1Y': 365,
        '5Y': 1825
    }

    days = period_days.get(period, 365)

    query = """
        SELECT date, close, volume
        FROM silver.s_stock_prices_daily
        WHERE symbol = %s
            AND date >= CURRENT_DATE - INTERVAL '%s days'
        ORDER BY date ASC
    """

    result = DBConnectorFinancials.query(query, [symbol.upper(), days])

    prices = []
    for row in result:
        prices.append({
            "date": str(row[0]),
            "close": float(row[1]) if row[1] else None,
            "volume": int(row[2]) if row[2] else None
        })

    return prices


def search_companies(query: str, limit: int = 10) -> List[Dict]:
    """
    Search for companies by name or symbol

    Args:
        query: Search query
        limit: Maximum results

    Returns:
        list: Matching companies
    """
    # Prioritize exact symbol matches, then symbol starts-with, then partial matches
    search_query = """
        SELECT symbol, company_name, sector, industry, image_url
        FROM (
            SELECT DISTINCT c.symbol, c.companyname AS company_name, c.sector, c.industry, c.image_url,
                CASE
                    WHEN c.symbol ILIKE %s THEN 0
                    WHEN c.symbol ILIKE %s THEN 1
                    ELSE 2
                END as match_priority
            FROM gold.g_company c
            WHERE c.symbol ILIKE %s OR c.companyname ILIKE %s
        ) ranked
        ORDER BY match_priority, symbol
        LIMIT %s
    """

    search_pattern = f"%{query}%"
    starts_with_pattern = f"{query}%"
    result = DBConnectorFinancials.query(search_query, [query.upper(), starts_with_pattern, search_pattern, search_pattern, limit])

    companies = []
    for row in result:
        companies.append({
            "symbol": row[0],
            "company_name": row[1],
            "sector": row[2],
            "industry": row[3],
            "image_url": row[4]
        })

    return companies


def get_companies_by_sector(sector: str) -> List[Dict]:
    """
    Get all companies in a specific sector

    Args:
        sector: Sector name

    Returns:
        list: Companies in the sector with market cap
    """
    query = """
        SELECT c.symbol, c.companyname AS company_name, c.image_url, c.industry, sp.market_cap
        FROM gold.g_company c
        LEFT JOIN LATERAL (
            SELECT market_cap
            FROM silver.s_stock_prices_daily
            WHERE symbol = c.symbol
            ORDER BY date DESC
            LIMIT 1
        ) sp ON true
        WHERE c.sector = %s
        ORDER BY c.companyname ASC
    """

    result = DBConnectorFinancials.query(query, [sector])

    companies = []
    for row in result:
        companies.append({
            "symbol": row[0],
            "company_name": row[1],
            "image_url": row[2],
            "industry": row[3],
            "market_cap": float(row[4]) if row[4] else None
        })

    return companies


def get_sector_overview() -> Dict:
    query = """
        SELECT sector, industry, total_market_cap, company_count
        FROM gold.g_sector_market_cap
        ORDER BY sector, total_market_cap DESC
    """
    rows = DBConnectorFinancials.query(query)

    sectors_dict = {}
    grand_total = 0.0

    for row in rows:
        sector, industry, market_cap, company_count = row
        mc = float(market_cap) if market_cap else 0.0
        grand_total += mc

        if sector not in sectors_dict:
            sectors_dict[sector] = {"name": sector, "total_market_cap": 0.0, "company_count": 0, "industries": []}

        sectors_dict[sector]["total_market_cap"] += mc
        sectors_dict[sector]["company_count"] += int(company_count)
        sectors_dict[sector]["industries"].append({
            "name": industry,
            "total_market_cap": mc,
            "company_count": int(company_count),
        })

    sectors = sorted(sectors_dict.values(), key=lambda x: x["total_market_cap"], reverse=True)

    for s in sectors:
        s["market_cap_pct"] = round(s["total_market_cap"] / grand_total * 100, 2) if grand_total > 0 else 0
        for ind in s["industries"]:
            ind["market_cap_pct"] = round(ind["total_market_cap"] / s["total_market_cap"] * 100, 2) if s["total_market_cap"] > 0 else 0

    return {"total_market_cap": grand_total, "sectors": sectors}


def get_sector_history(period: str = '1Y', view: str = 'sector') -> Dict:
    period_config = {
        '1W':  (7,    1),
        '1M':  (30,   1),
        '6M':  (180,  7),
        '1Y':  (365,  7),
        '2Y':  (730,  14),
        '5Y':  (1825, 30),
        '10Y': (3650, 30),
        '15Y': (5475, 45),
    }
    days, step = period_config.get(period, (365, 7))
    start_date = date.today() - timedelta(days=days)

    if view == 'industry':
        query = """
            WITH date_ranks AS (
                SELECT snapshot_date,
                       ROW_NUMBER() OVER (ORDER BY snapshot_date) AS rn
                FROM (
                    SELECT DISTINCT snapshot_date
                    FROM gold.g_sector_market_cap_history
                    WHERE snapshot_date >= %s
                ) d
            ),
            sampled AS (
                SELECT snapshot_date FROM date_ranks
                WHERE rn %% %s = 0
                   OR snapshot_date = (SELECT MAX(snapshot_date) FROM date_ranks)
            )
            SELECT h.snapshot_date, h.sector, h.industry, h.total_market_cap
            FROM gold.g_sector_market_cap_history h
            JOIN sampled s ON h.snapshot_date = s.snapshot_date
            ORDER BY h.snapshot_date, h.sector, h.industry
        """
        rows = DBConnectorFinancials.query(query, [start_date, step])

        snapshots_dict: Dict[str, Dict] = {}
        series_map: Dict[str, str] = {}  # key -> sector

        for row in rows:
            snap_date = str(row[0])
            sector    = row[1]
            industry  = row[2]
            mc        = float(row[3]) if row[3] else 0.0

            series_map[industry] = sector
            if snap_date not in snapshots_dict:
                snapshots_dict[snap_date] = {"date": snap_date}
            snapshots_dict[snap_date][industry] = mc

    else:
        query = """
            WITH sector_agg AS (
                SELECT snapshot_date, sector, SUM(total_market_cap) AS sector_mc
                FROM gold.g_sector_market_cap_history
                WHERE snapshot_date >= %s
                GROUP BY snapshot_date, sector
            ),
            date_ranks AS (
                SELECT snapshot_date,
                       ROW_NUMBER() OVER (ORDER BY snapshot_date) AS rn
                FROM (SELECT DISTINCT snapshot_date FROM sector_agg) d
            ),
            sampled AS (
                SELECT snapshot_date FROM date_ranks
                WHERE rn %% %s = 0
                   OR snapshot_date = (SELECT MAX(snapshot_date) FROM date_ranks)
            )
            SELECT sa.snapshot_date, sa.sector, sa.sector_mc
            FROM sector_agg sa
            JOIN sampled s ON sa.snapshot_date = s.snapshot_date
            ORDER BY sa.snapshot_date, sa.sector
        """
        rows = DBConnectorFinancials.query(query, [start_date, step])

        snapshots_dict = {}
        series_map = {}

        for row in rows:
            snap_date = str(row[0])
            sector    = row[1]
            mc        = float(row[2]) if row[2] else 0.0

            series_map[sector] = sector
            if snap_date not in snapshots_dict:
                snapshots_dict[snap_date] = {"date": snap_date}
            snapshots_dict[snap_date][sector] = mc

    snapshots = sorted(snapshots_dict.values(), key=lambda x: x["date"])
    series = [{"key": k, "sector": v} for k, v in sorted(series_map.items())]

    return {"period": period, "view": view, "series": series, "snapshots": snapshots}


def get_revenue_segments(symbol: str, limit: int = 200) -> Dict:
    """
    Get revenue segment breakdown (product and geographic)

    Args:
        symbol: Stock symbol
        limit: Maximum periods to return

    Returns:
        dict: Revenue segments data
    """
    query = """
        WITH deduplicated_segments AS (
            SELECT
                MAX(date) as date,
                fiscal_year,
                period,
                quarter,
                segment_type,
                segment_name,
                SUM(revenue) as revenue
            FROM gold.g_revenue_segments
            WHERE symbol = %s
            GROUP BY fiscal_year, period, quarter, segment_type, segment_name
        ),
        filtered_segments AS (
            SELECT
                date,
                fiscal_year,
                period,
                quarter,
                segment_type,
                segment_name,
                revenue
            FROM deduplicated_segments
            WHERE
                -- Exclude summary segments that overlap with detail segments
                segment_name NOT IN (
                    'GoogleServices',           -- Top-level summary containing all Google segments
                    'GoogleAdvertisingRevenue'  -- Summary of YouTube + GoogleSearchOther + GoogleNetwork
                )
        ),
        segment_totals AS (
            SELECT
                date,
                fiscal_year,
                period,
                quarter,
                segment_type,
                segment_name,
                revenue,
                SUM(revenue) OVER (PARTITION BY fiscal_year, quarter, segment_type) as total_revenue
            FROM filtered_segments
        )
        SELECT
            date,
            fiscal_year,
            period,
            quarter,
            segment_type,
            segment_name,
            revenue,
            CASE
                WHEN total_revenue > 0 THEN (revenue / total_revenue * 100)
                ELSE 0
            END as revenue_percentage
        FROM segment_totals
        ORDER BY fiscal_year DESC,
            CASE quarter
                WHEN 'Q1' THEN 1
                WHEN 'Q2' THEN 2
                WHEN 'Q3' THEN 3
                WHEN 'Q4' THEN 4
                WHEN 'FY' THEN 5
                ELSE 6
            END DESC,
            segment_type, segment_name
        LIMIT %s
    """

    result = DBConnectorFinancials.query(query, [symbol.upper(), limit])

    if not result:
        return {"symbol": symbol.upper(), "periods": []}

    # Group by fiscal_year and quarter instead of date
    periods_dict = {}

    for row in result:
        date, fiscal_year, period, quarter, segment_type, segment_name, revenue, revenue_pct = row
        # Use fiscal_year + quarter as the unique key
        period_key = f"{fiscal_year}_{quarter}"

        if period_key not in periods_dict:
            periods_dict[period_key] = {
                "date": str(date),
                "data": {
                    "product": {"period": period, "segments": []},
                    "geographic": {"period": period, "segments": []},
                    "units": {"period": period, "segments": []}
                }
            }

        segment_data = {
            "name": segment_name,
            "revenue": float(revenue) if revenue else 0,
            "revenue_percentage": float(revenue_pct) if revenue_pct else 0,
            "fiscal_year": fiscal_year,
            "quarter": quarter
        }

        if segment_type == 'product':
            periods_dict[period_key]["data"]["product"]["segments"].append(segment_data)
        elif segment_type == 'geographic':
            periods_dict[period_key]["data"]["geographic"]["segments"].append(segment_data)
        elif segment_type == 'units':
            periods_dict[period_key]["data"]["units"]["segments"].append(segment_data)

    periods = list(periods_dict.values())

    return {
        "symbol": symbol.upper(),
        "periods": periods
    }


def get_user_segments(symbol: str, limit: int = 100) -> Dict:
    """
    Get user/subscriber segment data (memberships, paid subscribers, etc.)

    Args:
        symbol: Stock symbol
        limit: Maximum periods to return

    Returns:
        dict: User segment data with historical metrics
    """
    query = """
        SELECT
            date,
            fiscal_year,
            period,
            quarter,
            segment_name,
            revenue as value
        FROM gold.g_revenue_segments
        WHERE symbol = %s
            AND segment_type = 'users'
        ORDER BY fiscal_year DESC,
            CASE quarter
                WHEN 'Q1' THEN 1
                WHEN 'Q2' THEN 2
                WHEN 'Q3' THEN 3
                WHEN 'Q4' THEN 4
                WHEN 'FY' THEN 5
                ELSE 6
            END DESC
        LIMIT %s
    """

    result = DBConnectorFinancials.query(query, [symbol.upper(), limit])

    if not result:
        return {"symbol": symbol.upper(), "metrics": []}

    # Group by segment_name to support multiple user metrics
    metrics_dict = {}

    for row in result:
        date, fiscal_year, period, quarter, segment_name, value = row

        if segment_name not in metrics_dict:
            metrics_dict[segment_name] = {
                "name": segment_name,
                "data": []
            }

        metrics_dict[segment_name]["data"].append({
            "date": str(date),
            "fiscal_year": fiscal_year,
            "period": period,
            "quarter": quarter,
            "value": float(value) if value else 0
        })

    # Reverse each metric's data to be chronological (oldest first)
    for metric in metrics_dict.values():
        metric["data"].reverse()

    return {
        "symbol": symbol.upper(),
        "metrics": list(metrics_dict.values())
    }


def get_sector_company_kpis(sector_name: str) -> List[Dict]:
    """
    Get latest KPI data for all companies in a sector, used for client-side filtering.
    """
    query = """
        SELECT
            c.symbol,
            k.net_margin,
            k.gross_margin,
            k.operating_margin,
            k.roe,
            k.roa,
            k.roic,
            k.current_ratio,
            k.cash_ratio,
            k.debt_to_equity,
            k.debt_to_assets,
            k.fcf_ttm,
            k.sbc_impact_on_fcf,
            k.pe_ratio_ttm,
            k.pb_ratio,
            k.ev_to_ebitda_ttm,
            sp.market_cap,
            i.revenue,
            i.net_income,
            i.ebitda,
            i.operating_expenses,
            i.eps_diluted,
            b.cash_and_cash_equivalents,
            b.total_debt,
            (b.cash_and_cash_equivalents - COALESCE(b.total_debt, 0)) AS net_debt,
            cf.free_cash_flow
        FROM gold.g_company c
        LEFT JOIN LATERAL (
            SELECT net_margin, gross_margin, operating_margin, roe, roa, roic,
                   current_ratio, cash_ratio, debt_to_equity, debt_to_assets,
                   fcf_ttm, sbc_impact_on_fcf, pe_ratio_ttm, pb_ratio, ev_to_ebitda_ttm
            FROM gold.g_calculated_kpis
            WHERE symbol = c.symbol
            ORDER BY date DESC
            LIMIT 1
        ) k ON true
        LEFT JOIN LATERAL (
            SELECT market_cap
            FROM silver.s_stock_prices_daily
            WHERE symbol = c.symbol
            ORDER BY date DESC
            LIMIT 1
        ) sp ON true
        LEFT JOIN LATERAL (
            SELECT revenue, net_income, ebitda, operating_expenses, eps_diluted
            FROM gold.g_financial_statement_income
            WHERE symbol = c.symbol AND period = 'FY'
            ORDER BY date DESC
            LIMIT 1
        ) i ON true
        LEFT JOIN LATERAL (
            SELECT cash_and_cash_equivalents, total_debt
            FROM gold.g_financial_statement_balance
            WHERE symbol = c.symbol AND period = 'FY'
            ORDER BY date DESC
            LIMIT 1
        ) b ON true
        LEFT JOIN LATERAL (
            SELECT free_cash_flow
            FROM gold.g_financial_statement_cashflow
            WHERE symbol = c.symbol AND period = 'FY'
            ORDER BY date DESC
            LIMIT 1
        ) cf ON true
        WHERE c.sector = %s
    """

    result = DBConnectorFinancials.query(query, [sector_name])

    kpis = []
    for row in result:
        def f(v):
            return float(v) if v is not None else None

        (symbol, net_margin, gross_margin, operating_margin, roe, roa, roic,
         current_ratio, cash_ratio, debt_to_equity, debt_to_assets,
         fcf_ttm, sbc_impact_on_fcf, pe_ratio_ttm, pb_ratio, ev_to_ebitda_ttm,
         market_cap, revenue, net_income, ebitda, operating_expenses, eps_diluted,
         cash, total_debt, net_debt, free_cash_flow) = row

        kpis.append({
            "symbol": symbol,
            "net_margin": f(net_margin),
            "gross_margin": f(gross_margin),
            "operating_margin": f(operating_margin),
            "roe": f(roe),
            "roa": f(roa),
            "roic": f(roic),
            "current_ratio": f(current_ratio),
            "cash_ratio": f(cash_ratio),
            "debt_to_equity": f(debt_to_equity),
            "debt_to_assets": f(debt_to_assets),
            "fcf_ttm": f(fcf_ttm),
            "sbc_impact_on_fcf": f(sbc_impact_on_fcf),
            "pe_ratio_ttm": f(pe_ratio_ttm),
            "pb_ratio": f(pb_ratio),
            "ev_to_ebitda_ttm": f(ev_to_ebitda_ttm),
            "market_cap": f(market_cap),
            "revenue": f(revenue),
            "net_income": f(net_income),
            "ebitda": f(ebitda),
            "operating_expenses": f(operating_expenses),
            "eps_diluted": f(eps_diluted),
            "cash_and_cash_equivalents": f(cash),
            "total_debt": f(total_debt),
            "net_debt": f(net_debt),
            "free_cash_flow": f(free_cash_flow),
        })

    return kpis


def get_earnings_calendar(start_date: str, end_date: str) -> List[Dict]:
    """
    Get earnings calendar events for a date range

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format

    Returns:
        list: Earnings events with company info, ordered by date then market cap (largest first)
    """
    ec_query = """
        SELECT symbol, report_date, expected_filing_date,
               fiscal_year, fiscal_period, form_type, is_filed
        FROM earnings_calendar
        WHERE report_date >= %s AND report_date <= %s
        ORDER BY report_date ASC
    """
    ec_rows = DBConnectorAPP.query(ec_query, [start_date, end_date])

    if not ec_rows:
        return []

    symbols = list({row[0] for row in ec_rows})
    placeholders = ', '.join(['%s'] * len(symbols))
    company_query = f"""
        SELECT c.symbol, c.companyname, c.image_url, sp.market_cap
        FROM gold.g_company c
        LEFT JOIN LATERAL (
            SELECT market_cap
            FROM silver.s_stock_prices_daily
            WHERE symbol = c.symbol
            ORDER BY date DESC
            LIMIT 1
        ) sp ON true
        WHERE c.symbol IN ({placeholders})
    """
    company_rows = DBConnectorFinancials.query(company_query, symbols)
    company_map = {
        row[0]: {
            "company_name": row[1],
            "image_url": row[2],
            "market_cap": float(row[3]) if row[3] else None
        }
        for row in company_rows
    }

    events = []
    for row in ec_rows:
        info = company_map.get(row[0], {"company_name": None, "image_url": None, "market_cap": None})
        events.append({
            "symbol": row[0],
            "company_name": info["company_name"],
            "image_url": info["image_url"],
            "report_date": str(row[1]) if row[1] else None,
            "expected_filing_date": str(row[2]) if row[2] else None,
            "fiscal_year": row[3],
            "fiscal_period": row[4],
            "form_type": row[5],
            "is_filed": row[6],
            "market_cap": info["market_cap"]
        })

    events.sort(key=lambda x: (x["report_date"] or "", -(x["market_cap"] or 0)))
    return events
