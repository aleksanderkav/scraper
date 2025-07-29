#!/usr/bin/env python3
"""
Test script for the enhanced scraper API with comprehensive metadata and batch processing.
"""
import requests
import json
import time
from typing import Dict, Any

# Configuration
API_BASE_URL = "https://scraper-production-22f6.up.railway.app"
# API_BASE_URL = "http://localhost:8000"  # For local testing

def test_single_scrape(query: str, store_to_db: bool = False, debug: bool = True) -> Dict[str, Any]:
    """Test the enhanced single scrape endpoint."""
    print(f"\n🔍 Testing single scrape for: '{query}'")
    print(f"   Parameters: store_to_db={store_to_db}, debug={debug}")
    
    params = {
        "query": query,
        "store_to_db": store_to_db,
        "debug": debug
    }
    
    try:
        response = requests.get(f"{API_BASE_URL}/scrape", params=params, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        
        print(f"✅ Single scrape completed!")
        print(f"   Prices found: {data.get('price_count', 0)}")
        print(f"   Price range: ${data.get('lowest_price', 0):.2f} - ${data.get('highest_price', 0):.2f}")
        print(f"   Average: ${data.get('average', 0):.2f}")
        print(f"   Median: ${data.get('median_price', 0):.2f}")
        print(f"   Sync status: {data.get('sync_status', 'unknown')}")
        
        if data.get('storage_result'):
            storage = data['storage_result']
            print(f"   Database: {storage.get('price_entries_inserted', 0)} entries stored")
        
        # Show some example prices
        if data.get('prices_sorted'):
            prices = data['prices_sorted'][:5]
            print(f"   Sample prices: {[f'${p:.2f}' for p in prices]}")
        
        return data
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return {}
    except Exception as e:
        print(f"❌ Error: {e}")
        return {}

def test_batch_scrape(queries: list, store_to_db: bool = False, max_concurrent: int = 2) -> Dict[str, Any]:
    """Test the batch scrape endpoint."""
    print(f"\n🚀 Testing batch scrape for {len(queries)} queries")
    print(f"   Parameters: store_to_db={store_to_db}, max_concurrent={max_concurrent}")
    print(f"   Queries: {queries}")
    
    payload = {
        "queries": queries,
        "store_to_db": store_to_db,
        "max_concurrent": max_concurrent
    }
    
    try:
        start_time = time.time()
        response = requests.post(f"{API_BASE_URL}/scrape_batch", json=payload, timeout=180)
        response.raise_for_status()
        
        data = response.json()
        elapsed = time.time() - start_time
        
        print(f"✅ Batch scrape completed in {elapsed:.1f} seconds!")
        
        # Show batch summary
        summary = data.get('batch_summary', {})
        print(f"   Success rate: {summary.get('successful', 0)}/{summary.get('total_queries', 0)}")
        print(f"   Total prices found: {summary.get('total_prices_found', 0)}")
        
        if store_to_db:
            print(f"   Total prices stored: {summary.get('total_prices_stored', 0)}")
            print(f"   Cards created: {summary.get('cards_created', 0)}")
        
        # Show individual results
        for result in data.get('results', []):
            query = result['query']
            status = result['status']
            if status == 'success' and result.get('data'):
                price_count = result['data'].get('price_count', 0)
                avg_price = result['data'].get('average', 0)
                print(f"   📊 '{query}': {price_count} prices, avg ${avg_price:.2f}")
            else:
                print(f"   ❌ '{query}': {result.get('error', 'Failed')}")
        
        return data
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return {}
    except Exception as e:
        print(f"❌ Error: {e}")
        return {}

def test_health_check():
    """Test the health check endpoint."""
    print(f"\n🏥 Testing health check endpoint")
    
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=10)
        response.raise_for_status()
        
        data = response.json()
        print(f"✅ API Status: {data.get('status', 'unknown')}")
        print(f"   Version: {data.get('api_version', 'unknown')}")
        
        features = data.get('features', {})
        print(f"   Features: {list(features.keys())}")
        
        return data
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return {}

def main():
    """Run comprehensive tests of the enhanced scraper API."""
    print("🧪 Enhanced Scraper API Test Suite")
    print("=" * 50)
    
    # Test 1: Health check
    test_health_check()
    
    # Test 2: Single scrape with debug (no database storage for testing)
    single_result = test_single_scrape("Charizard PSA 10", store_to_db=False, debug=True)
    
    # Test 3: Single scrape without debug info
    test_single_scrape("Pikachu PSA 9", store_to_db=False, debug=False)
    
    # Test 4: Batch scrape (small batch for testing)
    batch_queries = [
        "Blastoise PSA 10",
        "Venusaur PSA 9", 
        "Alakazam holo PSA"
    ]
    batch_result = test_batch_scrape(batch_queries, store_to_db=False, max_concurrent=2)
    
    print("\n📊 Test Summary:")
    print("=" * 50)
    
    if single_result:
        print(f"✅ Single scrape: {single_result.get('price_count', 0)} prices found")
    else:
        print(f"❌ Single scrape: Failed")
    
    if batch_result:
        summary = batch_result.get('batch_summary', {})
        success_rate = f"{summary.get('successful', 0)}/{summary.get('total_queries', 0)}"
        print(f"✅ Batch scrape: {success_rate} queries successful")
    else:
        print(f"❌ Batch scrape: Failed")
    
    print("\n🎉 Test suite completed!")
    print("\nTo test with Supabase integration:")
    print("1. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables")
    print("2. Change store_to_db=True in the test calls")

if __name__ == "__main__":
    main()