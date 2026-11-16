# MarketPulse News

This project is a prototype and is not financial advice.

Open **Growth → MarketPulse News** from the existing platform navigation. **Today’s market overview** summarizes headlines published that calendar day in U.S. Eastern time and links to the supporting stories. It checks public feeds from The Guardian, NPR, and the Federal Reserve. On quiet days it shows that coverage is empty. If Gemini is unavailable, the panel still links to any same-day headlines it found.

The curated feed keeps the original source links, discussion prompts, reading list, and linked practice charts. **Latest** is chronological. **Breaking** shows high-importance releases from the curated catalog over the previous seven days.

## Gemini integration

Set `GEMINI_API_KEY` in the Python server environment or in the Git-ignored `pretium-labs-learn/.env.local` file in this checkout. Use the line `GEMINI_API_KEY=` followed by the key. The Python server calls Gemini directly, so MarketPulse works without a running Learn service. The default model is `gemini-3.5-flash-lite`. Use `GEMINI_MODEL` to select another structured-output model available to your key. [Google structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output)

The fixed public endpoints `GET /api/marketpulse/classifications` and `GET /api/marketpulse/overview` accept no query data. Gemini receives public headlines and reference fields only. The server validates the classification batch and caches it for 24 hours. It validates the single overview paragraph and its source IDs, then caches it for ten minutes within the same market day. The overview shows the reason for a missing key, configuration error, quota limit, or temporary service problem. Story cards fall back to editorial context if their AI readings could not load.

## Personalization

For You ranks across freshness, editorial importance, selected categories, followed tickers, article opens, and likes or dislikes. An article contributes at most one open signal and one reaction. Category and ticker weights are bounded. The first slot is reserved for a high-importance release when available, and the first six slots limit category repetition when there are alternatives.

Preferences live in browser memory unless the visitor enables **Save these preferences in this browser across reloads**. Reset clears the local profile and opt-in. The ranking model, including the Watchlist, has no account, analytics, or network integration. Reading list bookmarks stay in page memory in the detached preview and contribute no ranking signal. Visiting an original publisher leaves the app.

## Historical evidence and direction evaluation

The quantitative prototype uses 32 scheduled FOMC rate decisions from 2022 through 2025, with event dates and rate changes from the Federal Reserve. It uses the Fed's daily noon New York EUR/USD quotes as an FX proxy. A policy release normally occurs after that day's noon quote. The measured returns use the event-day quote as the base, then the first and fifth subsequent available observations. Five incremental daily log returns yield annualized sample volatility using the square root of 252. The six chart-pattern names connect to Pretium Labs practice via descriptive daily-quote rules. This data lacks candle highs, lows, and intraday timing, so the historical screen does not apply the game grader. [FOMC calendar and statements](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) · [Rate-action history](https://www.federalreserve.gov/FOMC/fundsrate.htm) · [EUR/USD quotes from the Federal Reserve via FRED](https://fred.stlouisfed.org/series/DEXUSEU)

The direction model learns the most common next-quote direction for each announced action (hike, hold, or cut). It falls back to the training majority for unseen actions. A move within ±0.05% is flat. The chronological split trains on 16 decisions in 2022–2023 and evaluates once on 16 decisions in 2024–2025. The displayed historical model for the October 2026 decision uses all 32 prior events after the holdout evaluation.

| Model | Correct | Accuracy |
| --- | ---: | ---: |
| Rate-action model | 6/16 | 37.5% |
| Training-majority direction | 9/16 | 56.3% |
| Prior-quote momentum | 6/16 | 37.5% |
| Always flat | 3/16 | 18.8% |

The test set had nine down moves, four up moves and three flat moves. The action model underperformed the majority baseline. There were no rate cuts in training, so cuts fall back to the majority. The split spans different policy regimes and the sample is small. Rate expectations, other announcements and price movements before and after the announcement are uncontrolled. The study evaluates a deterministic direction model, with no estimate of Gemini predictive accuracy or causal market impact.

Three comparison releases can appear per dated story, prioritized by category, same ticker or matching policy action, and recency. Quantitative coverage is limited to FOMC comparisons. Other comparisons can link to verified releases without a return, and some categories have no dated analog. The historical simulator uses a known five-observation price change with hypothetical fixed exposure and excludes fees, financing, and slippage. It does not execute Paper Trading orders.

## Personalization evaluation

Four synthetic profiles define selected interests, followed tickers, one seed interaction, and a small set of relevant story IDs. The seed story is excluded from the test feed. The same public candidate pool is ranked by the shipped model and the chronological baseline at a fixed evaluation date of November 15, 2026. Binary nDCG@5 rewards relevant stories appearing earlier in the top five.

| Synthetic profile | Latest hits@5 | For You hits@5 | Latest nDCG@5 | For You nDCG@5 |
| --- | ---: | ---: | ---: | ---: |
| Rates watcher | 1 | 2 | 0.307 | 0.693 |
| Macro learner | 1 | 2 | 0.613 | 1.000 |
| Apple earnings reader | 1 | 1 | 0.631 | 0.631 |
| Energy and positioning reader | 0 | 1 | 0.000 | 0.631 |
| Mean nDCG@5 | | | 0.388 | 0.739 |

Average distinct categories in the top five rose from 4.25 to 4.75. Every personalized top five retained high-importance coverage. The scenarios are small and constructed to test explicit interests, so they do not establish benefit for real users. Apple relevance tied, and the Apple profile's top-five category count fell from five to four.

## Reproduce locally

```powershell
curl.exe -fL 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXUSEU&cosd=2022-01-01&coed=2025-12-31' -o dexuseu.csv
python tools/evaluate_marketpulse.py dexuseu.csv
node tools/evaluate-marketpulse-ranking.cjs
python -m unittest discover -s tests -p test_marketpulse.py
node --test tests/marketpulse.test.cjs
```

The derived JSON records the input hash. Pass `--output marketpulse-history.json` to deliberately rebuild the public artifact. The provider may revise historical data.
