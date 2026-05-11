from typing import List, Dict, Optional
from connectors.db_connector import DBConnectorAPP, DBConnectorFinancials
from datetime import date, datetime, timedelta


# ==================== Portfolio Operations ====================

def get_all_portfolios() -> List[Dict]:
    """Get all portfolios"""
    query = """
        SELECT id, name, description, created_at, updated_at
        FROM portfolios
        ORDER BY created_at DESC
    """
    results = DBConnectorAPP.query(query)

    return [
        {
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "created_at": row[3],
            "updated_at": row[4]
        }
        for row in results
    ]


def get_portfolio_by_id(portfolio_id: int) -> Optional[Dict]:
    """Get a single portfolio by ID"""
    query = """
        SELECT id, name, description, created_at, updated_at
        FROM portfolios
        WHERE id = %s
    """
    results = DBConnectorAPP.query(query, [portfolio_id])

    if not results:
        return None

    row = results[0]
    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "created_at": row[3],
        "updated_at": row[4]
    }


def create_portfolio(name: str, description: Optional[str] = None) -> Dict:
    """Create a new portfolio"""
    query = """
        INSERT INTO portfolios (name, description)
        VALUES (%s, %s)
        RETURNING id, name, description, created_at, updated_at
    """
    row = DBConnectorAPP.execute_returning(query, [name, description])

    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "created_at": row[3],
        "updated_at": row[4]
    }


def update_portfolio(portfolio_id: int, name: Optional[str] = None, description: Optional[str] = None) -> Optional[Dict]:
    """Update a portfolio"""
    # Build dynamic update query
    updates = []
    params = []

    if name is not None:
        updates.append("name = %s")
        params.append(name)
    if description is not None:
        updates.append("description = %s")
        params.append(description)

    if not updates:
        return get_portfolio_by_id(portfolio_id)

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(portfolio_id)

    query = f"""
        UPDATE portfolios
        SET {', '.join(updates)}
        WHERE id = %s
        RETURNING id, name, description, created_at, updated_at
    """
    row = DBConnectorAPP.execute_returning(query, params)

    if not row:
        return None

    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "created_at": row[3],
        "updated_at": row[4]
    }


def delete_portfolio(portfolio_id: int) -> bool:
    """Delete a portfolio (cascades to transactions)"""
    query = "DELETE FROM portfolios WHERE id = %s"
    DBConnectorAPP.execute(query, [portfolio_id])
    return True


# ==================== Transaction Operations ====================

def get_transactions(portfolio_id: int) -> List[Dict]:
    """Get all transactions for a portfolio"""
    query = """
        SELECT id, portfolio_id, symbol, transaction_type, quantity,
               price_per_share, transaction_date, notes, created_at
        FROM portfolio_transactions
        WHERE portfolio_id = %s
        ORDER BY transaction_date DESC, created_at DESC
    """
    results = DBConnectorAPP.query(query, [portfolio_id])

    return [
        {
            "id": row[0],
            "portfolio_id": row[1],
            "symbol": row[2],
            "transaction_type": row[3],
            "quantity": float(row[4]),
            "price_per_share": float(row[5]),
            "transaction_date": row[6],
            "notes": row[7],
            "created_at": row[8]
        }
        for row in results
    ]


def create_transaction(
    portfolio_id: int,
    symbol: str,
    transaction_type: str,
    quantity: float,
    price_per_share: float,
    transaction_date: date,
    notes: Optional[str] = None
) -> Dict:
    """Create a new transaction"""
    query = """
        INSERT INTO portfolio_transactions
        (portfolio_id, symbol, transaction_type, quantity, price_per_share, transaction_date, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id, portfolio_id, symbol, transaction_type, quantity,
                  price_per_share, transaction_date, notes, created_at
    """
    row = DBConnectorAPP.execute_returning(query, [
        portfolio_id,
        symbol.upper(),
        transaction_type.upper(),
        quantity,
        price_per_share,
        transaction_date,
        notes
    ])

    return {
        "id": row[0],
        "portfolio_id": row[1],
        "symbol": row[2],
        "transaction_type": row[3],
        "quantity": float(row[4]),
        "price_per_share": float(row[5]),
        "transaction_date": row[6],
        "notes": row[7],
        "created_at": row[8]
    }


def delete_transaction(transaction_id: int) -> bool:
    """Delete a transaction"""
    query = "DELETE FROM portfolio_transactions WHERE id = %s"
    DBConnectorAPP.execute(query, [transaction_id])
    return True


def get_transactions_by_symbol(symbol: str) -> List[Dict]:
    """Get all transactions for a specific symbol across all portfolios"""
    query = """
        SELECT pt.id, pt.portfolio_id, p.name as portfolio_name, pt.symbol,
               pt.transaction_type, pt.quantity, pt.price_per_share,
               pt.transaction_date, pt.notes, pt.created_at
        FROM portfolio_transactions pt
        JOIN portfolios p ON p.id = pt.portfolio_id
        WHERE pt.symbol = %s
        ORDER BY pt.transaction_date ASC
    """
    results = DBConnectorAPP.query(query, [symbol.upper()])

    return [
        {
            "id": row[0],
            "portfolio_id": row[1],
            "portfolio_name": row[2],
            "symbol": row[3],
            "transaction_type": row[4],
            "quantity": float(row[5]),
            "price_per_share": float(row[6]),
            "transaction_date": row[7].isoformat() if hasattr(row[7], 'isoformat') else str(row[7]),
            "notes": row[8],
            "created_at": row[9]
        }
        for row in results
    ]


# ==================== Holdings Calculation ====================

def get_holdings(portfolio_id: int) -> Dict:
    """
    Calculate holdings from transactions with P/L
    """
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        return None

    # Get all transactions grouped by symbol
    query = """
        SELECT symbol, transaction_type, quantity, price_per_share
        FROM portfolio_transactions
        WHERE portfolio_id = %s
        ORDER BY transaction_date, created_at
    """
    transactions = DBConnectorAPP.query(query, [portfolio_id])

    # Calculate holdings per symbol
    holdings_map = {}
    realized_pl = 0.0

    for row in transactions:
        symbol = row[0]
        tx_type = row[1]
        qty = float(row[2])
        price = float(row[3])

        if symbol not in holdings_map:
            holdings_map[symbol] = {
                "shares": 0.0,
                "total_cost": 0.0,
                "buy_qty": 0.0,
                "buy_cost": 0.0
            }

        if tx_type == "BUY":
            holdings_map[symbol]["shares"] += qty
            holdings_map[symbol]["total_cost"] += qty * price
            holdings_map[symbol]["buy_qty"] += qty
            holdings_map[symbol]["buy_cost"] += qty * price
        elif tx_type == "SELL":
            # Calculate realized P/L using average cost
            if holdings_map[symbol]["shares"] > 0:
                avg_cost = holdings_map[symbol]["total_cost"] / holdings_map[symbol]["shares"]
                realized_pl += (price - avg_cost) * qty

                # Reduce shares and cost proportionally
                holdings_map[symbol]["total_cost"] -= avg_cost * qty
                holdings_map[symbol]["shares"] -= qty

                # Also reduce buy tracking (for consistency)
                if holdings_map[symbol]["buy_qty"] > 0:
                    buy_avg = holdings_map[symbol]["buy_cost"] / holdings_map[symbol]["buy_qty"]
                    holdings_map[symbol]["buy_cost"] -= buy_avg * qty
                    holdings_map[symbol]["buy_qty"] -= qty
            else:
                holdings_map[symbol]["shares"] -= qty

    # Get current prices and company names for holdings
    holdings = []
    total_cost = 0.0
    total_value = 0.0
    total_unrealized_pl = 0.0

    for symbol, data in holdings_map.items():
        if data["shares"] <= 0:
            continue  # Skip fully sold positions

        # Get current price and company info
        price_query = """
            SELECT spd.close, c.companyname, c.sector
            FROM silver.s_stock_prices_daily spd
            JOIN gold.g_company c ON c.symbol = spd.symbol
            WHERE spd.symbol = %s
            ORDER BY spd.date DESC
            LIMIT 1
        """
        price_result = DBConnectorFinancials.query(price_query, [symbol])

        current_price = None
        company_name = None
        sector = None
        current_value = None
        unrealized_pl = None
        unrealized_pl_percent = None

        if price_result:
            current_price = float(price_result[0][0])
            company_name = price_result[0][1]
            sector = price_result[0][2]
            current_value = data["shares"] * current_price
            unrealized_pl = current_value - data["total_cost"]
            unrealized_pl_percent = (unrealized_pl / data["total_cost"] * 100) if data["total_cost"] > 0 else 0

            total_value += current_value
            total_unrealized_pl += unrealized_pl

        avg_cost = data["total_cost"] / data["shares"] if data["shares"] > 0 else 0
        total_cost += data["total_cost"]

        holdings.append({
            "symbol": symbol,
            "company_name": company_name,
            "sector": sector,
            "shares": round(data["shares"], 6),
            "avg_cost": round(avg_cost, 4),
            "total_cost": round(data["total_cost"], 2),
            "current_price": round(current_price, 2) if current_price else None,
            "current_value": round(current_value, 2) if current_value else None,
            "unrealized_pl": round(unrealized_pl, 2) if unrealized_pl else None,
            "unrealized_pl_percent": round(unrealized_pl_percent, 2) if unrealized_pl_percent else None
        })

    # Sort holdings by current value (descending)
    holdings.sort(key=lambda x: x["current_value"] or 0, reverse=True)

    total_unrealized_pl_percent = (total_unrealized_pl / total_cost * 100) if total_cost > 0 else 0

    return {
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio["name"],
        "holdings": holdings,
        "total_cost": round(total_cost, 2),
        "total_value": round(total_value, 2),
        "total_unrealized_pl": round(total_unrealized_pl, 2),
        "total_unrealized_pl_percent": round(total_unrealized_pl_percent, 2),
        "realized_pl": round(realized_pl, 2)
    }


# ==================== Portfolio Performance ====================

def get_portfolio_performance(portfolio_id: int) -> Dict:
    """
    Calculate portfolio performance over different time periods (YTD, 1Y, 2Y, 5Y)
    Returns the total invested at each period start, current value, and percentage change
    """
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        return None

    today = datetime.now().date()

    # Define periods
    periods = {
        "YTD": date(today.year, 1, 1),
        "1Y": today - timedelta(days=365),
        "2Y": today - timedelta(days=730),
        "5Y": today - timedelta(days=1825),
    }

    # Get all transactions up to now
    query = """
        SELECT symbol, transaction_type, quantity, price_per_share, transaction_date
        FROM portfolio_transactions
        WHERE portfolio_id = %s
        ORDER BY transaction_date, created_at
    """
    transactions = DBConnectorAPP.query(query, [portfolio_id])

    if not transactions:
        return {
            "portfolio_id": portfolio_id,
            "portfolio_name": portfolio["name"],
            "current_value": 0,
            "performance": {k: None for k in periods.keys()}
        }

    def calculate_invested_and_value_in_period(start_date: date) -> Optional[Dict]:
        """
        Calculate total invested during the period and current value of those investments.
        This compares money invested vs current market value for positions acquired in the period.
        """
        # Track net investment and current holdings for transactions within the period
        total_invested = 0.0  # Net cash flow (buys - sells) during period
        holdings_from_period = {}  # Track shares bought/sold in this period

        for row in transactions:
            symbol = row[0]
            tx_type = row[1]
            qty = float(row[2])
            price = float(row[3])
            tx_date = row[4]

            # Convert tx_date to date if it's a datetime
            if hasattr(tx_date, 'date'):
                tx_date = tx_date.date()
            elif isinstance(tx_date, str):
                tx_date = datetime.strptime(tx_date, '%Y-%m-%d').date()

            # Only include transactions within the period (from start_date to today)
            if tx_date < start_date:
                continue

            if symbol not in holdings_from_period:
                holdings_from_period[symbol] = {"shares": 0.0, "cost": 0.0}

            if tx_type == "BUY":
                total_invested += qty * price
                holdings_from_period[symbol]["shares"] += qty
                holdings_from_period[symbol]["cost"] += qty * price
            elif tx_type == "SELL":
                total_invested -= qty * price  # Sells reduce net investment
                holdings_from_period[symbol]["shares"] -= qty
                # Reduce cost proportionally
                if holdings_from_period[symbol]["shares"] > 0:
                    avg_cost = holdings_from_period[symbol]["cost"] / (holdings_from_period[symbol]["shares"] + qty)
                    holdings_from_period[symbol]["cost"] -= avg_cost * qty

        # No transactions in this period
        if total_invested == 0:
            return None

        # Get current value of holdings from this period
        current_value = 0.0

        for symbol, data in holdings_from_period.items():
            if data["shares"] <= 0:
                continue

            # Get current price
            price_query = """
                SELECT close
                FROM silver.s_stock_prices_daily
                WHERE symbol = %s
                ORDER BY date DESC
                LIMIT 1
            """
            price_result = DBConnectorFinancials.query(price_query, [symbol])

            if price_result:
                price = float(price_result[0][0])
                current_value += data["shares"] * price

        return {
            "total_invested": total_invested,
            "current_value": current_value
        }

    # Get current portfolio value
    current_holdings = get_holdings(portfolio_id)
    total_current_value = current_holdings["total_value"] if current_holdings else 0
    total_cost = current_holdings["total_cost"] if current_holdings else 0

    # Calculate performance for each period
    performance = {}

    for period_name, start_date in periods.items():
        period_data = calculate_invested_and_value_in_period(start_date)

        if period_data and period_data["total_invested"] > 0:
            invested = period_data["total_invested"]
            current = period_data["current_value"]
            change = current - invested
            change_percent = (change / invested) * 100 if invested > 0 else 0

            performance[period_name] = {
                "start_date": str(start_date),
                "start_value": round(invested, 2),  # Amount invested in period
                "current_value": round(current, 2),  # Current value of those investments
                "change": round(change, 2),
                "change_percent": round(change_percent, 2)
            }
        else:
            performance[period_name] = None

    return {
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio["name"],
        "current_value": round(total_current_value, 2),
        "total_cost": round(total_cost, 2),
        "performance": performance
    }