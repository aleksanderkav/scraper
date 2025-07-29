#!/usr/bin/env python3
"""
Mini test script to demonstrate the scheduled scraper working.
Tests with just 3 queries so you can see results quickly.
"""

import requests
import json
from datetime import datetime

class MiniScraper:
    def __init__(self):
        # Use your live API
        self.scraper_api_url = "https://scraper-production-22f6.up.railway.app"
        
        # Just test with 3 popular cards
        self.test_queries = [
            "Charizard PSA 10",
            "Pikachu PSA 9", 
            "Blastoise PSA 10"
        ]
    
    def test_single_query(self, query: str):
        """Test a single query and show the results."""
        print(f"\n🎯 Testing: {query}")
        print("-" * 50)
        
        try:
            # Call your live API
            response = requests.get(
                f"{self.scraper_api_url}/scrape",
                params={"query": query},
                timeout=60
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Display the results nicely
            print(f"📊 Query: {data['query']}")
            print(f"🔢 Prices Found: {len(data['prices'])}")
            if data['prices']:
                print(f"💰 Individual Prices: {data['prices']}")
                print(f"📈 Average Price: ${data['average']}")
                print(f"💎 Highest Price: ${max(data['prices'])}")
                print(f"💸 Lowest Price: ${min(data['prices'])}")
            else:
                print("❌ No prices found")
            print(f"⏰ Scraped At: {data['timestamp']}")
            
            return data
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    def run_demo(self):
        """Run demo with 3 test queries."""
        print("🚀 POKEMON CARD PRICE SCRAPER DEMO")
        print("=" * 60)
        print(f"🔗 API: {self.scraper_api_url}")
        print(f"📋 Testing {len(self.test_queries)} popular cards")
        print("=" * 60)
        
        results = []
        
        for i, query in enumerate(self.test_queries, 1):
            print(f"\n[{i}/{len(self.test_queries)}]", end="")
            result = self.test_single_query(query)
            if result:
                results.append(result)
            
            # Small delay between requests
            if i < len(self.test_queries):
                print("\n⏳ Waiting 3 seconds...")
                import time
                time.sleep(3)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 DEMO SUMMARY")
        print("=" * 60)
        
        total_prices = 0
        total_cards = len(results)
        
        for result in results:
            prices = result.get('prices', [])
            avg = result.get('average', 0)
            total_prices += len(prices)
            print(f"🃏 {result['query']}: {len(prices)} prices, avg ${avg}")
        
        print(f"\n✅ Successfully scraped {total_cards} cards")
        print(f"💰 Total price points collected: {total_prices}")
        print(f"📈 Average per card: {total_prices/total_cards if total_cards > 0 else 0:.1f} prices")
        
        return results

if __name__ == "__main__":
    scraper = MiniScraper()
    scraper.run_demo()