# Stock Bersek

Stock Bersek is an AI-assisted research desk for Bitget Reality tokens (rTokens). It turns live Bitget market data into a concise, explainable research workflow so that a trader can investigate a tokenized U.S. stock market before making their own decision.

Built for the Bitget AI Base Camp Hackathon S2, **AI Trading Desk** track.

> Educational market commentary only. Stock Bersek does not provide investment advice, execute trades, or make decisions for the user.

## The problem

Tokenized U.S. stocks can trade around the clock, but a price alone does not explain the market behind it. A trader needs to know whether the quote is fresh, how deep the order book is, whether recent trade flow supports the move, and what data may be missing before acting.

Stock Bersek makes that context visible in one research flow. AI summarizes the available data; the human remains responsible for every trading decision.

## What it does

1. Enter an underlying ticker such as `AAPL`, `TSLA`, or `NVDA`.
2. Convert it to Bitget's Reality-token pair format, for example `RAAPLUSDT`.
3. Retrieve live public Bitget market data:
   - ticker and 24-hour statistics;
   - candle history;
   - order-book depth;
   - recent fills / trade flow.
   - Bitget Signal crypto market-mood context, via its public no-key MCP service.
4. Calculate technical and microstructure context, including SMA, RSI, VWAP, spread, book imbalance, liquidity depth, and buy/sell flow.
5. Send a compact, server-side prompt to Gemini for a plain-language research briefing.
6. Let the trader record a Buy, Hold, or Skip intent, optionally add their rationale, and open the matching Bitget market page.
7. Keep a session journal with the decision snapshot and a later-outcome field for review.

## Research safeguards

- **Human in control:** AI analysis is informational; it does not place or authorize trades.
- **No client-side Gemini key:** `GEMINI_API_KEY` is read only by the server.
- **rToken clarity:** the UI labels the Bitget Reality-token quote separately from the underlying exchange share price.
- **Data transparency:** source-level failures are shown rather than silently presented as complete data.
- **Quote quality:** freshness, best bid/ask, spread, turnover, thin-liquidity warnings, and a data-confidence score help users judge the analysis context.

## Architecture

```text
Browser
  └─ /api/market ──> Server-side proxy ──> Bitget public REST API
  └─ /api/ai     ──> Server-side proxy ──> Gemini API
```

The browser never calls Gemini directly and never receives the Gemini API key. Bitget public market data does not require a Bitget API key.

## Technology

- React 19 + TypeScript
- TanStack Start / TanStack Router
- Vite + Tailwind CSS
- Framer Motion
- Bitget public market API
- Google Gemini API, via a server-side endpoint

## Run locally

### Prerequisites

- Node.js 20+ or Bun
- A Gemini API key

### Setup

```bash
npm install
```

Create a non-committed `.env.local` file:

```env
GEMINI_API_KEY=your_key_here
```

Then start the app:

```bash
npm run dev
```

Open the local URL printed by Vite. Restart the dev server after changing `.env.local`.

## Verification

```bash
bun test
bunx tsc --noEmit
npm run lint
```

## Deployment

Deploy to a host that supports the TanStack Start/Nitro server routes. Configure `GEMINI_API_KEY` as a server-side environment variable on the host.

Never use `VITE_GEMINI_API_KEY`: `VITE_*` environment variables are exposed to the browser.

## Hackathon demonstration flow

For a complete AI Trading Desk research task, demonstrate:

1. Ask Stock Bersek to analyze a ticker.
2. Review the current rToken quote, freshness, liquidity, and source status.
3. Read the AI briefing and ask a follow-up question.
4. Record a decision rationale and inspect the journal snapshot.
5. Use the Bitget link only after the trader has independently chosen to act.

## Project status

Stock Bersek is a research workbench, not an automated trading agent. The strongest hackathon sub-theme fit is **AI Trading Desk → Personalized Research Workbench**.

## License

No license has been selected yet.
