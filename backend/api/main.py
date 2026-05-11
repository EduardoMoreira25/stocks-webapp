from fastapi import FastAPI, HTTPException
from api.services.balance import get_balance_sheets_by_symbol
from api.routes import market, companies, company_data, portfolio

# Create the app instance
app = FastAPI(
    title="Financial Data API",
    description="API for accessing financial data",
    version="1.0.0"
)

# Register routers
app.include_router(market.router)
app.include_router(market.market_router_alt)
app.include_router(companies.router)
app.include_router(company_data.router)
app.include_router(portfolio.router)


# A simple test endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to Financial Data API biatchs"}

# First endpoint - hardcoded for now
@app.get("/balance-sheets/{symbol}")
def get_balance_sheet(
    symbol:str,
    start_date:str=None,
    end_date:str=None,
    limit: int = 100):
    
    try:
        data = get_balance_sheets_by_symbol(symbol,start_date,end_date,limit)

        if not data:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        
        return {
            "symbol": symbol,
            "count": len(data),
            "data": data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))