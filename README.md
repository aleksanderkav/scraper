# FastAPI Web Scraper

A simple FastAPI application that provides a web scraping API endpoint. This project is ready for deployment to Railway.

## Features

- FastAPI web server
- `/scrape` endpoint that accepts a `query` parameter
- Mock scraping functionality (easily replaceable with real scraping logic)
- Docker support for containerized deployment
- Railway-ready configuration

## Local Development

### Prerequisites

- Python 3.10 or higher
- pip

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd fastapi-scraper
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the development server:
```bash
python server.py
```

Or using uvicorn directly:
```bash
uvicorn server:app --reload
```

4. Open your browser and navigate to `http://localhost:8000`

### API Endpoints

- `GET /` - Health check endpoint
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /scrape?query=<your-query>` - Scrape data based on query

### Example Usage

```bash
curl "http://localhost:8000/scrape?query=laptop"
```

Response:
```json
{
  "query": "laptop",
  "prices": [150.0, 162.5, 175.0],
  "average": 162.5,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Docker

### Build and Run

```bash
# Build the Docker image
docker build -t fastapi-scraper .

# Run the container
docker run -p 8000:8000 fastapi-scraper
```

## Deployment to Railway

### Method 1: GitHub Integration (Recommended)

1. Push your code to GitHub
2. Go to [Railway](https://railway.app/)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically detect the Dockerfile and deploy your application

### Method 2: Direct Deployment

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize and deploy:
```bash
railway init
railway up
```

### Environment Variables

No environment variables are required for basic functionality, but you can add them in Railway's dashboard if needed for your specific use case.

## Customization

### Adding Real Scraping Logic

Replace the mock implementation in `scraper.py` with your actual scraping logic:

```python
import requests
from bs4 import BeautifulSoup

def run_scraper(query: str) -> dict:
    # Your actual scraping logic here
    # Example: scrape prices from an e-commerce site
    pass
```

### Adding More Endpoints

Add new endpoints in `server.py`:

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Project Structure

```
fastapi-scraper/
├── server.py          # Main FastAPI application
├── scraper.py         # Scraping logic
├── requirements.txt   # Python dependencies
├── Dockerfile         # Docker configuration
└── README.md         # This file
```

## License

MIT License - feel free to use this project as a starting point for your own applications.
