# Vercel Parse Note Function

A minimal Vercel serverless function that transforms brief notes into comprehensive educational permanent notes using OpenAI's API.

## Project Structure

```
.
├── api/
│   └── parse-note.ts    # Edge runtime API endpoint
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── .env.example         # Environment variable template
└── README.md           # This file
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your keys:
   ```
   OPENAI_API_KEY=sk-...
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```
   
   **Get Upstash Redis credentials:**
   - Sign up at [Upstash](https://console.upstash.com/)
   - Create a new Redis database
   - Copy the REST URL and REST TOKEN from the dashboard

3. **Run locally:**
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3000/api/parse-note`

## Deployment

1. **Install Vercel CLI (if not already installed):**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set environment variables on Vercel:**
   ```bash
   vercel env add OPENAI_API_KEY
   vercel env add UPSTASH_REDIS_REST_URL
   vercel env add UPSTASH_REDIS_REST_TOKEN
   ```

## API Usage

**Endpoint:** `POST /api/parse-note`

**Request body:**
```json
{
  "noteContent": "Brief note content here",
  "settings": {
    "template": "Transform the following brief note into a comprehensive educational permanent note:\n\n{noteContent}",
    "includeTermExplanations": true,
    "maxLength": 2000
  }
}
```

**Response:**
```json
{
  "title": "Note title",
  "content": "Comprehensive permanent note content",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}
```

## Features

- ✅ Edge runtime for fast cold starts
- ✅ TypeScript support
- ✅ Rate limiting (10 requests per minute per IP)
- ✅ Input validation (max 10,000 characters)
- ✅ Comprehensive error handling
- ✅ OpenAI GPT-4o-mini integration

## Rate Limiting

The API implements rate limiting of **10 requests per minute per IP address** using Upstash Redis. When rate limited, you'll receive a `429` response with headers indicating:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

