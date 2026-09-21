# Stock Bersek

**AI research workbench for Bitget Reality tokens (rTokens).** Stock Bersek helps self-directed traders investigate a tokenized U.S. stock market with live Bitget data, transparent market-quality checks, and a continuing Gemini research conversation. The trader always makes the final decision.

**Live demo:** [stock-bersek.vercel.app](https://stock-bersek.vercel.app/)

> Educational market commentary only. Stock Bersek is not investment advice, does not guarantee outcomes, and never places or authorizes trades.

## Why Stock Bersek

rTokens trade around the clock, but last price alone is not enough to make sense of a market. A trader also needs to see quote freshness, order-book depth, spread, turnover, recent trade flow, technical context, and source failures before forming a view.

Stock Bersek turns that scattered context into one explainable workflow: **question -> market evidence -> AI research -> human decision -> review**.

## What is built

- **Natural-language research workflow** - enter a research question such as “Is liquidity supporting this move?” alongside a ticker.
- **Bitget rToken mapping** - converts underlying symbols such as `AAPL` into Bitget Reality-token pairs such as `RAAPLUSDT`.
- **Live market evidence** - retrieves public Bitget ticker data, candles, order-book levels, and recent fills.
- **Bitget AI ecosystem context** - uses the official no-key Bitget Signal / Agent Hub public MCP source for broad crypto market-mood context when available.
- **Explainable research** - computes SMA, RSI, VWAP, support/resistance, order-book imbalance, spread, depth, and buy/sell pressure before requesting an AI briefing.
- **Source and liquidity transparency** - shows source-level availability, quote freshness, best bid/ask, turnover, thin-liquidity warnings, and a data-confidence score.
- **Continuing AI conversation** - Gemini receives the original market context, research question, and earlier messages for every follow-up question.
- **Decision support, not automated trading** - users can log Buy, Hold, or Skip intent with rationale and later outcome; Buy intent opens the matching Bitget market page in a new tab.
- **Light and dark modes** - usable research interface for different environments.

## Complete research task

Example question: **“Is liquidity supporting the current AAPL rToken move?”**

1. Enter `AAPL` and the research question.
2. Stock Bersek maps it to `RAAPLUSDT` and pulls the current Bitget market snapshot.
3. Review the rToken quote, data freshness, order book, recent flow, technical indicators, liquidity warning, and data-confidence panel.
4. Read the Gemini briefing, then continue with questions such as:
   - “What is the biggest risk here?”
   - “Give me a bear case and a bull case.”
   - “What would invalidate this setup?”
5. Record a Buy, Hold, or Skip intent and rationale in the session journal. The user may then choose to open Bitget independently.

## AI role and safeguards

Gemini acts as a research assistant. It translates the live market snapshot and calculated indicators into concise, plain-language commentary and answers follow-up questions using the same context.

It does **not** decide for the user, execute trades, access a Bitget account, or claim that a Buy/Hold/Skip intent is a recommendation.

- `GEMINI_API_KEY` stays server-side; the browser never receives it.
- Bitget market data is public and does not require a Bitget API key.
- rToken quotes are explicitly labeled as Bitget Reality-token market quotes, not the underlying exchange share price.
- Partial data is disclosed through per-source status warnings rather than treated as a complete analysis.

## Architecture

```text
Browser
  -> /api/market -> server-side proxy -> Bitget public market API
  -> /api/signal -> server-side proxy -> Bitget Signal public MCP
  -> /api/ai     -> server-side proxy -> Gemini API
```

## Technology

- React 19, TypeScript, TanStack Start, TanStack Router
- Vite, Tailwind CSS, Framer Motion
- Bitget public market API and Bitget Signal public MCP
- Google Gemini API through a server-side endpoint

## Run locally

### Prerequisites

- Node.js 20+ or Bun
- Gemini API key

### Setup

```bash
npm install
```

Create `.env.local` (it is ignored by Git):

```env
GEMINI_API_KEY=your_key_here
```

Start the development server:

```bash
npm run dev
```

Restart the server after changing environment variables.

## Verification

```bash
bun test
bunx tsc --noEmit
npm run lint
```

The test suite covers technical indicators, rToken pair mapping, quote freshness, liquidity-warning rules, and data-confidence scoring.

## Deploy

Deploy to a host that supports TanStack Start/Nitro server routes. Configure `GEMINI_API_KEY` as a server-side environment variable in the deployment platform.

Never use `VITE_GEMINI_API_KEY`; `VITE_*` variables are exposed to the browser.
