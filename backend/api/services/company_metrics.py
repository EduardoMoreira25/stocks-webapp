from connectors.db_connector import DBConnectorFinancials
from typing import Dict, Optional


def get_current_price(symbol: str) -> Optional[float]:
    """
    Get most recent closing price for a symbol

    Args:
        symbol: Stock symbol

    Returns:
        float: Most recent closing price, or None if not available
    """
    query = """
        SELECT close
        FROM silver.s_stock_prices_daily
        WHERE symbol = %s
        ORDER BY date DESC
        LIMIT 1
    """
    result = DBConnectorFinancials.query(query, [symbol.upper()])
    return float(result[0][0]) if result and result[0][0] else None


def get_latest_kpis(symbol: str):
    """
    Get the most recent quarterly row from int_financial_kpis for a symbol.
    Used as the base for all metric functions.

    Args:
        symbol: Stock symbol

    Returns:
        Row from int_financial_kpis or None
    """
    query = """
        SELECT
            revenue,                        -- 0
            revenue_ttm,                    -- 1
            net_income,                     -- 2
            net_income_ttm,                 -- 3
            gross_profit_ttm,               -- 4
            operating_income_ttm,           -- 5
            ebitda_ttm,                     -- 6
            eps_diluted_ttm,                -- 7
            free_cash_flow,                 -- 8
            fcf_ttm,                        -- 9
            sbc_ttm,                        -- 10
            stock_based_compensation,       -- 11
            total_equity,                   -- 12
            total_stockholders_equity,      -- 13
            total_debt,                     -- 14
            total_current_assets,           -- 15
            total_current_liabilities,      -- 16
            cash_and_cash_equivalents,      -- 17
            net_debt,                       -- 18
            market_cap_period_end,          -- 19
            price_period_end,               -- 20
            date                            -- 21
        FROM gold.g_calculated_kpis
        WHERE symbol = %s
          AND period NOT IN ('FY')
        ORDER BY date DESC
        LIMIT 1
    """
    result = DBConnectorFinancials.query(query, [symbol.upper()])
    return result[0] if result else None


def get_valuation_metrics(symbol: str) -> Dict:
    """
    Calculate valuation metrics for a company

    Args:
        symbol: Stock symbol

    Returns:
        dict: Valuation metrics including market cap, P/E, P/S, P/EBITDA, P/B
    """
    row = get_latest_kpis(symbol)

    if not row:
        return {
            "symbol": symbol.upper(),
            "data_quality": {"error": "No TTM data available"},
            "market_cap": None,
            "ttm_pe_ratio": None,
            "ttm_price_to_sales": None,
            "ttm_price_to_ebitda": None,
            "price_to_book": None
        }

    revenue_ttm               = row[1]
    net_income_ttm            = row[3]
    ebitda_ttm                = row[6]
    total_stockholders_equity = row[13]
    market_cap                = row[19]
    price                     = row[20]

    current_price = get_current_price(symbol)

    # Derive shares outstanding from market cap / price at period end
    shares_outstanding = None
    if market_cap and price and float(price) > 0:
        shares_outstanding = float(market_cap) / float(price)

    # Recalculate market cap with current price if available
    current_market_cap = None
    if current_price and shares_outstanding:
        current_market_cap = float(current_price) * shares_outstanding

    mc = current_market_cap or (float(market_cap) if market_cap else None)

    ttm_pe = None
    if mc and net_income_ttm and float(net_income_ttm) > 0:
        ttm_pe = mc / float(net_income_ttm)

    ttm_ps = None
    if mc and revenue_ttm and float(revenue_ttm) > 0:
        ttm_ps = mc / float(revenue_ttm)

    ttm_p_ebitda = None
    if mc and ebitda_ttm and float(ebitda_ttm) > 0:
        ttm_p_ebitda = mc / float(ebitda_ttm)

    price_to_book = None
    if current_price and total_stockholders_equity and shares_outstanding and shares_outstanding > 0:
        book_value_per_share = float(total_stockholders_equity) / shares_outstanding
        if book_value_per_share > 0:
            price_to_book = float(current_price) / book_value_per_share

    return {
        "symbol": symbol.upper(),
        "current_price": current_price,
        "market_cap": mc,
        "ttm_pe_ratio": ttm_pe,
        "ttm_price_to_sales": ttm_ps,
        "ttm_price_to_ebitda": ttm_p_ebitda,
        "price_to_book": price_to_book,
        "data_quality": {
            "has_current_price": current_price is not None
        }
    }


def get_dividend_metrics(symbol: str) -> Dict:
    """
    Calculate dividend metrics for a company

    Args:
        symbol: Stock symbol

    Returns:
        dict: Dividend metrics including yield, total paid, payout ratio
    """
    row = get_latest_kpis(symbol)

    if not row:
        return {
            "symbol": symbol.upper(),
            "data_quality": {"error": "No data available"},
            "ttm_dividend_yield": None,
            "ttm_net_dividends_paid": None,
            "ttm_payout_ratio": None
        }

    net_income_ttm = row[3]
    market_cap     = row[19]
    price          = row[20]

    # Dividends are not in int_financial_kpis — pull TTM sum from cashflow source
    div_query = """
        SELECT sum(dividends_paid)
        FROM gold.g_financial_statement_cashflow
        WHERE symbol = %s
          AND period NOT IN ('FY')
          AND date >= (
              SELECT date - interval '1 year'
              FROM gold.g_financial_statement_cashflow
              WHERE symbol = %s AND period NOT IN ('FY')
              ORDER BY date DESC LIMIT 1
          )
    """
    div_result = DBConnectorFinancials.query(div_query, [symbol.upper(), symbol.upper()])
    ttm_dividends = abs(float(div_result[0][0])) if div_result and div_result[0][0] else 0

    # Derive shares outstanding from market cap / price at period end
    shares_outstanding = None
    if market_cap and price and float(price) > 0:
        shares_outstanding = float(market_cap) / float(price)

    current_price = get_current_price(symbol)

    dividend_per_share = None
    if ttm_dividends and shares_outstanding and shares_outstanding > 0:
        dividend_per_share = ttm_dividends / shares_outstanding

    dividend_yield = None
    if dividend_per_share and current_price and current_price > 0:
        dividend_yield = (dividend_per_share / float(current_price)) * 100

    payout_ratio = None
    if ttm_dividends and net_income_ttm and float(net_income_ttm) > 0:
        payout_ratio = (ttm_dividends / float(net_income_ttm)) * 100

    return {
        "symbol": symbol.upper(),
        "ttm_dividend_yield": dividend_yield,
        "ttm_net_dividends_paid": ttm_dividends,
        "ttm_payout_ratio": payout_ratio,
        "data_quality": {
            "has_dividends": ttm_dividends > 0
        }
    }


def get_cashflow_metrics(symbol: str) -> Dict:
    """
    Calculate cash flow metrics for a company including SBC-adjusted metrics

    Args:
        symbol: Stock symbol

    Returns:
        dict: Cash flow metrics including FCF, OCF, SBC-adjusted FCF, and yield metrics
    """
    row = get_latest_kpis(symbol)

    if not row:
        return {
            "symbol": symbol.upper(),
            "data_quality": {"error": "No data available"},
            "ttm_free_cash_flow": None,
            "ttm_operating_cash_flow": None,
            "ttm_fcf_margin": None,
            "ttm_fcf_per_share": None,
            "cash_flow_to_debt_ratio": None,
            "ttm_stock_based_compensation": None,
            "ttm_sbc_adjusted_fcf": None,
            "ttm_sbc_adjusted_fcf_margin": None,
            "ttm_sbc_adjusted_fcf_per_share": None,
            "ttm_sbc_impact_pct": None,
            "ttm_fcf_yield": None,
            "ttm_fcf_per_share_to_price": None
        }

    revenue_ttm = row[1]
    fcf_ttm     = row[9]
    sbc_ttm     = row[10]
    total_debt  = row[14]
    market_cap  = row[19]
    price       = row[20]

    # Derive shares outstanding from market cap / price at period end
    shares_outstanding = None
    if market_cap and price and float(price) > 0:
        shares_outstanding = float(market_cap) / float(price)

    current_price = get_current_price(symbol)

    # Recalculate market cap with current price if available
    current_market_cap = None
    if current_price and shares_outstanding:
        current_market_cap = float(current_price) * shares_outstanding

    mc = current_market_cap or (float(market_cap) if market_cap else None)

    # OCF not carried through to int_financial_kpis final select — pull from source
    ocf_query = """
        SELECT operating_cash_flow
        FROM gold.g_financial_statement_cashflow
        WHERE symbol = %s AND period NOT IN ('FY')
        ORDER BY date DESC
        LIMIT 1
    """
    ocf_result = DBConnectorFinancials.query(ocf_query, [symbol.upper()])
    ocf = float(ocf_result[0][0]) if ocf_result and ocf_result[0][0] else None

    fcf_ttm_f = float(fcf_ttm) if fcf_ttm is not None else None
    sbc_ttm_f = float(sbc_ttm) if sbc_ttm is not None else None
    revenue_f = float(revenue_ttm) if revenue_ttm else None
    debt_f    = float(total_debt) if total_debt else None

    fcf_margin    = (fcf_ttm_f / revenue_f * 100)          if fcf_ttm_f and revenue_f and revenue_f > 0 else None
    fcf_per_share = (fcf_ttm_f / shares_outstanding)        if fcf_ttm_f and shares_outstanding and shares_outstanding > 0 else None
    cf_to_debt    = (ocf / debt_f)                          if ocf and debt_f and debt_f > 0 else None

    sbc_adjusted_fcf           = None
    sbc_adjusted_fcf_margin    = None
    sbc_adjusted_fcf_per_share = None
    sbc_impact_pct             = None

    if sbc_ttm_f is not None and fcf_ttm_f is not None:
        sbc_adjusted_fcf = fcf_ttm_f - sbc_ttm_f

        if fcf_ttm_f != 0:
            sbc_impact_pct = (sbc_ttm_f / fcf_ttm_f) * 100

        if revenue_f and revenue_f > 0:
            sbc_adjusted_fcf_margin = (sbc_adjusted_fcf / revenue_f) * 100

        if shares_outstanding and shares_outstanding > 0:
            sbc_adjusted_fcf_per_share = sbc_adjusted_fcf / shares_outstanding

    fcf_yield              = None
    fcf_per_share_to_price = None

    if mc and fcf_ttm_f and mc > 0:
        fcf_yield = (fcf_ttm_f / mc) * 100

    if current_price and fcf_per_share and float(current_price) > 0:
        fcf_per_share_to_price = fcf_per_share / float(current_price)

    return {
        "symbol": symbol.upper(),
        "ttm_free_cash_flow": fcf_ttm_f,
        "ttm_operating_cash_flow": ocf,
        "ttm_fcf_margin": fcf_margin,
        "ttm_fcf_per_share": fcf_per_share,
        "cash_flow_to_debt_ratio": cf_to_debt,
        "ttm_stock_based_compensation": sbc_ttm_f,
        "ttm_sbc_adjusted_fcf": sbc_adjusted_fcf,
        "ttm_sbc_adjusted_fcf_margin": sbc_adjusted_fcf_margin,
        "ttm_sbc_adjusted_fcf_per_share": sbc_adjusted_fcf_per_share,
        "ttm_sbc_impact_pct": sbc_impact_pct,
        "ttm_fcf_yield": fcf_yield,
        "ttm_fcf_per_share_to_price": fcf_per_share_to_price,
        "data_quality": {
            "has_sbc_data": sbc_ttm is not None,
            "has_current_price": current_price is not None
        }
    }


def get_margin_metrics(symbol: str) -> Dict:
    """
    Calculate margin and growth metrics for a company

    Args:
        symbol: Stock symbol

    Returns:
        dict: Margin metrics and YoY growth rates
    """
    row = get_latest_kpis(symbol)

    if not row:
        return {
            "symbol": symbol.upper(),
            "data_quality": {"error": "No data available"},
            "ttm_profit_margin": None,
            "ttm_operating_margin": None,
            "ttm_gross_margin": None,
            "ttm_ebitda_margin": None,
            "quarterly_earnings_yoy": None,
            "quarterly_revenue_yoy": None
        }

    revenue_ttm          = row[1]
    net_income_ttm       = row[3]
    gross_profit_ttm     = row[4]
    operating_income_ttm = row[5]
    ebitda_ttm           = row[6]

    revenue_f = float(revenue_ttm) if revenue_ttm else None

    profit_margin    = (float(net_income_ttm) / revenue_f * 100)       if net_income_ttm and revenue_f and revenue_f > 0 else None
    operating_margin = (float(operating_income_ttm) / revenue_f * 100) if operating_income_ttm and revenue_f and revenue_f > 0 else None
    gross_margin     = (float(gross_profit_ttm) / revenue_f * 100)     if gross_profit_ttm and revenue_f and revenue_f > 0 else None
    ebitda_margin    = (float(ebitda_ttm) / revenue_f * 100)           if ebitda_ttm and revenue_f and revenue_f > 0 else None

    yoy_query = """
        WITH latest_quarter AS (
            SELECT symbol, fiscal_year, period, net_income, revenue, date
            FROM gold.g_financial_statement_income
            WHERE symbol = %s AND period IN ('Q1','Q2','Q3','Q4')
            ORDER BY date DESC
            LIMIT 1
        ),
        same_quarter_last_year AS (
            SELECT net_income, revenue
            FROM gold.g_financial_statement_income
            WHERE symbol = %s
                AND period = (SELECT period FROM latest_quarter)
                AND fiscal_year::int = (SELECT fiscal_year::int - 1 FROM latest_quarter)
            LIMIT 1
        )
        SELECT
            lq.net_income as current_earnings,
            sq.net_income as prior_earnings,
            lq.revenue    as current_revenue,
            sq.revenue    as prior_revenue
        FROM latest_quarter lq
        LEFT JOIN same_quarter_last_year sq ON true
    """

    yoy_result = DBConnectorFinancials.query(yoy_query, [symbol.upper(), symbol.upper()])

    earnings_yoy = None
    revenue_yoy  = None

    if yoy_result and yoy_result[0]:
        curr_earnings  = yoy_result[0][0]
        prior_earnings = yoy_result[0][1]
        curr_revenue   = yoy_result[0][2]
        prior_revenue  = yoy_result[0][3]

        if curr_earnings is not None and prior_earnings and prior_earnings != 0:
            earnings_yoy = ((float(curr_earnings) - float(prior_earnings)) / float(prior_earnings)) * 100

        if curr_revenue and prior_revenue and float(prior_revenue) > 0:
            revenue_yoy = ((float(curr_revenue) - float(prior_revenue)) / float(prior_revenue)) * 100

    return {
        "symbol": symbol.upper(),
        "ttm_profit_margin": profit_margin,
        "ttm_operating_margin": operating_margin,
        "ttm_gross_margin": gross_margin,
        "ttm_ebitda_margin": ebitda_margin,
        "quarterly_earnings_yoy": earnings_yoy,
        "quarterly_revenue_yoy": revenue_yoy,
        "data_quality": {}
    }


def get_balance_metrics(symbol: str) -> Dict:
    """
    Get balance sheet metrics for a company

    Args:
        symbol: Stock symbol

    Returns:
        dict: Balance sheet metrics and ratios
    """
    query = """
        SELECT
            date,
            cash_and_cash_equivalents,
            total_debt,
            net_debt,
            current_ratio,
            debt_to_equity
        FROM gold.g_calculated_kpis
        WHERE symbol = %s
          AND period NOT IN ('FY')
        ORDER BY date DESC
        LIMIT 1
    """

    result = DBConnectorFinancials.query(query, [symbol.upper()])

    if not result:
        return {
            "symbol": symbol.upper(),
            "data_quality": {"error": "No data available"},
            "balance_sheet_date": None,
            "cash_and_equivalents": None,
            "total_debt": None,
            "net_cash_debt": None,
            "current_ratio": None,
            "debt_to_equity": None
        }

    row = result[0]

    return {
        "symbol": symbol.upper(),
        "balance_sheet_date": str(row[0]) if row[0] else None,
        "cash_and_equivalents": row[1],
        "total_debt": row[2],
        "net_cash_debt": row[3],
        "current_ratio": float(row[4]) if row[4] else None,
        "debt_to_equity": float(row[5]) if row[5] else None,
        "data_quality": {"has_balance_sheet": row[0] is not None}
    }


def get_company_overview(symbol: str) -> Dict:
    """
    Get complete company overview combining all metrics

    Args:
        symbol: Stock symbol

    Returns:
        dict: Complete company overview with all financial metrics
    """
    company_query = """
        SELECT companyname AS company_name, sector, industry
        FROM gold.g_company
        WHERE symbol = %s
    """

    company_result = DBConnectorFinancials.query(company_query, [symbol.upper()])

    company_info = {}
    if company_result:
        company_info = {
            "company_name": company_result[0][0],
            "sector": company_result[0][1],
            "industry": company_result[0][2]
        }

    return {
        "symbol": symbol.upper(),
        **company_info,
        "valuation": get_valuation_metrics(symbol),
        "dividends": get_dividend_metrics(symbol),
        "cashflow": get_cashflow_metrics(symbol),
        "margins": get_margin_metrics(symbol),
        "balance": get_balance_metrics(symbol)
    }