from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.services.watchlist import (
    get_watchlist,
    is_on_watchlist,
    add_to_watchlist,
    remove_from_watchlist,
    update_watchlist_item,
)

router = APIRouter(prefix="/api/v1/watchlist", tags=["Watchlist"])


class WatchlistUpdate(BaseModel):
    buy_price: Optional[float] = None
    sell_price: Optional[float] = None
    note: Optional[str] = None


@router.get("")
def list_watchlist():
    return get_watchlist()


@router.get("/{symbol}/status")
def watchlist_status(symbol: str):
    return {"symbol": symbol.upper(), "on_watchlist": is_on_watchlist(symbol)}


@router.post("/{symbol}")
def add_watchlist(symbol: str):
    try:
        return add_to_watchlist(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{symbol}")
def remove_watchlist(symbol: str):
    removed = remove_from_watchlist(symbol)
    if not removed:
        raise HTTPException(status_code=404, detail=f"{symbol.upper()} not on watchlist")
    return {"symbol": symbol.upper(), "removed": True}


@router.patch("/{symbol}")
def update_watchlist(symbol: str, data: WatchlistUpdate):
    item = update_watchlist_item(symbol, data.buy_price, data.sell_price, data.note)
    if not item:
        raise HTTPException(status_code=404, detail=f"{symbol.upper()} not on watchlist")
    return item