import asyncio
from playwright.async_api import async_playwright
from datetime import datetime
import re
from typing import List, Dict, Any

async def scrape_ebay_prices(query: str) -> List[float]:
    """
    Scrape eBay completed/sold listings for the given query.
    
    Args:
        query (str): The search query
        
    Returns:
        List[float]: List of prices from sold items
    """
    prices = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        try:
            # Navigate to eBay search with completed listings filter
            search_url = f"https://www.ebay.com/sch/i.html?_nkw={query.replace(' ', '+')}&_sacat=0&LH_Complete=1&LH_Sold=1&_sop=13"
            await page.goto(search_url, wait_until="networkidle")
            
            # Wait for results to load
            await page.wait_for_selector('.s-item__price', timeout=10000)
            
            # Extract prices from the first 5 sold items
            price_elements = await page.query_selector_all('.s-item__price')
            
            for i, element in enumerate(price_elements[:5]):
                try:
                    price_text = await element.inner_text()
                    # Extract numeric price using regex
                    price_match = re.search(r'[\$£€]?(\d+(?:,\d{3})*(?:\.\d{2})?)', price_text)
                    if price_match:
                        price_str = price_match.group(1).replace(',', '')
                        price = float(price_str)
                        prices.append(price)
                except Exception as e:
                    print(f"Error extracting price {i+1}: {e}")
                    continue
                    
        except Exception as e:
            print(f"Error during scraping: {e}")
        finally:
            await browser.close()
    
    return prices

def run_scraper(query: str) -> Dict[str, Any]:
    """
    Scrape eBay for completed/sold listings and return price data.
    
    Args:
        query (str): The search query
        
    Returns:
        dict: Scraped data with prices and average
    """
    # Run the async scraping function
    prices = asyncio.run(scrape_ebay_prices(query))
    
    # Calculate average if we have prices
    average = sum(prices) / len(prices) if prices else 0.0
    
    return {
        "query": query,
        "prices": prices,
        "average": round(average, 2),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
