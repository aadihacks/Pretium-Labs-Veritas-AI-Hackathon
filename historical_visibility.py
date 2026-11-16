"""Minimize lookup fingerprints in unanswered historical prediction responses.

This is lookup friction, not secrecy against matching public market history.
Original snapshots remain server-owned for grading and committed reveals.
"""


# Date-preserving prediction responses are limited to published Event Packs.
# These are the existing eventPackWindows in script.js, not arbitrary exports.
EVENT_PACK_WINDOWS = frozenset({
    ("2007-07-01", "2009-06-30"), ("2020-01-01", "2021-03-31"),
    ("2020-12-01", "2021-04-30"), ("1999-01-01", "2002-12-31"),
    ("2021-11-01", "2023-03-31"), ("2020-01-01", "2020-12-31"),
    ("2021-11-01", "2023-01-31"), ("2016-04-01", "2016-12-31"),
    ("2022-10-01", "2024-03-31"), ("2017-10-01", "2018-06-30"),
})


def hidden_history(puzzle, *, hide_instrument=False, keep_dates=False):
    bars = puzzle["candles"]
    observed = puzzle["observedEnd"]
    # An allowlist prevents provider notes, date bounds, hashes or future fields
    # from silently becoming another lookup key. Never return the price factor.
    public = {key: puzzle[key] for key in ("id", "date", "version", "timeframe", "interval", "observedEnd")
              if key in puzzle}
    public.update({key: puzzle.get(key, "") for key in ("ticker", "name", "asset")})
    public.update(currency="", exchange="", source="Verified historical chart",
                  sourceNote="Prices indexed to 100. Original market data returns at reveal.",
                  historyMasked=True)
    if hide_instrument:
        public.update(ticker="HIDDEN", name="Historical market", asset="stocks")
    times = [bar["time"] if keep_dates else 946684800 + index * 86400
             for index, bar in enumerate(bars)]
    reference = bars[0]["open"]
    public["candles"] = []
    for index, bar in enumerate(bars[:observed]):
        item = {key: round(bar[key] / reference * 100, 4) for key in ("open", "high", "low", "close")}
        item.update(time=times[index], volume=0, indexedPrice=True)
        if not keep_dates:
            item["challengeIndex"] = index + 1
        public["candles"].append(item)
    # Slots support the existing covered-future layout without revealing actual
    # timestamps. Event Packs intentionally retain their published event dates.
    public["candleTimes"] = times
    return public
