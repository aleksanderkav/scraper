import os
import requests
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
import time

class ScheduledScraper:
    """
    Scheduled scraper that fetches price data from the scraper API
    and stores it in Supabase.
    """
    
    def __init__(self):
        # Initialize Supabase client
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_ANON_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Your scraper API endpoint
        self.scraper_api_url = os.environ.get("SCRAPER_API_URL", "https://scraper-production-22f6.up.railway.app")
        
        # Expanded search queries for comprehensive Pokemon card price tracking
        self.search_queries = [
            # Base Set Starters - High Value PSA 10
            "Charizard PSA 10",
            "Blastoise PSA 10", 
            "Venusaur PSA 10",
            
            # Popular PSA 9 Cards (more affordable tier)
            "Charizard PSA 9",
            "Pikachu PSA 9",
            "Blastoise PSA 9",
            "Venusaur PSA 9",
            
            # Classic Base Set Holos
            "Alakazam holo PSA",
            "Machamp holo PSA",
            "Gyarados holo PSA",
            "Zapdos holo PSA",
            "Moltres holo PSA",
            "Articuno holo PSA",
            "Magneton holo PSA",
            "Hitmonchan holo PSA",
            
            # Legendary Birds & Psychic Pokemon
            "Mewtwo PSA 10",
            "Mew PSA 10",
            "Lugia PSA 10",
            "Ho-Oh PSA 10",
            "Celebi PSA 10",
            
            # Dragon & Flying Types (High Value)
            "Rayquaza PSA 10",
            "Dragonite PSA 10",
            "Aerodactyl holo PSA",
            
            # Japanese Cards (Premium Market)
            "Japanese Charizard PSA",
            "Japanese Pikachu PSA",
            "Japanese Blastoise PSA",
            "Japanese Base Set PSA",
            
            # Modern High-Value Cards
            "Charizard VMAX PSA",
            "Pikachu VMAX PSA",
            "Umbreon VMAX PSA",
            "Sylveon VMAX PSA",
            
            # Vintage Promos & Special Cards
            "Black Star Promo Pikachu PSA",
            "Shadowless Charizard PSA",
            "First Edition Charizard PSA",
            "Trophy Pikachu PSA",
            
            # Neo Genesis & Other Popular Sets
            "Neo Genesis Lugia PSA",
            "Jungle Flareon PSA",
            "Fossil Gengar PSA",
            "Team Rocket Dark Charizard PSA",
            
            # Shining & Crystal Pokemon
            "Shining Gyarados PSA",
            "Shining Magikarp PSA",
            "Crystal Charizard PSA",
            
            # eCard Series
            "Aquapolis Lugia PSA",
            "Skyridge Charizard PSA"
        ]
    
    def fetch_price_data(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Fetch price data from the scraper API for a given query.
        
        Args:
            query (str): The search query
            
        Returns:
            Optional[Dict]: The API response data or None if failed
        """
        try:
            print(f"🔍 Fetching price data for: {query}")
            response = requests.get(
                f"{self.scraper_api_url}/scrape",
                params={"query": query},
                timeout=90  # Increased timeout for complex scraping
            )
            response.raise_for_status()
            
            data = response.json()
            prices = data.get('prices', [])
            print(f"✅ Found {len(prices)} prices for '{query}' - Avg: ${data.get('average', 0)}")
            return data
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error for '{query}': {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error for '{query}': {e}")
            return None
        except Exception as e:
            print(f"❌ Unexpected error for '{query}': {e}")
            return None
    
    def get_or_create_card(self, card_name: str) -> Optional[Dict]:
        """
        Get existing card or create a new one in the cards table.
        
        Args:
            card_name (str): The name of the card
            
        Returns:
            Optional[Dict]: The card record or None if failed
        """
        try:
            # First, try to find existing card
            result = self.supabase.table("cards").select("*").eq("name", card_name).execute()
            
            if result.data:
                return result.data[0]
            
            # Create new card if it doesn't exist
            new_card = {
                "name": card_name,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("cards").insert(new_card).execute()
            
            if result.data:
                print(f"📝 Created new card: {card_name}")
                return result.data[0]
            else:
                print(f"❌ Failed to create card: {card_name}")
                return None
                
        except Exception as e:
            print(f"❌ Error handling card '{card_name}': {e}")
            return None
    
    def insert_price_entries(self, card_id: int, prices: List[float], query: str, timestamp: str) -> bool:
        """
        Insert individual price entries into the price_entries table.
        """
        try:
            if not prices:
                return True
                
            price_entries = []
            for price in prices:
                entry = {
                    "card_id": card_id,
                    "price": price,
                    "source": "ebay",
                    "query": query,
                    "scraped_at": timestamp,
                    "created_at": datetime.utcnow().isoformat()
                }
                price_entries.append(entry)
            
            result = self.supabase.table("price_entries").insert(price_entries).execute()
            
            if result.data:
                print(f"💾 Inserted {len(price_entries)} price entries")
                return True
            else:
                print(f"❌ Failed to insert price entries")
                return False
                
        except Exception as e:
            print(f"❌ Error inserting price entries: {e}")
            return False
    
    def update_card_prices(self, card_id: int, average_price: float, price_count: int, timestamp: str) -> bool:
        """
        Update or insert the latest price data in card_prices table.
        """
        try:
            # Check if card_prices entry exists
            result = self.supabase.table("card_prices").select("*").eq("card_id", card_id).execute()
            
            price_data = {
                "card_id": card_id,
                "latest_average": average_price,
                "price_count": price_count,
                "last_updated": timestamp,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if result.data:
                # Update existing record
                update_result = self.supabase.table("card_prices").update(price_data).eq("card_id", card_id).execute()
                if update_result.data:
                    print(f"🔄 Updated average price: ${average_price}")
                    return True
            else:
                # Insert new record
                price_data["created_at"] = datetime.utcnow().isoformat()
                insert_result = self.supabase.table("card_prices").insert(price_data).execute()
                if insert_result.data:
                    print(f"📊 Created price record: ${average_price}")
                    return True
                    
            return False
                    
        except Exception as e:
            print(f"❌ Error updating card_prices: {e}")
            return False
    
    def process_query(self, query: str) -> bool:
        """
        Process a single query: scrape data and save to Supabase.
        """
        print(f"\n🎯 Processing: {query}")
        
        # 1. Fetch price data from scraper API
        price_data = self.fetch_price_data(query)
        if not price_data:
            return False
        
        prices = price_data.get("prices", [])
        average = price_data.get("average", 0.0)
        timestamp = price_data.get("timestamp", datetime.utcnow().isoformat())
        
        if not prices:
            print(f"⚠️ No prices found for: {query}")
            return False
        
        # 2. Get or create card
        card = self.get_or_create_card(query)
        if not card:
            return False
        
        card_id = card["id"]
        
        # 3. Insert price entries
        if not self.insert_price_entries(card_id, prices, query, timestamp):
            return False
        
        # 4. Update card_prices
        if not self.update_card_prices(card_id, average, len(prices), timestamp):
            return False
        
        print(f"✅ Successfully processed: {query} (${average})")
        return True
    
    def run_scheduled_scrape(self):
        """
        Run the scheduled scraping for all predefined queries.
        """
        start_time = datetime.utcnow()
        print(f"🚀 Starting Pokemon card price scraping at {start_time.isoformat()}")
        print(f"📊 Processing {len(self.search_queries)} card queries")
        print(f"🔗 API: {self.scraper_api_url}")
        print("=" * 60)
        
        successful_queries = 0
        failed_queries = 0
        total_prices_collected = 0
        
        for i, query in enumerate(self.search_queries, 1):
            print(f"\n📋 [{i}/{len(self.search_queries)}] {query}")
            
            try:
                if self.process_query(query):
                    successful_queries += 1
                else:
                    failed_queries += 1
                    
                # Add delay between requests to be respectful to eBay
                if i < len(self.search_queries):
                    print("⏳ Waiting 8 seconds...")
                    time.sleep(8)
                    
            except Exception as e:
                print(f"❌ Unexpected error processing '{query}': {e}")
                failed_queries += 1
        
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()
        
        print("\n" + "=" * 60)
        print(f"📊 SCRAPING COMPLETED!")
        print(f"✅ Successful: {successful_queries}")
        print(f"❌ Failed: {failed_queries}")
        print(f"⏱️ Duration: {duration:.1f} seconds")
        print(f"🕐 Finished at: {end_time.isoformat()}")
        print("=" * 60)
    
    def add_query(self, new_query: str):
        """
        Add a new query to the search list.
        """
        if new_query not in self.search_queries:
            self.search_queries.append(new_query)
            print(f"➕ Added: {new_query}")
        else:
            print(f"⚠️ Already exists: {new_query}")


def main():
    """
    Main function to run the scheduled scraper.
    """
    try:
        scraper = ScheduledScraper()
        scraper.run_scheduled_scrape()
        
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("💡 Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables")
        exit(1)
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        exit(1)


if __name__ == "__main__":
    main()