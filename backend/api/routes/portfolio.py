from fastapi import APIRouter, HTTPException
from api.schemas.portfolio import (
    Portfolio, PortfolioCreate, PortfolioUpdate, PortfolioList,
    Transaction, TransactionCreate, TransactionList,
    PortfolioHoldings
)
from api.services.portfolio import (
    get_all_portfolios, get_portfolio_by_id, create_portfolio,
    update_portfolio, delete_portfolio,
    get_transactions, create_transaction, delete_transaction,
    get_holdings, get_transactions_by_symbol, get_portfolio_performance
)

router = APIRouter(prefix="/api/v1/portfolios", tags=["Portfolio"])


# ==================== Portfolio Endpoints ====================

@router.get("", response_model=PortfolioList)
def list_portfolios():
    """Get all portfolios"""
    portfolios = get_all_portfolios()
    return {"portfolios": portfolios}


@router.post("", response_model=Portfolio)
def create_new_portfolio(data: PortfolioCreate):
    """Create a new portfolio"""
    try:
        portfolio = create_portfolio(data.name, data.description)
        return portfolio
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{portfolio_id}", response_model=Portfolio)
def get_portfolio(portfolio_id: int):
    """Get a portfolio by ID"""
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.put("/{portfolio_id}", response_model=Portfolio)
def update_existing_portfolio(portfolio_id: int, data: PortfolioUpdate):
    """Update a portfolio"""
    portfolio = update_portfolio(portfolio_id, data.name, data.description)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.delete("/{portfolio_id}")
def delete_existing_portfolio(portfolio_id: int):
    """Delete a portfolio and all its transactions"""
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    delete_portfolio(portfolio_id)
    return {"message": "Portfolio deleted successfully"}


# ==================== Transaction Endpoints ====================

@router.get("/{portfolio_id}/transactions", response_model=TransactionList)
def list_transactions(portfolio_id: int):
    """Get all transactions for a portfolio"""
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    transactions = get_transactions(portfolio_id)
    return {"transactions": transactions}


@router.post("/{portfolio_id}/transactions", response_model=Transaction)
def add_transaction(portfolio_id: int, data: TransactionCreate):
    """Add a transaction to a portfolio"""
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if data.transaction_type.upper() not in ["BUY", "SELL"]:
        raise HTTPException(status_code=400, detail="Transaction type must be BUY or SELL")

    try:
        transaction = create_transaction(
            portfolio_id=portfolio_id,
            symbol=data.symbol,
            transaction_type=data.transaction_type,
            quantity=data.quantity,
            price_per_share=data.price_per_share,
            transaction_date=data.transaction_date,
            notes=data.notes
        )
        return transaction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{portfolio_id}/transactions/{transaction_id}")
def remove_transaction(portfolio_id: int, transaction_id: int):
    """Delete a transaction"""
    portfolio = get_portfolio_by_id(portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    delete_transaction(transaction_id)
    return {"message": "Transaction deleted successfully"}


# ==================== Holdings Endpoint ====================

@router.get("/{portfolio_id}/holdings", response_model=PortfolioHoldings)
def get_portfolio_holdings(portfolio_id: int):
    """Get aggregated holdings with P/L calculations"""
    holdings = get_holdings(portfolio_id)
    if not holdings:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return holdings


# ==================== Performance Endpoint ====================

@router.get("/{portfolio_id}/performance")
def get_performance(portfolio_id: int):
    """Get portfolio performance over different time periods (YTD, 1Y, 2Y, 5Y)"""
    performance = get_portfolio_performance(portfolio_id)
    if not performance:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return performance


# ==================== Symbol Transactions Endpoint ====================

@router.get("/symbol/{symbol}/transactions")
def get_symbol_transactions(symbol: str):
    """Get all transactions for a symbol across all portfolios (for chart markers)"""
    transactions = get_transactions_by_symbol(symbol)
    return {"symbol": symbol.upper(), "transactions": transactions}