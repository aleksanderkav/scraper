import asyncio
from playwright.async_api import async_playwright
from datetime import datetime
import re
from typing import List, Dict, Any
import random

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
        # Launch browser with anti-detection settings
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-gpu',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-default-apps',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ]
        )
        
        # Create context with realistic settings
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        page = await context.new_page()
        
        # Add stealth settings
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        """)
        
        try:
            # Navigate to eBay search with completed listings filter
            search_url = f"https://www.ebay.com/sch/i.html?_nkw={query.replace(' ', '+')}&_sacat=0&LH_Complete=1&LH_Sold=1&_sop=13"
            print(f"Navigating to: {search_url}")
            
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait a bit for page to fully load
            await page.wait_for_timeout(2000)
            
            # Try multiple selectors for price elements
            price_selectors = [
                '.s-item__price .notranslate',  # More specific selector
                '.s-item__price',               # Original selector
                '[data-testid="item-price"]',   # Alternative data attribute
                '.s-item__detail .s-item__price', # More specific path
                '.price'                        # Generic fallback
            ]
            
            price_elements = []
            
            # Try each selector until we find prices
            for selector in price_selectors:
                try:
                    print(f"Trying selector: {selector}")
                    await page.wait_for_selector(selector, timeout=5000)
                    elements = await page.query_selector_all(selector)
                    if elements:
                        print(f"Found {len(elements)} elements with selector: {selector}")
                        price_elements = elements
                        break
                except Exception as e:
                    print(f"Selector {selector} failed: {e}")
                    continue
            
            if not price_elements:
                # If no specific selectors work, try to find any element containing price patterns
                print("No price elements found with standard selectors, trying text-based search...")
                
                # Get all text content and search for price patterns
                page_content = await page.content()
                price_matches = re.findall(r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', page_content)
                
                if price_matches:
                    print(f"Found {len(price_matches)} price matches in page content")
                    for price_str in price_matches[:5]:  # Take first 5 prices
                        try:
                            price = float(price_str.replace(',', ''))
                            # Filter out unrealistic prices (less than $1 or more than $10000)
                            if 1.0 <= price <= 10000.0:
                                prices.append(price)
                        except ValueError:
                            continue
                else:
                    print("No price patterns found in page content")
                    # Save page content for debugging
                    await page.screenshot(path="debug_screenshot.png")
                    print("Screenshot saved as debug_screenshot.png")
            else:
                # Extract prices from found elements
                print(f"Processing {len(price_elements)} price elements...")
                
                for i, element in enumerate(price_elements[:10]):  # Check more elements
                    try:
                        price_text = await element.inner_text()
                        print(f"Price element {i+1} text: '{price_text}'")
                        
                        # Try multiple regex patterns
                        price_patterns = [
                            r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # $123.45 or $1,234.56
                            r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',    # 123.45 or 1,234.56
                            r'[\$£€]?(\d+(?:,\d{3})*(?:\.\d{2})?)', # Original pattern
                        ]
                        
                        price_found = False
                        for pattern in price_patterns:
                            price_match = re.search(pattern, price_text)
                            if price_match:
                                price_str = price_match.group(1).replace(',', '')
                                price = float(price_str)
                                
                                # Filter out unrealistic prices
                                if 1.0 <= price <= 10000.0:
                                    prices.append(price)
                                    print(f"✅ Extracted price: ${price}")
                                    price_found = True
                                    break
                        
                        if not price_found:
                            print(f"❌ Could not extract price from: '{price_text}'")
                            
                    except Exception as e:
                        print(f"Error processing price element {i+1}: {e}")
                        continue
                        
        except Exception as e:
            print(f"Error during scraping: {e}")
            # Save page content for debugging
            try:
                await page.screenshot(path="error_screenshot.png")
                print("Error screenshot saved as error_screenshot.png")
            except:
                pass
        finally:
            await context.close()
            await browser.close()
    
    print(f"Final extracted prices: {prices}")
    return prices

async def run_scraper(query: str) -> Dict[str, Any]:
    """
    Scrape eBay for completed/sold listings and return price data.
    
    Args:
        query (str): The search query
        
    Returns:
        dict: Scraped data with prices and average
    """
    print(f"Starting scraper for query: {query}")
    
    # Run the async scraping function
    prices = await scrape_ebay_prices(query)
    
    # Calculate average if we have prices
    average = sum(prices) / len(prices) if prices else 0.0
    
    result = {
        "query": query,
        "prices": prices,
        "average": round(average, 2),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    print(f"Scraper result: {result}")
    return result

if __name__ == "__main__":
    """
    Command-line testing section.
    Run with: python scraper.py
    """
    import sys
    
    # You can modify this query for testing
    test_query = "iphone 15" if len(sys.argv) == 1 else " ".join(sys.argv[1:])
    
    print(f"Testing scraper with query: {test_query}")
    result = asyncio.run(run_scraper(test_query))
    
    print(f"Results: {result}")
    print(f"Found {len(result['prices'])} prices with average: ${result['average']}")
