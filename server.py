from fastapi import FastAPI, HTTPException
from scraper import run_scraper
import uvicorn

app = FastAPI(title="Web Scraper API", description="A simple web scraping API")

@app.get("/")
async def root():
    return {"message": "Web Scraper API is running!"}

@app.get("/scrape")
async def scrape_endpoint(query: str):
    """
    Scrape data based on the provided query parameter.
    
    Args:
        query (str): The search query to scrape data for
        
    Returns:
        dict: Scraped data including prices and average
    """
    try:
        result = await run_scraper(query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
