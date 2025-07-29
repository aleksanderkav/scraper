# Card Scraper Frontend

A React application for searching and collecting trading card data using Supabase Edge Functions.

## Features

- **Card Search**: Search for trading cards by name and automatically scrape data
- **Card Library**: View all previously scraped cards in a responsive grid layout
- **Real-time Updates**: Automatically refresh the library after successful searches
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark Mode Support**: Automatic dark/light mode based on system preferences

## Tech Stack

- **React 19** with Vite for fast development
- **TailwindCSS** for styling
- **Supabase** for backend services
- **Environment-based configuration** for easy deployment

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/aleksanderkav/Flipping-frontend.git
   cd card-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://jvkxyjycpomtzfngocge.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## API Endpoints

The application uses the following Supabase endpoints:

- **Card Scraper Function**: `POST /functions/v1/card-scraper`
  - Headers: `Authorization: Bearer <anon-key>`
  - Body: `{ "query": "Card Name" }`

- **Cards Database**: `GET /rest/v1/cards?select=*`
  - Headers: `apikey: <anon-key>`, `Authorization: Bearer <anon-key>`

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
1. Connect your GitHub repository
2. Set environment variables in the deployment platform
3. Deploy automatically on push to main branch

### WordPress Integration
This application is designed to be easily embedded in WordPress via iframe:

```html
<iframe 
  src="https://your-deployed-app.com" 
  width="100%" 
  height="800px" 
  frameborder="0"
  style="border: none;"
></iframe>
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
card-frontend/
├── src/
│   ├── App.jsx          # Main application component
│   ├── index.css        # Global styles with TailwindCSS
│   └── main.jsx         # Application entry point
├── public/              # Static assets
├── .env                 # Environment variables
├── .env.example         # Example environment file
├── tailwind.config.js   # TailwindCSS configuration
├── postcss.config.js    # PostCSS configuration
└── package.json         # Dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Flipping-frontend repository.
# Updated Tue Jul 29 02:19:31 PM UTC 2025
