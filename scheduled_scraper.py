#!/usr/bin/env python3
"""
Scheduled Scraper for Railway
Automatically scrapes predefined card queries and stores data in Supabase.
"""

import os
import asyncio
import aiohttp
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('scheduled_scraper.log')
    ]
)
logger = logging.getLogger(__name__)

class SupabaseClient:
    """Client for interacting with Supabase REST API"""
    
    def __init__(self):
        self.supabase_url = os.environ.get('SUPABASE_URL')
        self.supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        self.headers = {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    
    async def get_card_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get card by name, returns None if not found"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.supabase_url}/rest/v1/cards?name=eq.{name}&select=id"
            async with session.get(url, headers=self.headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data[0] if data else None
                else:
                    logger.error(f"Failed to get card: {response.status}")
                    return None
    
    async def create_card(self, name: str) -> Optional[int]:
        """Create a new card and return its ID"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.supabase_url}/rest/v1/cards"
            payload = {"name": name}
            
            async with session.post(url, headers=self.headers, json=payload) as response:
                if response.status == 201:
                    data = await response.json()
                    return data[0]['id'] if data else None
                else:
                    logger.error(f"Failed to create card: {response.status}")
                    return None
    
    async def insert_price_entries(self, price_entries: List[Dict[str, Any]]) -> bool:
        """Insert multiple price entries"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.supabase_url}/rest/v1/price_entries"
            
            async with session.post(url, headers=self.headers, json=price_entries) as response:
                if response.status == 201:
                    logger.info(f"Inserted {len(price_entries)} price entries")
                    return True
                else:
                    logger.error(f"Failed to insert price entries: {response.status}")
                    return False
    
    async def upsert_card_price(self, card_id: int, average_price: float, last_seen: str) -> bool:
        """Update or insert card price summary"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.supabase_url}/rest/v1/card_prices"
            
            # Check if card price exists
            check_url = f"{self.supabase_url}/rest/v1/card_prices?card_id=eq.{card_id}"
            async with session.get(check_url, headers=self.headers) as check_response:
                if check_response.status == 200:
                    existing_data = await check_response.json()
                    
                    if existing_data:
                        # Update existing
                        update_url = f"{self.supabase_url}/rest/v1/card_prices?card_id=eq.{card_id}"
                        payload = {
                            "average_price": average_price,
                            "last_seen": last_seen
                        }
                        async with session.patch(update_url, headers=self.headers, json=payload) as update_response:
                            success = update_response.status == 204
                            if success:
                                logger.info(f"Updated card price for card_id {card_id}")
                            else:
                                logger.error(f"Failed to update card price: {update_response.status}")
                            return success
                    else:
                        # Insert new
                        payload = {
                            "card_id": card_id,
                            "average_price": average_price,
                            "last_seen": last_seen
                        }
                        async with session.post(url, headers=self.headers, json=payload) as insert_response:
                            success = insert_response.status == 201
                            if success:
                                logger.info(f"Created new card price for card_id {card_id}")
                            else:
                                logger.error(f"Failed to create card price: {insert_response.status}")
                            return success
                else:
                    logger.error(f"Failed to check existing card price: {check_response.status}")
                    return False

class ScraperClient:
    """Client for interacting with the scraper endpoint"""
    
    def __init__(self):
        self.scraper_url = os.environ.get('SCRAPER_URL')
        if not self.scraper_url:
            raise ValueError("SCRAPER_URL must be set")
    
    async def scrape_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Scrape a single query and return the response"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.scraper_url}/scrape?query={query}"
            
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"Successfully scraped '{query}': {len(data.get('prices', []))} prices found")
                        return data
                    else:
                        logger.error(f"Scraper request failed for '{query}': {response.status}")
                        return None
            except Exception as e:
                logger.error(f"Error scraping '{query}': {str(e)}")
                return None

class ScheduledScraper:
    """Main scraper class that orchestrates the scraping and storage process"""
    
    def __init__(self):
        self.supabase = SupabaseClient()
        self.scraper = ScraperClient()
        
        # Predefined search queries - easy to modify
        self.search_queries = [
            "Charizard PSA 10",
            "Pikachu PSA 9", 
            "Blastoise holo",
            "Venusaur 1st edition",
            "Mewtwo PSA 8",
            "Gyarados holo",
            "Alakazam PSA 9",
            "Machamp 1st edition",
            "Gengar holo",
            "Dragonite PSA 10"
        ]
    
    def add_query(self, query: str):
        """Add a new query to the list"""
        if query not in self.search_queries:
            self.search_queries.append(query)
            logger.info(f"Added new query: {query}")
    
    def remove_query(self, query: str):
        """Remove a query from the list"""
        if query in self.search_queries:
            self.search_queries.remove(query)
            logger.info(f"Removed query: {query}")
    
    async def process_query(self, query: str) -> bool:
        """Process a single query: scrape, store card, store prices, update summary"""
        try:
            # Step 1: Scrape the query
            scraper_data = await self.scraper.scrape_query(query)
            if not scraper_data or not scraper_data.get('prices'):
                logger.warning(f"No prices found for query: {query}")
                return False
            
            prices = scraper_data['prices']
            average_price = scraper_data['average']
            timestamp = scraper_data['timestamp']
            
            # Step 2: Get or create card
            card = await self.supabase.get_card_by_name(query)
            if card:
                card_id = card['id']
                logger.info(f"Found existing card: {query} (ID: {card_id})")
            else:
                card_id = await self.supabase.create_card(query)
                if not card_id:
                    logger.error(f"Failed to create card: {query}")
                    return False
                logger.info(f"Created new card: {query} (ID: {card_id})")
            
            # Step 3: Insert price entries
            price_entries = [
                {
                    "card_id": card_id,
                    "price": price,
                    "timestamp": timestamp
                }
                for price in prices
            ]
            
            success = await self.supabase.insert_price_entries(price_entries)
            if not success:
                logger.error(f"Failed to insert price entries for: {query}")
                return False
            
            # Step 4: Update card price summary
            success = await self.supabase.upsert_card_price(card_id, average_price, timestamp)
            if not success:
                logger.error(f"Failed to update card price summary for: {query}")
                return False
            
            logger.info(f"Successfully processed query: {query} - {len(prices)} prices, avg: ${average_price}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing query '{query}': {str(e)}")
            return False
    
    async def run_scheduled_scrape(self):
        """Run the scheduled scraping for all queries"""
        logger.info(f"Starting scheduled scrape for {len(self.search_queries)} queries")
        start_time = datetime.now()
        
        success_count = 0
        total_count = len(self.search_queries)
        
        # Process queries concurrently (with rate limiting)
        semaphore = asyncio.Semaphore(3)  # Limit concurrent requests
        
        async def process_with_semaphore(query):
            async with semaphore:
                return await self.process_query(query)
        
        tasks = [process_with_semaphore(query) for query in self.search_queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Exception processing '{self.search_queries[i]}': {result}")
            elif result:
                success_count += 1
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info(f"Scheduled scrape completed: {success_count}/{total_count} successful in {duration:.2f}s")
        
        return {
            "success_count": success_count,
            "total_count": total_count,
            "duration_seconds": duration,
            "timestamp": datetime.utcnow().isoformat()
        }

async def main():
    """Main function to run the scheduled scraper"""
    try:
        scraper = ScheduledScraper()
        result = await scraper.run_scheduled_scrape()
        
        # Log final summary
        logger.info(f"Scraping session completed: {result}")
        
        # You could also send this result to a monitoring service
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        logger.error(f"Fatal error in scheduled scraper: {str(e)}")
        raise

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main()) 