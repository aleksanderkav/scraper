from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from scraper import run_scraper
import uvicorn
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Enhanced Web Scraper API", 
    description="A comprehensive web scraping API with batch processing and database integration",
    version="2.0.0"
)

class BatchScrapeRequest(BaseModel):
    queries: List[str]
    store_to_db: bool = True
    max_concurrent: int = 3

@app.get("/")
async def root():
    return {"message": "Enhanced Web Scraper API is running!", "version": "2.0.0", "features": ["batch_scraping", "supabase_integration", "comprehensive_metadata", "debug_logging"]}

@app.get("/scrape")
async def scrape_endpoint(
    query: str,
    store_to_db: bool = Query(True, description="Whether to store results to Supabase database"),
    debug: bool = Query(False, description="Include debug information in response")
):
    """
    Scrape data for a single query with enhanced metadata and optional database storage.
    
    Args:
        query (str): The search query to scrape data for
        store_to_db (bool): Whether to automatically store results to Supabase
        debug (bool): Whether to include debug information in the response
        
    Returns:
        dict: Comprehensive scraped data including prices, statistics, and metadata
    """
    try:
        logger.info(f"🔍 Single scrape request: '{query}' (store_to_db: {store_to_db})")
        
        result = await run_scraper(query, store_to_db=store_to_db)
        
        # Remove debug info if not requested (for cleaner API responses)
        if not debug and "debug_info" in result:
            result["debug_info"] = {
                "total_actions": len(result["debug_info"].get("browser_actions", [])),
                "selectors_tried": len(result["debug_info"].get("selectors_tried", [])),
                "errors_count": len(result["debug_info"].get("errors", []))
            }
        
        logger.info(f"✅ Single scrape completed: {result['price_count']} prices, sync_status: {result['sync_status']}")
        return result
        
    except Exception as e:
        error_msg = f"Scraping failed for query '{query}': {str(e)}"
        logger.error(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/scrape_batch")
async def scrape_batch_endpoint(request: BatchScrapeRequest):
    """
    Scrape data for multiple queries in batch with controlled concurrency.
    
    Args:
        request: BatchScrapeRequest containing queries and configuration
        
    Returns:
        dict: Batch scraping results with individual query results and summary
    """
    try:
        queries = request.queries
        store_to_db = request.store_to_db
        max_concurrent = min(request.max_concurrent, 5)  # Limit to 5 for server stability
        
        logger.info(f"🚀 Batch scrape request: {len(queries)} queries (max_concurrent: {max_concurrent}, store_to_db: {store_to_db})")
        
        if len(queries) > 20:
            raise HTTPException(status_code=400, detail="Maximum 20 queries allowed per batch request")
        
        if not queries:
            raise HTTPException(status_code=400, detail="At least one query is required")
        
        # Process queries with controlled concurrency
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def scrape_with_semaphore(query: str):
            async with semaphore:
                try:
                    logger.info(f"📊 Processing batch query: '{query}'")
                    result = await run_scraper(query, store_to_db=store_to_db)
                    # Remove detailed debug info for batch responses
                    if "debug_info" in result:
                        result["debug_info"] = {
                            "success": True,
                            "errors_count": len(result["debug_info"].get("errors", []))
                        }
                    return {"query": query, "status": "success", "data": result}
                except Exception as e:
                    error_msg = f"Failed to scrape '{query}': {str(e)}"
                    logger.error(f"❌ {error_msg}")
                    return {"query": query, "status": "error", "error": error_msg, "data": None}
        
        # Execute all scraping tasks concurrently
        logger.info(f"🔄 Starting concurrent execution of {len(queries)} queries...")
        tasks = [scrape_with_semaphore(query) for query in queries]
        results = await asyncio.gather(*tasks)
        
        # Calculate batch summary
        successful = sum(1 for r in results if r["status"] == "success")
        failed = sum(1 for r in results if r["status"] == "error")
        total_prices = sum(r["data"]["price_count"] if r["data"] else 0 for r in results)
        
        # Database storage summary
        if store_to_db:
            total_stored = sum(
                r["data"]["storage_result"]["price_entries_inserted"] 
                if r["data"] and r["data"].get("storage_result") 
                else 0 
                for r in results
            )
            cards_created = sum(
                1 if r["data"] and r["data"].get("storage_result", {}).get("card_created") 
                else 0 
                for r in results
            )
        else:
            total_stored = 0
            cards_created = 0
        
        batch_result = {
            "batch_summary": {
                "total_queries": len(queries),
                "successful": successful,
                "failed": failed,
                "total_prices_found": total_prices,
                "total_prices_stored": total_stored,
                "cards_created": cards_created,
                "store_to_db": store_to_db
            },
            "results": results,
            "timestamp": results[0]["data"]["timestamp"] if results and results[0]["data"] else None
        }
        
        logger.info(f"✅ Batch scrape completed: {successful}/{len(queries)} successful, {total_prices} total prices")
        return batch_result
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Batch scraping failed: {str(e)}"
        logger.error(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "api_version": "2.0.0",
        "features": {
            "single_scraping": True,
            "batch_scraping": True,
            "supabase_integration": True,
            "debug_logging": True,
            "comprehensive_metadata": True
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
