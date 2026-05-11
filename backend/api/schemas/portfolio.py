from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# Portfolio schemas
class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None


class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Portfolio(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PortfolioList(BaseModel):
    portfolios: List[Portfolio]


# Transaction schemas
class TransactionCreate(BaseModel):
    symbol: str
    transaction_type: str  # 'BUY' or 'SELL'
    quantity: float
    price_per_share: float
    transaction_date: date
    notes: Optional[str] = None


class Transaction(BaseModel):
    id: int
    portfolio_id: int
    symbol: str
    transaction_type: str
    quantity: float
    price_per_share: float
    transaction_date: date
    notes: Optional[str] = None
    created_at: datetime


class TransactionList(BaseModel):
    transactions: List[Transaction]


# Holdings schemas (calculated from transactions)
class Holding(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    shares: float
    avg_cost: float
    total_cost: float
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    unrealized_pl: Optional[float] = None
    unrealized_pl_percent: Optional[float] = None


class PortfolioHoldings(BaseModel):
    portfolio_id: int
    portfolio_name: str
    holdings: List[Holding]
    total_cost: float
    total_value: float
    total_unrealized_pl: float
    total_unrealized_pl_percent: float
    realized_pl: float