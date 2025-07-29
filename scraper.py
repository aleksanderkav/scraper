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
            
            # Verify we're on a results page with sold listings
            page_title = await page.title()
            page_url = page.url
            print(f"Page title: {page_title}")
            print(f"Current URL: {page_url}")
            
            # Check if we have search results
            try:
                await page.wait_for_selector('.srp-results', timeout=5000)
                print("✅ Found search results container")
            except:
                print("⚠️ No search results container found")
            
            # First, find all listing items, then extract prices from each
            print("Looking for individual listing items...")
            listing_items = []
            
            # Try to find listing item containers first
            item_selectors = [
                '.s-item',                          # Standard eBay listing item
                '.srp-results .s-item',            # Items within results container
                '[data-testid="srp-grid-item"]',   # Alternative data attribute
                '.x-item'                          # Fallback selector
            ]
            
            for selector in item_selectors:
                try:
                    print(f"Trying item selector: {selector}")
                    await page.wait_for_selector(selector, timeout=5000)
                    items = await page.query_selector_all(selector)
                    if items and len(items) > 0:
                        print(f"Found {len(items)} listing items with selector: {selector}")
                        listing_items = items[:10]  # Take first 10 items
                        break
                except Exception as e:
                    print(f"Item selector {selector} failed: {e}")
                    continue
            
            if listing_items:
                # Extract prices from individual listing items
                print(f"Processing {len(listing_items)} listing items...")
                
                for i, item in enumerate(listing_items):
                    try:
                        # Look for price within this specific item
                        price_selectors_in_item = [
                            '.s-item__price .notranslate',
                            '.s-item__price span',
                            '.s-item__price',
                            '.price .notranslate',
                            '.price'
                        ]
                        
                        item_price_found = False
                        for price_selector in price_selectors_in_item:
                            try:
                                price_element = await item.query_selector(price_selector)
                                if price_element:
                                    price_text = await price_element.inner_text()
                                    print(f"Item {i+1} price text: '{price_text}'")
                                    
                                    # Extract price using regex
                                    price_patterns = [
                                        r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                                        r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
                                    ]
                                    
                                    for pattern in price_patterns:
                                        price_match = re.search(pattern, price_text)
                                        if price_match:
                                            price_str = price_match.group(1).replace(',', '')
                                            price = float(price_str)
                                            
                                            if 10.0 <= price <= 10000.0:
                                                prices.append(price)
                                                print(f"✅ Extracted price from item {i+1}: ${price}")
                                                item_price_found = True
                                                break
                                    
                                    if item_price_found:
                                        break
                            except Exception as e:
                                continue
                        
                        if not item_price_found:
                            print(f"❌ No valid price found in item {i+1}")
                            
                    except Exception as e:
                        print(f"Error processing item {i+1}: {e}")
                        continue
            
            else:
                print("No listing items found, trying global price selectors...")
                # Fallback to original method if no items found
                price_selectors = [
                    '.s-item__price .notranslate',
                    '.s-item__price',
                    '.price .notranslate',
                    '.price'
                ]
                
                price_elements = []
                
                for selector in price_selectors:
                    try:
                        print(f"Trying global selector: {selector}")
                        await page.wait_for_selector(selector, timeout=5000)
                        elements = await page.query_selector_all(selector)
                        if elements:
                            print(f"Found {len(elements)} elements with selector: {selector}")
                            price_elements = elements
                            break
                    except Exception as e:
                        print(f"Global selector {selector} failed: {e}")
                        continue
            
                # Process price elements from global search if items method didn't work
                if price_elements:
                    print(f"Processing {len(price_elements)} global price elements...")
                    
                    for i, element in enumerate(price_elements[:10]):
                        try:
                            price_text = await element.inner_text()
                            print(f"Global price element {i+1} text: '{price_text}'")
                            
                            price_patterns = [
                                r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                                r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
                            ]
                            
                            price_found = False
                            for pattern in price_patterns:
                                price_match = re.search(pattern, price_text)
                                if price_match:
                                    price_str = price_match.group(1).replace(',', '')
                                    price = float(price_str)
                                    
                                    if 10.0 <= price <= 10000.0:
                                        prices.append(price)
                                        print(f"✅ Extracted global price: ${price}")
                                        price_found = True
                                        break
                            
                            if not price_found:
                                print(f"❌ Could not extract price from: '{price_text}'")
                                
                        except Exception as e:
                            print(f"Error processing global price element {i+1}: {e}")
                            continue
            
            # Final fallback: text-based search if no prices found yet
            if not prices:
                print("No prices found with structured approach, trying text-based search...")
                
                page_content = await page.content()
                price_matches = re.findall(r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', page_content)
                
                if price_matches:
                    print(f"Found {len(price_matches)} price matches in page content")
                    for price_str in price_matches[:10]:
                        try:
                            price = float(price_str.replace(',', ''))
                            if 10.0 <= price <= 10000.0:
                                prices.append(price)
                                print(f"✅ Added price from content: ${price}")
                        except ValueError:
                            continue
                else:
                    print("No price patterns found in page content")
                    await page.screenshot(path="debug_screenshot.png")
                    print("Screenshot saved as debug_screenshot.png")
                        
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
