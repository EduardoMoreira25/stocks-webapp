from typing import List, Dict, Optional
from connectors.db_connector import DBConnectorAPP, DBConnectorFinancials


def get_watchlist() -> List[Dict]:
    rows = DBConnectorAPP.query("""
        SELECT id, symbol, buy_price, sell_price, note, added_at, updated_at
        FROM watchlist
        ORDER BY added_at DESC
    """)
    if not rows:
        return []

    symbols = [r[1] for r in rows]
    placeholders = ', '.join(['%s'] * len(symbols))
    company_rows = DBConnectorFinancials.query(f"""
        SELECT c.symbol, c.companyname, c.sector, c.industry, c.image_url, sp.close, sp.market_cap
        FROM gold.g_company c
        LEFT JOIN LATERAL (
            SELECT close, market_cap
            FROM silver.s_stock_prices_daily
            WHERE symbol = c.symbol
            ORDER BY date DESC
            LIMIT 1
        ) sp ON true
        WHERE c.symbol IN ({placeholders})
    """, symbols)

    company_map = {
        r[0]: {
            "company_name": r[1],
            "sector": r[2],
            "industry": r[3],
            "image_url": r[4],
            "current_price": float(r[5]) if r[5] else None,
            "market_cap": float(r[6]) if r[6] else None,
        }
        for r in company_rows
    }

    result = []
    for row in rows:
        wid, symbol, buy_price, sell_price, note, added_at, updated_at = row
        info = company_map.get(symbol, {})
        result.append({
            "id": wid,
            "symbol": symbol,
            "company_name": info.get("company_name"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "image_url": info.get("image_url"),
            "current_price": info.get("current_price"),
            "market_cap": info.get("market_cap"),
            "buy_price": float(buy_price) if buy_price is not None else None,
            "sell_price": float(sell_price) if sell_price is not None else None,
            "note": note,
            "added_at": str(added_at) if added_at else None,
            "updated_at": str(updated_at) if updated_at else None,
        })
    return result


def is_on_watchlist(symbol: str) -> bool:
    rows = DBConnectorAPP.query(
        "SELECT id FROM watchlist WHERE symbol = %s",
        [symbol.upper()]
    )
    return bool(rows)


def add_to_watchlist(symbol: str) -> Dict:
    row = DBConnectorAPP.execute_returning("""
        INSERT INTO watchlist (symbol)
        VALUES (%s)
        ON CONFLICT (symbol) DO UPDATE SET updated_at = NOW()
        RETURNING id, symbol, buy_price, sell_price, note, added_at, updated_at
    """, [symbol.upper()])
    return {
        "id": row[0],
        "symbol": row[1],
        "buy_price": float(row[2]) if row[2] is not None else None,
        "sell_price": float(row[3]) if row[3] is not None else None,
        "note": row[4],
        "added_at": str(row[5]) if row[5] else None,
        "updated_at": str(row[6]) if row[6] else None,
    }


def remove_from_watchlist(symbol: str) -> bool:
    rows = DBConnectorAPP.query(
        "SELECT id FROM watchlist WHERE symbol = %s",
        [symbol.upper()]
    )
    if not rows:
        return False
    DBConnectorAPP.execute(
        "DELETE FROM watchlist WHERE symbol = %s",
        [symbol.upper()]
    )
    return True


def update_watchlist_item(symbol: str, buy_price: Optional[float], sell_price: Optional[float], note: Optional[str]) -> Optional[Dict]:
    row = DBConnectorAPP.execute_returning("""
        UPDATE watchlist
        SET buy_price = %s,
            sell_price = %s,
            note = %s,
            updated_at = NOW()
        WHERE symbol = %s
        RETURNING id, symbol, buy_price, sell_price, note, added_at, updated_at
    """, [buy_price, sell_price, note, symbol.upper()])
    if not row:
        return None
    return {
        "id": row[0],
        "symbol": row[1],
        "buy_price": float(row[2]) if row[2] is not None else None,
        "sell_price": float(row[3]) if row[3] is not None else None,
        "note": row[4],
        "added_at": str(row[5]) if row[5] else None,
        "updated_at": str(row[6]) if row[6] else None,
    }