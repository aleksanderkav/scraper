def run_scraper(query: str) -> dict:
    """
    Mock scraper function that returns sample data.
    
    Args:
        query (str): The search query
        
    Returns:
        dict: Mock scraped data with prices and average
    """
    # Mock data - replace this with actual scraping logic
    prices = [150.0, 162.5, 175.0]
    average = sum(prices) / len(prices)
    
    return {
        "query": query,
        "prices": prices,
        "average": average,
        "timestamp": "2024-01-01T00:00:00Z"
    }
