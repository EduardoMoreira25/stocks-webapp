from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class WinnerStock(BaseModel):
    """Model for a single winning stock in the winners list"""
    symbol: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    current_price: float
    previous_price: float
    change: float
    change_percent: float
    volume: Optional[int] = None


class WinnersResponse(BaseModel):
    """Response model for winners endpoint"""
    period: str  # "daily", "weekly", or "monthly"
    as_of_date: str
    comparison_date: str
    count: int
    winners: list[WinnerStock]
