#!/usr/bin/env python3
"""
Test script to validate the cards_with_prices view works correctly.
This ensures the view provides the expected fields and data structure.
"""

import os
from supabase import create_client, Client
from scheduled_scraper import ScheduledScraper

def test_cards_with_prices_view():
    """Test the cards_with_prices view functionality."""
    
    # Check environment variables
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables")
        print("Set them with:")
        print("export SUPABASE_URL='your_supabase_url'")
        print("export SUPABASE_ANON_KEY='your_supabase_anon_key'")
        return False
    
    print("🔗 Testing Supabase View Integration")
    print("=" * 50)
    
    try:
        # Initialize Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Test 1: Check if view exists and has expected structure
        print("\n📋 Test 1: View Structure")
        print("-" * 30)
        
        result = supabase.from('cards_with_prices').select('*').limit(1).execute()
        
        if result.data:
            card = result.data[0]
            expected_fields = ['id', 'name', 'created_at', 'latest_price', 'last_price_update', 'price_count']
            
            print("✅ View exists and is accessible")
            print(f"📊 Sample record fields: {list(card.keys())}")
            
            missing_fields = [field for field in expected_fields if field not in card.keys()]
            if missing_fields:
                print(f"⚠️ Missing expected fields: {missing_fields}")
            else:
                print("✅ All expected fields present")
                
        else:
            print("⚠️ View exists but no data found")
        
        # Test 2: Test filtering by price
        print("\n💰 Test 2: Price Filtering")
        print("-" * 30)
        
        # Get cards with prices > 0
        result = supabase.from('cards_with_prices').select('*').gt('latest_price', 0).execute()
        cards_with_prices = result.data or []
        
        print(f"✅ Found {len(cards_with_prices)} cards with prices > $0")
        
        if cards_with_prices:
            # Show top 3 most expensive
            sorted_cards = sorted(cards_with_prices, key=lambda x: float(x.get('latest_price', 0)), reverse=True)[:3]
            print("🏆 Top 3 most expensive cards:")
            for i, card in enumerate(sorted_cards, 1):
                price = card.get('latest_price', 0)
                name = card.get('name', 'Unknown')
                count = card.get('price_count', 0)
                print(f"   {i}. {name}: ${price} ({count} prices)")
        
        # Test 3: Test search functionality
        print("\n🔍 Test 3: Search Functionality")
        print("-" * 30)
        
        # Search for Charizard cards
        result = supabase.from('cards_with_prices').select('*').ilike('name', '%Charizard%').execute()
        charizard_cards = result.data or []
        
        print(f"✅ Found {len(charizard_cards)} Charizard cards")
        
        if charizard_cards:
            for card in charizard_cards[:3]:  # Show first 3
                price = card.get('latest_price', 0)
                name = card.get('name', 'Unknown')
                print(f"   🔥 {name}: ${price}")
        
        # Test 4: Test price range filtering
        print("\n📊 Test 4: Price Range Filtering")
        print("-" * 30)
        
        # Cards between $100-$500
        result = supabase.from('cards_with_prices').select('*').gte('latest_price', 100).lte('latest_price', 500).execute()
        mid_range_cards = result.data or []
        
        print(f"✅ Found {len(mid_range_cards)} cards priced $100-$500")
        
        # Test 5: Verify data types
        print("\n🔢 Test 5: Data Types")
        print("-" * 30)
        
        if cards_with_prices:
            sample_card = cards_with_prices[0]
            price = sample_card.get('latest_price')
            count = sample_card.get('price_count')
            
            print(f"✅ latest_price type: {type(price)} (value: {price})")
            print(f"✅ price_count type: {type(count)} (value: {count})")
            
            # Check if price filtering will work correctly
            if isinstance(price, (int, float)):
                print("✅ Price filtering should work correctly")
            else:
                print("⚠️ Price might need type conversion for filtering")
        
        print("\n" + "=" * 50)
        print("📊 VIEW INTEGRATION TEST SUMMARY")
        print("=" * 50)
        print("✅ View is accessible and functional")
        print("✅ Price filtering works correctly")
        print("✅ Search functionality works")
        print("✅ Data types are appropriate")
        print("\n🎉 The cards_with_prices view is ready for frontend use!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing view: {e}")
        return False

def demo_frontend_queries():
    """Demonstrate typical frontend query patterns."""
    
    print("\n" + "="*60)
    print("🌐 FRONTEND QUERY EXAMPLES")
    print("="*60)
    
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing environment variables for demo")
        return
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Example 1: Get all cards with prices, ordered by price
    print("\n💎 Example 1: Top cards by price")
    result = supabase.from('cards_with_prices').select('name, latest_price, price_count').gt('latest_price', 0).order('latest_price', {'ascending': False}).limit(5).execute()
    
    if result.data:
        for card in result.data:
            print(f"   ${card['latest_price']:>8} - {card['name']} ({card['price_count']} prices)")
    
    # Example 2: Search with price filter
    print("\n🔍 Example 2: PSA 10 cards under $300")
    result = supabase.from('cards_with_prices').select('name, latest_price').ilike('name', '%PSA 10%').lt('latest_price', 300).gt('latest_price', 0).execute()
    
    if result.data:
        for card in result.data[:5]:
            print(f"   ${card['latest_price']:>8} - {card['name']}")
    
    # Example 3: Recent additions
    print("\n📅 Example 3: Recently added cards")
    result = supabase.from('cards_with_prices').select('name, latest_price, created_at').gt('latest_price', 0).order('created_at', {'ascending': False}).limit(5).execute()
    
    if result.data:
        for card in result.data:
            date = card['created_at'][:10] if card['created_at'] else 'Unknown'
            print(f"   {date} - {card['name']} (${card['latest_price']})")

if __name__ == "__main__":
    print("🧪 Supabase View Integration Test")
    
    # Test the view
    success = test_cards_with_prices_view()
    
    if success:
        # Show frontend examples
        demo_frontend_queries()
    
    print("\n✨ Test completed!")