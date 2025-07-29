import asyncio
import re
import random
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from playwright.async_api import async_playwright
import statistics
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging for debug information
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_supabase_client() -> Optional[Client]:
    """
    Initialize Supabase client if environment variables are available.
    
    Returns:
        Client: Supabase client instance or None if not configured
    """
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    
    if supabase_url and supabase_key:
        try:
            return create_client(supabase_url, supabase_key)
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client: {e}")
            return None
    else:
        logger.info("Supabase credentials not provided - running without database integration")
        return None

async def store_price_entries_to_supabase(scrape_result: Dict[str, Any], supabase: Client) -> Dict[str, Any]:
    """
    Store price entries to Supabase database.
    
    Args:
        scrape_result: The complete scrape result with price entries
        supabase: Supabase client instance
        
    Returns:
        dict: Storage result with sync status
    """
    storage_result = {
        "card_created": False,
        "price_entries_inserted": 0,
        "card_price_updated": False,
        "sync_status": "success",
        "errors": []
    }
    
    try:
        query = scrape_result["query"]
        prices = scrape_result["filtered_prices"]
        
        if not prices:
            storage_result["sync_status"] = "no_data"
            return storage_result
        
        # 1. Get or create card entry
        logger.info(f"📚 Getting or creating card for query: '{query}'")
        
        # Check if card exists
        card_response = supabase.table("cards").select("*").eq("name", query).execute()
        
        if card_response.data:
            card = card_response.data[0]
            card_id = card["id"]
            logger.info(f"✅ Found existing card: {card_id}")
        else:
            # Create new card
            new_card = {
                "name": query,
                "created_at": datetime.utcnow().isoformat()
            }
            card_response = supabase.table("cards").insert(new_card).execute()
            if card_response.data:
                card = card_response.data[0]
                card_id = card["id"]
                storage_result["card_created"] = True
                logger.info(f"✅ Created new card: {card_id}")
            else:
                raise Exception("Failed to create card")
        
        # 2. Insert individual price entries
        logger.info(f"💰 Inserting {len(prices)} price entries...")
        
        price_entries = []
        for i, price in enumerate(prices):
            entry = {
                "card_id": card_id,
                "price": price,
                "source": "ebay.com",
                "scraped_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "query": query,
                    "position": i,
                    "scrape_timestamp": scrape_result["scrape_timestamp"]
                }
            }
            price_entries.append(entry)
        
        # Insert in batches to avoid timeout
        batch_size = 50
        total_inserted = 0
        
        for i in range(0, len(price_entries), batch_size):
            batch = price_entries[i:i + batch_size]
            try:
                insert_response = supabase.table("price_entries").insert(batch).execute()
                if insert_response.data:
                    total_inserted += len(insert_response.data)
                    logger.info(f"✅ Inserted batch of {len(insert_response.data)} price entries")
            except Exception as e:
                error_msg = f"Failed to insert price entries batch {i//batch_size + 1}: {str(e)}"
                storage_result["errors"].append(error_msg)
                logger.error(f"❌ {error_msg}")
        
        storage_result["price_entries_inserted"] = total_inserted
        
        # 3. Update or create card_prices summary
        logger.info(f"📊 Updating card prices summary...")
        
        average_price = sum(prices) / len(prices)
        lowest_price = min(prices)
        highest_price = max(prices)
        
        # Check if card_prices entry exists
        card_price_response = supabase.table("card_prices").select("*").eq("card_id", card_id).execute()
        
        card_price_data = {
            "card_id": card_id,
            "average_price": round(average_price, 2),
            "lowest_price": round(lowest_price, 2),
            "highest_price": round(highest_price, 2),
            "price_count": len(prices),
            "last_seen": datetime.utcnow().isoformat(),
            "source": "ebay.com"
        }
        
        if card_price_response.data:
            # Update existing
            update_response = supabase.table("card_prices").update(card_price_data).eq("card_id", card_id).execute()
            if update_response.data:
                storage_result["card_price_updated"] = True
                logger.info(f"✅ Updated card prices for card {card_id}")
        else:
            # Create new
            insert_response = supabase.table("card_prices").insert(card_price_data).execute()
            if insert_response.data:
                storage_result["card_price_updated"] = True
                logger.info(f"✅ Created card prices for card {card_id}")
        
        logger.info(f"🎉 Successfully stored data for '{query}': {total_inserted} entries, avg ${average_price:.2f}")
        
    except Exception as e:
        error_msg = f"Supabase storage error: {str(e)}"
        storage_result["errors"].append(error_msg)
        storage_result["sync_status"] = "error"
        logger.error(f"❌ {error_msg}")
    
    return storage_result

async def scrape_ebay_prices(query: str) -> Dict[str, Any]:
    """
    Scrape eBay for completed/sold listings and return comprehensive price data.
    
    Args:
        query (str): The search query
        
    Returns:
        dict: Comprehensive scraped data with prices, metadata, and debug info
    """
    logger.info(f"🔍 Starting eBay scrape for query: '{query}'")
    
    # Initialize result structure with debug info
    scrape_result = {
        "raw_prices": [],
        "filtered_prices": [],
        "debug_info": {
            "browser_actions": [],
            "selectors_tried": [],
            "page_info": {},
            "errors": []
        },
        "source_domain": "ebay.com",
        "scrape_timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    async with async_playwright() as p:
        browser = None
        context = None
        try:
            logger.info("🌐 Launching browser with anti-detection settings")
            scrape_result["debug_info"]["browser_actions"].append("Browser launched with stealth mode")
            
            # Launch browser with anti-detection arguments
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu',
                    '--no-first-run',
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows'
                ]
            )
            
            # Create context with realistic settings
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            page = await context.new_page()
            
            # Add stealth JavaScript
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            """)
            
            scrape_result["debug_info"]["browser_actions"].append("Stealth JavaScript injected")
            
            # Construct eBay search URL for sold listings only
            search_url = f"https://www.ebay.com/sch/i.html?_nkw={query.replace(' ', '+')}&LH_Sold=1&LH_Complete=1&_sop=13"
            logger.info(f"🔗 Navigating to: {search_url}")
            scrape_result["debug_info"]["browser_actions"].append(f"Navigating to URL: {search_url}")
            
            # Navigate to eBay search results
            response = await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            scrape_result["debug_info"]["page_info"]["response_status"] = response.status if response else "unknown"
            
            # Wait for page to load
            await page.wait_for_timeout(2000)
            
            # Validate we're on the right page
            title = await page.title()
            scrape_result["debug_info"]["page_info"]["page_title"] = title
            logger.info(f"📄 Page title: {title}")
            
            # Check if results container exists
            try:
                await page.wait_for_selector('.srp-results', timeout=5000)
                scrape_result["debug_info"]["browser_actions"].append("Search results container found")
                logger.info("✅ Search results container found")
            except Exception as e:
                error_msg = f"Search results container not found: {str(e)}"
                scrape_result["debug_info"]["errors"].append(error_msg)
                logger.warning(f"⚠️ {error_msg}")
            
            # Try to find individual listing items first (preferred approach)
            listing_selectors = [
                '.s-item',
                '.srp-results .s-item', 
                '.srp-river-results .s-item',
                '[data-view="mi:1686|iid:1"]'
            ]
            
            listing_items = []
            for selector in listing_selectors:
                scrape_result["debug_info"]["selectors_tried"].append(f"Listing selector: {selector}")
                items = await page.query_selector_all(selector)
                if items:
                    listing_items = items
                    logger.info(f"✅ Found {len(items)} listings using selector: {selector}")
                    scrape_result["debug_info"]["browser_actions"].append(f"Found {len(items)} listings with {selector}")
                    break
            
            if not listing_items:
                scrape_result["debug_info"]["errors"].append("No listing items found with any selector")
                logger.warning("⚠️ No listing items found")
            
            # Price selectors to try within each item
            price_selectors = [
                '.s-item__price .notranslate',
                '.s-item__price span.notranslate', 
                '.s-item .s-item__price',
                '[data-testid="item-price"]',
                '.notranslate',
                '.s-item__price',
                '.price'
            ]
            
            prices_with_timestamps = []
            
            # Extract prices from individual listing items
            logger.info(f"🔍 Processing {len(listing_items)} individual listings...")
            for i, item in enumerate(listing_items[:50]):  # Limit to 50 items for performance
                try:
                    price_found = False
                    for price_selector in price_selectors:
                        price_element = await item.query_selector(price_selector)
                        if price_element:
                            price_text = await price_element.text_content()
                            if price_text:
                                # Extract numeric price
                                price_match = re.search(r'[\d,]+\.?\d*', price_text.replace(',', ''))
                                if price_match:
                                    try:
                                        price = float(price_match.group())
                                        if 10.0 <= price <= 10000.0:  # Filter reasonable prices
                                            price_entry = {
                                                "price": price,
                                                "timestamp": datetime.utcnow().isoformat() + "Z",
                                                "source_text": price_text.strip(),
                                                "item_index": i
                                            }
                                            prices_with_timestamps.append(price_entry)
                                            scrape_result["raw_prices"].append(price)
                                            price_found = True
                                            break
                                    except ValueError:
                                        continue
                    
                    if not price_found:
                        scrape_result["debug_info"]["errors"].append(f"No price found for item {i}")
                        
                except Exception as e:
                    error_msg = f"Error processing item {i}: {str(e)}"
                    scrape_result["debug_info"]["errors"].append(error_msg)
                    continue
            
            # If we didn't find enough prices from items, try global selectors as fallback
            if len(scrape_result["raw_prices"]) < 5:
                logger.info("🔄 Trying global price selectors as fallback...")
                scrape_result["debug_info"]["browser_actions"].append("Using global selectors as fallback")
                
                for price_selector in price_selectors:
                    scrape_result["debug_info"]["selectors_tried"].append(f"Global selector: {price_selector}")
                    price_elements = await page.query_selector_all(price_selector)
                    
                    if price_elements:
                        logger.info(f"✅ Found {len(price_elements)} price elements with global selector: {price_selector}")
                        
                        for element in price_elements[:30]:  # Limit for performance
                            try:
                                price_text = await element.text_content()
                                if price_text:
                                    # Extract numeric price
                                    price_match = re.search(r'[\d,]+\.?\d*', price_text.replace(',', ''))
                                    if price_match:
                                        price = float(price_match.group())
                                        if 10.0 <= price <= 10000.0:  # Filter reasonable prices
                                            if price not in scrape_result["raw_prices"]:  # Avoid duplicates
                                                price_entry = {
                                                    "price": price,
                                                    "timestamp": datetime.utcnow().isoformat() + "Z",
                                                    "source_text": price_text.strip(),
                                                    "method": "global_selector"
                                                }
                                                prices_with_timestamps.append(price_entry)
                                                scrape_result["raw_prices"].append(price)
                            except (ValueError, TypeError):
                                continue
                        
                        if len(scrape_result["raw_prices"]) >= 5:
                            break
            
            # Final fallback: text-based search
            if len(scrape_result["raw_prices"]) < 3:
                logger.info("🔄 Using text-based price extraction as final fallback...")
                scrape_result["debug_info"]["browser_actions"].append("Using text-based extraction")
                
                page_content = await page.content()
                price_pattern = r'\$[\d,]+\.?\d*'
                text_prices = re.findall(price_pattern, page_content)
                
                for price_text in text_prices[:20]:
                    try:
                        price = float(price_text.replace('$', '').replace(',', ''))
                        if 10.0 <= price <= 10000.0:
                            if price not in scrape_result["raw_prices"]:
                                price_entry = {
                                    "price": price,
                                    "timestamp": datetime.utcnow().isoformat() + "Z",
                                    "source_text": price_text,
                                    "method": "text_extraction"
                                }
                                prices_with_timestamps.append(price_entry)
                                scrape_result["raw_prices"].append(price)
                    except ValueError:
                        continue
            
            # Filter and sort prices
            scrape_result["filtered_prices"] = [p for p in scrape_result["raw_prices"] if 10.0 <= p <= 10000.0]
            scrape_result["filtered_prices"].sort()
            
            # Store price entries with timestamps
            scrape_result["price_entries"] = prices_with_timestamps
            
            logger.info(f"✅ Extraction complete: {len(scrape_result['filtered_prices'])} valid prices found")
            scrape_result["debug_info"]["browser_actions"].append(f"Extraction completed with {len(scrape_result['filtered_prices'])} valid prices")
            
        except Exception as e:
            error_msg = f"Scraping error: {str(e)}"
            scrape_result["debug_info"]["errors"].append(error_msg)
            logger.error(f"❌ {error_msg}")
            
            # Take screenshot for debugging if possible
            try:
                if page:
                    screenshot_path = f"debug_screenshot_{query.replace(' ', '_')}.png"
                    await page.screenshot(path=screenshot_path)
                    scrape_result["debug_info"]["browser_actions"].append(f"Debug screenshot saved: {screenshot_path}")
            except:
                pass
        
        finally:
            # Clean up browser resources
            try:
                if context:
                    await context.close()
                    scrape_result["debug_info"]["browser_actions"].append("Browser context closed")
                if browser:
                    await browser.close()
                    scrape_result["debug_info"]["browser_actions"].append("Browser closed")
            except Exception as e:
                scrape_result["debug_info"]["errors"].append(f"Cleanup error: {str(e)}")
    
    return scrape_result

async def run_scraper(query: str, store_to_db: bool = True) -> Dict[str, Any]:
    """
    Enhanced scraper that returns comprehensive metadata and optionally stores to Supabase.
    
    Args:
        query (str): The search query
        store_to_db (bool): Whether to store results to Supabase database
        
    Returns:
        dict: Comprehensive scraped data with prices, metadata, and statistics
    """
    logger.info(f"🚀 Starting enhanced scraper for query: '{query}' (store_to_db: {store_to_db})")
    
    # Initialize Supabase client if needed
    supabase = None
    if store_to_db:
        supabase = get_supabase_client()
        if supabase:
            logger.info("✅ Supabase client initialized")
        else:
            logger.warning("⚠️ Supabase client not available - proceeding without database storage")
    
    # Run the async scraping function
    scrape_data = await scrape_ebay_prices(query)
    
    # Extract filtered prices
    prices = scrape_data["filtered_prices"]
    
    # Calculate comprehensive statistics
    if prices:
        prices_sorted = sorted(prices)
        average = sum(prices) / len(prices)
        lowest_price = min(prices)
        highest_price = max(prices)
        
        # Calculate median
        if len(prices) % 2 == 0:
            median_price = (prices_sorted[len(prices)//2 - 1] + prices_sorted[len(prices)//2]) / 2
        else:
            median_price = prices_sorted[len(prices)//2]
    else:
        prices_sorted = []
        average = lowest_price = highest_price = median_price = 0.0
    
    # Store to Supabase if enabled and available
    storage_result = None
    if store_to_db and supabase and prices:
        logger.info("💾 Storing results to Supabase...")
        storage_result = await store_price_entries_to_supabase(scrape_data, supabase)
        logger.info(f"📊 Storage result: {storage_result['sync_status']}")
    
    # Build comprehensive result
    result = {
        "query": query,
        "prices": prices,
        "prices_sorted": prices_sorted,
        "price_count": len(prices),
        "average": round(average, 2),
        "lowest_price": round(lowest_price, 2),
        "highest_price": round(highest_price, 2),
        "median_price": round(median_price, 2),
        "price_range": round(highest_price - lowest_price, 2) if prices else 0.0,
        "source_domain": scrape_data["source_domain"],
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "scrape_timestamp": scrape_data["scrape_timestamp"],
        "price_entries": scrape_data["price_entries"],
        "debug_info": scrape_data["debug_info"],
        "raw_price_count": len(scrape_data["raw_prices"]),
        "sync_status": storage_result["sync_status"] if storage_result else ("success" if prices else "no_data"),
        "storage_result": storage_result
    }
    
    logger.info(f"✅ Enhanced scraper result: {len(prices)} prices, avg: ${average:.2f}, range: ${lowest_price:.2f}-${highest_price:.2f}")
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
