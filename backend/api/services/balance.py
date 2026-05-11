from connectors.db_connector import DBConnectorFinancials

def get_balance_sheets_by_symbol(
        symbol:str, 
        start_date:str=None,
        end_date:str=None,
        limit:int=100):
    """
    Fetch balance sheet data for a specific symbol with optional filters
    """

    # Base query
    query = """
    SELECT 
            symbol,
            date,
            fiscal_year,
            period,
            reported_currency,
            total_assets,
            total_liabilities,
            total_equity,
            cash_and_cash_equivalents,
            total_debt,
            net_debt
        FROM gold.g_financial_statement_balance
        WHERE symbol = %s
    """

    # Build params list
    params = [symbol.upper()]

    # Add optional date filters
    if start_date:
        query += "AND date > %s"
        params.append(start_date)
    
    if end_date:
        query += "AND date <= %s"
        params.append(end_date)

    # Order and limit
    query += " ORDER BY date DESC LIMIT %s"
    params.append(limit)

    # Execute query
    results = DBConnectorFinancials.query(query=query, params=params)

    # Transform results into list of dictionaries
    # (Right now it returns tuples - we need dicts for JSON)
    balance_sheets = []
    for row in results:
        balance_sheets.append({
            "symbol": row[0],
            "date": str(row[1]),  # Convert date to string
            "fiscal_year": row[2],
            "period": row[3],
            "reported_currency": row[4],
            "total_assets": row[5],
            "total_liabilities": row[6],
            "total_equity": row[7],
            "cash_and_cash_equivalents": row[8],
            "total_debt": row[9],
            "net_debt": row[10]
        })
    
    return balance_sheets