# Pretium Labs

Pretium Labs is an educational market-literacy and simulated trading app with chart-reading practice, paper trading, Quant Lab backtests, lessons, and a news board.

## Hackathon write-up

[Write-up (PDF)](output/pdf/Pretium-Labs-Write-Up.pdf) · [Credits and sources (PDF)](output/pdf/Pretium-Labs-Credits.pdf)

**Track:** AI + Finance\
**Team:** Aaditya Saxena, Edward Lee, Sebastian Maldonado

This project is a prototype and is not financial advice.

### The problem

A teenager with a first paycheck has to decide whether to buy now, carry a balance or save. Pretium Labs lets them compare the trade-offs and practice reading markets with simulated money.

### What we built

Pretium Labs brings together lessons and a Gemini tutor, chart practice, Paper Trading, Quant Lab backtests, and MarketPulse News. Pretium AI answers questions in context and helps draft or explain strategy code. In the credit simulator, a $300 purchase with $100 available shows a $200 shortfall when Gemini reads the plan as pay in full.

### What we added

For the hackathon, we built the Learn payment-plan classifier and its benchmark, added Gemini-powered MarketPulse summaries linked to original stories, and connected Pretium AI to learning and Quant Lab workflows. Learners can move from a plain-language question to a calculation, source or simulation they can inspect. The integrated platform includes an earlier Pretium Labs codebase.

### How it works

Of 16 fictional payment plans, four were used for development checks and excluded from scoring. The keyword rule and pretrained Gemini 3.5 Flash-Lite received the same 12 balanced held-out inputs. The simulator uses fixed formulas to calculate outcomes from Gemini’s validated category. The FOMC test checks whether announced rate actions predict the next EUR/USD quote’s direction from the event-day quote, using 2022–23 to predict 2024–25 decisions. News nDCG@5 rewards relevant stories ranked near the top of the first five.

### Results

| Evaluation | Simple baseline | Tested approach |
| --- | --- | --- |
| Payment plans, 12 held out | Keywords: 3/12 | Gemini: 11/12 |
| Chart patterns, 18 held out | Slope and range: 15/18 | Gemini: 12/18 |
| FOMC direction, 16 later events | Training majority: 9/16 | Rate-action rule: 6/16 |
| News ranking, 4 synthetic profiles | Chronological nDCG@5: 0.388 | Personalized nDCG@5: 0.739 |

Payment accuracy was 91.7% vs. 25.0% (macro F1 91.4% vs. 23.8%). Gemini missed all three chart breakouts, suggesting the slope-and-range rule captured those shapes better on this sample. Rate-action labels alone underperformed the majority guess on the later FOMC events.

**Recorded failure (p08).** “I'll buy it on the card and send $80 a month, which is more than the required minimum.” Expected **Payment plan unclear** (custom payments are unsupported). Gemini and the rule both returned **Carry the balance and pay the minimum**. [Saved prediction](pretium-labs-learn/artifacts/payment-held-out.json#L49-L54)

### What we’d do next

Test breakout rules on fresh charts, add custom-payment and savings scenarios, and refine AI responses to ask for clarification when inputs are ambiguous. Run sessions with students to see whether they can interpret the feedback and compare options.

### Sources

[Website code](./) · [Learn fixtures](pretium-labs-learn/src/features/learn/evaluation/payment-cases.ts) · [Payment results](pretium-labs-learn/artifacts/payment-held-out.json) · [MarketPulse evaluations](MARKETPULSE.md) · [Gemini API](https://ai.google.dev/gemini-api/docs/structured-output) · [OpenAI Codex](https://openai.com/codex/)

## Run locally

Install Python 3 and the dependencies in `requirements.txt`, then run:

```powershell
python -m pip install -r requirements.txt
python -B server.py
```

Open http://127.0.0.1:8766/index.html.

## Gemini chat backend

Stop the existing preview, then run this from the repository directory:

```powershell
python -B start_gemini.py
```

The launcher asks for your Gemini API key with hidden input, keeps it only in the
running process, and starts the app on `127.0.0.1:8766`. It does not save the key
to a file or shell history. Enter it again after stopping that process. An existing
private `GEMINI_API_KEY` process environment variable skips the prompt. Do not put
the key in frontend code, this README, `.env.example`, or `.env.local`: the latter
is already tracked by Git despite the ignore rule. No key-entry HTTP route exists.

`GEMINI_MODEL` optionally selects a model available to your Google project; the
default is `gemini-3.1-flash-lite`. Availability and billing depend on your Google
project. The backend uses Google's [generateContent REST API](https://ai.google.dev/api/generate-content)
with the credential in a private request header. No additional Python package is
required. It does not send account, portfolio, or chart records automatically.

- `GET /api/ai/status`: returns `configured`, `model`, `provider`, `localOnly`, and
  `storesConversations`; never returns the key. Configured means a key is present,
  not that Google has accepted it.
- `POST /api/ai/chat`: accepts only the JSON contract below and returns `reply`,
  `model`, `finishReason`, `truncated`, and available token `usage` counts. Errors
  return `error` and `code`, plus `retryAfter` when relevant.

```json
{"messages":[{"role":"user","content":"Explain compound interest with an example."}]}
```

For follow-ups, send the earlier `user` and `assistant` messages followed by the
next `user` message. Limits: 21 alternating messages, 8,000 characters per message,
16,000 total characters, 32 KiB request bodies, and 2,048 output tokens. The server
keeps no conversation store. Chat text goes to Google; its own retention and data
policies still apply. Frontends must display replies as text or sanitized Markdown.
Model output is untrusted and cannot authorize app actions or modify app data.

To test the endpoint directly, use a second PowerShell terminal:

```powershell
$chatBody = @{ messages = @(@{ role = 'user'; content = 'Explain compound interest.' }) } | ConvertTo-Json -Depth 4
Invoke-RestMethod http://127.0.0.1:8766/api/ai/chat -Method Post -ContentType application/json -Body $chatBody
```

The gateway allows only direct loopback preview access and rejects cross-origin
browser requests. It allows two simultaneous provider calls, 12 attempts per
rolling minute, and 200 attempts per rolling day in one process, including failed
calls. Budgets reset on server restart, are not billing caps, and provider quota
errors trigger a shared cooldown. Requests have a 20-second upstream socket timeout
and bounded response reads, with the platform's existing request admission and
connection deadline retained. There are no automatic paid retries or fallbacks.

## Local preview

This copy runs without database connections, login, or registration. Review history (the latest 120 records, including saved chart previews, favorites and review status), XP, practice coins and reward claims, streaks, Daily attempts, paper/event portfolios, lesson progress and notes, saved news, nickname, preferences, and the chart workspace are saved in this browser's localStorage. Explicitly saved Quant algorithms retain their existing eight-slot library. Saves survive reloads and browser restarts on the same site address and browser profile; they do not sync across devices. Clearing site data, storage eviction, or ending private browsing can remove them. Storage errors are shown instead of promising a successful save; export valuable work in Settings as a backup.

Learn uses separate browser-local progress. Run the integrated app below to open Learn from the sidebar.

Market charts and quotes require the Python server and an internet connection. Quotes use the latest available Yahoo Finance bar rather than a streaming feed. Provider failures remain visible errors.

Pretium Labs is a simulation for education. It is not a broker, investment adviser, bank, exchange, or real-money trading platform.

## Learn and AI features

For the integrated app, use Python 3.12, Node.js 22 or later, and pnpm 11. From `pretium-labs-learn/`:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start:platform
```

Open [Pretium Labs](http://127.0.0.1:8766/index.html) and select **Learn**. The launcher serves the platform on port 8766 and runs Learn's Next.js service on private loopback port 8767. Set `PRETIUM_PYTHON` to a Python executable path if needed. [Learn setup and Gemini configuration](pretium-labs-learn/README.md)

### MarketPulse News

Open **Growth → MarketPulse News** to see the daily market overview and browse the curated feed. Set `GEMINI_API_KEY` in the platform server environment or the Git-ignored `pretium-labs-learn/.env.local` file to enable the Gemini overview and market-impact readings. The curated feed, local personalization, and historical replay are available in editorial mode. [Setup, sources, and measured evaluation](MARKETPULSE.md)

### Quant Lab

Open **Trading Lab → Quant Lab** and scroll to **Learn to build an algorithm**. The two worked examples explain the inputs, entry, exit, and position size, and include a source link and a small experiment. Select **Open as new draft** to edit an example, then **Test** to simulate it on historical candles.

With Pretium AI configured for a private adult preview, open **Build** to chat alongside the editor. Ask for a strategy or start with pseudocode. Replies appear as Gemini writes them. Select **Replace editor with this code** after reviewing a complete draft, then choose **Test**. **Explain editor code** adds your rules to an editable question so you can review what you send. The worked examples are available without Gemini.

### Pretium AI

The gold bull in the lower-right corner opens Pretium AI. For a **private adult demo**, set `GEMINI_API_KEY` privately in the environment of the Python platform server. This checkout tracks the root `.env.local` file, so use the process environment for the key. The default is `gemini-3.5-flash-lite`. Set `GEMINI_MODEL` to use a different supported model available to your key. Restart the integrated platform and open [the local preview](http://127.0.0.1:8766/index.html). Try a question in MarketPulse News or a Learn lesson, then ask a follow-up.

The assistant uses the Gemini Developer API through Python and has no new package dependencies. Chats stay in the current browser tab's session, and New chat clears them. The assistant sends a bounded conversation and, when selected, current page context. It can open an existing simulation from a link. Users enter and confirm orders in Paper Trading themselves.

Pretium AI's chat endpoint is restricted to localhost because the platform admits users under 18. Do not expose this route through a tunnel or deploy Gemini Developer API chat to the current student audience. [Gemini Developer API terms](https://ai.google.dev/gemini-api/terms)

Run `python -m unittest discover -s tests -p test_pretium_ai.py` to check the request boundary and Gemini response handling with a mocked provider.
