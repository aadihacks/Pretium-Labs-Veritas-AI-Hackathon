const choices = ["Up", "Down", "Sideways", "Breakout", "Reversal", "Volatility spike"];
const modes = {
  home: "Choose a destination, continue your progress, or discover another part of Pretium Labs.",
  free: "Search stocks, ETFs, crypto, forex, indices, and futures with Yahoo Finance market data.",
  ranked: "Predict a complete 1-minute future candle. Your answer and bet lock five seconds before it starts and settle after verified closing data arrives.",
  paper: "",
  quant: "Use an advanced paper-trading lab for strategy code, backtests, risk controls, and signal review.",
  daily: "One locked puzzle per day. Complete today's puzzle to unlock the archive date picker.",
  review: "Review misses, retry weak setups, and turn mistakes into practical drills.",
  news: "Read verified primary-source market releases, discuss the evidence, and jump into related chart practice.",
  learn: "Practical finance and market skills, one focused lesson at a time.",
  packs: "Curated market events teach crashes, squeezes, panics, and policy shocks.",
  account: "Manage display preferences, saved progress, and practice exports.",
};
const assetDefaults = {
  stocks: "AAPL",
  crypto: "BTC-USD",
  forex: "EURUSD=X",
  indices: "^GSPC",
  etfs: "SPY",
  commodities: "GC=F",
  futures: "ES=F",
  bonds: "TLT",
  macro: "DX-Y.NYB"
};
const eventPacks = {
  "2008": {
    title: "2008 Financial Crisis",
    symbol: "^GSPC",
    tag: "Crash",
    difficulty: "Hard",
    focus: "failed rallies, credit stress, downside continuation",
    brief: "S&P 500 crisis tape with rallies that repeatedly failed before capitulation."
  },
  covid: {
    title: "COVID Liquidity Shock",
    symbol: "SPY",
    tag: "Volatility",
    difficulty: "Hard",
    focus: "volatility expansion, gaps, policy response",
    brief: "Fast index drawdown and rebound conditions around the 2020 shock."
  },
  gme: {
    title: "GME Short Squeeze",
    symbol: "GME",
    tag: "Squeeze",
    difficulty: "Expert",
    focus: "parabolic moves, failed continuation, range explosions",
    brief: "Meme-stock volatility where direction mattered less than risk control."
  },
  dotcom: {
    title: "Dot-Com Bubble",
    symbol: "^IXIC",
    tag: "Bubble",
    difficulty: "Hard",
    focus: "trend exhaustion, long distribution, failed bounces",
    brief: "Nasdaq bubble behavior with repeated growth-stock regime shifts."
  },
  fed2022: {
    title: "2022 Rate Shock",
    symbol: "TLT",
    tag: "Rates",
    difficulty: "Medium",
    focus: "bond selloffs, trend persistence, macro repricing",
    brief: "Treasury ETF pressure as markets repriced inflation and hikes."
  },
  oil2020: {
    title: "Oil Panic",
    symbol: "CL=F",
    tag: "Commodity",
    difficulty: "Expert",
    focus: "futures stress, liquidation candles, reversal risk",
    brief: "Crude oil stress conditions and extreme volatility around 2020."
  },
  crypto2022: {
    title: "Crypto Winter",
    symbol: "BTC-USD",
    tag: "Crypto",
    difficulty: "Hard",
    focus: "breakdowns, failed support, volatility clustering",
    brief: "Bitcoin bear-market setups with sharp rallies inside larger downtrends."
  },
  brexit: {
    title: "Brexit FX Shock",
    symbol: "GBPUSD=X",
    tag: "FX",
    difficulty: "Medium",
    focus: "gap risk, currency breaks, event reaction",
    brief: "Sterling volatility around political shock and repricing."
  },
  tech2023: {
    title: "Mega-Cap Tech Breakout",
    symbol: "NVDA",
    tag: "Momentum",
    difficulty: "Medium",
    focus: "earnings gaps, trend continuation, high-volume breakouts",
    brief: "Semiconductor and mega-cap momentum tape with gap-and-go continuation patterns."
  },
  vol2018: {
    title: "Volmageddon",
    symbol: "^VIX",
    tag: "Volatility",
    difficulty: "Expert",
    focus: "volatility spike, risk-off reversal, compression breaks",
    brief: "VIX stress behavior after a long calm period broke sharply."
  }
};
const eventPackScenarios = {
  "2008": ["^GSPC", "XLF", "C", "BAC", "AIG", "TLT", "GLD", "CL=F", "EURUSD=X"],
  covid: ["SPY", "QQQ", "AAL", "ZM", "MRNA", "TLT", "GLD", "CL=F", "BTC-USD"],
  gme: ["GME", "AMC", "BB", "NOK", "KOSS", "^VIX", "SPY"],
  dotcom: ["^IXIC", "QQQ", "CSCO", "AMZN", "MSFT", "INTC", "SPY"],
  fed2022: ["TLT", "IEF", "QQQ", "SPY", "DX-Y.NYB", "EURUSD=X", "GC=F"],
  oil2020: ["CL=F", "USO", "XOM", "CVX", "SPY", "CAD=X", "GC=F"],
  crypto2022: ["BTC-USD", "ETH-USD", "COIN", "MARA", "RIOT", "QQQ"],
  brexit: ["GBPUSD=X", "EURGBP=X", "EWU", "^FTSE", "FXB", "GC=F"],
  tech2023: ["NVDA", "AMD", "MSFT", "GOOGL", "SMH", "QQQ", "^IXIC"],
  vol2018: ["^VIX", "SVXY", "SPY", "QQQ", "TLT", "GLD"]
};
const eventPackWindows = {
  "2008": { start: "2007-07-01", end: "2009-06-30" },
  covid: { start: "2020-01-01", end: "2021-03-31" },
  gme: { start: "2020-12-01", end: "2021-04-30" },
  dotcom: { start: "1999-01-01", end: "2002-12-31" },
  fed2022: { start: "2021-11-01", end: "2023-03-31" },
  oil2020: { start: "2020-01-01", end: "2020-12-31" },
  crypto2022: { start: "2021-11-01", end: "2023-01-31" },
  brexit: { start: "2016-04-01", end: "2016-12-31" },
  tech2023: { start: "2022-10-01", end: "2024-03-31" },
  vol2018: { start: "2017-10-01", end: "2018-06-30" }
};
// Temporarily hide page tutorials; set to true to restore the existing previews.
const PAGE_TUTORIALS_ENABLED = true;
const modeIntros = {
  ranked: { kicker: "Live Puzzles", title: "Ranked", action: "Open Ranked", bullets: ["Complete 1-minute future candles", "Lock prediction and stake five seconds before the candle starts", "Score after verified market data arrives"] },
  free: { kicker: "Mode Preview", title: "Free Play Setup", action: "Open Free Play", bullets: ["Any real symbol", "No timer", "Draw and test your own thesis"] },
  paper: { kicker: "Paper Account", title: "Paper Trading", action: "Open Paper Trading", bullets: ["Starts with $100 USD", "Trade from current quotes only", "Open charts only when you choose"] },
  quant: { kicker: "Advanced Paper Trading", title: "Quant Lab", action: "Open Quant Lab", bullets: ["Strategy code", "Backtest metrics", "Risk controls"] },
  daily: { kicker: "Mode Preview", title: "Daily", action: "Open Daily", bullets: ["Same chart for everyone", "One attempt for today", "Archive unlocks after completion"] },
  review: { kicker: "Mode Preview", title: "Review", action: "Open Review", bullets: ["Browse All Trade Records", "Open a Trade Record Listing for its Trade Metadata View", "Choose Review to open the Expanded Review Chart"] },
  news: { kicker: "Briefing", title: "MarketPulse News", action: "Open MarketPulse News", bullets: ["Primary-source market briefs", "Compare historical events", "Practice linked tickers"] },
  learn: { kicker: "Learning", title: "Pretium Labs IQ", action: "Open Pretium Labs IQ", bullets: ["12 focused lessons · 3 learning paths", "Original explanations and worked examples", "Knowledge checks with university references"] },
  packs: { kicker: "Mode Preview", title: "Event Packs", action: "Open Event Packs", bullets: ["10 curated packs", "Multi-market scenarios", "Crash, bubble, squeeze, rates, FX, crypto"] },
  account: { kicker: "Preferences", title: "Settings", action: "Open Settings", bullets: ["Display preferences", "Session progress", "Export practice data"] },
};
const rankTiers = [
  { id: "copper", name: "Copper", startsAt: 1, endsAt: 20 },
  { id: "bronze", name: "Bronze", startsAt: 21, endsAt: 40 },
  { id: "silver", name: "Silver", startsAt: 41, endsAt: 60 },
  { id: "diamond", name: "Diamond", startsAt: 61, endsAt: 80 },
  { id: "platinum", name: "Platinum", startsAt: 81, endsAt: 100 },
  { id: "legendary", name: "Legendary", startsAt: 101, endsAt: 120 }
];
const xpRequiredForLevel = level => Math.round(((level - 1) * level / 2) * 500);
const levelLadder = Array.from({ length: rankTiers.at(-1).endsAt }, (_, index) => {
  const level = index + 1;
  const tier = rankTiers.find(item => level >= item.startsAt && level <= item.endsAt);
  const tierIncrement = level - tier.startsAt + 1;
  const tierLevel = Math.ceil(tierIncrement / 4);
  return {
    level,
    tierId: tier.id,
    tierName: tier.name,
    tierLevel,
    tierIncrement,
    title: `${tier.name} ${tierLevel}`,
    xp: xpRequiredForLevel(level)
  };
});

const patternLessons = {
  "Up": {
    title: "Trend Continuation",
    why: "A chart can keep rising when buyers defend pullbacks and each selloff gets absorbed at a higher level.",
    checklist: ["Higher lows", "Close near candle highs", "Volume supports advances"],
    drill: "Find the last pullback before the hidden section and mark the level buyers defended."
  },
  "Down": {
    title: "Failed Rally",
    why: "A weak bounce often rolls over when price cannot reclaim the prior breakdown area.",
    checklist: ["Lower highs", "Rejected resistance", "Large red candles after small green ones"],
    drill: "Draw a horizontal line at the failed bounce high and watch how price reacts there."
  },
  "Sideways": {
    title: "Range Compression",
    why: "When range narrows and neither side wins, the best prediction is often no strong direction.",
    checklist: ["Overlapping candles", "Flat highs and lows", "Low follow-through"],
    drill: "Box the range with a rectangle and note whether price closes outside it."
  },
  "Breakout": {
    title: "Breakout After Compression",
    why: "Tight ranges can store energy. Once price clears a key level, stop orders and momentum can extend the move.",
    checklist: ["Tight base", "Repeated resistance tests", "Expansion candle through level"],
    drill: "Draw the resistance line that price needed to clear."
  },
  "Reversal": {
    title: "Exhaustion Reversal",
    why: "When a move stretches too far and follow-through fades, traders who arrived late can become forced exits.",
    checklist: ["Extended move", "Long wick or failed push", "Break of short-term trendline"],
    drill: "Use the arrow tool to mark the failed final push."
  },
  "Volatility spike": {
    title: "Volatility Expansion",
    why: "Sometimes the right answer is not direction. It is recognizing that candle ranges are about to get much larger.",
    checklist: ["Wide ranges", "Volume jump", "Alternating large red/green candles"],
    drill: "Use Ruler to compare the visible average candle size with the reveal."
  }
};
const predictionTriggers = {
  "Up": "Hidden close is more than 2% above the hidden-window open after volatility checks.",
  "Down": "Hidden close is more than 3.5% below the hidden-window open.",
  "Sideways": "Absolute move is under 1.2%, so price stayed inside a tight range.",
  "Breakout": "Hidden move exceeds 6%, suggesting price escaped the visible range.",
  "Reversal": "Move is neither clean trend nor range; the rulebook treats it as a failed/changed setup.",
  "Volatility spike": "Average hidden high-low range is above 5.5% of starting price."
};
/* Original Pretium Labs IQ lessons and exercises. External courses are further reading,
   not imported courseware. See docs/pretium-iq-sources.md for the reuse review. */
const IQ_SOURCES = {
  harvard: { author: "David Laibson & Jason Furman · HarvardX", title: "Personal Finance: Investing for Beginners", url: "https://pll.harvard.edu/course/personal-finance-investing-beginners", kind: "Course reference" },
  yale: { author: "Robert J. Shiller · Yale University", title: "Financial Markets (2011)", url: "https://oyc.yale.edu/economics/econ-252", kind: "Course reference" },
  diversification: { author: "Robert J. Shiller · Open Yale Courses", title: "Lecture 4: Portfolio Diversification", url: "https://oyc.yale.edu/economics/econ-252-11/lecture-4", kind: "Go deeper" },
  efficiency: { author: "Robert J. Shiller · Open Yale Courses", title: "Lecture 7: Efficient Markets", url: "https://oyc.yale.edu/economics/econ-252-11/lecture-7", kind: "Go deeper" },
  debt: { author: "Robert J. Shiller · Open Yale Courses", title: "Lecture 8: Debt and Leverage Cycles", url: "https://oyc.yale.edu/economics/econ-252-11/lecture-8", kind: "Go deeper" },
  orders: { author: "U.S. SEC · Investor.gov", title: "Types of Orders", url: "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders", kind: "Practical reference" },
  fees: { author: "U.S. SEC · Investor.gov", title: "How Fees and Expenses Affect Your Investment Portfolio", url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated", kind: "Practical reference" },
  daytrading: { author: "U.S. SEC · Investor.gov", title: "Day Trading", url: "https://www.investor.gov/introduction-investing/investing-basics/glossary/day-trading", kind: "Risk reference" },
  performance: { author: "U.S. SEC · Investor.gov", title: "Investor Bulletin: Performance Claims", url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47", kind: "Practical reference" }
};

const IQ_TRACKS = [
  { title: "Financial decisions", description: "Give every dollar a job and compare the tradeoffs." },
  { title: "Investing with perspective", description: "Understand what you own, what you pay, and what can go wrong." },
  { title: "Markets into practice", description: "Read evidence, plan risk, and learn from simulated decisions." }
];

const IQ_LESSONS = [
  {
    id: "money-time", trackIndex: 0, title: "Match money to its time horizon", minutes: 5,
    summary: "Choose between liquidity and growth by starting with when you need the money.",
    details: [
      ["Start with the obligation", "A return is only useful if the money is available when its job comes due. Separate near-term bills, a reserve for surprises, and longer-term goals. For a near-term obligation, access and a stable value can matter more than a higher expected return. An investment that can be sold quickly can still be down when you need to sell it."],
      ["Measure your room to take risk", "Risk tolerance is how much uncertainty you feel comfortable with. Risk capacity is how much loss your finances can actually withstand. An unstable income or an upcoming payment can reduce capacity even when you feel confident. Start with take-home income, necessary spending, debt payments, and irregular expenses; only then consider what is available for long-term investing or a separate practice budget."]
    ],
    example: { title: "The same $2,400, two different jobs", prompt: "You have $2,400 saved, a $1,800 tuition bill in three months, and no other reserve. Is all $2,400 available to invest for growth?", steps: ["Set aside the $1,800 obligation first: $2,400 − $1,800 = $600.", "The remaining $600 is also your only buffer. A market loss could leave you borrowing for a surprise expense.", "Treat the tuition and buffer as near-term money. Build a separate long-term allocation as cash flow allows."], takeaway: "A short deadline can make a volatile investment unsuitable even when its long-term outlook looks attractive." },
    terms: [["Liquidity", "How readily an asset can be converted to spendable money without a large price concession."], ["Time horizon", "The time until money needs to fund its intended goal."]],
    sources: ["harvard", "yale"],
    quiz: [
      { prompt: "You need $900 in two months. What matters most for that money?", options: ["The highest recent return", "Access and a stable value", "The number of shares you can buy"], correctIndex: 1, explanation: "A near-term payment leaves little time to recover from a market decline." },
      { prompt: "Of $2,400 saved, $1,800 is committed to tuition. What remains before setting aside a reserve?", options: ["$600", "$1,800", "$2,400"], correctIndex: 0, explanation: "$2,400 − $1,800 = $600. A reserve may use some or all of that remainder." },
      { prompt: "Income becomes less predictable while your confidence stays high. What changes?", options: ["Your risk capacity rises", "Your time horizon disappears", "Your risk capacity may fall"], correctIndex: 2, explanation: "The ability to absorb losses depends on your obligations and resources, not confidence alone." }
    ]
  },
  {
    id: "real-returns", trackIndex: 0, title: "Compare returns that actually matter", minutes: 6,
    summary: "Account for time, compounding, and inflation before comparing two numbers.",
    details: [
      ["Put returns on the same clock", "A 12% gain over three years is not a 12% annual return. With annual compounding, ending value equals starting value multiplied by (1 + annual return) for each year. Contributions and withdrawals also affect the ending balance, so balance growth alone does not measure investment performance. Always state the period and whether income was reinvested."],
      ["Count purchasing power", "Nominal return measures the change in currency. Real return measures what that currency can buy. The exact one-period real return is (1 + nominal return) divided by (1 + inflation), minus 1. Subtracting inflation is a useful approximation for small rates. Fees and taxes can reduce what you keep further. A constant growth rate is an illustration, not a forecast."]
    ],
    example: { title: "A gain in dollars, a loss in purchasing power", prompt: "Assume $1,000 earns 4% over one year while prices rise 6%. Ignore taxes and fees.", steps: ["The account ends at $1,000 × 1.04 = $1,040.", "The same basket of goods that cost $1,000 now costs $1,060.", "Real return = 1.04 ÷ 1.06 − 1 ≈ −1.89%. The balance rose, but purchasing power fell."], takeaway: "Compare returns over the same period, after considering costs and inflation." },
    terms: [["Compounding", "Earning returns on earlier returns as well as the starting amount."], ["Real return", "Return adjusted for the change in purchasing power."]], sources: ["harvard", "fees"],
    quiz: [
      { prompt: "$1,000 grows by 10% in each of two years, with no deposits or fees. What is the ending value?", options: ["$1,100", "$1,200", "$1,210"], correctIndex: 2, explanation: "$1,000 × 1.10 × 1.10 = $1,210; the second year's return includes growth on the first year's gain." },
      { prompt: "A 4% return with 6% inflation means purchasing power…", options: ["Falls by about 1.89%", "Rises by 4%", "Stays unchanged"], correctIndex: 0, explanation: "1.04 ÷ 1.06 − 1 is about −1.89%, before taxes and fees." },
      { prompt: "One fund reports a three-year gain and another a one-year gain. What should you do first?", options: ["Choose the larger number", "Compare equivalent time periods", "Add the two returns"], correctIndex: 1, explanation: "Different measurement periods do not provide a like-for-like comparison." }
    ]
  },
  {
    id: "debt-decisions", trackIndex: 0, title: "Weigh debt against investing", minutes: 5,
    summary: "Compare an avoided borrowing cost with an uncertain investment return.",
    details: [
      ["Compare certainty as well as size", "Paying down interest-bearing debt can avoid a known borrowing cost. An investment's expected return is uncertain and may be negative. Comparing a loan's annual rate with last year's market gain ignores that difference. Check rate changes, repayment penalties, minimum payments, fees, and tax treatment before comparing alternatives."],
      ["Keep flexibility in the calculation", "Sending every available dollar to a loan can leave you short of cash and force new borrowing. A sound comparison includes a usable reserve, required payments, and the timing of future expenses. With several debts, directing extra payments toward the highest effective rate generally minimizes interest when other terms are comparable; maintaining payments on all debts still matters."]
    ],
    example: { title: "A 20% borrowing cost versus a hopeful 8%", prompt: "Compare using $500 to reduce a balance charging 20% a year with investing it at an uncertain 8%. Assume the debt otherwise stays outstanding for a year; use simple interest for this illustration.", steps: ["Reducing the debt avoids roughly $500 × 20% = $100 in interest.", "An 8% investment gain would be $40 before fees and taxes, and is not assured.", "Check that the payment leaves enough liquidity and that no penalty changes the comparison."], takeaway: "An expected market return is not interchangeable with an avoided interest charge." },
    terms: [["Opportunity cost", "The value of the best alternative you give up."], ["Effective borrowing cost", "The cost of a loan after considering its rate, fees, and relevant terms."]], sources: ["harvard", "debt"],
    quiz: [
      { prompt: "In the simplified example, how much annual interest does a $500 reduction at 20% avoid?", options: ["$40", "$100", "$500"], correctIndex: 1, explanation: "$500 × 0.20 = $100 under the stated simple-interest assumption." },
      { prompt: "Why is an expected 8% investment return different from a fixed borrowing rate?", options: ["The investment return is uncertain", "Borrowing always has no risk", "Both outcomes are guaranteed"], correctIndex: 0, explanation: "The investment can perform better or worse than expected, including losing money." },
      { prompt: "What could make paying every dollar toward debt problematic?", options: ["It always raises the loan rate", "It creates investment income", "It leaves no cash for essential surprises"], correctIndex: 2, explanation: "Without liquidity, an unexpected cost may require taking on new debt." }
    ]
  },
  {
    id: "bias-and-hype", trackIndex: 0, title: "Slow down a persuasive money story", minutes: 5,
    summary: "Separate evidence from urgency, social proof, and your own expectations.",
    details: [
      ["Write the opposing case", "Confirmation bias makes supporting evidence feel more convincing than conflicting evidence. Before a decision, write what would make your view wrong. A rising price or a popular creator does not establish value. Ask who benefits from your participation, how the claim could be checked independently, and what relevant evidence is missing."],
      ["Judge the process before the result", "A lucky outcome can follow a weak decision, and a careful decision can lose money. Use a short decision record: the claim, the evidence, the downside, and the condition for changing your mind. Promised high returns with little risk and pressure to act immediately are reasons to pause and verify. A professional-looking page or famous name is not verification."]
    ],
    example: { title: "The screenshot that leaves out the denominator", prompt: "A creator shows five winning trades and says their method works 90% of the time. No full record or cost assumptions are available.", steps: ["Five selected wins do not reveal how many trades were attempted or how large the losses were.", "Ask for the complete period, all outcomes, costs, and how results were calculated.", "Without that evidence, treat the success rate as unverified rather than filling the gaps with confidence."], takeaway: "A useful claim can survive questions about the missing evidence." },
    terms: [["Confirmation bias", "Giving more weight to evidence that supports an existing belief."], ["Selection bias", "Drawing conclusions from a sample that systematically leaves out relevant cases."]], sources: ["harvard", "performance"],
    quiz: [
      { prompt: "Five winning screenshots establish…", options: ["A 90% long-term success rate", "A profitable strategy after costs", "Only the selected outcomes shown"], correctIndex: 2, explanation: "You need the full sample, losses, and costs to evaluate the claim." },
      { prompt: "Which question best challenges confirmation bias?", options: ["What evidence would change my mind?", "Who already agrees with me?", "How can I ignore a bad result?"], correctIndex: 0, explanation: "Specifying disconfirming evidence makes the decision testable." },
      { prompt: "A weakly researched decision makes money once. What follows?", options: ["Research is unnecessary", "One outcome does not validate the process", "The result will repeat"], correctIndex: 1, explanation: "Randomness can reward poor decisions over short periods." }
    ]
  },
  {
    id: "ownership-and-debt", trackIndex: 1, title: "Know what an investment promises", minutes: 6,
    summary: "Distinguish ownership, lending, and a fund wrapper before looking at returns.",
    details: [
      ["Ownership and lending carry different claims", "A stock represents ownership in a business; dividends and future sale proceeds are uncertain. A bond is a debt claim with specified terms, but payment still depends on the issuer's ability to meet those terms. Bondholders generally rank ahead of shareholders in a liquidation. Neither a familiar company name nor a stated coupon makes an investment risk-free."],
      ["Look inside the wrapper", "A mutual fund or ETF pools holdings. Its risk depends on what it owns and how it is managed. A narrowly focused stock ETF can be concentrated even though it holds many names. For an ordinary fixed-rate bond, higher market yields generally reduce its price because its existing payments become less attractive; longer-duration bonds are typically more sensitive. Holding a bond fund is different from holding one bond to maturity."]
    ],
    example: { title: "Why yesterday's bond price can change", prompt: "A bond pays $40 annually on $1,000 face value. New comparable bonds now offer a higher yield.", steps: ["The old bond's promised $40 payment has not changed.", "Buyers generally require a lower purchase price to accept those less attractive fixed payments.", "The exact price depends on maturity, credit risk, and all remaining payments—not only this year's coupon."], takeaway: "Read the underlying claim and risks; the product label is only the starting point." },
    terms: [["Coupon", "The interest payment specified by a bond's terms."], ["Credit risk", "The risk that a borrower fails to make promised payments."]], sources: ["yale", "harvard"],
    quiz: [
      { prompt: "What does owning a share of stock represent?", options: ["A guaranteed repayment date", "An ownership stake", "An insured deposit"], correctIndex: 1, explanation: "Shareholders own part of a business and bear uncertainty about its future value." },
      { prompt: "Comparable market yields rise. An existing ordinary fixed-rate bond's price generally…", options: ["Falls", "Rises by the coupon rate", "Cannot change"], correctIndex: 0, explanation: "Its fixed payments become less attractive relative to new bonds offering higher yields." },
      { prompt: "Does an ETF label alone establish broad diversification?", options: ["Yes, every ETF holds the whole market", "Yes, if it trades frequently", "No, inspect its holdings and strategy"], correctIndex: 2, explanation: "An ETF can focus on one sector, a narrow theme, or a complex strategy." }
    ]
  },
  {
    id: "diversification", trackIndex: 1, title: "Diversify the risks, not the labels", minutes: 6,
    summary: "Find hidden concentration and distinguish company risk from market risk.",
    details: [
      ["Count exposures", "Owning several investments helps only to the extent that their risks differ. Three funds can all own the same largest companies. Your job, employer stock, home, and investment portfolio can also share exposure to one industry or region. Look through the names to the sources of income and the events that could hurt them together."],
      ["Set a mix you can maintain", "Diversification can reduce the impact of an individual holding, but does not eliminate broad market losses. An asset allocation is the chosen mix of categories such as stocks, bonds, and cash for a goal. Rebalancing brings that mix back toward its target after price changes. Consider transaction costs and taxes; it is a risk-management decision, not a prediction that yesterday's winner will lose tomorrow."]
    ],
    example: { title: "Three funds, one large exposure", prompt: "You put $1,000 into each of three funds. Each fund invests 20% in the same company.", steps: ["Each position contributes $1,000 × 20% = $200 of exposure to that company.", "Combined exposure is $600 out of $3,000, still 20%.", "Three fund names have not diluted that exposure. Check overlap before calling the portfolio diversified."], takeaway: "The number of holdings matters less than how their risks overlap." },
    terms: [["Correlation", "The degree to which two returns tend to move together."], ["Rebalancing", "Adjusting a portfolio back toward a chosen allocation."]], sources: ["diversification", "harvard"],
    quiz: [
      { prompt: "In the example, what percentage remains exposed to the shared company?", options: ["6.67%", "60%", "20%"], correctIndex: 2, explanation: "$600 ÷ $3,000 = 20%. Adding overlapping funds did not reduce that percentage." },
      { prompt: "Diversification can reduce…", options: ["The impact of a single company failing", "Every possible market loss", "The need to inspect holdings"], correctIndex: 0, explanation: "Different exposures can reduce company-specific risk, while broad market risk remains." },
      { prompt: "A portfolio drifts far above its planned stock allocation. Rebalancing primarily…", options: ["Guarantees a better return", "Restores the intended risk mix", "Predicts the next market move"], correctIndex: 1, explanation: "Rebalancing is about the chosen allocation, with costs and taxes considered." }
    ]
  },
  {
    id: "price-value-news", trackIndex: 1, title: "Separate a good business from a good price", minutes: 6,
    summary: "Read valuation and news in terms of expectations, not excitement.",
    details: [
      ["Price includes a story about the future", "An investment's value depends on future cash flows, their timing, and their uncertainty. Paying more requires stronger future outcomes to justify the price. A strong business can still be an expensive investment. Valuation ratios help frame questions, but a low ratio alone does not prove a bargain: weak growth, unusual earnings, or substantial risk may explain it."],
      ["News is compared with expectations", "Markets react to the gap between new information and what participants expected. Higher earnings can coincide with a falling price if expectations were even higher or guidance weakens. Separate the reported fact, the comparison period, expectations, and changes to the outlook. Prices also reflect liquidity and positioning, so a plausible explanation is not proof of a single cause."]
    ],
    example: { title: "Earnings rise, expectations fall short", prompt: "A company earns $2.20 per share, up from $2.00. Analysts expected $2.50. The stock costs $44.", steps: ["Year-over-year earnings growth is ($2.20 − $2.00) ÷ $2.00 = 10%.", "Earnings are also $0.30 below the $2.50 expectation. Both statements can be true.", "Using $2.20 as annual earnings, price/earnings is $44 ÷ $2.20 = 20. That ratio alone does not tell you whether growth will justify the price."], takeaway: "Ask what is already priced in, and label the assumptions behind your valuation." },
    terms: [["Valuation", "An estimate of an asset's worth based on assumptions about future benefits and risks."], ["Expectations", "The outcomes market participants anticipate before new information arrives."]], sources: ["harvard", "efficiency"],
    quiz: [
      { prompt: "Earnings rise from $2.00 to $2.20. What is the growth rate?", options: ["10%", "20%", "2.2%"], correctIndex: 0, explanation: "$0.20 ÷ $2.00 = 10%." },
      { prompt: "Why might a stock fall after earnings increase?", options: ["Increases always lower value", "Earnings can still miss expectations", "Prices never reflect expectations"], correctIndex: 1, explanation: "An improvement can be smaller than what was already anticipated." },
      { prompt: "A low price/earnings ratio proves…", options: ["The stock must rise", "The company has no debt", "Neither cheapness nor quality by itself"], correctIndex: 2, explanation: "The ratio needs context about growth, accounting, and risk." }
    ]
  },
  {
    id: "costs-and-policy", trackIndex: 1, title: "Keep costs from quietly setting the outcome", minutes: 5,
    summary: "Compare the full cost of investing and turn your decisions into a repeatable policy.",
    details: [
      ["Small percentages have a large base", "Fund expenses, account charges, commissions, and trading spreads all reduce what you keep. Some occur even when you make no trades. A percentage fee is charged against a balance, not just its gains. Compare products with similar exposures and services, and read which costs are included. Taxes vary by location, account, and transaction; a headline return is not a take-home return."],
      ["Make the policy before the pressure", "A compact investment policy can state the goal, time horizon, cash reserve, target mix, acceptable costs, and review rule. That is more useful than a list of predictions. Check on a planned schedule or when circumstances change. Frequent trading to respond to noise can increase costs without improving the decision process."]
    ],
    example: { title: "An $80 annual difference", prompt: "Compare annual expense ratios of 0.20% and 1.00% on a constant $10,000 balance. Ignore all other costs and balance changes.", steps: ["At 0.20%, the annual expense is approximately $20.", "At 1.00%, it is approximately $100: an $80 difference for this year.", "Over time, amounts deducted also stop earning returns. Check whether any extra service or different exposure justifies the added cost."], takeaway: "Know the cost in dollars, then decide whether it serves your goal." },
    terms: [["Expense ratio", "A fund's annual operating expenses expressed as a percentage of its assets."], ["Investment policy", "Written rules connecting a goal to allocation, costs, and review decisions."]], sources: ["fees", "harvard"],
    quiz: [
      { prompt: "What is 0.20% of $10,000?", options: ["$200", "$2", "$20"], correctIndex: 2, explanation: "0.20% is 0.002; $10,000 × 0.002 = $20." },
      { prompt: "Which comparison is most useful?", options: ["Similar exposures and services, including all costs", "Only last month's return", "Only the number of trades allowed"], correctIndex: 0, explanation: "A fee comparison needs the services and risks being purchased as well as the price." },
      { prompt: "A useful investment policy specifies…", options: ["Tomorrow's exact market level", "Goals, allocation, and review rules", "A promise never to lose money"], correctIndex: 1, explanation: "A policy makes the process repeatable without pretending the future is known." }
    ]
  },
  {
    id: "execution", trackIndex: 2, title: "Understand the price you can actually trade", minutes: 6,
    summary: "Use bid, ask, and order types to explain the gap between a chart and a fill.",
    details: [
      ["A displayed price is not a promise", "The bid is a quoted buying price; the ask is a quoted selling price. Their difference is the spread. A last-traded price records a completed transaction and may differ from current quotes. Available size and changing prices mean a large or fast-moving order can fill across multiple prices. That difference from an expected execution price is slippage."],
      ["Choose which uncertainty to accept", "A market order prioritizes execution over a specific price. A limit order sets a price boundary but may not fill. A stop order becomes a market order when triggered, so its trigger does not cap the eventual loss. A stop-limit adds a price boundary but can remain unfilled during a gap. Availability and trigger rules vary by broker; simulation does not reproduce every live execution condition."]
    ],
    example: { title: "The cost of crossing the spread", prompt: "A quote is $49.90 bid / $50.10 ask. You buy 10 shares at the ask and immediately sell at the unchanged bid. Assume sufficient quoted size and no other fees.", steps: ["Buy cost: 10 × $50.10 = $501.", "Sale proceeds: 10 × $49.90 = $499.", "The round trip loses $2 to the spread, although the quote did not move."], takeaway: "Evaluate outcomes after execution costs, not just from the chart's last price." },
    terms: [["Spread", "The difference between quoted ask and bid prices."], ["Limit order", "An instruction to trade at a specified price or better, with no assurance of a fill."]], sources: ["orders", "yale"],
    quiz: [
      { prompt: "What is the round-trip loss in the worked example?", options: ["$0", "$2", "$20"], correctIndex: 1, explanation: "10 × ($50.10 − $49.90) = $2, before other costs." },
      { prompt: "A buy limit of $50 means…", options: ["Buy at $50 or lower if an execution is available", "Buy immediately at any price", "Buy only above $50"], correctIndex: 0, explanation: "The limit restricts price; it does not guarantee execution." },
      { prompt: "A sell stop triggers during a downward gap. What can happen?", options: ["It must fill at the stop price", "The gap is reversed", "It can fill below the stop price"], correctIndex: 2, explanation: "Once triggered, a stop becomes a market order and the available execution price can be worse." }
    ]
  },
  {
    id: "chart-evidence", trackIndex: 2, title: "Read a chart without inventing certainty", minutes: 6,
    summary: "Describe trend, range, and volatility before making a testable prediction.",
    details: [
      ["Observation comes before interpretation", "A candle summarizes open, high, low, and close for one interval. A sequence of higher highs and higher lows describes an upward trend over that window; repeated movement between similar boundaries describes a range. Those are observations, not guarantees about the next candle. Check the interval and the scale: the same movement can look dramatic or ordinary depending on the view."],
      ["State what would disprove the idea", "Treat support and resistance as areas to observe, not physical barriers. A move outside a range can continue or fail. Larger candles show increased movement, but do not by themselves establish direction. In Pretium Labs, record the visible evidence before the future is revealed. Evaluate your original read afterward instead of inventing a story using information you did not have."]
    ],
    example: { title: "A breakout is a hypothesis", prompt: "Price repeatedly trades between $98 and $102, then closes one interval at $102.30 with a larger candle.", steps: ["Observation: this close is above the recent range, and the interval's movement is larger.", "Hypothesis: price may continue beyond the range. An alternative is a failed breakout back into it.", "Before the reveal, specify your observation window and what return into the range would invalidate the idea."], takeaway: "A pattern gives you something to test; it does not prove a profitable edge." },
    terms: [["Volatility", "The degree of price variation over a specified period."], ["Invalidation", "An observation that would make the original hypothesis no longer fit."]], sources: ["efficiency", "daytrading"], practice: "free",
    quiz: [
      { prompt: "A close above a recent range establishes…", options: ["A guaranteed profitable trade", "An observed range break, with an uncertain next move", "A permanent support level"], correctIndex: 1, explanation: "A range break is visible evidence; its continuation remains uncertain." },
      { prompt: "Larger candles most directly indicate…", options: ["Greater price movement in those intervals", "Certain upward direction", "Lower risk"], correctIndex: 0, explanation: "Candle size describes movement, not a guaranteed direction or outcome." },
      { prompt: "When should you write the evidence behind a Pretium Labs prediction?", options: ["Only after seeing the future", "Only after winning", "Before the reveal"], correctIndex: 2, explanation: "A record made before the outcome helps separate the original reasoning from hindsight." }
    ]
  },
  {
    id: "size-and-risk", trackIndex: 2, title: "Size a position from the downside", minutes: 7,
    summary: "Translate a simulated loss budget into units, then account for what the plan cannot control.",
    details: [
      ["Start with the loss scenario", "For a simple unleveraged long position, planned price risk per share is entry minus the intended exit if the idea fails. Dividing a hypothetical loss budget by that distance gives a position-size ceiling before costs. Round down to whole shares if fractional shares are unavailable. Then check cash required and total exposure across positions; a risk formula does not create buying power."],
      ["Planned risk is not maximum risk", "A stop may fill worse during a gap, and a stop-limit may not fill at all. Fees, spreads, and slippage increase realized losses. Borrowing magnifies gains and losses relative to your own capital and can expose you to forced liquidation or losses beyond that capital. Use this exercise to understand the arithmetic in simulation, not as a recommended personal risk percentage."]
    ],
    example: { title: "A $20 plan, a $500 position", prompt: "In a simulated cash account, entry is $50, intended loss exit is $48, and the hypothetical loss budget is $20. Ignore costs initially.", steps: ["Planned price risk is $50 − $48 = $2 per share.", "The ceiling is $20 ÷ $2 = 10 shares. Buying them requires $500 in cash.", "If a gap produces a $47 exit, the loss is 10 × $3 = $30 before costs—more than planned."], takeaway: "Position size controls exposure; an exit plan cannot guarantee the final loss." },
    terms: [["Position size", "The quantity held in a particular investment or trade."], ["Leverage", "Exposure larger than your own committed capital, often created with borrowing or derivatives."]], sources: ["debt", "orders", "daytrading"],
    quiz: [
      { prompt: "A $20 hypothetical loss budget and $2 planned risk per share permit how many shares before costs?", options: ["40", "20", "10"], correctIndex: 2, explanation: "$20 ÷ $2 = 10 shares; this still requires $500 at the stated entry." },
      { prompt: "Those 10 shares enter at $50 and exit at $47. What is the loss before costs?", options: ["$20", "$30", "$3"], correctIndex: 1, explanation: "10 × ($50 − $47) = $30. A gap can exceed planned risk." },
      { prompt: "The sizing formula permits 10 shares, but the cash account has only $300. What follows?", options: ["The cash constraint also limits the position", "The formula supplies the missing cash", "The planned loss becomes impossible"], correctIndex: 0, explanation: "At $50 per share, $300 funds at most six whole shares before costs, regardless of the risk ceiling." }
    ]
  },
  {
    id: "evaluate-process", trackIndex: 2, title: "Know whether your process is improving", minutes: 7,
    summary: "Combine win rate, payoff, costs, and honest review into a useful practice loop.",
    details: [
      ["Win rate is only one ingredient", "Average outcome depends on the frequency and size of wins and losses, minus costs. A strategy can win often and still lose money if its losses are large. Review results over a defined period using every attempt, including skipped or failed setups where relevant. Record the worst drawdown and exposure as well as the average; two similar averages can conceal very different risk."],
      ["Test the rule on evidence it has not seen", "A rule tuned repeatedly to the same historical examples can fit noise. Write the rule first, keep a separate evaluation sample, and include realistic costs. Simulation can help test consistency, but fills, pressure, and market conditions differ in live trading. Improve one decision habit at a time: record the setup, plan the downside, make the simulated decision, then compare the outcome with the original reasoning."]
    ],
    example: { title: "Winning 60% of the time can still lose", prompt: "Across ten simulated trades, six gain $10 each and four lose $20 each. Each trade also has $1 of total costs.", steps: ["Gains: 6 × $10 = $60. Losses: 4 × $20 = $80.", "Net result: $60 − $80 − $10 in costs = −$30.", "Average outcome is −$3 per trade despite the 60% win rate. Ten trades are also too few to establish a dependable long-term edge."], takeaway: "Judge the full distribution and the quality of decisions, not a streak or one headline statistic." },
    terms: [["Expectancy", "The average outcome implied by win frequency, payoff sizes, and costs."], ["Drawdown", "The decline from a previous peak in account value to a later low."]], sources: ["performance", "efficiency", "daytrading"], practice: "review",
    quiz: [
      { prompt: "What is the net result of the ten-trade example?", options: ["+$60", "−$20", "−$30"], correctIndex: 2, explanation: "$60 − $80 − $10 = −$30 after the stated costs." },
      { prompt: "Which evidence best tests a rule tuned to historical data?", options: ["A separate sample with costs included", "Only its three best examples", "The same data with more tuning"], correctIndex: 0, explanation: "Unseen evidence reduces the risk of mistaking a fit to past noise for a useful rule." },
      { prompt: "A profitable simulation establishes…", options: ["A guarantee of live profit", "A result under those simulated assumptions", "That execution risk no longer matters"], correctIndex: 1, explanation: "Real fills, costs, behavior, and conditions can differ from a simulation." }
    ]
  }
];

const learnModules = IQ_LESSONS.map((lesson, index) => ({
  ...lesson,
  level: `Lesson ${String(index + 1).padStart(2, "0")}`,
  track: IQ_TRACKS[lesson.trackIndex].title
}));

// New curriculum: old chapter indices must not mark different lessons complete.
// Browser saves are separate from former account-owned database records.
const LEARN_PROGRESS_KEY = "pretiumlabs-learn-progress-iq-v1";
const LEARN_ACTIVITY_KEY = "pretiumlabs-learn-activity-iq-v1";
const PRACTICE_HISTORY_KEY = "pretiumlabs-practice-history-v3";
const FREE_PLAY_DAYS_KEY = "pretiumlabs-free-play-days-v1";
const DAY_STREAK_PUZZLES_REQUIRED = 15;
const LEGACY_STREAK_DAYS_KEY = "pretiumlabs-legacy-streak-days-v1";
// Retain legacy preference keys so account deletion also removes older saved data.
const FORUM_VOTES_KEY = "pretiumlabs-forum-votes-v1";
const FORUM_AUDIENCE_KEY = "pretiumlabs-forum-audience-v1";
const NEWS_SAVED_KEY = "pretiumlabs-news-saved-v3";
const PAPER_ACCOUNT_KEY = "pretiumlabs-paper-account-v2";
const STATS_KEY = "pretiumlabs-stats-v3";
const COINS_KEY = "pretiumlabs-coins-v1";
const HEADER_ACCURACY_KEY = "pretiumlabs-header-accuracy-v1";
const REVIEW_PATTERN_HINT_KEY = "pretiumlabs-review-pattern-hint-v1";
const REVIEW_PATTERN_HINT_LIMIT = 8;
const HEADER_ACCURACY_MODES = ["free", "ranked", "daily"];
const DEFAULT_STATS = { xp: 0, streak: 0, correct: 0, total: 0 };
const PAPER_STARTING_CASH = 100;
const QUANT_LIBRARY_KEY = "pretiumlabs-quant-library-v1";
const QUANT_DRAFT_KEY = "pretiumlabs-quant-draft-v1";
const browserDataCache = new Map();
let browserSaveWarning = false;
let browserPrivacyLeaving = false;
const guestPaperAccounts = new Map();
const DATABASES_DETACHED = true;
let learnProgress = loadLearnProgress();
let learnActivity = loadLearnActivity();
let practiceHistory = loadPracticeHistory();
let headerAccuracyState = loadHeaderAccuracyState();
let freePlayDailyAnswers = loadFreePlayDailyAnswers();
let legacyStreakDays = loadLegacyStreakDays();
let savedNews = loadSavedNews();
let freePlayRedoAvailable = false;
const selectedNewsTopics = new Set();
// Restore portfolios after symbol aliases have initialized during startup.
let paperAccount = emptyPaperAccount();
let activeSettingsSection = "profile";
const cloudWeather = {
  enabled: false, pending: false, coordinates: null, current: null,
  request: 0, timer: 0, controller: null, updated: 0
};
let cloudWeatherStatusMessage = "Match Gamify clouds to your local weather.";
let paperQuote = null;
let paperQuoteError = "";
let paperQuoteLoading = false;
let paperChartSymbol = "";
let paperSellAllPending = false;
const SOUND_KEY = "pretiumlabs-sound-enabled-v1";
const ANIMATION_KEY = "pretiumlabs-animations-v1";
let animationPreferences = loadAnimationPreferences();
const THEME_KEY = "pretiumlabs-theme-v1";
const DRAWING_TOOLS_KEY = "pretiumlabs-drawing-tools-open-v1";
const NAVIGATION_PAGE_KEY = "pretiumlabs-navigation-page-v1";
const RELOAD_SESSION_KEY = "pretiumlabs-reload-session-v1";
let soundEnabled = readBrowserPreference(SOUND_KEY) === "true";
let soundContext = null;
const activeSoundOscillators = new Set();
let quantConfig = {
  strategy: "trend",
  fast: 12,
  slow: 36,
  risk: "balanced",
  costBps: 5,
  stopLossPct: 8,
  takeProfitPct: 18,
  maxHoldBars: 60,
  maxExposurePct: 100,
  customLanguage: "python",
  customEntry: "ma(8) > ma(24) && close > ma(24)",
  customExit: "ma(8) < ma(24) || drawdown > 0.08",
  customSize: "risk(0.01)",
  customCode: `def entry():
    return ma(8) > ma(24) and close > ma(24)

def exit():
    return ma(8) < ma(24) or drawdown < -0.08

def size():
    return risk(0.01)`
};
let quantBacktest = null;
const DEFAULT_QUANT_CONFIG = structuredClone(quantConfig);
let quantFormulaError = "";
let quantView = "landing";
let quantParametersExpanded = false;
let quantDraftId = "";
let quantDraftName = "Untitled algorithm";
let quantDraftSaveTimer = null;
let quantDraftDirty = false;
let quantDraftSaveMessage = "";
quantConfig.algorithms = loadQuantAlgorithms();
let learnQuizFeedback = {};
let learnQuizStarted = new Set();
let learnQuizAnswers = {};
let activeLearnChapter = Math.max(0, learnModules.findIndex((_, index) => !learnProgress.has(index)));
const restoredNavigationPage = loadNavigationPage();
let navigationReady = false;
let appMode = restoredNavigationPage || "home";
let lastProductMode = "free";
let reviewChartActive = false;
let packChartActive = false;
let packDataVerified = false;
let activePackId = "";
let packPracticeMode = "prediction";
let packPaperIndex = 0;
let packPaperTimer = null;
let expandedReviewStatistic = "";
let selectedReviewWeek = 1;
let selectedReviewAccuracyModes = [];
let selectedReviewPattern = "";
let reviewPatternHintVisible = null;
let reviewRecordFilter = "all";
let reviewGameModes = [];
let reviewGameModeDraft = [];
// Empty means All; ["none"] preserves an explicitly cleared selection.
const reviewGameModeOptions = [
  ["free", "Free Play", "↗"],
  ["ranked", "Ranked", "♜"],
  ["daily", "Daily", "▦"],
  ["paper", "Paper Trading", "▤"],
  ["quant", "Quant Lab", "ƒ"],
  ["packs", "Event Packs", "▧"]
];
let activeReviewRecordId = "";
let activeReviewRound = "";
let activeReviewAnswer = "";
let selectedDailyDate = new Date().toISOString().slice(0, 10);
let dailyCalendarMonth = new Date(`${selectedDailyDate}T12:00:00`);
const modeSymbols = {
  ranked: "AAPL",
  free: "AAPL",
  paper: "AAPL",
  quant: "SPY",
  daily: "SPY",
  review: "QQQ",
  news: "TLT",
  learn: "SPY",
  packs: "^GSPC",
  account: "SPY",
};
const aliases = new Map([
  ["BTC", "BTC-USD"],
  ["ETH", "ETH-USD"],
  ["EUR/USD", "EURUSD=X"],
  ["USDJPY", "JPY=X"],
  ["GOLD", "GC=F"],
  ["OIL", "CL=F"],
  ["SPX", "^GSPC"],
  ["NASDAQ", "^IXIC"],
  ["DOW", "^DJI"],
  ["ES", "ES=F"],
  ["NQ", "NQ=F"]
]);

let currentSymbol = { ticker: "AAPL", name: "Apple Inc.", asset: "stocks", exchange: "NasdaqGS", currency: "USD" };
let rawCandles = [];
let latestSeries = [];
let revealed = false;
let liveInterval = "1m";
let liveHistory = "1D";
let liveRound = null;
let liveMarketClosed = false;
let liveMarketTimer = null;
let liveMarketSymbol = "";
let livePollTimer = null;
let liveClockTimer = null;
let stats = loadStats();
let zoom = 1;
let pan = 0;
let priceOffset = 0;
let priceScale = 1;
let hoverIndex = null;
let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartPan = 0;
let dragStartPriceOffset = 0;
let dragStartPriceRange = 1;
let chartDragKind = "pan";
let dragStartZoom = 1;
let dragStartPriceScale = 1;
let timeframe = "3M";
let chartType = "candles";
let showSMA = false;
let showEMA = false;
let showBollinger = false;
let showVolume = true;
let activeTool = null;
let advancedMode = false;
let activeTimeframeGroup = "months";
const timeframeGroupChoices = { minutes: "1m", hours: "1h", days: "1D", weeks: "1W", months: "3M", years: "1Y", all: "All" };
let activePackWindow = null;
let drawings = [];
let drawingHistory = [];
let draftDrawing = null;
let pendingToolStart = null;
let brushPoints = [];
let eraserGesture = null;
let suggestionIndex = -1;
let lastSuggestions = [];
let searchTimer = null;
let searchRequestId = 0;
let providerNoticeShown = false;
let nextChartLoading = false;
let chartRequestId = 0;
let chartWindowStart = null;
let chartWindowScale = 1;
let challengeObservedRatio = .64;

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");
let chartWidth = canvas.width;
let chartHeight = canvas.height;
let chartPixelRatio = 1;
const title = document.getElementById("challengeTitle");
const tickerInput = document.getElementById("tickerInput");
const result = document.getElementById("result");
const revealTag = document.getElementById("revealTag");
const assetSelect = document.getElementById("assetSelect");
const chartTip = document.getElementById("chartTip");
const suggestions = document.getElementById("suggestions");
const symbolStatus = document.getElementById("symbolStatus");
const chartCitation = document.getElementById("chartCitation");
const modeSurface = document.getElementById("modeSurface");
const patternLab = document.getElementById("patternLab");
const patternProgress = document.getElementById("patternProgress");
const settingsShortcut = document.getElementById("settingsShortcut");
const roundModal = document.getElementById("roundModal");
const roundKicker = document.getElementById("roundKicker");
const roundTitle = document.getElementById("roundTitle");
const roundText = document.getElementById("roundText");
const roundBullets = document.getElementById("roundBullets");
const roundStart = document.getElementById("roundStart");
const roundPagesViewport = document.getElementById("roundPagesViewport");
const roundStandardPage = document.querySelector(".round-standard-page");
const chartPanel = document.querySelector(".chart-panel");
const predictionPanel = document.querySelector(".workspace > .panel");
let predictionPanelPageY = window.scrollY;
let predictionPanelMode = "";
let predictionPanelRestoreTop = null;
const chartLoading = document.getElementById("chartLoading");
const toastRegion = document.getElementById("toastRegion");
const scrollProgress = document.getElementById("scrollProgress");
const breadcrumb = document.getElementById("breadcrumb");
const cacheStatus = document.getElementById("cacheStatus");
const advancedToggle = document.getElementById("advancedToggle");
const advancedIntervals = document.getElementById("advancedIntervals");
const symbolResultsPage = document.getElementById("symbolResultsPage");
const symbolResultsTitle = document.getElementById("symbolResultsTitle");
const symbolResultsSummary = document.getElementById("symbolResultsSummary");
const symbolResultsList = document.getElementById("symbolResultsList");
const symbolResultsInput = document.getElementById("symbolResultsInput");
const symbolResultsForm = document.getElementById("symbolResultsForm");
const symbolResultsBack = document.getElementById("symbolResultsBack");
const levelButton = document.getElementById("levelButton");
const levelModal = document.getElementById("levelModal");
const levelClose = document.getElementById("levelClose");
const levelCurrent = document.getElementById("levelCurrent");
const levelList = document.getElementById("levelList");
const streakMenu = document.getElementById("streakMenu");
const streakTrigger = document.getElementById("streakTrigger");
const streakPopover = document.getElementById("streakPopover");
const streakPopoverCount = document.getElementById("streakPopoverCount");
const streakMonthLabel = document.getElementById("streakMonthLabel");
const streakMonthYear = document.getElementById("streakMonthYear");
const streakMonthPicker = document.getElementById("streakMonthPicker");
const streakMonthStrip = document.getElementById("streakMonthStrip");
const streakMonthPrev = document.getElementById("streakMonthPrev");
const streakMonthNext = document.getElementById("streakMonthNext");
const streakLinkedPrev = document.getElementById("streakLinkedPrev");
const streakLinkedNext = document.getElementById("streakLinkedNext");
const streakCalendarPanel = document.getElementById("streakCalendarPanel");
const streakCalendarPrev = document.getElementById("streakCalendarPrev");
const streakCalendarNext = document.getElementById("streakCalendarNext");
const streakCalendar = document.getElementById("streakCalendar");
const accountModal = document.getElementById("accountModal");
const accountPanel = document.getElementById("accountPanel");
const nicknameModal = document.getElementById("nicknameModal");
const dailyCalendarModal = document.getElementById("dailyCalendarModal");
const dailyCalendarClose = document.getElementById("dailyCalendarClose");
const modalReturnFocus = new WeakMap();
const modalIsolation = new Map();

function visibleModal() {
  return [...document.querySelectorAll('[role="dialog"][aria-modal="true"], #roundModal')]
    .filter(dialog => !dialog.hidden && !dialog.classList.contains("hidden") && getComputedStyle(dialog).display !== "none")
    .at(-1) || null;
}

function modalFocusable(dialog) {
  if (dialog.id === "sideMenu" && document.body.classList.contains("rail-auto-hide")
    && !document.body.classList.contains("rail-revealed")) return [];
  const selector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return [...(dialog.matches(selector) ? [dialog] : []), ...dialog.querySelectorAll(selector)]
    .filter(element => !element.disabled && !element.hidden && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
}

function modalRegions(dialog) {
  if (dialog !== roundModal) return [dialog];
  return [dialog, ...document.querySelectorAll("#sideMenu, #railCollapseToggle, #railHoverZone")];
}

function focusInsideModal(dialog) {
  const target = modalFocusable(dialog)[0] || dialog;
  if (target === dialog) dialog.tabIndex = -1;
  target.focus({ preventScroll: true });
}

function syncModalIsolation() {
  for (const [element, previous] of modalIsolation) {
    element.inert = previous.inert;
    if (previous.ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", previous.ariaHidden);
    if (previous.obscured === null) element.removeAttribute("data-modal-obscured");
    else element.setAttribute("data-modal-obscured", previous.obscured);
  }
  modalIsolation.clear();
  const dialog = visibleModal();
  if (!dialog) return;
  const regions = modalRegions(dialog);
  function isolateOutsideRegions(parent) {
    for (const child of parent.children) {
      if (regions.includes(child) || child === toastRegion || child === scrollProgress) continue;
      if (regions.some(region => child.contains(region))) {
        isolateOutsideRegions(child);
        continue;
      }
      modalIsolation.set(child, {
        inert: child.inert,
        ariaHidden: child.getAttribute("aria-hidden"),
        obscured: child.getAttribute("data-modal-obscured")
      });
      child.inert = true;
      child.setAttribute("aria-hidden", "true");
      child.setAttribute("data-modal-obscured", "");
    }
  }
  isolateOutsideRegions(document.body);
}

function openAccessibleModal(dialog) {
  if (!dialog) return;
  if (dialog.classList.contains("hidden")) modalReturnFocus.set(dialog, document.activeElement);
  dialog.classList.remove("hidden");
  syncModalIsolation();
}

function closeAccessibleModal(dialog, fallback = null, { restoreFocus = true } = {}) {
  if (!dialog || dialog.classList.contains("hidden")) return;
  dialog.classList.add("hidden");
  syncModalIsolation();
  if (!restoreFocus) return;
  const previous = modalReturnFocus.get(dialog);
  const canRestore = previous && previous !== document.body && previous !== document.documentElement
    && previous.isConnected && previous.getClientRects().length && !previous.closest("[inert]");
  const target = canRestore ? previous : fallback;
  if (target?.isConnected) {
    if (target.tabIndex < 0 && !target.hasAttribute("tabindex")) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}

// Show focus outlines after keyboard navigation, rather than automatic or pointer focus.
document.body.classList.add("pointer-focus");
document.addEventListener("pointerdown", () => {
  document.body.classList.add("pointer-focus");
}, true);

document.addEventListener("keydown", event => {
  if (event.key === "Tab") document.body.classList.remove("pointer-focus");
  if (event.key !== "Tab") return;
  const dialog = visibleModal();
  if (!dialog) return;
  const regions = modalRegions(dialog);
  const focusable = regions.flatMap(modalFocusable);
  if (!focusable.length) {
    event.preventDefault();
    focusInsideModal(dialog);
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!regions.some(region => region.contains(document.activeElement)) || (event.shiftKey && document.activeElement === first)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}, true);

document.addEventListener("focusin", event => {
  const dialog = visibleModal();
  if (dialog && !modalRegions(dialog).some(region => region.contains(event.target))) focusInsideModal(dialog);
});

syncModalIsolation();
const dailyCalendarPrev = document.getElementById("dailyCalendarPrev");
const dailyCalendarNext = document.getElementById("dailyCalendarNext");
const dailyCalendarMonthLabel = document.getElementById("dailyCalendarMonth");
const dailyCalendarGrid = document.getElementById("dailyCalendarGrid");
const sideMenu = document.getElementById("sideMenu");
const railHoverZone = document.getElementById("railHoverZone");
const railCollapseToggle = document.getElementById("railCollapseToggle");
const desktopRailQuery = window.matchMedia("(min-width: 981px)");

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function updateThemeToggleLabel() {
  const activeTheme = document.body.dataset.theme || "light";
  document.querySelectorAll("[data-theme-choice]").forEach(button => {
    const active = button.dataset.themeChoice === activeTheme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function resizeChartCanvas() {
  const rect = canvas.getBoundingClientRect();
  // Hidden modes have no layout box; retain the bitmap until the chart is visible.
  if (!rect.width || !rect.height) return false;
  // The bitmap fills the content box, not the border/padding measured by rect.
  // Including borders in an intrinsically sized canvas creates growth on redraw.
  const style = getComputedStyle(canvas);
  const insetX = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0)
    + (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const insetY = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0)
    + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const nextWidth = Math.max(1, Math.round(rect.width - insetX));
  const nextHeight = Math.max(1, Math.round(rect.height - insetY));
  const nextRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const changed = nextWidth !== chartWidth || nextHeight !== chartHeight || nextRatio !== chartPixelRatio;
  chartWidth = nextWidth;
  chartHeight = nextHeight;
  chartPixelRatio = nextRatio;
  if (changed || canvas.width !== Math.round(chartWidth * chartPixelRatio) || canvas.height !== Math.round(chartHeight * chartPixelRatio)) {
    canvas.width = Math.round(chartWidth * chartPixelRatio);
    canvas.height = Math.round(chartHeight * chartPixelRatio);
  }
  ctx.setTransform(chartPixelRatio, 0, 0, chartPixelRatio, 0, 0);
  return changed;
}

function chartMetadataUnavailable() {
  return !rawCandles.length
    || symbolStatus.classList.contains("loading");
}

function loadingTextHtml(text) {
  const label = /\bloading\b/i.test(text) && !/(…|\.{3})$/.test(text) ? text.replace(/\.$/, "") + "…" : text;
  return escapeHtml(label).replace(/(\S+?)(…|\.{3})$/, '<i class="loading-word">$1<i class="loading-dots"><i>$2</i></i></i>');
}

function animateLoadingDots(element) {
  if (!element?.ownerDocument || element.querySelector(".loading-dots")) return;
  if (/(…|\.{3})$/.test(element.textContent)) element.innerHTML = loadingTextHtml(element.textContent);
}

function setLoadingText(element, text) {
  if (element.textContent !== text) element.textContent = text;
  animateLoadingDots(element);
}

function syncChartMetadata() {
  if (chartMetadataUnavailable()) {
    const marketClosed = appMode === "ranked" && liveMarketClosed;
    const rankedError = appMode === "ranked" && symbolStatus.classList.contains("error")
      && !symbolStatus.classList.contains("loading");
    const packError = appMode === "packs" && symbolStatus.classList.contains("error")
      && !symbolStatus.classList.contains("loading");
    const label = packError ? "Event pack unavailable" : marketClosed ? "Market Closed" : rankedError ? "Chart unavailable" : "Loading…";
    if (title.textContent?.trim() !== label) title.innerHTML = `<span class="chart-ticker"><span class="chart-loading-label">${loadingTextHtml(label)}</span></span><span class="chart-company-name">&nbsp;</span>`;
    setLoadingText(symbolStatus, packError || marketClosed ? label : symbolStatus.classList.contains("error") ? "Chart unavailable" : label);
    assetSelect.value = "";
    assetSelect.classList?.add("loading-placeholder");
    const assetPlaceholder = assetSelect.querySelector?.('option[value=""]');
    if (assetPlaceholder) assetPlaceholder.textContent = label;
    if (assetSelect.nextElementSibling?.classList.contains("asset-loading-label")) {
      setLoadingText(assetSelect.nextElementSibling, label);
    }
    setLoadingText(chartCitation, label);
    revealTag.textContent = "";
    chartTip.hidden = true;
    return;
  }
  title.innerHTML = `<span class="chart-ticker">${escapeHtml(currentSymbol.ticker)}</span><span class="chart-company-name">${escapeHtml(currentSymbol.name)}</span>`;
  assetSelect.value = currentSymbol.asset in assetDefaults ? currentSymbol.asset : "stocks";
  assetSelect.classList?.remove("loading-placeholder");
  if (!symbolStatus.classList.contains("error")) {
    symbolStatus.textContent = `${currentSymbol.ticker} - ${currentSymbol.name}${currentSymbol.exchange ? ` - ${currentSymbol.exchange}` : ""}`;
  }
  updateChartCitation(chartSeriesForMode());
}

function setLoading(active, message = "Fetching market data...") {
  document.body.classList.toggle("is-loading", active);
  chartPanel?.classList.toggle("is-loading", active);
  symbolStatus.classList.toggle("loading", active);
  if (chartLoading) {
    chartLoading.classList.toggle("hidden", !active);
    const label = chartLoading.querySelector("strong");
    if (label) {
      setLoadingText(label, "Fetching market data...");
    }
  }
  syncChartMetadata();
  if (!active) updateScrollProgress();
  syncNextChartButton();
}

function showToast(message, options = {}) {
  if (!toastRegion) return;
  const toastMessage = String(message);
  for (const existing of Array.from(toastRegion.children)) {
    if (existing.dataset.toastMessage !== toastMessage
      && !(options.key && existing.dataset.toastKey === options.key)) continue;
    window.clearTimeout(existing.leaveTimer);
    window.clearTimeout(existing.removeTimer);
    existing.remove();
  }
  const toast = document.createElement("div");
  toast.dataset.toastMessage = toastMessage;
  toast.className = options.tone === "feedback-warning" ? "toast toast-feedback-warning" : "toast";
  if (options.key) toast.dataset.toastKey = options.key;
  if (options.tone === "feedback-warning") {
    toast.innerHTML = `<span class="feedback-warning-icon" aria-hidden="true">!</span><span class="feedback-warning-message"></span><span class="feedback-warning-icon" aria-hidden="true">!</span>`;
    toast.querySelector(".feedback-warning-message").textContent = message;
  } else {
    toast.textContent = message;
  }
  if (!toast.isConnected) toastRegion.appendChild(toast);
  const duration = options.duration ?? (options.tone === "feedback-warning" ? 6500 : 2600);
  toast.leaveTimer = window.setTimeout(() => toast.classList.add("leaving"), duration);
  toast.removeTimer = window.setTimeout(() => toast.remove(), duration + 250);
}

function updateBreadcrumb() {
  if (!breadcrumb) return;
  const label = document.querySelector(`.nav[data-mode="${appMode}"]`)?.textContent || "Free Play";
  breadcrumb.textContent = `Pretium Labs / ${label}`;
}

function updatePredictionPanelScroll() {
  const pageY = window.scrollY;
  const active = document.body.matches(".prediction-mode, .paper-mode");
  const mode = active ? appMode : "";
  if (predictionPanel) {
    if (mode !== predictionPanelMode || !active) {
      predictionPanelRestoreTop = null;
      predictionPanel.scrollTo({ top: 0, behavior: "instant" });
    } else if (pageY < predictionPanelPageY) {
      // Bring the controls back with the page instead of retaining a hidden top.
      const top = pageY === 0 ? 0 : Math.max(0, predictionPanel.scrollTop - (predictionPanelPageY - pageY));
      predictionPanelRestoreTop = top;
      predictionPanel.scrollTo({ top, behavior: "instant" });
    } else if (pageY > predictionPanelPageY) {
      predictionPanelRestoreTop = null;
    }
    if (active) {
      const headerHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
      predictionPanel.style.setProperty("--prediction-header-height", `${headerHeight}px`);
      predictionPanel.tabIndex = 0;
      predictionPanel.setAttribute("aria-label", "Prediction and chart controls");
    } else {
      predictionPanel.style.removeProperty("--prediction-header-height");
      predictionPanel.removeAttribute("tabindex");
      predictionPanel.removeAttribute("aria-label");
    }
  }
  predictionPanelPageY = pageY;
  predictionPanelMode = mode;
}

function updateScrollProgress() {
  updatePredictionPanelScroll();
  const statusBar = document.querySelector(".topbar");
  statusBar?.classList.toggle("is-stuck", window.scrollY > 0 && statusBar.getBoundingClientRect().top <= 0);
  if (!scrollProgress || document.body.classList.contains("is-loading")) return;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  scrollProgress.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
}

function loadAnimationPreferences() {
  const preferences = { xp: true, correct: true, trail: true, graph: true };
  try {
    const saved = JSON.parse(localStorage.getItem(ANIMATION_KEY));
    for (const key of Object.keys(preferences)) {
      if (typeof saved?.[key] === "boolean") preferences[key] = saved[key];
    }
  } catch {}
  return preferences;
}

function syncAnimationPreferences() {
  const gamify = document.body.dataset.theme === "gamify";
  for (const [key, enabled] of Object.entries(animationPreferences)) {
    document.body.dataset[`animation${key[0].toUpperCase()}${key.slice(1)}`] = enabled ? "on" : "off";
    document.querySelectorAll(`[data-animation-option="${key}"]`).forEach(control => { control.checked = enabled; });
  }
  if (!gamify || !animationPreferences.graph) document.body.classList.remove("market-pointer-active");
  if (!gamify || !animationPreferences.xp) {
    window.cancelXpOrbCollection?.();
    document.querySelectorAll(".xp-orb-status").forEach(node => node.remove());
    document.querySelector(".xp-metric")?.classList.remove("xp-orb-complete");
  }
  if (!gamify || !animationPreferences.xp) window.CoinRewards?.cancelCollections();
  if (!gamify || !animationPreferences.correct) {
    window.cancelCorrectMarketCelebration?.();
    if (window.__pretiumDownAnimationFrame) {
      window.cancelAnimationFrame(window.__pretiumDownAnimationFrame);
      window.__pretiumDownAnimationFrame = null;
    }
    window.__pretiumDownAnimationRun = (window.__pretiumDownAnimationRun || 0) + 1;
    document.querySelectorAll(".correct-down-celebration, .correct-down-flash").forEach(node => node.remove());
  }
  if (!gamify) document.querySelectorAll(".achievement-burst").forEach(node => node.remove());
}

function updateSoundToggle() {
  const button = document.getElementById("soundToggle");
  if (button) {
    button.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
    button.setAttribute("aria-pressed", String(soundEnabled));
    button.classList.toggle("active", soundEnabled);
  }
  const headerButton = document.getElementById("headerSoundToggle");
  if (headerButton) {
    headerButton.setAttribute("aria-pressed", String(soundEnabled));
    headerButton.classList.toggle("is-muted", !soundEnabled);
    headerButton.title = soundEnabled ? "Mute interface sounds" : "Unmute interface sounds";
  }
  if (!soundEnabled) {
    // Disconnect immediately, including tones scheduled for later in a sequence.
    activeSoundOscillators.forEach(oscillator => {
      oscillator.stop();
      oscillator.disconnect();
    });
    activeSoundOscillators.clear();
  }
}

function syncSoundPreference() {

  const saved = readBrowserPreference(SOUND_KEY);
  soundEnabled = saved === null ? document.body.dataset.theme === "gamify" : saved === "true";
  updateSoundToggle();
}

function playUiSound(kind = "tap") {
  if (!soundEnabled) return;
  try {
    soundContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (soundContext.state === "suspended") soundContext.resume().catch(() => {});
    const notes = kind === "success" ? [523.25, 659.25, 783.99] : kind === "error" ? [220, 174.61] : kind === "power" ? [392, 523.25, 659.25, 783.99] : [440];
    notes.forEach((frequency, index) => {
      const oscillator = soundContext.createOscillator();
      const gain = soundContext.createGain();
      const start = soundContext.currentTime + index * 0.055;
      oscillator.type = kind === "error" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === "tap" ? 0.025 : 0.045, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.connect(gain).connect(soundContext.destination);
      oscillator.onended = () => {
        activeSoundOscillators.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      activeSoundOscillators.add(oscillator);
      oscillator.stop(start + 0.18);
    });
  } catch {
    soundEnabled = false;
    writeBrowserPreference(SOUND_KEY, "false");
    updateSoundToggle();
  }
}

function celebrateAction() {
  if (document.body.dataset.theme !== "gamify" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const burst = document.createElement("div");
  burst.className = "achievement-burst";
  burst.setAttribute("aria-hidden", "true");
  burst.innerHTML = Array.from({ length: 12 }, (_, index) => `<i style="--i:${index}"></i>`).join("");
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1000);
}

function updateConnectivity() {
  if (!cacheStatus) return;
  const offline = !navigator.onLine;
  cacheStatus.classList.toggle("offline", offline);
  cacheStatus.textContent = offline ? "Offline — reconnect to load market data." : "";
  cacheStatus.title = offline
    ? "Yahoo Finance market data needs an internet connection. Reconnect and retry loading the chart."
    : "";
  cacheStatus.hidden = !offline;
  if (offline) showToast("Reconnect to load market data.");
}

function showProviderNotice() {
  if (providerNoticeShown) return;
  providerNoticeShown = true;
  showToast("Market practice is ready.");
}

function accountScopedKey(baseKey) { return `${baseKey}:browser-v1`; }

function readBrowserPreference(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function browserStorageWarning() {
  if (browserSaveWarning) return;
  browserSaveWarning = true;
  setTimeout(() => showToast("Browser storage is full or unavailable. New changes may be lost when this tab closes. Export your data in Settings."), 0);
}

function writeBrowserPreference(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch { browserStorageWarning(); return false; }
}

function readBrowserData(key, fallback) {
  try {
    const raw = localStorage.getItem(accountScopedKey(key));
    return raw === null ? fallback : JSON.parse(raw) ?? fallback;
  } catch { return browserDataCache.has(key) ? browserDataCache.get(key) : fallback; }
}

function writeBrowserData(key, value, strict = false) {
  try {
    localStorage.setItem(accountScopedKey(key), JSON.stringify(value));
    browserDataCache.set(key, value);
    browserSaveWarning = false;
    return true;
  } catch (error) {
    if (!strict) browserDataCache.set(key, value);
    browserStorageWarning();
    if (strict) throw error;
    return false;
  }
}

function loadBrowserQuantConfig() {
  const saved = readBrowserData("pretiumlabs-quant-config-v1", {});
  return { ...Object.fromEntries(Object.entries(DEFAULT_QUANT_CONFIG).map(([key, fallback]) => [key,
    typeof saved?.[key] === typeof fallback && (typeof fallback !== "number" || Number.isFinite(saved[key]))
      ? (typeof fallback === "string" ? saved[key].slice(0, 5000) : saved[key]) : fallback
  ])), algorithms: loadQuantAlgorithms() };
}

// Local replacements for the document saves still used by shared controls.
function saveAccountDocument(kind) {
  if (kind === "workspace") return saveReloadSession();
  if (kind === "quant") return writeBrowserData("pretiumlabs-quant-config-v1",
    Object.fromEntries(Object.keys(DEFAULT_QUANT_CONFIG).map(key => [key, quantConfig[key]])));
  // Settings controls already commit their existing individual browser keys.
  return kind === "settings";
}

function cleanStats(value = {}) {
  return {
    xp: Math.max(0, Number(value.xp) || 0),
    streak: Math.max(0, Number(value.streak) || 0),
    correct: Math.max(0, Number(value.correct) || 0),
    total: Math.max(0, Number(value.total) || 0)
  };
}

function loadStats() {
  return cleanStats(readBrowserData(STATS_KEY, null) || DEFAULT_STATS);
}

function saveStats() {
  return writeBrowserData(STATS_KEY, cleanStats(stats));
}

function emptyPaperAccount() {
  return {
    cash: PAPER_STARTING_CASH,
    positions: {},
    orders: [],
    realized: 0,
    createdAt: new Date().toISOString()
  };
}

function cleanPaperAccount(value) {
  const source = value && typeof value === "object" ? value : {};
  const positions = {};
  Object.entries(source.positions || {}).forEach(([key, raw]) => {
    const ticker = normalizeSymbol(raw?.ticker || key);
    const quantity = Math.max(0, Number(raw?.quantity || 0));
    if (!ticker || quantity <= 0) return;
    positions[ticker] = {
      ticker,
      name: String(raw?.name || ticker),
      asset: String(raw?.asset || "stocks"),
      quantity,
      avgCost: Math.max(0, Number(raw?.avgCost || 0)),
      lastPrice: Math.max(0, Number(raw?.lastPrice || raw?.avgCost || 0)),
      lastUpdated: raw?.lastUpdated || "",
      source: raw?.source || ""
    };
  });
  const orders = Array.isArray(source.orders) ? source.orders.slice(0, 80).map(order => ({
    id: String(order?.id || `paper-order-${Date.now()}`),
    side: order?.side === "sell" ? "sell" : "buy",
    ticker: normalizeSymbol(order?.ticker || ""),
    name: String(order?.name || order?.ticker || ""),
    quantity: Math.max(0, Number(order?.quantity || 0)),
    price: Math.max(0, Number(order?.price || 0)),
    notional: Math.max(0, Number(order?.notional || 0)),
    at: order?.at || new Date().toISOString(),
    source: order?.source || "Market data",
    note: order?.note || ""
  })).filter(order => order.ticker && order.quantity > 0 && order.price > 0) : [];
  return {
    cash: Math.max(0, Number.isFinite(Number(source.cash)) ? Number(source.cash) : PAPER_STARTING_CASH),
    positions,
    orders,
    realized: Number.isFinite(Number(source.realized)) ? Number(source.realized) : 0,
    replayTime: Number.isFinite(Number(source.replayTime)) ? Math.max(0, Number(source.replayTime)) : 0,
    createdAt: source.createdAt || new Date().toISOString()
  };
}

function loadPaperAccount() {
  const portfolios = readBrowserData(`${PAPER_ACCOUNT_KEY}-events`, {});
  if (portfolios && typeof portfolios === "object" && !Array.isArray(portfolios)) {
    Object.entries(portfolios).forEach(([id, account]) => guestPaperAccounts.set(id, cleanPaperAccount(account)));
  }
  return cleanPaperAccount(readBrowserData(PAPER_ACCOUNT_KEY, null) || emptyPaperAccount());
}

function isEventPackPaper() {
  return appMode === "packs" && packChartActive && packPracticeMode === "paper";
}

function paperTradingAccount() {

  if (!isEventPackPaper()) return paperAccount;
  if (!guestPaperAccounts.has(activePackId)) guestPaperAccounts.set(activePackId, emptyPaperAccount());
  return guestPaperAccounts.get(activePackId);
}

function eventPackPaperQuote() {
  if (!isEventPackPaper() || !packDataVerified || !activePackWindow || symbolStatus.classList.contains("loading")
    || symbolStatus.classList.contains("error")) return null;
  const bar = rawCandles[packPaperIndex];
  if (!bar || !(bar.close > 0) || bar.time < (paperTradingAccount().replayTime || 0)) return null;
  const previous = rawCandles[Math.max(0, packPaperIndex - 1)].close;
  return { ...currentSymbol, price: bar.close, change: bar.close - previous,
    changePercent: previous ? (bar.close / previous - 1) * 100 : 0,
    quoteTime: bar.time, source: `${eventPacks[activePackId].title} historical candle`, marketState: "Historical replay" };
}

function eventPackPaperDate(time) {
  return new Date(time * 1000).toISOString().slice(0, 10);
}

function saveEventPackPaperTime() {

  const account = paperTradingAccount();
  account.replayTime = Math.max(account.replayTime || 0, rawCandles[packPaperIndex]?.time || 0);
  savePaperAccount(account);
}

function restoreEventPackPaperTime(minimumIndex = 0) {
  const account = paperTradingAccount();
  // Older accounts already have dated orders even if they predate the clock.
  const orderTimes = account.orders.map(order => Date.parse(order.at) / 1000)
    .filter(time => time >= rawCandles[0]?.time && time <= rawCandles.at(-1)?.time);
  const savedTime = Math.max(account.replayTime || 0, ...orderTimes);
  const savedIndex = rawCandles.findIndex(bar => bar.time >= savedTime);
  packPaperIndex = Math.max(Math.min(minimumIndex, rawCandles.length - 1), Math.min(24, Math.max(0, rawCandles.length - 2)), savedIndex < 0 ? rawCandles.length - 1 : savedIndex);
  saveEventPackPaperTime();
}

function stopEventPackPlayback() {
  clearInterval(packPaperTimer);
  packPaperTimer = null;
  const button = modeSurface.querySelector('[data-action="pack-paper-play"]');
  if (button) {
    button.textContent = "Play";
    button.setAttribute("aria-pressed", "false");
  }
}

function eventPackPaperClockHtml() {
  const ready = eventPackChartReady();
  const bar = ready ? rawCandles[packPaperIndex] : null;
  const time = bar ? Math.max(bar.time, paperTradingAccount().replayTime || 0) : 0;
  const date = time ? eventPackPaperDate(time) : "";
  const lastDate = ready ? eventPackPaperDate(rawCandles.at(-1).time) : "";
  const nextDay = ready ? rawCandles.findIndex((item, index) => index > packPaperIndex && eventPackPaperDate(item.time) > date) : -1;
  const complete = ready && packPaperIndex >= rawCandles.length - 1;
  return `<section class="event-paper-clock" aria-label="Historical replay controls">
    <div class="event-paper-date" role="status" aria-live="polite" aria-atomic="true"><small>Simulation date (UTC)</small><strong>${bar ? `<time datetime="${date}">${new Date(time * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</time>` : "Loading event…"}</strong><small>${ready ? `${complete ? "Event complete · " : ""}Candle ${packPaperIndex + 1} of ${rawCandles.length}` : "Waiting for historical data"}</small></div>
    <div class="mode-actions event-paper-steps">
      <button type="button" data-action="pack-paper-next" ${!ready || complete ? "disabled" : ""}>Next candle</button>
      <button type="button" data-action="pack-paper-day" ${nextDay < 0 ? "disabled" : ""}>Next trading day</button>
      <button type="button" data-action="pack-paper-play" aria-pressed="${Boolean(packPaperTimer)}" ${!ready || complete ? "disabled" : ""}>${packPaperTimer ? "Pause" : "Play"}</button>
    </div>
    <form class="event-paper-jump" data-event-paper-jump>
      <label for="eventPaperDate">Advance to date</label>
      <input id="eventPaperDate" type="date" required min="${nextDay < 0 ? lastDate : eventPackPaperDate(rawCandles[nextDay].time)}" max="${lastDate}" value="${nextDay < 0 ? lastDate : eventPackPaperDate(rawCandles[nextDay].time)}" aria-describedby="eventPaperDateHelp" ${nextDay < 0 ? "disabled" : ""} />
      <div class="mode-actions"><button id="eventPaperAdvance" type="submit" ${nextDay < 0 ? "disabled" : ""}>Go to date</button></div>
      <small class="event-pack-copy" id="eventPaperDateHelp">Forward only. Dates without trading use the next available candle. Play advances one candle per second.</small>
    </form>
  </section>`;
}

function advanceEventPackPaper(index, focusAction = "") {

  if (!isEventPackPaper() || !eventPackChartReady() || !Number.isInteger(index) || index <= packPaperIndex || index >= rawCandles.length) return false;
  const active = modeSurface.contains(document.activeElement) ? document.activeElement : null;
  const focusId = active?.id;
  const action = focusAction || active?.dataset.action;
  const inputs = ["paperBuyAmount", "paperSellQty"].map(id => [id, document.getElementById(id)?.value]);
  const details = [...modeSurface.querySelectorAll(".paper-account-details")].map(item => item.open);
  packPaperIndex = index;
  if (index === rawCandles.length - 1) stopEventPackPlayback();
  // Keep the current candle visible without changing the user's zoom.
  const count = Math.min(packPaperIndex + 1, rawCandles.length, timeframeSize());
  pan = Math.max(0, count - Math.max(24, Math.round(count / zoom)));
  saveEventPackPaperTime();
  const quote = eventPackPaperQuote();
  if (quote) updatePaperPositionQuote(quote);
  renderPaperTrading();
  inputs.forEach(([id, value]) => { if (value !== undefined) document.getElementById(id).value = value; });
  modeSurface.querySelectorAll(".paper-account-details").forEach((item, i) => { item.open = details[i]; });
  drawChart();
  const focus = focusId ? document.getElementById(focusId) : action ? modeSurface.querySelector(`[data-action="${action}"]`) : null;
  if (focus?.disabled) modeSurface.querySelector('[data-action="pack-browse"]')?.focus({ preventScroll: true });
  else focus?.focus({ preventScroll: true });
  return true;
}

function playEventPackPaper() {
  if (packPaperTimer) { stopEventPackPlayback(); return; }
  if (!isEventPackPaper() || !eventPackChartReady() || packPaperIndex >= rawCandles.length - 1 || document.hidden) return;
  const requestId = chartRequestId;
  const owner = accountScopedKey(PAPER_ACCOUNT_KEY);
  packPaperTimer = setInterval(() => {
    if (document.hidden || requestId !== chartRequestId || owner !== accountScopedKey(PAPER_ACCOUNT_KEY)
      || !advanceEventPackPaper(packPaperIndex + 1)) stopEventPackPlayback();
  }, 1000);
  const button = modeSurface.querySelector('[data-action="pack-paper-play"]');
  button.textContent = "Pause";
  button.setAttribute("aria-pressed", "true");
}

function paperTradingQuote() {
  return isEventPackPaper() ? eventPackPaperQuote() : paperQuote;
}

function savePaperAccount(account = paperAccount) {
  if (isEventPackPaper()) {
    guestPaperAccounts.set(activePackId, cleanPaperAccount(account));
    return writeBrowserData(`${PAPER_ACCOUNT_KEY}-events`, Object.fromEntries(guestPaperAccounts));
  }
  return writeBrowserData(PAPER_ACCOUNT_KEY, cleanPaperAccount(account));
}

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: Math.abs(value) < 10 ? 2 : 2 }).format(Number(value || 0));
}

function formatShares(value) {
  const number = Number(value || 0);
  if (number >= 100) return number.toFixed(2);
  if (number >= 1) return number.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return number.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function formatQuoteTime(value) {
  const ms = Number(value || 0) * 1000;
  if (!ms) return "Latest quote";
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function paperPositions() {
  const paperAccount = paperTradingAccount();
  return Object.values(paperAccount.positions || {}).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

function paperPortfolioSummary() {
  const paperAccount = paperTradingAccount();
  const invested = paperPositions().reduce((sum, position) => sum + position.quantity * (position.lastPrice || position.avgCost || 0), 0);
  const cost = paperPositions().reduce((sum, position) => sum + position.quantity * (position.avgCost || 0), 0);
  const equity = (paperAccount.cash || 0) + invested;
  const unrealized = invested - cost;
  return {
    cash: paperAccount.cash || 0,
    invested,
    cost,
    equity,
    unrealized,
    realized: paperAccount.realized || 0,
    totalReturn: equity - PAPER_STARTING_CASH
  };
}

function updatePaperPositionQuote(quote) {

  const paperAccount = paperTradingAccount();
  const position = paperAccount.positions?.[quote.ticker];
  if (!position) return;
  position.lastPrice = quote.price;
  position.lastUpdated = new Date().toISOString();
  position.source = quote.source;
  position.name = quote.name || position.name;
  position.asset = quote.asset || position.asset;
  savePaperAccount(paperAccount);
}

function paperQuoteSourceCopy(quote = paperTradingQuote()) {
  if (!quote) return "No quote loaded";
  if (isEventPackPaper()) return `${quote.source} - ${new Date(quote.quoteTime * 1000).toLocaleDateString(undefined, { timeZone: "UTC" })}`;
  const preview = /preview|fallback/i.test(`${quote.source} ${quote.exchange}`);
  const yahoo = /yahoo/i.test(`${quote.source} ${quote.exchange}`);
  const alpaca = /alpaca/i.test(`${quote.source} ${quote.exchange}`);
  const source = preview ? "Preview fallback quote" : yahoo ? "Yahoo Finance quote" : alpaca ? "Alpaca Market Data quote" : `${quote.source || "Market data"} quote`;
  return `${source} - ${formatQuoteTime(quote.quoteTime)}${quote.marketState ? ` - ${quote.marketState}` : ""}`;
}

function paperQuoteCardHtml() {
  const paperQuote = paperTradingQuote();
  if (!isEventPackPaper() && paperQuoteLoading) {
    return `<section class="paper-card paper-quote-card loading"><span>Quote lookup</span><strong>${loadingTextHtml("Fetching latest quote...")}</strong><p>Orders stay disabled until the current quote returns.</p></section>`;
  }
  if (!isEventPackPaper() && paperQuoteError) {
    return `<section class="paper-card paper-quote-card error"><span>Quote lookup</span><strong>Quote unavailable</strong><p>${escapeHtml(paperQuoteError)}</p><button type="button" data-action="paper-refresh">Refresh quote &amp; chart</button></section>`;
  }
  if (!paperQuote && isEventPackPaper()) return `<p class="paper-empty" role="status">${symbolStatus.classList.contains("error") ? "Event data could not load. Choose Another market to retry." : rawCandles[packPaperIndex]?.close <= 0 ? "Trading is paused at this nonpositive price. Advance to the next candle to continue." : eventPackChartReady() && packPaperIndex >= rawCandles.length - 1 ? "This market has no candles at the current simulation date. Choose Another market to continue." : "Loading event market data…"}</p>`;
  if (!paperQuote) {
    return `<p class="paper-empty">Choose a market using the chart search to see its quote.</p><button type="button" data-action="paper-refresh">Refresh quote &amp; chart</button>`;
  }
  const up = paperQuote.change >= 0;
  return `<section class="paper-card paper-quote-card ${up ? "up" : "down"}">
    <div class="paper-quote-head"><div><span>${escapeHtml(paperQuote.ticker)}</span><strong>${escapeHtml(paperQuote.name)}</strong></div><em>${escapeHtml(paperQuote.asset)}</em></div>
    <div class="paper-price-row"><b>${formatMoney(paperQuote.price, paperQuote.currency)}</b><small>${up ? "+" : ""}${paperQuote.change.toFixed(2)} (${up ? "+" : ""}${paperQuote.changePercent.toFixed(2)}%)</small></div>
    <p>${escapeHtml(isEventPackPaper() ? new Date(paperQuote.quoteTime * 1000).toLocaleDateString(undefined, { timeZone: "UTC" }) : formatQuoteTime(paperQuote.quoteTime))}</p>
    ${isEventPackPaper() ? "" : `<div class="mode-actions paper-quote-actions">
      <button type="button" data-action="paper-refresh">Refresh quote &amp; chart</button>
    </div>`}
  </section>`;
}

function paperPositionsHtml() {
  const positions = paperPositions();
  if (!positions.length) return `<p class="paper-empty">Look up a symbol and buy to see your positions.</p>`;
  return positions.map(position => {
    const marketValue = position.quantity * (position.lastPrice || position.avgCost || 0);
    const cost = position.quantity * (position.avgCost || 0);
    const pnl = marketValue - cost;
    return `<article class="paper-position">
      <div><strong>${escapeHtml(position.ticker)}</strong><small>${escapeHtml(position.name)}</small></div>
      <span>${formatShares(position.quantity)} sh</span>
      <span>${formatMoney(marketValue)}</span>
      <span class="${pnl >= 0 ? "gain" : "loss"}">${pnl >= 0 ? "+" : ""}${formatMoney(pnl)}</span>
    </article>`;
  }).join("");
}

function paperOrdersHtml(limit = 12, savedOrders = null, { hideYahooSource = false } = {}) {
  const paperAccount = savedOrders ? { orders: savedOrders } : paperTradingAccount();
  if (!paperAccount.orders?.length) return `<p class="paper-empty">Place a paper trade to see your orders.</p>`;
  return paperAccount.orders.slice(0, limit).map(order => {
    const source = order.source || "Alpaca Market Data";
    const sourceFinePrint = hideYahooSource && /yahoo/i.test(source) ? "" : `<small>${escapeHtml(source)}</small>`;
    return `<article class="paper-order ${order.side}">
    <div><strong>${order.side === "buy" ? "Bought" : "Sold"} ${escapeHtml(order.ticker)}</strong><small>${isEventPackPaper() ? new Date(order.at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : new Date(order.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div>
    <span>${formatShares(order.quantity)} @ ${formatMoney(order.price)}</span>
    <em>${formatMoney(order.notional)}</em>
    ${sourceFinePrint}
  </article>`;
  }).join("");
}

const paperLedger = document.getElementById("paperLedger");
const paperLedgerToggle = document.getElementById("paperLedgerToggle");
const paperLedgerPanel = document.getElementById("paperLedgerPanel");
let paperLedgerPinned = false;
let paperLedgerCloseTimer;
let paperLedgerDrag = null;
let paperLedgerMoved = false;
let paperLedgerY = null;

function positionPaperLedger() {
  const height = window.visualViewport?.height || window.innerHeight;
  const buttonHeight = paperLedgerToggle.offsetHeight || 44;
  const top = Math.max(8, Math.min(paperLedgerY ?? height * .72, height - buttonHeight - 8));
  paperLedgerToggle.style.top = `${top}px`;
  if (!paperLedgerPanel.hidden) {
    const panelTop = Math.max(8, Math.min(top, height - paperLedgerPanel.offsetHeight - 8));
    paperLedgerPanel.style.top = `${panelTop}px`;
  }
}

paperLedgerToggle.addEventListener("pointerdown", event => {
  if (event.button !== 0 || !event.isPrimary) return;
  paperLedgerMoved = false;
  paperLedgerDrag = { id: event.pointerId, start: event.clientY, top: paperLedgerToggle.getBoundingClientRect().top };
  paperLedgerToggle.setPointerCapture(event.pointerId);
  clearTimeout(paperLedgerCloseTimer);
});
paperLedgerToggle.addEventListener("pointermove", event => {
  if (paperLedgerDrag?.id !== event.pointerId) return;
  const delta = event.clientY - paperLedgerDrag.start;
  if (!paperLedgerMoved && Math.abs(delta) < 5) return;
  paperLedgerMoved = true;
  paperLedgerY = paperLedgerDrag.top + delta;
  positionPaperLedger();
});
function finishPaperLedgerDrag(event) {
  if (paperLedgerDrag?.id !== event.pointerId) return;
  paperLedgerDrag = null;
}
paperLedgerToggle.addEventListener("pointerup", finishPaperLedgerDrag);
paperLedgerToggle.addEventListener("pointercancel", finishPaperLedgerDrag);
paperLedgerToggle.addEventListener("lostpointercapture", finishPaperLedgerDrag);
paperLedgerToggle.addEventListener("keydown", event => {
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const height = window.visualViewport?.height || window.innerHeight;
  const top = paperLedgerToggle.getBoundingClientRect().top;
  paperLedgerY = event.key === "Home" ? 8 : event.key === "End" ? height - 52 : top + (event.key === "ArrowUp" ? -24 : 24);
  positionPaperLedger();
});
window.addEventListener("resize", positionPaperLedger);
window.visualViewport?.addEventListener("resize", positionPaperLedger);

function renderPaperLedger() {

  const orders = paperTradingAccount().orders || [];
  document.getElementById("paperLedgerSummary").textContent = `${isEventPackPaper() ? "Event paper account" : "Paper account"} · ${orders.length} saved trade${orders.length === 1 ? "" : "s"} · Newest first`;
  document.getElementById("paperLedgerOrders").innerHTML = paperOrdersHtml(80, null, { hideYahooSource: true });
  positionPaperLedger();
}

function setPaperLedgerOpen(open) {
  clearTimeout(paperLedgerCloseTimer);
  open = open && (appMode === "paper" || isEventPackPaper());
  if (open) renderPaperLedger();

  paperLedgerPanel.hidden = !open;
  positionPaperLedger();
  paperLedgerToggle.setAttribute("aria-expanded", String(open));
  paperLedgerToggle.setAttribute("aria-label", open ? "Close trade ledger" : "Open trade ledger");
  if (!open) paperLedgerPinned = false;
}

function closePaperLedger() {
  const restoreFocus = paperLedgerPanel.contains(document.activeElement);
  setPaperLedgerOpen(false);
  if (restoreFocus && !paperLedger.hidden) paperLedgerToggle.focus({ preventScroll: true });
}

paperLedger.addEventListener("pointerenter", event => {
  if (event.pointerType === "mouse" && matchMedia("(hover: hover)").matches) setPaperLedgerOpen(true);
});
paperLedger.addEventListener("pointerleave", () => {
  paperLedgerCloseTimer = setTimeout(() => {
    if (!paperLedgerDrag && !paperLedgerPinned && !paperLedgerPanel.contains(document.activeElement)) setPaperLedgerOpen(false);
  }, 180);
});
paperLedger.addEventListener("focusout", () => {
  paperLedgerCloseTimer = setTimeout(() => {
    if (!paperLedgerPinned && !paperLedger.contains(document.activeElement) && !paperLedger.matches(":hover")) setPaperLedgerOpen(false);
  }, 0);
});
paperLedgerToggle.addEventListener("click", () => {
  if (paperLedgerMoved) { paperLedgerMoved = false; return; }
  const open = !paperLedgerPinned;
  setPaperLedgerOpen(open);
  paperLedgerPinned = open;
  if (open) document.getElementById("paperLedgerClose").focus({ preventScroll: true });
});
document.getElementById("paperLedgerClose").addEventListener("click", closePaperLedger);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !paperLedgerPanel.hidden) closePaperLedger();
});
document.addEventListener("pointerdown", event => {
  if (!paperLedgerPanel.hidden && !paperLedger.contains(event.target)) setPaperLedgerOpen(false);
}, { passive: true });

function renderPaperTrading() {
  const detailsOpen = [...modeSurface.querySelectorAll(".paper-account-details")].map(item => item.open);
  const activeAction = modeSurface.contains(document.activeElement) ? document.activeElement.dataset.action : "";
  const paperAccount = paperTradingAccount();
  const eventPaper = isEventPackPaper();
  const paperQuote = paperTradingQuote();
  setUtilityPanel("");
  const summary = paperPortfolioSummary();
  const quoteTicker = paperQuote?.ticker || "AAPL";
  if (!eventPaper) paperChartSymbol ||= normalizeSymbol(paperQuote?.ticker || modeSymbols.paper || quoteTicker);
  document.getElementById("choices").innerHTML = "";
  result.innerHTML = "";
  modeSurface.innerHTML = `${eventPaper ? `${eventPackChartHeaderHtml(eventPacks[activePackId], "Paper trading")}
    ${eventPackPaperClockHtml()}
    <div class="mode-actions"><button type="button" data-pack="${activePackId}" data-pack-practice="paper">Another market</button></div>` : ""}<section class="paper-sidebar">
    <div class="mode-row"><strong>Paper account</strong><span>${formatMoney(summary.equity)} equity</span></div>
    <div class="paper-account-summary">
      <article><small>Cash</small><strong>${formatMoney(summary.cash)}</strong></article>
      <article><small>Invested</small><strong>${formatMoney(summary.invested)}</strong></article>
      <span class="${summary.totalReturn >= 0 ? "gain" : "loss"}">${summary.totalReturn >= 0 ? "+" : ""}${formatMoney(summary.totalReturn)} total return</span>
    </div>
    <form class="paper-ticket paper-ticket-compact" data-paper-ticket>
      <div><span>Trade ticket</span>${eventPaper ? `<strong>Historical candle close</strong>` : ""}</div>
      ${eventPaper ? `<p class="event-pack-copy">${escapeHtml(currentSymbol.ticker)} · Trade at the simulation date, then advance time to see how your position performs.</p>` : ""}
      ${paperQuoteCardHtml()}
      <label><span>Buy with USD</span><span class="paper-order-field" data-paper-order-field="buy"><input id="paperBuyAmount" type="number" min="0.01" step="0.01" max="${summary.cash.toFixed(2)}" value="${Math.min(25, Math.max(0, summary.cash)).toFixed(2)}" aria-describedby="paperBuyAmountError" /><span class="paper-order-error-icon" role="button" tabindex="0" aria-label="Show order error" aria-expanded="false" aria-describedby="paperBuyAmountError">!</span></span><span class="paper-order-alert" id="paperBuyAmountError" role="alert" aria-live="assertive"></span></label>
      <label><span>Sell shares</span><span class="paper-order-field" data-paper-order-field="sell"><input id="paperSellQty" type="number" min="0.000001" step="0.000001" value="${paperQuote && paperAccount.positions[paperQuote.ticker] ? formatShares(paperAccount.positions[paperQuote.ticker].quantity) : ""}" placeholder="0.000000" aria-describedby="paperSellQtyError" /><span class="paper-order-error-icon" role="button" tabindex="0" aria-label="Show order error" aria-expanded="false" aria-describedby="paperSellQtyError">!</span></span><span class="paper-order-alert" id="paperSellQtyError" role="alert" aria-live="assertive"></span></label>
      <div class="mode-actions paper-order-actions">
        <button type="button" data-action="paper-buy" ${paperQuote && summary.cash > 0 ? "" : "disabled"}>Buy</button>
        <button type="button" data-action="paper-sell" ${paperQuote && paperAccount.positions[paperQuote.ticker] ? "" : "disabled"}>Sell</button>
      </div>
      ${""}
    </form>
    <details class="paper-account-details">
      <summary><span>Portfolio</span><strong>${paperPositions().length} position${paperPositions().length === 1 ? "" : "s"}</strong></summary>
      <div class="paper-details-body">
        ${paperPositions().length ? `<button class="paper-sell-all" type="button" data-action="paper-sell-all">Sell all positions</button>` : ""}
        ${paperSellAllPending ? `<div class="paper-sell-all-confirm" role="alert"><div class="mode-actions"><button type="button" data-action="paper-sell-all-cancel">Keep</button><button class="danger" type="button" data-action="paper-sell-all-confirm">Sell</button></div></div>` : ""}
        <div class="paper-position-list">${paperPositionsHtml()}</div>
      </div>
    </details>
    <details class="paper-account-details">
      <summary><span>Orders</span><strong>${paperAccount.orders?.length || 0} logged</strong></summary>
      <div class="paper-details-body paper-order-list">${paperOrdersHtml()}</div>
    </details>
  </section>`;
  modeSurface.querySelectorAll(".paper-account-details").forEach((item, index) => { item.open = Boolean(detailsOpen[index]); });
  if (activeAction?.startsWith("paper-sell-all")) {
    const focusAction = paperSellAllPending ? "paper-sell-all-cancel" : "paper-sell-all";
    (modeSurface.querySelector(`[data-action="${focusAction}"]`) || modeSurface.querySelector(".paper-account-details summary"))?.focus({ preventScroll: true });
  }
  observePaperPriceRows();
  if (!paperLedgerPanel.hidden) renderPaperLedger();
}

// Measure the complete row so both the price and change stay aligned at any width.
function fitPaperPriceRow(row) {
  row.style.removeProperty("--paper-price-size");
  const price = row.querySelector("b"), change = row.querySelector("small");
  const max = parseFloat(getComputedStyle(price).fontSize);
  const needed = price.getBoundingClientRect().width + change.getBoundingClientRect().width;
  const available = row.clientWidth - parseFloat(getComputedStyle(row).columnGap);
  if (needed > available && available > 0) row.style.setProperty("--paper-price-size", `${max * available / needed}px`);
}
const paperPriceObserver = typeof ResizeObserver === "function" ? new ResizeObserver(entries => {
  entries.forEach(({ target }) => fitPaperPriceRow(target));
}) : null;
function observePaperPriceRows() {
  paperPriceObserver?.disconnect();
  modeSurface.querySelectorAll(".paper-price-row").forEach(row => {
    fitPaperPriceRow(row);
    paperPriceObserver?.observe(row);
  });
}
window.addEventListener("resize", observePaperPriceRows);
document.fonts?.ready.then(observePaperPriceRows);
document.fonts?.addEventListener("loadingdone", observePaperPriceRows);
new MutationObserver(observePaperPriceRows).observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });

function renderPaperTradingIfCurrent() {
  if (appMode === "paper" || isEventPackPaper()) renderPaperTrading();
}

async function refreshPaperQuote(rawSymbol, options = {}) {
  if (isEventPackPaper()) return eventPackPaperQuote();
  const requestId = chartRequestId;
  const symbol = normalizeSymbol(rawSymbol || currentSymbol.ticker || "");
  if (!symbol) {
    paperQuoteError = "Type a real symbol first.";
    renderPaperTradingIfCurrent();
    return null;
  }
  paperQuoteLoading = true;
  paperQuoteError = "";
  if (!options.silent) renderPaperTradingIfCurrent();
  try {
    const quote = await quoteMarket(symbol);
    if (requestId !== chartRequestId || isEventPackPaper()) return null;
    paperQuote = quote;
    paperQuoteError = "";
    updatePaperPositionQuote(quote);
    return quote;
  } catch (error) {
    if (requestId !== chartRequestId) return null;
    paperQuote = null;
    paperQuoteError = error.message || `No quote available for ${symbol}.`;
    showToast(paperQuoteError);
    return null;
  } finally {
    if (requestId === chartRequestId) {
      paperQuoteLoading = false;
      if (!options.silent) renderPaperTradingIfCurrent();
    }
  }
}

function addPaperOrder(order, paperAccount = paperTradingAccount()) {
  paperAccount.orders.unshift(order);
  paperAccount.orders = paperAccount.orders.slice(0, 80);
  savePaperAccount(paperAccount);
}

function setPaperOrderTooltipOpen(icon, open) {
  icon.classList.toggle("is-open", open);
  icon.setAttribute("aria-expanded", String(open));
}

function markPaperOrderFieldInvalid(kind, message) {
  const field = modeSurface.querySelector(`[data-paper-order-field="${kind}"]`);
  const input = field?.querySelector("input");
  const errorIcon = field?.querySelector(".paper-order-error-icon");
  if (!field || !input) return;
  field.classList.remove("is-invalid");
  void field.offsetWidth;
  field.classList.add("is-invalid");
  input.setAttribute("aria-invalid", "true");
  if (errorIcon) {
    errorIcon.dataset.tooltip = message;
    setPaperOrderTooltipOpen(errorIcon, false);
  }
  const alert = document.getElementById(input.getAttribute("aria-describedby"));
  if (alert) alert.textContent = message;
  input.focus({ preventScroll: true });
}

function clearPaperOrderFieldInvalid(field) {
  if (!field?.classList.contains("is-invalid")) return;
  field.classList.remove("is-invalid");
  const input = field.querySelector("input");
  const errorIcon = field.querySelector(".paper-order-error-icon");
  input?.removeAttribute("aria-invalid");
  if (errorIcon) {
    delete errorIcon.dataset.tooltip;
    setPaperOrderTooltipOpen(errorIcon, false);
  }
  const alert = input ? document.getElementById(input.getAttribute("aria-describedby")) : null;
  if (alert) alert.textContent = "";
}

async function executePaperOrder(side) {

  if (isEventPackPaper()) stopEventPackPlayback();
  const paperAccount = paperTradingAccount();
  const requestedSymbol = normalizeSymbol(currentSymbol.ticker || "");
  const eventPaper = isEventPackPaper();
  const candleIndex = packPaperIndex;
  const requestId = chartRequestId;
  const quote = await refreshPaperQuote(requestedSymbol, { silent: true });
  if (requestId !== chartRequestId || (eventPaper
      ? !isEventPackPaper() || candleIndex !== packPaperIndex : appMode !== "paper")) return;
  if (!quote) {
    renderPaperTradingIfCurrent();
    return;
  }
  const position = paperAccount.positions[quote.ticker];
  const price = quote.price;
  if (side === "buy") {
    const amount = Math.max(0, Number(document.getElementById("paperBuyAmount")?.value || 0));
    if (amount < 0.01) {
      showToast("Enter at least $0.01 to buy.");
      renderPaperTradingIfCurrent();
      return;
    }
    if (amount > paperAccount.cash + 0.000001) {
      const message = "That buy is larger than your paper cash.";
      showToast(message);
      markPaperOrderFieldInvalid("buy", message);
      return;
    }
    const quantity = amount / price;
    const oldQuantity = position?.quantity || 0;
    const oldCost = oldQuantity * (position?.avgCost || 0);
    const newQuantity = oldQuantity + quantity;
    paperAccount.positions[quote.ticker] = {
      ticker: quote.ticker,
      name: quote.name,
      asset: quote.asset,
      quantity: newQuantity,
      avgCost: (oldCost + amount) / newQuantity,
      lastPrice: price,
      lastUpdated: new Date().toISOString(),
      source: quote.source
    };
    paperAccount.cash = Math.max(0, paperAccount.cash - amount);
    addPaperOrder({
      id: `paper-order-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      side: "buy",
      ticker: quote.ticker,
      name: quote.name,
      quantity,
      price,
      notional: amount,
      at: eventPaper ? new Date(quote.quoteTime * 1000).toISOString() : new Date().toISOString(),
      source: quote.source,
      note: paperQuoteSourceCopy(quote)
    }, paperAccount);
    showToast(`Bought ${formatShares(quantity)} ${quote.ticker} with paper cash.`);
  } else {
    if (!position) {
      const message = `You do not hold ${quote.ticker}.`;
      showToast(message);
      renderPaperTradingIfCurrent();
      markPaperOrderFieldInvalid("sell", message);
      return;
    }
    const quantity = Math.max(0, Number(document.getElementById("paperSellQty")?.value || 0));
    if (quantity <= 0) {
      showToast("Enter shares to sell.");
      renderPaperTradingIfCurrent();
      return;
    }
    if (quantity > position.quantity + 0.0000001) {
      const message = "You cannot sell more than you hold.";
      showToast(message);
      markPaperOrderFieldInvalid("sell", message);
      return;
    }
    const notional = quantity * price;
    paperAccount.cash += notional;
    paperAccount.realized = (paperAccount.realized || 0) + (price - (position.avgCost || 0)) * quantity;
    position.quantity -= quantity;
    position.lastPrice = price;
    position.lastUpdated = new Date().toISOString();
    position.source = quote.source;
    if (position.quantity <= 0.0000001) delete paperAccount.positions[quote.ticker];
    addPaperOrder({
      id: `paper-order-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      side: "sell",
      ticker: quote.ticker,
      name: quote.name,
      quantity,
      price,
      notional,
      at: eventPaper ? new Date(quote.quoteTime * 1000).toISOString() : new Date().toISOString(),
      source: quote.source,
      note: paperQuoteSourceCopy(quote)
    }, paperAccount);
    showToast(`Sold ${formatShares(quantity)} ${quote.ticker}.`);
  }
  renderPaperTradingIfCurrent();
}

async function openPaperChart(symbol) {
  const ticker = normalizeSymbol(symbol || currentSymbol.ticker || "");
  if (!ticker) {
    showToast("Load a quote before opening a chart.");
    return;
  }
  paperChartSymbol = ticker;
  renderPaperTradingIfCurrent();
  syncNextChartButton();
  await submitSymbol(ticker, { remember: false });
  if (appMode !== "paper") return;
  chartPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function reloadAccountScopedState() {
  guestPaperAccounts.clear();
  if (typeof DEFAULT_QUANT_CONFIG !== "undefined") { quantConfig = loadBrowserQuantConfig(); quantBacktest = null; quantView = "landing"; quantDraftId = ""; quantDraftName = "Untitled algorithm"; }
  drawings = []; drawingHistory = [];
  stopEventPackPlayback();
  if (typeof resetAccountHistoryWorkspace === "function") resetAccountHistoryWorkspace();
  chartRequestId += 1;
  cancelLivePuzzle();
  dailyRound = null;
  reviewChartActive = false;
  activeReviewRecordId = "";
  activeReviewRound = "";
  activeReviewAnswer = "";
  window.cancelXpOrbCollection?.();
  resetCoinRewardsUi();
  resetReviewPatternHint();
  stats = loadStats();
  learnProgress = loadLearnProgress();
  learnActivity = loadLearnActivity();
  practiceHistory = loadPracticeHistory();
  headerAccuracyState = loadHeaderAccuracyState();
  freePlayDailyAnswers = loadFreePlayDailyAnswers();
  legacyStreakDays = loadLegacyStreakDays();
  savedNews = loadSavedNews();
  paperAccount = loadPaperAccount();
  paperQuote = null;
  paperQuoteError = "";
  paperQuoteLoading = false;
  paperChartSymbol = "";
  learnQuizFeedback = {};
  learnQuizStarted = new Set();
  learnQuizAnswers = {};
  activeLearnChapter = Math.max(0, learnModules.findIndex((_, index) => !learnProgress.has(index)));
  if (activeLearnChapter < 0) activeLearnChapter = 0;
  renderPracticePlan();
  updateStats();
  if (typeof initializeAccountHistory === "function") void initializeAccountHistory();
  if (typeof initializeAccountData === "function") void initializeAccountData();
}

function clearPracticeChoices() {
  const box = document.getElementById("choices");
  if (box) box.innerHTML = "";
}

function practiceControlsActive(mode = appMode) {
  if (mode === "packs") return packChartActive && !isEventPackPaper();
  if (mode === "free" || mode === "ranked" || mode === "daily") return true;
  if (mode === "review") return reviewChartActive && Boolean(activeReviewRecordId);
  return false;
}

function setUtilityPanel(tag, titleText = "", copyText = "") {
  clearPracticeChoices();
  revealTag.textContent = tag;
  result.innerHTML = `${titleText ? `<strong>${escapeHtml(titleText)}</strong>` : ""}${copyText ? `<p>${escapeHtml(copyText)}</p>` : ""}`;
}

function loadLearnProgress() {
  const saved = readBrowserData(LEARN_PROGRESS_KEY, []);
  return new Set((Array.isArray(saved) ? saved : []).filter(index => Number.isInteger(index) && index >= 0 && index < learnModules.length));
}

function saveLearnProgress() {

  return writeBrowserData(LEARN_PROGRESS_KEY, [...learnProgress]);
}

function loadLearnActivity() {
  const saved = readBrowserData(LEARN_ACTIVITY_KEY, {});
  return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}

function saveLearnActivity() {
  return writeBrowserData(LEARN_ACTIVITY_KEY, learnActivity);
}

function learnChapterActivity(index) {
  learnActivity[index] ||= { steps: [], reflection: "", flashcards: [] };
  learnActivity[index].steps ||= [];
  learnActivity[index].flashcards ||= [];
  return learnActivity[index];
}

function learnChapterUnlocked(index) {
  return Number.isInteger(index) && index >= 0 && index < learnModules.length;
}

function nextLearnTargetIndex() {
  const next = learnModules.findIndex((_, index) => !learnProgress.has(index));
  if (next === -1) return 0;
  return Math.max(0, Math.min(learnModules.length - 1, next));
}

function learnQuizReady(index) {
  return learnChapterUnlocked(index);
}

function loadSavedNews() {
  const saved = readBrowserData(NEWS_SAVED_KEY, []);
  return new Set((Array.isArray(saved) ? saved : []).filter(id => typeof id === "string"));
}

function saveSavedNews() {
  return writeBrowserData(NEWS_SAVED_KEY, [...savedNews]);
}

function containsInappropriateName(value) {
  // Normalize accents, compatibility characters, invisible separators and common leetspeak.
  const normalized = String(value).normalize("NFKD").toLowerCase()
    .replace(/[\p{M}\p{Cf}]/gu, "")
    .replace(/[аɑα]/gu, "a").replace(/[еε]/gu, "e").replace(/[іιı]/gu, "i")
    .replace(/[оο]/gu, "o").replace(/[сϲ]/gu, "c").replace(/[хχ]/gu, "x")
    .replace(/[у]/gu, "y").replace(/[ѕ]/gu, "s");
  const text = normalized.replace(/[01345789@$!]/g, char => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s", "!": "i" })[char]);
  const compact = text.replace(/[^a-z]/g, "");
  const blockedWords = /^(?:ass|asshole|bastard|cunt|dick|slut|fag|kike|chink|spic|coon|nazi|kkk|kys|porn|rape|rapist|dildo|penis|vagina|shit|shithead|whore|pussy|cock|retard|retarded)$/;
  // Only unambiguous roots use substring checks; short words use boundaries to spare real names.
  return /f+u+c+[kq]+|f+u+k+|motherfucker|bullshit|b+i+t+c+h+|n+i+g{2,}(?:e+r+|a+)|f+a+g+[o]+t+|heilhitler|hitler|neonazi|whitesuprem|kill(?:yourself|all)|gas(?:the)?jews/.test(compact)
    || blockedWords.test(compact)
    || `${text} ${normalized}`.split(/[^a-z]+/).some(word => blockedWords.test(word));
}

function warnAboutFeedback() {
  showToast("Sending false bug reports or submitting troll Suggestions may result in losing the privilege to submit feedback and may even result in a ban.", { tone: "feedback-warning", key: "feedback-warning" });
}

function executePaperSellAll() {

  if (isEventPackPaper()) stopEventPackPlayback();
  const paperAccount = paperTradingAccount();
  const positions = paperPositions();
  paperSellAllPending = false;
  if (!positions.length) {
    showToast("There are no positions to sell.");
    playUiSound("error");
    renderPaperTradingIfCurrent();
    return;
  }
  let proceeds = 0;
  const soldAt = new Date(isEventPackPaper() ? rawCandles[packPaperIndex].time * 1000 : Date.now()).toISOString();
  positions.forEach((position, index) => {
    const price = Math.max(0, Number(position.lastPrice || position.avgCost || 0));
    if (!price || !position.quantity) return;
    const notional = position.quantity * price;
    proceeds += notional;
    paperAccount.realized = (paperAccount.realized || 0) + (price - (position.avgCost || 0)) * position.quantity;
    paperAccount.orders.unshift({
      id: `paper-sell-all-${Date.now()}-${index}`,
      side: "sell", ticker: position.ticker, name: position.name, quantity: position.quantity,
      price, notional, at: soldAt, source: position.source || "Latest saved quote", note: "Sell all positions"
    });
    delete paperAccount.positions[position.ticker];
  });
  paperAccount.cash += proceeds;
  paperAccount.orders = paperAccount.orders.slice(0, 80);
  savePaperAccount(paperAccount);
  showToast(`Sold ${positions.length} position${positions.length === 1 ? "" : "s"} for ${formatMoney(proceeds)}.`);
  playUiSound("success");
  celebrateAction();
  renderPaperTradingIfCurrent();
}

function safeScreenshotMeta(file) {
  if (!file) return null;
  const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
  const name = String(file.name || "screenshot").replace(/[^A-Za-z0-9_. -]/g, "").slice(0, 90) || "screenshot";
  const type = String(file.type || "").toLowerCase();
  const size = Number(file.size || 0);
  if (!allowed.has(type)) return { ok: false, reason: "Use a PNG, JPG, or WebP screenshot. SVG, HTML, PDF, and scripts are blocked." };
  if (size > 2 * 1024 * 1024) return { ok: false, reason: "Screenshot must be under 2 MB for this local prototype." };
  return {
    ok: true,
    name,
    type,
    size,
    sizeLabel: `${Math.max(1, Math.round(size / 1024)).toLocaleString()} KB`
  };
}

function accountDisplayName() { return sessionProfile.nickname || "Market learner"; }

function renderAccountPanel() {
  const level = currentLevel();
  accountPanel.innerHTML = `<section class="account-profile"><div class="account-profile-card">
    <div class="account-profile-name"><h3>${escapeHtml(accountDisplayName())}</h3>
    <button class="nickname-edit" id="nicknameEdit" type="button" data-action="account-edit-nickname" aria-label="Edit nickname" aria-haspopup="dialog" aria-controls="nicknameModal" title="Edit nickname"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z" /></svg></button></div>
    <span class="account-profile-rank">${level.tierName} • Level ${level.tierLevel}</span>
    <p>Progress is saved in this browser. New browsers start with 500 practice coins. Export a backup before clearing site data.</p></div>
    <div class="account-actions"><button type="button" data-action="account-open-levels">View level ladder</button><button type="button" data-action="account-back">Back to site</button></div></section>`;
}

function openAccountModal() {
  renderAccountPanel();
  renderRankRoad();
  renderCoinRewards();
  openAccessibleModal(accountModal);
  focusInsideModal(accountModal);
}

function closeAccountModal() {
  closeAccessibleModal(accountModal, levelButton);
}

function purgeBrowserPersonalData(all = false) {
  const deviceKeys = new Set(["pretiumlabs-theme-v1", "pretiumlabs-sound-enabled-v1", "pretiumlabs-animations-v1", "pretiumlabs-drawing-tools-open-v1", "pretiumlabs-free-play-random-v1", "pretiumlabs-cookie-notice-v1"]);
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const storage = window[name];
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        const appKey = key?.startsWith("pretiumlabs-") || key?.startsWith("fl101_") || key === "financeLabsWebsiteLanguage";
        // Saved algorithms and the recovery draft survive normal startup.
        const keep = name === "localStorage" ? deviceKeys.has(key) || key === "financeLabsWebsiteLanguage" || key === QUANT_LIBRARY_KEY || key === QUANT_DRAFT_KEY || key?.endsWith(":browser-v1")
          : ["pretiumlabs-reload-session-v1", "pretiumlabs-navigation-page-v1"].includes(key);
        if (appKey && (all || !keep)) storage.removeItem(key);
      }
    } catch {} // Storage-disabled browsers still get a fresh, nonpersistent page.
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function completeLearnChapter(index, options = {}) {
  learnProgress.add(index);
  learnQuizFeedback[index] ||= { passed: true, score: 3 };
  learnQuizFeedback[index].passed = true;
  learnQuizStarted.add(index);
  const nextIndex = Math.min(learnModules.length - 1, index + 1);
  activeLearnChapter = options.advance && index < learnModules.length - 1 ? nextIndex : index;
  saveLearnProgress();
  renderLearn();
  document.querySelector(".iq-checkpoint")?.focus({ preventScroll: true });
  const done = learnProgress.size === learnModules.length;
  showToast(done ? "Pretium Labs IQ complete." : `Lesson ${index + 1} complete. Explore any lesson next.`);
}

function resetLearnProgress() {

  learnProgress = new Set();
  learnActivity = {};
  learnQuizFeedback = {};
  learnQuizStarted = new Set();
  learnQuizAnswers = {};
  activeLearnChapter = 0;
  saveLearnProgress();
  saveLearnActivity();
  renderLearn();
  showToast("Pretium Labs IQ progress reset.");
}

function scrollToNextLearnChapter() {
  const nextIndex = learnModules.findIndex((_, index) => !learnProgress.has(index));
  activeLearnChapter = nextIndex === -1 ? 0 : Math.min(nextIndex, nextLearnTargetIndex());
  renderLearn();
}

function startLearnQuiz(index) {
  if (!learnQuizReady(index)) return;
  learnQuizStarted.add(index);
  activeLearnChapter = index;
  renderLearn();
  document.querySelector(".iq-checkpoint, .module-quiz")?.scrollIntoView({ behavior: "smooth", block: "center" });
  document.querySelector(".module-quiz")?.focus({ preventScroll: true });
  showToast(`Lesson ${index + 1} quiz started.`);
}

function submitLearnQuiz(index) {
  const module = learnModules[index];
  if (!module) return;
  if (!learnChapterUnlocked(index)) return;
  if (!learnQuizStarted.has(index)) {
    startLearnQuiz(index);
    return;
  }
  const answers = module.quiz.map((question, questionIndex) => Number(learnQuizAnswers[index]?.[questionIndex] ?? -1));
  if (answers.includes(-1)) {
    learnQuizFeedback[index] = { passed: false, score: 0, answers, message: "Answer all 3 questions before submitting." };
    activeLearnChapter = index;
    renderLearn();
    document.querySelector(".iq-checkpoint, .module-quiz")?.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Answer all 3 quiz questions.");
    return;
  }
  const score = answers.reduce((total, answer, questionIndex) => total + (answer === module.quiz[questionIndex].correctIndex ? 1 : 0), 0);
  if (score === module.quiz.length) {

    learnQuizFeedback[index] = { passed: true, score, answers, message: "Passed. Progress saved." };
    completeLearnChapter(index);
    return;
  }
  learnQuizFeedback[index] = { passed: false, score, answers, message: `You scored ${score}/3. Review the quiz feedback and try again. Lesson completion requires 3/3.` };
  activeLearnChapter = index;
  renderLearn();
  document.querySelector(".iq-checkpoint, .module-quiz")?.scrollIntoView({ behavior: "smooth", block: "center" });
  document.querySelector(".module-quiz")?.focus({ preventScroll: true });
  showToast(`Quiz needs 3/3. You got ${score}/3.`);
}

function isPrivateReviewRecord(record) {
  return Boolean(record && (record.type === "versus-match" || record.mode === "versus")
    && (String(record.competitiveMode || "").toLowerCase() === "private"
      || String(record.matchType || "").toLowerCase() === "private"
      || /^Private match /i.test(record.opponent || "")));
}

function loadPracticeHistory() {
  const saved = readBrowserData(PRACTICE_HISTORY_KEY, []);
  return (Array.isArray(saved) ? saved : []).filter(record => record && typeof record === "object"
    && typeof record.id === "string" && !isPrivateReviewRecord(record)).slice(0, 120);
}

function savePracticeHistory() {
  return writeBrowserData(PRACTICE_HISTORY_KEY, practiceHistory);
}

function freePlayAnswerDate(record) {
  if (record?.mode !== "free" || record.type !== "single" || !record.choice || !record.answer) return "";
  const date = new Date(record.at || "");
  if (Number.isNaN(date.getTime())) return "";
  return dateToIso(date.getFullYear(), date.getMonth(), date.getDate());
}

function loadFreePlayDailyAnswers() {
  const saved = readBrowserData(FREE_PLAY_DAYS_KEY, {});
  return Object.fromEntries(Object.entries(saved && typeof saved === "object" ? saved : {})
    .filter(([date, count]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isInteger(count) && count > 0)
    .map(([date, count]) => [date, Math.min(DAY_STREAK_PUZZLES_REQUIRED, count)]));
}

function recordFreePlayDayAnswer(entry) {

  const date = freePlayAnswerDate(entry);
  if (!date) return;
  // Keep earned days even after the 120-record Review history drops their puzzles.
  freePlayDailyAnswers[date] = Math.min(DAY_STREAK_PUZZLES_REQUIRED, (freePlayDailyAnswers[date] || 0) + 1);
  writeBrowserData(FREE_PLAY_DAYS_KEY, freePlayDailyAnswers);
}

function loadLegacyStreakDays() {
  const saved = readBrowserData(LEGACY_STREAK_DAYS_KEY, []);
  return new Set((Array.isArray(saved) ? saved : []).filter(date => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)));
}

function formatXp(value) {
  return `${Math.round(value).toLocaleString()} XP`;
}

function currentLevel() {
  return levelLadder.reduce((current, level) => {
    return stats.xp >= level.xp ? level : current;
  }, levelLadder[0]);
}

function nextReachableLevel(level = currentLevel()) {
  return levelLadder.find(item => item.level > level.level && item.title !== level.title) || levelLadder.at(-1);
}

const savedBrowserProfile = readBrowserData("pretiumlabs-profile-v1", {});
const sessionProfile = { nickname: typeof savedBrowserProfile?.nickname === "string" ? savedBrowserProfile.nickname.slice(0, 15) : "" };
const sessionWallet = window.CoinRewards.createWallet({
  storage: { getItem: () => JSON.stringify(readBrowserData(COINS_KEY, { balance: 500 })),
    setItem: (_, value) => writeBrowserData(COINS_KEY, JSON.parse(value), true) },
  key: () => accountScopedKey(COINS_KEY)
});
const coinQuestDismissals = new Map();
function coinWallet() { return sessionWallet; }
function coinWalletState() {
  return coinWallet().read();
}
function cancelQuestDismissals() {
  for (const motion of coinQuestDismissals.values()) motion.cancel();
  coinQuestDismissals.clear();
}
function resetCoinRewardsUi() {
  if (typeof refundRankedRound === "function") refundRankedRound();
  cancelQuestDismissals();
  window.CoinRewards?.cancelCollections();
  window.cancelXpOrbCollection?.();
  window.rewardStatus?.reset();
  const panel = document.getElementById("accountRewards");
  if (panel) panel.dataset.signature = "";
}
function syncRewardStatus() {
  window.rewardStatus?.update({ xp: stats.xp, coins: coinWalletState().balance }, accountScopedKey(COINS_KEY));
}
window.refreshRewardStatus = syncRewardStatus;
function renderCoinRewards() {
  syncRewardStatus();
  const panel = document.getElementById("accountRewards");
  if (!panel) return;
  panel.hidden = false;
  const state = coinWalletState();
  const signature = JSON.stringify([accountScopedKey(COINS_KEY), state.day]);
  if (panel.dataset.signature === signature || coinQuestDismissals.size) return;
  panel.dataset.signature = signature;
  const quests = window.CoinRewards.questDefinitions.filter(quest => !state.day.claimed.includes(quest.id));
  panel.innerHTML = `<div class="quest-heading"><h3 id="dailyQuestTitle">Daily Quests</h3><small>Resets at 00:00 UTC</small></div>
    <div class="account-quest-row" role="region" tabindex="0" aria-label="Daily quest cards. Swipe, scroll or use arrow keys to browse.">${quests.map(quest => {
      const progress = state.day.progress[quest.id];
      const complete = progress >= quest.target;
      return `<article class="account-quest-card" data-quest-id="${quest.id}">
        <span class="quest-category">${quest.category}</span><h4>${quest.title}</h4>
        <div class="quest-progress-label"><span>${complete ? "Completed" : "In progress"}</span><span>${progress} / ${quest.target}</span></div>
        <progress value="${progress}" max="${quest.target}" aria-label="${quest.title}, ${progress} of ${quest.target}"></progress>
        <button type="button" class="coin-reward-button" data-action="coin-claim-quest" data-quest-id="${quest.id}" ${complete ? "" : "disabled"}>Claim ${quest.reward} coins</button>
      </article>`;
    }).join("") || '<p class="quest-empty" role="status">All daily rewards collected. New quests arrive at 00:00 UTC.</p>'}</div>`;
}
function dismissCoinQuest(card, moveFocus) {
  const finish = () => {
    card.remove();
    renderCoinRewards();
    if (moveFocus && !accountModal.classList.contains("hidden")) {
      (accountModal.querySelector('.account-quest-card button:not(:disabled)') || accountModal.querySelector('.account-actions button'))?.focus({ preventScroll: true });
    }
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !card.animate) return finish();
  const motion = card.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-38px)", opacity: 0 }],
    { duration: 360, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
  coinQuestDismissals.set(card, motion);
  motion.finished.then(() => {
    if (coinQuestDismissals.get(card) !== motion) return;
    coinQuestDismissals.delete(card);
    finish();
    motion.cancel();
  }).catch(() => {});
}
function handleCoinClaim(button) {
  if (button.disabled) return;

  const rect = button.getBoundingClientRect();
  const moveFocus = button.matches(":focus-visible");
  let amount;
  try {
    amount = button.dataset.action === "coin-claim-level"
      ? coinWallet().claimLevel(Number(button.dataset.increment), currentLevel().level)
      : coinWallet().claimQuest(button.dataset.questId);
  } catch {
    showToast("Coins could not be saved in this browser. Please try again.");
    return;
  }
  if (!amount) { renderCoinRewards(); renderRankRoad(); return; }
  button.disabled = true;
  button.classList.add("is-claimed");
  button.setAttribute("aria-label", `${amount} coins collected`);
  document.getElementById("coinBalance").textContent = coinWalletState().balance.toLocaleString();
  const card = button.closest(".account-quest-card");
  if (card) dismissCoinQuest(card, moveFocus);
  window.CoinRewards.playCollection({ getBoundingClientRect: () => rect }, amount);
}
function awardPredictionCoins(mode, correct, source, delay, collection = null) {
  if (!["free", "daily", "ranked"].includes(mode)) return 0;
  const series = latestSeries;
  const dailyDate = mode === "daily" ? dailyRound?.data.date : "";
  const id = mode === "daily" ? dailyDate : mode === "ranked"
    ? `${currentSymbol.ticker}:${liveRound?.interval}:${liveRound?.targetStart}`
    : `${currentSymbol.ticker}:outcome:${series.at(-1)?.date?.getTime?.()}`;
  if (!id || mode !== "daily" && !series.length) return 0;
  try {
    const amount = coinWallet().recordPrediction({ mode, id, correct, dailyDate });
    renderCoinRewards();
    if (amount) window.CoinRewards.playCollection(source, amount, { delay, collection });
    return amount;
  } catch { showToast("Your result was saved, but coins could not be saved in this browser."); }
}
function rankedRoundId(round = liveRound) {
  return round ? `${round.symbol}:${round.interval}:${round.targetStart}` : "";
}
function rankedRoundWallet(round = liveRound) {
  return coinWallet();
}
function rankedRoundEntry(round = liveRound) {
  if (!round || round.walletOwner && round.walletOwner !== accountScopedKey(COINS_KEY)) return null;
  return coinWalletState().ranked.find(entry => entry.id === rankedRoundId(round));
}
function rankedRoundOpen(round = liveRound) {
  return Boolean(round && !round.resolved && !round.failed && !round.expired
    && Date.now() + round.clockOffset < (round.targetStart - 5) * 1000);
}
function rankedRoundCommitted(round = liveRound) {
  if (!round || round.resolved || round.failed || round.refunded) return false;
  if (round.walletOwner && round.walletOwner !== accountScopedKey(COINS_KEY)) return false;
  if (round.entrySaving || round.betSaving || round.serverSaving) return true;
  const entry = typeof rankedRoundEntry === "function" ? rankedRoundEntry(round) : null;
  if (entry?.status === "settled" || entry?.status === "refunded") return false;
  return Boolean(round.choice || round.serverAttemptId || round.entryPaid || entry?.status === "open");
}

function refundRankedRound(round = liveRound, { automatic = false } = {}) {
  if (!automatic && rankedRoundCommitted(round)) {
    showToast("You have bought into this Ranked round. Finish it before switching pages or charts.");
    return false;
  }
  if (!round?.walletOwner || round.resolved) return true;

  try {
    const amount = rankedRoundWallet(round).refundRanked(rankedRoundId(round));
    if (amount) {
      round.refunded = true;
      renderCoinRewards();
    }
    return true;
  } catch {
    showToast("The Ranked refund could not be saved. Please retry before leaving this round.");
    return false;
  }
}
function renderRankedCoins() {
  const panel = document.getElementById("rankedCoins");
  if (!panel) return;
  panel.hidden = appMode !== "ranked";
  if (panel.hidden) return;
  const state = coinWalletState();
  const entry = rankedRoundEntry();
  const open = rankedRoundOpen();
  const paid = entry?.status === "open";
  const canBet = open && paid && !liveRound.choice && !entry.choice && !liveRound.serverSaving && !liveRound.betSaving;
  const availableStake = state.balance + (entry?.stake || 0);
  const signature = JSON.stringify([state.balance, entry, open, liveRound?.choice, liveRound?.resolved, liveRound?.refunded, liveRound?.serverSaving, liveRound?.betSaving, liveRound?.entrySaving]);
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;
  const message = entry?.status === "settled"
    ? entry.stake ? entry.correct ? `Won: ${entry.stake * 2} coins returned (${entry.stake} profit).` : `Lost: ${entry.stake} coins staked.` : "Round complete. No bet placed."
    : entry?.status === "refunded" ? "Round cancelled. Entry fee and any bet refunded."
    : liveRound?.choice || entry?.choice ? entry?.stake ? `${entry.stake} coins locked. Correct: ${entry.stake * 2} returned. Wrong: stake lost.` : "Prediction locked. No bet placed."
    : liveRound?.serverSaving ? "Submitting prediction. Betting is closed."
    : !open ? "Betting is closed. Load a new future candle to enter a round."
    : !paid ? state.balance < 100 ? "You need 100 coins to enter. Earn coins in Free Play, Daily, or claim rewards in Progress." : "Pay the entry fee to unlock this round’s predictions."
    : liveRound.betSaving ? "Saving bet. Wait before predicting."
    : entry.stake ? `${entry.stake} coins bet. Submit a new amount to edit it before predicting.`
    : "Entry paid. Place an optional bet before predicting. You can edit it until you predict.";
  panel.innerHTML = `<div class="ranked-coins-heading"><strong>Ranked coins</strong><span><span class="gold-coin" aria-hidden="true">$</span> ${state.balance.toLocaleString()}</span></div>
    <p>Entry: <b>100 coins per round</b>. A correct bet returns your stake + equal profit. A wrong bet loses only your stake.</p>
    <button class="secondary" type="button" id="rankedBuyIn" ${!open || paid || liveRound?.entrySaving || entry?.status === "settled" || state.balance < 100 ? "disabled" : ""}>${paid || entry?.status === "settled" ? "Entry paid · 100 coins" : "Enter round · 100 coins"}</button>
    <form id="rankedBetForm"><label for="rankedBetAmount">Optional bet (coins)</label><div class="ranked-bet-controls"><input id="rankedBetAmount" type="number" inputmode="numeric" min="1" max="${availableStake}" step="1" value="${entry?.stake || Math.min(20, state.balance) || ""}" ${canBet && availableStake > 0 ? "" : "disabled"} aria-describedby="rankedBetTerms"><button class="secondary" type="submit" ${canBet && availableStake > 0 ? "" : "disabled"}>${entry?.stake ? "Update bet" : "Place bet"}</button></div></form>
    <p id="rankedBetTerms">Bet 20 → receive 40 if correct. Buying in locks this round until completion or an automatic refund. Prediction and stake lock five seconds before the candle starts.</p>
    <p class="ranked-coin-status" role="status" tabindex="-1">${message}</p>`;
  document.getElementById("rankedBuyIn").onclick = async () => {
    if (!rankedRoundOpen() || liveRound.choice || liveRound.entrySaving) return;
    const round = liveRound;
    round.entrySaving = true;
    round.walletOwner = accountScopedKey(COINS_KEY);
    renderRankedCoins();
    if (typeof syncNextChartButton === "function") syncNextChartButton();
    if (typeof syncLiveClock === "function") syncLiveClock();
    try {
      if (!await coinWallet().enterRanked(rankedRoundId(round), round.serverPuzzleId)) { showToast("Not enough coins, or this round has already been played."); return; }
      if (liveRound !== round) return;
      round.entryPaid = true;
      renderCoinRewards();
      renderChoices();
      syncLiveClock();
      document.querySelector('#choices button:not(:disabled)')?.focus({ preventScroll: true });
      saveReloadSession();
    } catch (error) {
      if (liveRound === round && (!error.status || error.status >= 500)
          && typeof coinWallet().refresh === "function") {
        // Recover a buy-in whose response was lost before allowing navigation.
        round.entryPaid = true;
        try {
          await coinWallet().refresh();
          if (liveRound === round) round.entryPaid = rankedRoundEntry(round)?.status === "open";
        } catch { /* Keep the round committed until it can be confirmed. */ }
      }
      showToast(error.message || "Entry payment could not be saved. No prediction was unlocked. Please try again.");
    }
    finally {
      round.entrySaving = false;
      if (liveRound === round) {
        renderRankedCoins();
        if (typeof syncNextChartButton === "function") syncNextChartButton();
        if (typeof syncLiveClock === "function") syncLiveClock();
        if (typeof saveReloadSession === "function") saveReloadSession();
      }
    }
  };
  document.getElementById("rankedBetForm").onsubmit = async event => {
    event.preventDefault();
    const round = liveRound;
    const entry = rankedRoundEntry();
    if (!rankedRoundOpen() || round.choice || round.serverSaving || round.betSaving || entry?.choice || entry?.status !== "open") return;
    const input = document.getElementById("rankedBetAmount");
    const amount = Number(input.value);
    round.betSaving = true;
    renderRankedCoins();
    document.querySelectorAll("#choices button").forEach(button => { button.disabled = true; });
    try {
      if (!await coinWallet().betRanked(rankedRoundId(round), amount)) { showToast("Enter a whole-coin bet within your balance, including your current stake. Bets lock when you predict."); return; }
      if (liveRound !== round) return;
      renderCoinRewards();
      saveReloadSession();
    } catch (error) { showToast(error.message || "Your bet could not be saved. Please try again."); }
    finally {
      round.betSaving = false;
      if (liveRound === round) {
        if (!round.choice && !round.serverSaving) renderChoices();
        renderRankedCoins();
        panel.querySelector('.ranked-coin-status')?.focus({ preventScroll: true });
      }
    }
  };
}
window.coinRewards = { recordPrediction: awardPredictionCoins };
window.setInterval(() => {
  if (!document.hidden && !accountModal.classList.contains("hidden")) renderCoinRewards();
}, 30000);

let rankRoadSelectedIndex = 0;
let rankRoadScrollTimer = 0;
let rankRoadInertiaFrame = 0;
let rankRoadOverscroll = 0;

function stopRankRoadInertia(resetEdge = true) {
  window.cancelAnimationFrame(rankRoadInertiaFrame);
  rankRoadInertiaFrame = 0;
  if (resetEdge) {
    rankRoadOverscroll = 0;
    document.getElementById("rankRoadTrack")?.style.removeProperty("transform");
  }
}

function rankRoadMaxScroll(viewport) {
  // Transforms can expand scrollWidth; measure the untransformed track instead.
  return Math.max(0, viewport.firstElementChild.offsetWidth - viewport.clientWidth);
}

function rankRoadDragPosition(viewport) {
  const limit = Math.min(90, viewport.clientWidth * 0.22);
  // Undo rubber-band resistance so grabbing a moving edge does not jump.
  const resistance = 0.45 * Math.max(0.01, 1 - Math.abs(rankRoadOverscroll) / limit);
  return viewport.scrollLeft + rankRoadOverscroll / resistance;
}

function setRankRoadPosition(viewport, position, resist = false) {
  const bounded = Math.max(0, Math.min(rankRoadMaxScroll(viewport), position));
  const excess = position - bounded;
  const limit = Math.min(90, viewport.clientWidth * 0.22);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  rankRoadOverscroll = reduced ? 0 : resist
    ? excess * 0.45 / (1 + Math.abs(excess) * 0.45 / limit)
    : Math.max(-limit, Math.min(limit, excess));
  viewport.firstElementChild.style.transform = rankRoadOverscroll ? `translateX(${-rankRoadOverscroll}px)` : "";
  viewport.scrollLeft = bounded;
}

function startRankRoadInertia(viewport, initialVelocity) {
  stopRankRoadInertia(false);
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    stopRankRoadInertia();
    return;
  }

  const limit = Math.min(90, viewport.clientWidth * 0.22);
  // Release at the speed of the resisted track, not the faster-moving pointer.
  const resistance = rankRoadOverscroll ? 0.45 * (1 - Math.abs(rankRoadOverscroll) / limit) ** 2 : 1;
  let velocity = Math.max(-2.8, Math.min(2.8, initialVelocity)) * resistance;
  let position = viewport.scrollLeft + rankRoadOverscroll;
  if (Math.abs(velocity) < 0.08 && !rankRoadOverscroll) return;
  let previousTime = performance.now();

  function coast(now) {
    const elapsed = Math.min(32, now - previousTime);
    previousTime = now;
    const maxScroll = rankRoadMaxScroll(viewport);
    // Exact spring/friction steps keep the return smooth across frame rates.
    for (let remaining = elapsed; remaining > 0;) {
      const step = Math.min(8, remaining);
      const edge = Math.max(0, Math.min(maxScroll, position));
      const stretch = position - edge;
      if (stretch) {
        // Critically damped: a prompt return without oscillation or an edge pause.
        const spring = 0.028;
        const decay = Math.exp(-spring * step);
        const travel = (velocity + spring * stretch) * step;
        position = edge + (stretch + travel) * decay;
        velocity = (velocity - spring * travel) * decay;
        if ((position - edge) * stretch <= 0) {
          position = edge;
          velocity = 0;
        }
      } else {
        const decay = Math.exp(-0.0044 * step);
        position += velocity * (1 - decay) / 0.0044;
        velocity *= decay;
      }
      remaining -= step;
    }
    setRankRoadPosition(viewport, position);
    // Keep the fractional position; scrollLeft can round away slow movement.

    if (Math.abs(velocity) > 0.018 || Math.abs(rankRoadOverscroll) > 0.4) {
      rankRoadInertiaFrame = window.requestAnimationFrame(coast);
    } else {
      stopRankRoadInertia();
    }
  }

  rankRoadInertiaFrame = window.requestAnimationFrame(coast);
}

function updateRankRoadSelection(index) {
  const track = document.getElementById("rankRoadTrack");
  if (!track) return;
  rankRoadSelectedIndex = Math.max(0, Math.min(track.children.length - 1, index));
  [...track.children].forEach((stop, stopIndex) => {
    const selected = stopIndex === rankRoadSelectedIndex;
    stop.classList.toggle("is-selected", selected);
  });
}

function showRankRoadLevel(index, behavior = "smooth") {
  stopRankRoadInertia();
  window.clearTimeout(rankRoadScrollTimer);
  const track = document.getElementById("rankRoadTrack");
  const viewport = document.getElementById("rankRoadViewport");
  const stop = track?.children[Math.max(0, Math.min(track.children.length - 1, index))];
  if (!stop || !viewport || !viewport.clientWidth) return;
  const left = stop === track.children[0] ? 0 : stop === track.children[track.children.length - 1]
    ? rankRoadMaxScroll(viewport)
    : Math.max(0, Math.min(rankRoadMaxScroll(viewport), stop.offsetLeft + stop.offsetWidth / 2 - viewport.clientWidth / 2));
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) behavior = "instant";
  viewport.scrollTo({ left, behavior });
  updateRankRoadSelection(index);
}

function renderRankRoad() {
  const track = document.getElementById("rankRoadTrack");
  if (!track) return;
  const current = currentLevel();
  const currentIndex = current.level;
  track.innerHTML = `<div class="rank-road-level rank-road-opening is-complete" role="listitem" aria-label="Opening Bell, start of your rank journey">
    <strong><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Z"/><path d="M10 20h4M12 2v2"/></svg>Opening Bell</strong>
    <span class="rank-road-segment" aria-hidden="true"></span>
    <small>Start</small>
  </div>` + levelLadder.map(item => {
    const isCurrent = item.level === current.level;
    const isComplete = item.level < current.level;
    const isMilestone = (item.tierIncrement - 1) % 4 === 0;
    const state = isCurrent ? "current" : isComplete ? "complete" : "locked";
    return `<div class="rank-road-level tier-${item.tierId} is-${state}${item.tierIncrement === 1 ? " is-rank-start" : ""}" role="listitem" aria-label="${item.title}, increment ${item.tierIncrement} of 20, ${state}" aria-current="${isCurrent ? "step" : "false"}">
      ${isMilestone ? `<strong>${item.title}</strong>` : ""}
      <span class="rank-road-segment" aria-hidden="true"></span>
      <small>${item.tierIncrement}</small>
    </div>`;
  }).join("");
  updateRankRoadSelection(currentIndex);
  requestAnimationFrame(() => {
    showRankRoadLevel(currentIndex, "instant");
  });
}

function renderAccountLevel() {
  const level = currentLevel(), next = nextReachableLevel(level);
  document.getElementById("accountLevel").textContent = `${level.tierName} • Level ${level.tierLevel}`;
  document.getElementById("accountTitle").textContent = accountDisplayName();
  const progress = document.getElementById("accountProgress");
  const bar = document.querySelector("#levelButton .xp span");
  const prevXp = levelLadder.find(item => item.title === level.title)?.xp ?? level.xp;
  bar.style.width = `${next.level === level.level ? 100 : Math.max(6, Math.min(100, (stats.xp - prevXp) / Math.max(1, next.xp - prevXp) * 100))}%`;
  progress.textContent = next.level === level.level ? "Maximum rank reached" : `${formatXp(next.xp - stats.xp)} to ${next.title}`;
  levelButton.setAttribute("aria-label", `Open progress and rewards. ${level.title}, ${formatXp(stats.xp)}`);
  renderRankRoad();
  renderCoinRewards();
}

function renderLevelsModal() {
  if (!levelCurrent || !levelList) return;
  const level = currentLevel();
  const next = nextReachableLevel(level);
  levelCurrent.className = `level-current tier-${level.tierId}`;
  levelCurrent.innerHTML = `<strong>Current rank: ${level.title}</strong>
    <span>Increment ${level.tierIncrement} of 20 • ${formatXp(stats.xp)} earned. ${next.level === level.level ? "You reached the final increment of Legendary 5." : `Next: ${next.title === level.title ? "the final increment" : next.title} at ${formatXp(next.xp)}.`}</span>`;
  levelList.innerHTML = rankTiers.map(tier => {
    const tierLevels = levelLadder.filter(item => item.tierId === tier.id && (item.tierIncrement - 1) % 4 === 0);
    return `<section class="rank-tier-group tier-${tier.id}">
      <header><div><span class="tier-medallion" aria-hidden="true"></span><strong>${tier.name}</strong></div><small>5 levels · 20 increments</small></header>
      <div class="rank-tier-levels">${tierLevels.map(item => {
        const unlocked = stats.xp >= item.xp;
        const status = unlocked ? "Unlocked" : `${formatXp(item.xp - stats.xp)} away`;
        return `<article class="${unlocked ? "unlocked" : ""}${item.title === level.title ? " current" : ""}">
          <span>${item.tierLevel}</span>
          <div><strong>${item.title}</strong><small>Increments ${item.tierIncrement}–${item.tierIncrement + 3} • ${formatXp(item.xp)} required</small></div>
          <em>${status}</em>
        </article>`;
      }).join("")}</div>
    </section>`;
  }).join("");
}

function openLevelsModal() {
  renderLevelsModal();
  openAccessibleModal(levelModal);
  levelClose?.focus();
}

function closeLevelsModal() {
  closeAccessibleModal(levelModal, levelButton);
}

function normalizeSymbol(value) {
  const raw = value.trim().toUpperCase();
  return aliases.get(raw) || raw;
}

const standalonePreview = DATABASES_DETACHED || location.protocol === "file:";
const localSymbols = [
  ["AAPL", "Apple Inc.", "stocks"], ["MSFT", "Microsoft Corporation", "stocks"], ["NVDA", "NVIDIA Corporation", "stocks"],
  ["TSLA", "Tesla Inc.", "stocks"], ["RIVN", "Rivian Automotive", "stocks"], ["GOOGL", "Alphabet Inc.", "stocks"], ["AMZN", "Amazon.com Inc.", "stocks"],
  ["AMD", "Advanced Micro Devices", "stocks"], ["CSCO", "Cisco Systems", "stocks"], ["INTC", "Intel Corporation", "stocks"],
  ["C", "Citigroup Inc.", "stocks"], ["BAC", "Bank of America Corporation", "stocks"], ["AIG", "American International Group", "stocks"],
  ["AAL", "American Airlines Group", "stocks"], ["ZM", "Zoom Video Communications", "stocks"], ["MRNA", "Moderna Inc.", "stocks"],
  ["GME", "GameStop Corp.", "stocks"], ["AMC", "AMC Entertainment", "stocks"], ["BB", "BlackBerry Ltd.", "stocks"],
  ["NOK", "Nokia Corporation", "stocks"], ["KOSS", "Koss Corporation", "stocks"], ["COIN", "Coinbase Global", "stocks"],
  ["MARA", "MARA Holdings", "stocks"], ["RIOT", "Riot Platforms", "stocks"], ["XOM", "Exxon Mobil", "stocks"],
  ["CVX", "Chevron Corporation", "stocks"], ["SPY", "S&P 500 ETF", "etfs"], ["QQQ", "Nasdaq 100 ETF", "etfs"],
  ["XLF", "Financial Select Sector SPDR Fund", "etfs"], ["SMH", "VanEck Semiconductor ETF", "etfs"], ["EWU", "iShares MSCI United Kingdom ETF", "etfs"],
  ["FXB", "Invesco CurrencyShares British Pound", "etfs"], ["GLD", "SPDR Gold Shares", "commodities"], ["USO", "United States Oil Fund", "commodities"],
  ["TLT", "20+ Year Treasury Bond ETF", "bonds"], ["BTC-USD", "Bitcoin USD", "crypto"], ["ETH-USD", "Ethereum USD", "crypto"],
  ["IEF", "7-10 Year Treasury Bond ETF", "bonds"], ["EURUSD=X", "EUR/USD", "forex"], ["GBPUSD=X", "GBP/USD", "forex"],
  ["EURGBP=X", "EUR/GBP", "forex"], ["CAD=X", "USD/CAD", "forex"], ["GC=F", "Gold Futures", "futures"],
  ["CL=F", "Crude Oil Futures", "futures"], ["ES=F", "S&P 500 Futures", "futures"], ["^GSPC", "S&P 500", "indices"],
  ["^IXIC", "Nasdaq Composite", "indices"], ["^VIX", "CBOE Volatility Index", "indices"], ["^FTSE", "FTSE 100", "indices"],
  ["DX-Y.NYB", "US Dollar Index", "macro"], ["SVXY", "ProShares Short VIX Short-Term Futures ETF", "etfs"]
];
const FREE_PLAY_RANDOM_KEY = "pretiumlabs-free-play-random-v1";
const freePlayAssetLabels = {
  stocks: "Stocks",
  crypto: "Crypto",
  forex: "Forex",
  indices: "Indices",
  etfs: "ETFs",
  commodities: "Commodities",
  futures: "Futures",
  bonds: "Bonds",
  macro: "Macro data"
};

function loadFreePlayRandomSettings() {
  const fallback = {
    mode: "both",
    randomSelected: false,
    assetSelected: false,
    instrumentSelected: false,
    manualSymbol: "",
    lastSymbol: "",
    hideScopeOverrideNotice: false,
    assetTypes: [],
    instruments: []
  };
  try {
    const stored = JSON.parse(localStorage.getItem(FREE_PLAY_RANDOM_KEY) || "null");
    if (!stored || typeof stored !== "object") return fallback;
    const lastSymbol = typeof stored.lastSymbol === "string" && stored.lastSymbol
      ? normalizeSymbol(stored.lastSymbol)
      : typeof stored.manualSymbol === "string" ? normalizeSymbol(stored.manualSymbol) : "";
    return {
      ...fallback,
      manualSymbol: lastSymbol,
      lastSymbol,
      hideScopeOverrideNotice: stored.hideScopeOverrideNotice === true
    };
  } catch {
    return fallback;
  }
}

let freePlayRandomSettings = loadFreePlayRandomSettings();
let freeRandomizerExpanded = false;
let freePlaySettingsExpanded = { asset: false, instrument: false };
const instrumentSearchQueries = { free: "" };

function saveFreePlayRandomSettings({ hideScopeOverrideNotice = loadFreePlayRandomSettings().hideScopeOverrideNotice } = {}) {
  // Chart settings in older tabs must preserve the latest explicit notice choice.
  freePlayRandomSettings = { ...freePlayRandomSettings, hideScopeOverrideNotice };
  writeBrowserPreference(FREE_PLAY_RANDOM_KEY, JSON.stringify(freePlayRandomSettings));
  if (typeof saveAccountDocument === "function") saveAccountDocument("settings");
}

async function api(path) {
  if (location.protocol === "file:") {
    throw new Error("Market data needs the application server. Open http://127.0.0.1:8766/index.html.");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    const headers = typeof accountHistoryHeaders === "function" && /^\/api\/(?:chart|live-chart|search|quote)\?/.test(path)
      ? await accountHistoryHeaders() : {};
    if (!DATABASES_DETACHED && path.includes("practice=") && !headers.Authorization) await ensureGuestProgress();
    response = await fetch(path, { signal: controller.signal, headers });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Market data timed out. Please try again in a moment.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.marketClosed === true) {
    const error = new Error(payload.error || "Request failed");
    error.marketClosed = payload.marketClosed === true;
    error.retryAfter = Number(response.headers.get("Retry-After") || payload.retryAfter) || 0;
    throw error;
  }
  return payload;
}

async function searchMarket(query) {
  if (!query.trim()) return [];
  const data = await api(`/api/search?q=${encodeURIComponent(query.trim())}`);
  return data.quotes || [];
}

async function quoteMarket(input) {
  const symbol = normalizeSymbol(input || "");
  if (!symbol) throw new Error("Type a real symbol first.");
  let data;
  try {
    data = await api(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
  } catch (error) {
    data = await quoteFromLatestChart(symbol, error.message);
  }
  if (!data?.price || Number(data.price) <= 0) {
    throw new Error(`No current quote available for ${symbol}.`);
  }
  return {
    ticker: normalizeSymbol(data.ticker || symbol),
    name: data.name || data.ticker || symbol,
    asset: data.asset || "stocks",
    exchange: data.exchange || "",
    currency: data.currency || "USD",
    price: Number(data.price),
    change: Number(data.change || 0),
    changePercent: Number(data.changePercent || 0),
    marketState: data.marketState || "",
    quoteTime: Number(data.quoteTime || Date.now() / 1000),
    source: data.source || "Market data",
    sourceNote: data.sourceNote || ""
  };
}

async function quoteFromLatestChart(symbol, reason = "") {
  const data = await api(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=5d&interval=5m`);
  const candles = Array.isArray(data.candles) ? data.candles : [];
  const last = candles.at(-1);
  const prior = candles.at(-2) || last;
  if (!last?.close) throw new Error(reason || `No current quote available for ${symbol}.`);
  const price = Number(last.close);
  const previous = Number(prior?.close || price);
  const change = price - previous;
  return {
    ticker: normalizeSymbol(data.ticker || symbol),
    name: data.name || data.ticker || symbol,
    asset: data.asset || "stocks",
    exchange: data.exchange || "",
    currency: data.currency || "USD",
    price,
    change,
    changePercent: previous ? (change / previous) * 100 : 0,
    marketState: /alpaca|yahoo/i.test(data.source || "") ? "LATEST_CHART" : "PREVIEW",
    quoteTime: Number(last.time || Date.now() / 1000),
    source: /alpaca|yahoo/i.test(data.source || "") ? `${data.source} latest chart` : data.source || "Latest chart",
    sourceNote: reason
  };
}

async function loadMarketChart(input, { randomWindow = false } = {}) {
  const savedReview = appMode === "review" && typeof reviewChartActive !== "undefined" && reviewChartActive ? findReviewTarget(activeReviewRecordId, activeReviewRound) : null;
  if (savedReview?.backend && savedReview.trust === "server") {
    const requestId = ++chartRequestId;
    const snapshot = await historyApi(`attempt?id=${encodeURIComponent(savedReview.id)}`);
    if (requestId !== chartRequestId || appMode !== "review") return false;
    if (!Array.isArray(snapshot.chartPreview) || snapshot.chartPreview.length < 2) throw new Error("Saved chart is unavailable.");
    Object.assign(savedReview, snapshot);
    currentSymbol = { ticker: snapshot.ticker, name: snapshot.name || snapshot.ticker, asset: snapshot.asset || "stocks" };
    rawCandles = snapshot.chartPreview.map(([at, open, high, low, close]) => ({ time: at / 1000, date: new Date(at), open, high, low, close }));
    loadCurrentSymbol();
    chartCitation.textContent = `${snapshot.source || "Saved market chart"} · saved puzzle snapshot`;
    return true;
  }
  if (appMode === "packs" && (!packChartActive || !activePackWindow)) {
    throw new Error("Event pack unavailable. Retry the pack to load its historical data.");
  }
  if (appMode === "ranked") return loadLivePuzzle(input);
  const requestId = ++chartRequestId;
  const symbol = normalizeSymbol(input);
  const config = timeframeConfig();
  const chartParams = activePackWindow
    ? `symbol=${encodeURIComponent(symbol)}&start=${encodeURIComponent(activePackWindow.start)}&end=${encodeURIComponent(activePackWindow.end)}&interval=1d`
    : `symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(config.range)}&interval=${encodeURIComponent(config.interval)}`;
  let data;
  const hiddenPrediction = !standalonePreview && (appMode === "free"
    || appMode === "packs" && !isEventPackPaper());
  try {
    data = await api(`/api/chart?${chartParams}${hiddenPrediction ? `&practice=${appMode}&timeframe=${encodeURIComponent(timeframe)}` : ""}`);
  } catch (error) {
    if (requestId !== chartRequestId) return false;
    throw error;
  }
  if (requestId !== chartRequestId) return false;
  if (hiddenPrediction && (typeof data.puzzleId !== "string" || !data.puzzleId.startsWith("hidden-v1:")
    || !Number.isInteger(data.observedEnd) || data.observedEnd < 1
    || !Array.isArray(data.candles) || data.candles.length !== data.observedEnd
    || !Array.isArray(data.candleTimes) || data.candleTimes.length <= data.observedEnd)) {
    throw new Error("This server does not support hidden prediction charts yet. Refresh after updating the server.");
  }
  if (appMode === "packs") {
    validateEventPackChart(data, symbol, activePackWindow);
    packDataVerified = true;
  }
  const localInfo = localSymbols.find(([ticker]) => ticker === normalizeSymbol(data.ticker || symbol));
  currentSymbol = {
    ticker: data.ticker,
    name: data.name && data.name !== data.ticker ? data.name : localInfo?.[1] || data.name || data.ticker,
    asset: data.asset || "stocks",
    exchange: data.exchange || "",
    currency: data.currency || ""
  };
  const lastVisible = data.candles.at(-1);
  const deliveredCandles = data.puzzleId ? data.candleTimes.map((time, index) => data.candles[index] || {
    time, open: lastVisible.close, high: lastVisible.close, low: lastVisible.close, close: lastVisible.close, volume: 0,
    ...(data.historyMasked ? { indexedPrice: true } : {}),
    ...(lastVisible.challengeIndex ? { challengeIndex: index + 1 } : {})
  }) : data.candles;
  const sourceCandles = deliveredCandles.map(item => ({ ...item, date: new Date(item.time * 1000) }));
  rawCandles = !data.puzzleId && !activePackWindow ? aggregateTimeframeCandles(sourceCandles, config) : sourceCandles;
  if (data.chartId && rawCandles.length) rawCandles[0].backendChartId = data.chartId;
  if (data.puzzleId && rawCandles.length) Object.assign(rawCandles[0], {
    backendPuzzleId: data.puzzleId, backendObservedEnd: data.observedEnd
  });
  if (data.puzzleId && typeof trackPredictionVisibility === "function") trackPredictionVisibility(data.puzzleId);
  const minimumCandles = config.minimumCandles ?? (["1D", "1m", "2m", "3m", "5m"].includes(timeframe) ? 20 : timeframe === "5D" ? 30 : 40);
  if (rawCandles.length < minimumCandles) throw new Error(`Not enough market history for ${symbol}`);
  chartWindowStart = null;
  chartWindowScale = 1;
  challengeObservedRatio = .64;
  if (randomWindow && !config.fullRange && !data.puzzleId) randomizeCurrentChartWindow();
  loadCurrentSymbol();
  return true;
}

function aggregateCandles(candles, groupSize) {
  const aggregated = [];
  for (let i = 0; i < candles.length; i += groupSize) {
    const group = candles.slice(i, i + groupSize);
    if (group.length < groupSize) continue;
    aggregated.push({
      time: group[0].time,
      date: group[0].date,
      open: group[0].open,
      high: Math.max(...group.map(item => item.high)),
      low: Math.min(...group.map(item => item.low)),
      close: group.at(-1).close,
      volume: group.reduce((sum, item) => sum + (item.volume || 0), 0)
    });
  }
  return aggregated;
}

function aggregateTimeframeCandles(candles, config) {
  if (!config.bucketSeconds && !config.calendarMonths) {
    return config.aggregate ? aggregateCandles(candles, config.aggregate) : candles;
  }
  const groups = new Map();
  const sessions = new Map();
  for (const bar of candles) {
    const date = new Date(bar.time * 1000);
    const day = date.toISOString().slice(0, 10);
    if (!sessions.has(day)) sessions.set(day, bar.time);
    const key = config.calendarMonths
      ? date.getUTCFullYear() * 12 + Math.floor(date.getUTCMonth() / config.calendarMonths) * config.calendarMonths
      : `${day}:${Math.floor((bar.time - sessions.get(day)) / config.bucketSeconds)}`;
    const group = groups.get(key);
    if (!group) groups.set(key, { ...bar });
    else {
      group.high = Math.max(group.high, bar.high);
      group.low = Math.min(group.low, bar.low);
      group.close = bar.close;
      group.volume = (group.volume || 0) + (bar.volume || 0);
    }
  }
  return [...groups.values()];
}

function timeframeSize() {
  if (rawCandles[0]?.indexedPrice) return rawCandles.length;
  const config = timeframeConfig();
  if (config.fullRange) return rawCandles.length;
  if (config.windowDays && rawCandles.length) {
    const cutoff = rawCandles.at(-1).time - config.windowDays * 86400;
    return rawCandles.filter(bar => bar.time > cutoff).length;
  }
  const desired = {
    "1m": 180, "2m": 180, "3m": 160, "5m": 150, "10m": 150, "15m": 140, "30m": 140, "45m": 140, "1h": 160, "2h": 160, "3h": 160, "4h": 160,
    "1d": 180, "1w": 156, "1mo": 120, "3mo": 80, "6mo": 60, "12mo": 48,
    "1D": 78, "5D": 130, "1M": 48, "3M": 72, "6M": 118, "1Y": 180, "5Y": 240
  }[timeframe];
  return Math.min(desired, rawCandles.length);
}

function timeframeConfigFor(value = timeframe) {
  return {
    "1m": { range: "1d", interval: "1m" },
    "2m": { range: "5d", interval: "2m" },
    "3m": { range: "5d", interval: "1m", aggregate: 3 },
    "5m": { range: "5d", interval: "5m" },
    "10m": { range: "5d", interval: "5m", bucketSeconds: 600 },
    "15m": { range: "1mo", interval: "15m" },
    "30m": { range: "1mo", interval: "30m" },
    "45m": { range: "1mo", interval: "15m", bucketSeconds: 2700 },
    "1h": { range: "3mo", interval: "60m" },
    "2h": { range: "3mo", interval: "60m", bucketSeconds: 7200 },
    "3h": { range: "6mo", interval: "60m", bucketSeconds: 10800 },
    "4h": { range: "6mo", interval: "60m", aggregate: 4 },
    "1d": { range: "5y", interval: "1d" },
    "1w": { range: "max", interval: "1wk" },
    "1mo": { range: "max", interval: "1mo", minimumCandles: 2 },
    "3mo": { range: "max", interval: "1mo", calendarMonths: 3, minimumCandles: 2 },
    "6mo": { range: "max", interval: "1mo", calendarMonths: 6, minimumCandles: 2 },
    "12mo": { range: "max", interval: "1mo", calendarMonths: 12, minimumCandles: 2 },
    "1D": { range: "1d", interval: "5m" },
    "5D": { range: "5d", interval: "15m" },
    "1W": { range: "1mo", interval: "15m", windowDays: 7 },
    "2W": { range: "1mo", interval: "30m", windowDays: 14 },
    "1M": { range: "6mo", interval: "1d" },
    "3M": { range: "1y", interval: "1d" },
    "6M": { range: "2y", interval: "1d" },
    "YTD": { range: "ytd", interval: "1d", fullRange: true, minimumCandles: 2 },
    "1Y": { range: "5y", interval: "1d" },
    "5Y": { range: "10y", interval: "1wk" },
    "All": { range: "max", interval: "1mo", fullRange: true, minimumCandles: 2 }
  }[value];
}

function timeframeConfig() {
  return timeframeConfigFor(timeframe);
}

function seededStart(maxStart) {
  const key = `${currentSymbol.ticker}:${timeframe}:${appMode === "daily" ? selectedDailyDate : ""}`;
  const seed = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Math.max(0, seed % Math.max(1, maxStart + 1));
}

function randomStartAfter(currentStart, maxStart) {
  if (maxStart < 1) return 0;
  const offset = 1 + Math.floor(Math.random() * maxStart);
  return (currentStart + offset) % (maxStart + 1);
}

function scaledChartWindowCount(baseCount) {
  const minimum = Math.min(24, rawCandles.length);
  return Math.min(rawCandles.length, Math.max(minimum, Math.floor(baseCount * chartWindowScale)));
}

function randomizeCurrentChartWindow() {
  if (!rawCandles.length) return false;
  const scales = [.76, .82, .88, .94, 1];
  const scaleAlternatives = scales.filter(scale => scale !== chartWindowScale);
  chartWindowScale = randomItem(scaleAlternatives) || .88;
  if (timeframeConfig().windowDays) chartWindowScale = 1;
  const baseCount = appMode === "quant"
    ? Math.min(Math.max(120, timeframeSize() * 2), rawCandles.length)
    : Math.min(timeframeSize(), rawCandles.length);
  const count = scaledChartWindowCount(baseCount);
  const maxStart = Math.max(0, rawCandles.length - count);
  const defaultStart = appMode === "paper" || appMode === "quant" ? maxStart : seededStart(maxStart);
  const currentStart = Number.isInteger(chartWindowStart)
    ? Math.max(0, Math.min(maxStart, chartWindowStart))
    : defaultStart;
  chartWindowStart = randomStartAfter(currentStart, maxStart);

  // A different crop or reveal split can still end at an already-paid outcome.
  // Prefer fresh endpoints from the account's loaded history, preserving replay
  // practice when every endpoint in this download has already been played.
  if (appMode === "free" && typeof practiceHistory !== "undefined") {
    const playedEnds = new Set(practiceHistory
      .filter(record => record.ticker === currentSymbol.ticker
        && ["free", "packs"].includes(record.mode))
      .map(record => Date.parse(record.windowEnd) / 1000));
    if (playedEnds.has(rawCandles[chartWindowStart + count - 1]?.time)) {
      const freshStarts = Array.from({ length: maxStart + 1 }, (_, start) => start)
        .filter(start => !playedEnds.has(rawCandles[start + count - 1]?.time));
      if (freshStarts.length) chartWindowStart = randomItem(freshStarts);
    }
  }

  if (appMode !== "paper" && appMode !== "quant") {
    const ratios = [.56, .6, .64, .68, .72];
    const alternatives = ratios.filter(ratio => ratio !== challengeObservedRatio);
    challengeObservedRatio = randomItem(alternatives) || .64;
  }
  return true;
}

function challengeCandles() {
  if (appMode === "daily") return dailyChallengeCandles();
  if (["free", "packs"].includes(appMode) && rawCandles[0]?.backendPuzzleId) {
    const observedEnd = rawCandles[0].backendObservedEnd;
    return rawCandles.map((bar, index) => ({ ...bar, future: index >= observedEnd, observedEnd }));
  }
  if (appMode === "review" && reviewChartActive) {
    const saved = findReviewTarget(activeReviewRecordId, activeReviewRound);
    if (saved?.backend && saved.trust === "server") return rawCandles.map((bar, index) => ({ ...bar, future: index >= saved.chartObservedEnd, observedEnd: saved.chartObservedEnd }));
  }
  if (typeof liveRound !== "undefined" && appMode === "ranked") {
    if (!liveRound) return [];
    // History stays fixed during a round; pointer/cloud redraws can reuse it.
    const cached = liveRound.seriesCache;
    if (cached?.candles === rawCandles && cached.outcome === liveRound.outcome
      && cached.answer === liveRound.answer) return cached.series;
    const known = rawCandles.map(bar => ({ ...bar, future: false, observedEnd: rawCandles.length }));
    const last = known.at(-1);
    if (!last) return [];
    // The future slot has no market prices until the provider confirms its close.
    const series = [...known, { ...(liveRound.outcome || { time: liveRound.targetStart,
      date: new Date(liveRound.targetStart * 1000), open: last.close, high: last.close,
      low: last.close, close: last.close, volume: 0 }), future: true, observedEnd: known.length, liveAnswer: liveRound.answer }];
    liveRound.seriesCache = { candles: rawCandles, outcome: liveRound.outcome, answer: liveRound.answer, series };
    return series;
  }
  const count = scaledChartWindowCount(Math.min(timeframeSize(), rawCandles.length));
  const maxStart = Math.max(0, rawCandles.length - count);
  const start = Number.isInteger(chartWindowStart)
    ? Math.max(0, Math.min(maxStart, chartWindowStart))
    : seededStart(maxStart);
  const window = rawCandles.slice(start, start + count).map(item => ({ ...item }));
  const shortHistory = ["YTD", "All", "1mo", "3mo", "6mo", "12mo"].includes(timeframe);
  const observedEnd = Math.min(window.length - (shortHistory ? 1 : 0), Math.max(shortHistory ? 1 : 24, Math.floor(window.length * challengeObservedRatio)));
  return window.map((bar, idx) => ({ ...bar, future: idx >= observedEnd, observedEnd }));
}

function currentChartCandles() {
  const count = scaledChartWindowCount(Math.min(timeframeSize(), rawCandles.length));
  const maxStart = Math.max(0, rawCandles.length - count);
  const start = Number.isInteger(chartWindowStart)
    ? Math.max(0, Math.min(maxStart, chartWindowStart))
    : maxStart;
  const window = rawCandles.slice(start, start + count).map(item => ({ ...item }));
  return window.map((bar, index) => ({ ...bar, future: false, observedEnd: window.length, currentIndex: index }));
}

function quantSeries() {
  const count = scaledChartWindowCount(Math.min(Math.max(120, timeframeSize() * 2), rawCandles.length));
  const maxStart = Math.max(0, rawCandles.length - count);
  const start = Number.isInteger(chartWindowStart)
    ? Math.max(0, Math.min(maxStart, chartWindowStart))
    : maxStart;
  return rawCandles.slice(start, start + count).map((bar, index) => ({ ...bar, i: index, future: false, observedEnd: count }));
}

function quantRiskMultiplier() {
  const base = { conservative: 0.6, balanced: 1, aggressive: 1.25 }[quantConfig.risk] || 1;
  const maxExposure = Math.max(5, Math.min(150, Number(quantConfig.maxExposurePct) || 100)) / 100;
  return Math.min(1.5, Math.max(0.05, base * maxExposure));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function stdev(values) {
  const avg = mean(values);
  const variance = mean(values.map(value => (value - avg) ** 2));
  return Math.sqrt(Math.max(variance, 0));
}

function movingAverageValue(series, index, lookback) {
  if (index < lookback - 1) return null;
  const values = series.slice(index - lookback + 1, index + 1).map(bar => Number(bar.close));
  return mean(values);
}

function highestValue(series, index, lookback, field = "high") {
  const start = Math.max(0, index - lookback + 1);
  return Math.max(...series.slice(start, index + 1).map(bar => Number(bar[field] ?? bar.close)));
}

function lowestValue(series, index, lookback, field = "low") {
  const start = Math.max(0, index - lookback + 1);
  return Math.min(...series.slice(start, index + 1).map(bar => Number(bar[field] ?? bar.close)));
}

function atrValue(series, index, lookback = 14) {
  const start = Math.max(1, index - lookback + 1);
  const ranges = [];
  for (let i = start; i <= index; i += 1) {
    const high = Number(series[i]?.high || 0);
    const low = Number(series[i]?.low || 0);
    const priorClose = Number(series[i - 1]?.close || series[i]?.close || 0);
    ranges.push(Math.max(high - low, Math.abs(high - priorClose), Math.abs(low - priorClose)));
  }
  return mean(ranges);
}

function rsiValue(series, index, lookback = 14) {
  if (index < 1) return 50;
  const start = Math.max(1, index - lookback + 1);
  let gains = 0;
  let losses = 0;
  for (let i = start; i <= index; i += 1) {
    const change = Number(series[i].close) - Number(series[i - 1].close);
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  if (!losses) return 100;
  const rs = gains / Math.max(losses, 0.000001);
  return 100 - (100 / (1 + rs));
}

function buildQuantContext(series, index, state = {}) {
  const bar = series[index] || {};
  const prior = series[index - 1] || bar;
  const close = Number(bar.close || 0);
  const priorClose = Number(prior.close || close);
  const entryPrice = Number(state.entryPrice || close);
  const unrealized = state.position ? (close - entryPrice) / Math.max(entryPrice, 0.01) : 0;
  const maxExposure = Math.max(5, Math.min(150, Number(quantConfig.maxExposurePct) || 100)) / 100;
  const ctx = {
    open: Number(bar.open || close),
    high: Number(bar.high || close),
    low: Number(bar.low || close),
    close,
    volume: Number(bar.volume || 0),
    prevClose: priorClose,
    return1: priorClose ? (close - priorClose) / priorClose : 0,
    position: Number(state.position || 0),
    equity: Number(state.equity || 1),
    drawdown: Number(state.peak ? (state.equity / state.peak) - 1 : 0),
    unrealized,
    barsHeld: Number(state.barsHeld || 0),
    fast: Number(quantConfig.fast || 12),
    slow: Number(quantConfig.slow || 36),
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    sqrt: Math.sqrt,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    clamp: (value, minValue, maxValue) => Math.max(minValue, Math.min(maxValue, value)),
    ma: lookback => movingAverageValue(series, index, Math.max(1, Math.round(Number(lookback) || 1))) || close,
    ema: lookback => {
      const period = Math.max(1, Math.round(Number(lookback) || 1));
      const multiplier = 2 / (period + 1);
      let ema = Number(series[0]?.close || close);
      for (let i = 1; i <= index; i += 1) ema = (Number(series[i].close) - ema) * multiplier + ema;
      return ema;
    },
    roc: lookback => {
      const offset = Math.max(1, Math.round(Number(lookback) || 1));
      const past = Number(series[Math.max(0, index - offset)]?.close || close);
      return past ? (close - past) / past : 0;
    },
    highest: lookback => highestValue(series, index, Math.max(1, Math.round(Number(lookback) || 1))),
    lowest: lookback => lowestValue(series, index, Math.max(1, Math.round(Number(lookback) || 1))),
    zscore: lookback => {
      const period = Math.max(2, Math.round(Number(lookback) || 20));
      const start = Math.max(0, index - period + 1);
      const values = series.slice(start, index + 1).map(item => Number(item.close));
      const avg = mean(values);
      const sigma = stdev(values) || Math.max(close * 0.004, 0.01);
      return (close - avg) / sigma;
    },
    atr: lookback => atrValue(series, index, Math.max(1, Math.round(Number(lookback) || 14))),
    rsi: lookback => rsiValue(series, index, Math.max(2, Math.round(Number(lookback) || 14))),
    volAvg: lookback => {
      const period = Math.max(1, Math.round(Number(lookback) || 20));
      const start = Math.max(0, index - period + 1);
      return mean(series.slice(start, index + 1).map(item => Number(item.volume || 0)));
    },
    crossOver: (a, b) => {
      const fastNow = movingAverageValue(series, index, Math.max(1, Math.round(Number(a) || 1)));
      const slowNow = movingAverageValue(series, index, Math.max(1, Math.round(Number(b) || 1)));
      const fastPrev = movingAverageValue(series, index - 1, Math.max(1, Math.round(Number(a) || 1)));
      const slowPrev = movingAverageValue(series, index - 1, Math.max(1, Math.round(Number(b) || 1)));
      return Boolean(fastPrev && slowPrev && fastNow > slowNow && fastPrev <= slowPrev);
    },
    crossUnder: (a, b) => {
      const fastNow = movingAverageValue(series, index, Math.max(1, Math.round(Number(a) || 1)));
      const slowNow = movingAverageValue(series, index, Math.max(1, Math.round(Number(b) || 1)));
      const fastPrev = movingAverageValue(series, index - 1, Math.max(1, Math.round(Number(a) || 1)));
      const slowPrev = movingAverageValue(series, index - 1, Math.max(1, Math.round(Number(b) || 1)));
      return Boolean(fastPrev && slowPrev && fastNow < slowNow && fastPrev >= slowPrev);
    },
    risk: riskPct => {
      const atrPct = atrValue(series, index, 14) / Math.max(close, 0.01);
      return Math.max(0.05, Math.min(maxExposure, (Number(riskPct) || 0.01) / Math.max(atrPct, 0.004)));
    }
  };
  return ctx;
}

const quantLanguages = {
  python: {
    label: "Python",
    template: `def entry():
    return ma(8) > ma(24) and close > ma(24)

def exit():
    return ma(8) < ma(24) or drawdown < -0.08

def size():
    return risk(0.01)`
  },
  cpp: {
    label: "C++",
    template: `bool entry() {
  return ma(8) > ma(24) && close > ma(24);
}

bool exit() {
  return ma(8) < ma(24) || drawdown < -0.08;
}

double size() {
  return risk(0.01);
}`
  },
  java: {
    label: "Java",
    template: `boolean entry() {
  return ma(8) > ma(24) && close > ma(24);
}

boolean exit() {
  return ma(8) < ma(24) || drawdown < -0.08;
}

double size() {
  return risk(0.01);
}`
  },
  csharp: {
    label: "C#",
    template: `bool Entry() {
  return ma(8) > ma(24) && close > ma(24);
}

bool Exit() {
  return ma(8) < ma(24) || drawdown < -0.08;
}

double Size() {
  return risk(0.01);
}`
  },
  matlab: {
    label: "MATLAB",
    template: `function out = entry()
out = ma(8) > ma(24) && close > ma(24);
end

function out = exit()
out = ma(8) < ma(24) || drawdown < -0.08;
end

function out = size()
out = risk(0.01);
end`
  },
  scala: {
    label: "Scala",
    template: `def entry: Boolean = ma(8) > ma(24) && close > ma(24)
def exit: Boolean = ma(8) < ma(24) || drawdown < -0.08
def size: Double = risk(0.01)`
  },
  julia: {
    label: "Julia",
    template: `entry() = ma(8) > ma(24) && close > ma(24)
exit() = ma(8) < ma(24) || drawdown < -0.08
size() = risk(0.01)`
  }
};

let quantCompiledExpressions = Object.create(null);
const quantExpressionLimits = { length: 320, tokens: 140, depth: 24, args: 4, value: 1e12 };
const quantHelperNames = new Set(["ma", "ema", "rsi", "atr", "roc", "highest", "lowest", "zscore", "volAvg", "crossOver", "crossUnder", "risk"]);
const quantVariableNames = new Set(["close", "open", "high", "low", "volume", "return1", "drawdown", "unrealized", "barsHeld", "position", "entryPrice", "equity"]);
const quantLiteralNames = new Set(["true", "false", "null"]);

function quantLanguageOptions() {
  return Object.entries(quantLanguages).map(([id, language]) => `<option value="${id}" ${quantConfig.customLanguage === id ? "selected" : ""}>${language.label}</option>`).join("");
}

function quantLanguageTemplate(language = quantConfig.customLanguage) {
  return quantLanguages[language]?.template || quantLanguages.python.template;
}

function cleanQuantSource(source = "") {
  return String(source).replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(line => line.replace(/#.*/, "").replace(/\/\/.*/, "")).join("\n");
}

function normalizeQuantExpression(expression = "") {
  return String(expression)
    .trim()
    .replace(/;\s*$/, "")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b|\bnothing\b|\bnull\b/g, "0")
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!")
    .replace(/~=|≠/g, "!=")
    .replace(/\bMath\./g, "Math.")
    .replace(/\bctx\./g, "ctx.");
}

function quantSourceLooksSafe(source) {
  const text = String(source || "");
  const blocked = /(?:window|document|fetch|localStorage|sessionStorage|XMLHttpRequest|WebSocket|navigator|location|using\s+namespace|os\.|sys\.|java\.|javax\.|System\.|Console\.|IO\.|net\.|fs\.|globalThis|constructor|prototype|__proto__|\b(?:eval|import|include|require|system|exec|spawn|process|Runtime|getRuntime|reflection|reflect|unsafe|socket|http|https|file|read|write|delete|remove|class|struct|while|for|switch|try|catch|throw|new|lambda|subprocess|this)\b)/i;
  return !blocked.test(text) && !/[^0-9A-Za-z_+\-*/%<>=!&|().,{};\s?:]/.test(text);
}

function quantExpressionError(message) {
  const error = new Error(message);
  error.name = "QuantExpressionError";
  return error;
}

function tokenizeQuantExpression(expression = "") {
  const source = String(expression || "").trim();
  if (!source) throw quantExpressionError("Formula is empty.");
  if (source.length > quantExpressionLimits.length) throw quantExpressionError("Formula is too long.");
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const pair = source.slice(index, index + 2);
    if (["&&", "||", "<=", ">=", "==", "!="].includes(pair)) {
      tokens.push({ type: "op", value: pair });
      index += 2;
      continue;
    }
    if ("+-*/%<>!?:".includes(char)) {
      tokens.push({ type: "op", value: char });
      index += 1;
      continue;
    }
    if (char === "(" || char === ")" || char === ",") {
      tokens.push({ type: char, value: char });
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
      if (!match) throw quantExpressionError(`Unsupported number near "${source.slice(index, index + 8)}".`);
      const value = Number(match[0]);
      if (!Number.isFinite(value) || Math.abs(value) > quantExpressionLimits.value) throw quantExpressionError("Number is outside the safe range.");
      tokens.push({ type: "number", value });
      index += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = source.slice(index).match(/^[A-Za-z_]\w*/);
      tokens.push({ type: "name", value: match[0] });
      index += match[0].length;
      continue;
    }
    throw quantExpressionError(`Unsupported token "${char}".`);
  }
  if (tokens.length > quantExpressionLimits.tokens) throw quantExpressionError("Formula has too many tokens.");
  return tokens;
}

function parseQuantExpression(expression = "") {
  const tokens = tokenizeQuantExpression(expression);
  let index = 0;
  const peek = value => tokens[index]?.value === value;
  const take = value => {
    if (!peek(value)) return false;
    index += 1;
    return true;
  };
  const expect = value => {
    if (!take(value)) throw quantExpressionError(`Expected "${value}".`);
  };
  const boundedNode = (type, fields, depth) => {
    if (depth > quantExpressionLimits.depth) throw quantExpressionError("Formula is nested too deeply.");
    return { type, ...fields };
  };
  const parsePrimary = depth => {
    const token = tokens[index];
    if (!token) throw quantExpressionError("Formula ended unexpectedly.");
    if (token.type === "number") {
      index += 1;
      return boundedNode("number", { value: token.value }, depth);
    }
    if (token.type === "name") {
      index += 1;
      const name = token.value;
      if (take("(")) {
        if (!quantHelperNames.has(name)) throw quantExpressionError(`${name} is not an allowed helper.`);
        const args = [];
        if (!take(")")) {
          do {
            args.push(parseTernary(depth + 1));
            if (args.length > quantExpressionLimits.args) throw quantExpressionError(`${name} has too many arguments.`);
          } while (take(","));
          expect(")");
        }
        return boundedNode("call", { name, args }, depth);
      }
      if (!quantVariableNames.has(name) && !quantLiteralNames.has(name)) throw quantExpressionError(`${name} is not an allowed variable.`);
      return boundedNode("name", { name }, depth);
    }
    if (take("(")) {
      const node = parseTernary(depth + 1);
      expect(")");
      return node;
    }
    throw quantExpressionError(`Unexpected token "${token.value}".`);
  };
  const parseUnary = depth => {
    const token = tokens[index];
    if (token?.type === "op" && ["!", "-", "+"].includes(token.value)) {
      index += 1;
      return boundedNode("unary", { op: token.value, argument: parseUnary(depth + 1) }, depth);
    }
    return parsePrimary(depth);
  };
  const parseBinary = (parseNext, ops, depth) => {
    let left = parseNext(depth + 1);
    while (tokens[index]?.type === "op" && ops.includes(tokens[index].value)) {
      const op = tokens[index].value;
      index += 1;
      left = boundedNode("binary", { op, left, right: parseNext(depth + 1) }, depth);
    }
    return left;
  };
  const parseMultiplicative = depth => parseBinary(parseUnary, ["*", "/", "%"], depth);
  const parseAdditive = depth => parseBinary(parseMultiplicative, ["+", "-"], depth);
  const parseComparison = depth => parseBinary(parseAdditive, ["<", "<=", ">", ">="], depth);
  const parseEquality = depth => parseBinary(parseComparison, ["==", "!="], depth);
  const parseAnd = depth => parseBinary(parseEquality, ["&&"], depth);
  const parseOr = depth => parseBinary(parseAnd, ["||"], depth);
  function parseTernary(depth = 0) {
    const condition = parseOr(depth + 1);
    if (!take("?")) return condition;
    const whenTrue = parseTernary(depth + 1);
    expect(":");
    const whenFalse = parseTernary(depth + 1);
    return boundedNode("conditional", { condition, whenTrue, whenFalse }, depth);
  }
  const ast = parseTernary();
  if (index !== tokens.length) throw quantExpressionError(`Unexpected token "${tokens[index].value}".`);
  return ast;
}

function validateQuantExpression(expression) {
  try {
    return { ok: true, ast: parseQuantExpression(expression) };
  } catch (error) {
    return { ok: false, message: error.message || "Formula could not be parsed." };
  }
}

function expressionLooksSafe(expression) {
  return validateQuantExpression(expression).ok;
}

function extractReturnExpression(body = "") {
  const returnMatch = body.match(/return\s+([^;\n}]+)/i);
  if (returnMatch) return returnMatch[1];
  const assignmentMatch = body.match(/(?:out|signal|position|size|result)\s*=\s*([^;\n]+)/i);
  return assignmentMatch?.[1] || "";
}

function extractQuantExpression(source, language, name) {
  const names = name === "entry" ? ["entry", "Entry"] : name === "exit" ? ["exit", "Exit"] : ["size", "Size"];
  for (const fn of names) {
    if (language === "python") {
      const match = source.match(new RegExp(`def\\s+${fn}\\s*\\([^)]*\\)\\s*:\\s*([\\s\\S]*?)(?=\\ndef\\s+|$)`, "i"));
      const expr = extractReturnExpression(match?.[1] || "");
      if (expr) return expr;
    } else if (["cpp", "java", "csharp"].includes(language)) {
      const match = source.match(new RegExp(`(?:bool|boolean|double|float|int|decimal)\\s+${fn}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\}`, "i"));
      const expr = extractReturnExpression(match?.[1] || "");
      if (expr) return expr;
    } else if (language === "matlab") {
      const match = source.match(new RegExp(`function\\s+\\w+\\s*=\\s*${fn}\\s*\\([^)]*\\)([\\s\\S]*?)\\bend`, "i"));
      const expr = extractReturnExpression(match?.[1] || "");
      if (expr) return expr;
    } else if (language === "scala") {
      const inline = source.match(new RegExp(`def\\s+${fn}\\s*(?::\\s*[A-Za-z0-9_\\[\\]]+)?\\s*=\\s*([^\\n]+)`, "i"));
      if (inline?.[1]) return inline[1];
      const block = source.match(new RegExp(`def\\s+${fn}\\s*(?::\\s*[A-Za-z0-9_\\[\\]]+)?\\s*=\\s*\\{([\\s\\S]*?)\\}`, "i"));
      const expr = extractReturnExpression(block?.[1] || "");
      if (expr) return expr;
    } else if (language === "julia") {
      const inline = source.match(new RegExp(`${fn}\\s*\\([^)]*\\)\\s*=\\s*([^\\n]+)`, "i"));
      if (inline?.[1]) return inline[1];
      const block = source.match(new RegExp(`function\\s+${fn}\\s*\\([^)]*\\)([\\s\\S]*?)\\bend`, "i"));
      const expr = extractReturnExpression(block?.[1] || "");
      if (expr) return expr;
    }
  }
  return "";
}

function compileQuantCode() {
  const language = quantLanguages[quantConfig.customLanguage] ? quantConfig.customLanguage : "python";
  quantConfig.customLanguage = language;
  quantCompiledExpressions = Object.create(null);
  const rawSource = String(quantConfig.customCode || quantLanguageTemplate(language)).slice(0, 5000);
  quantConfig.customCode = rawSource;
  const compiled = compileQuantSource(rawSource, language);
  if (!compiled.ok) return compiled;
  quantConfig.customEntry = compiled.expressions.entry;
  quantConfig.customExit = compiled.expressions.exit;
  quantConfig.customSize = compiled.expressions.size;
  quantCompiledExpressions = compiled.parsed;
  return compiled;
}

function compileQuantSource(rawSource, language) {
  const source = cleanQuantSource(rawSource);
  if (!source.trim()) return { ok: false, message: "Compiler error: strategy code is empty." };
  if (!quantSourceLooksSafe(source)) {
    return { ok: false, message: "Compiler blocked unsafe code. Use only entry, exit, size, local variables, and Quant Lab helper functions." };
  }
  const entry = normalizeQuantExpression(extractQuantExpression(source, language, "entry"));
  const exit = normalizeQuantExpression(extractQuantExpression(source, language, "exit"));
  const size = normalizeQuantExpression(extractQuantExpression(source, language, "size"));
  if (!entry || !exit || !size) {
    return { ok: false, message: `Compiler error: ${quantLanguages[language].label} strategy must define entry, exit, and size functions.` };
  }
  const compiled = { entry, exit, size };
  const parsed = Object.create(null);
  for (const [key, expr] of Object.entries(compiled)) {
    const validation = validateQuantExpression(expr);
    if (!validation.ok) return { ok: false, message: `Compiler blocked unsafe ${key} expression: ${validation.message}` };
    parsed[expr] = validation.ast;
  }
  return { ok: true, language, expressions: compiled, parsed, message: `${quantLanguages[language].label} strategy compiled locally.` };
}

function safeQuantNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > quantExpressionLimits.value) throw quantExpressionError("Formula produced a value outside the safe range.");
  return number;
}

function evaluateQuantAst(ast, ctx) {
  if (!ast) throw quantExpressionError("Formula did not parse.");
  if (ast.type === "number") return ast.value;
  if (ast.type === "name") {
    if (ast.name === "true") return true;
    if (ast.name === "false") return false;
    if (ast.name === "null") return 0;
    if (!quantVariableNames.has(ast.name)) throw quantExpressionError(`${ast.name} is not an allowed variable.`);
    return safeQuantNumber(ctx[ast.name]);
  }
  if (ast.type === "call") {
    if (!quantHelperNames.has(ast.name) || typeof ctx[ast.name] !== "function") throw quantExpressionError(`${ast.name} is not an allowed helper.`);
    const args = ast.args.map(arg => safeQuantNumber(evaluateQuantAst(arg, ctx)));
    const value = ctx[ast.name](...args);
    return typeof value === "boolean" ? value : safeQuantNumber(value);
  }
  if (ast.type === "unary") {
    const value = evaluateQuantAst(ast.argument, ctx);
    if (ast.op === "!") return !Boolean(value);
    if (ast.op === "-") return -safeQuantNumber(value);
    if (ast.op === "+") return safeQuantNumber(value);
  }
  if (ast.type === "binary") {
    if (ast.op === "&&") return Boolean(evaluateQuantAst(ast.left, ctx)) && Boolean(evaluateQuantAst(ast.right, ctx));
    if (ast.op === "||") return Boolean(evaluateQuantAst(ast.left, ctx)) || Boolean(evaluateQuantAst(ast.right, ctx));
    const left = evaluateQuantAst(ast.left, ctx);
    const right = evaluateQuantAst(ast.right, ctx);
    if (ast.op === "==") return left === right || safeQuantNumber(left) === safeQuantNumber(right);
    if (ast.op === "!=") return !(left === right || safeQuantNumber(left) === safeQuantNumber(right));
    const leftNumber = safeQuantNumber(left);
    const rightNumber = safeQuantNumber(right);
    if (ast.op === "<") return leftNumber < rightNumber;
    if (ast.op === "<=") return leftNumber <= rightNumber;
    if (ast.op === ">") return leftNumber > rightNumber;
    if (ast.op === ">=") return leftNumber >= rightNumber;
    if (ast.op === "+") return safeQuantNumber(leftNumber + rightNumber);
    if (ast.op === "-") return safeQuantNumber(leftNumber - rightNumber);
    if (ast.op === "*") return safeQuantNumber(leftNumber * rightNumber);
    if (ast.op === "/") return safeQuantNumber(leftNumber / rightNumber);
    if (ast.op === "%") return safeQuantNumber(leftNumber % rightNumber);
  }
  if (ast.type === "conditional") {
    return Boolean(evaluateQuantAst(ast.condition, ctx)) ? evaluateQuantAst(ast.whenTrue, ctx) : evaluateQuantAst(ast.whenFalse, ctx);
  }
  throw quantExpressionError("Formula contains an unsupported expression.");
}

function evaluateQuantExpression(expression, ctx, fallback = 0) {
  const source = String(expression || "").trim();
  if (!source) return fallback;
  try {
    const ast = quantCompiledExpressions[source] || parseQuantExpression(source);
    return evaluateQuantAst(ast, ctx);
  } catch (error) {
    quantFormulaError = `Formula blocked: ${error.message || "unsupported syntax"}`;
    return fallback;
  }
}

function customQuantSignalFor(series, index, state = {}) {
  const ctx = buildQuantContext(series, index, state);
  if (ctx.position > 0) {
    const exit = Boolean(evaluateQuantExpression(quantConfig.customExit, ctx, false));
    if (exit) return 0;
    return null;
  }
  return Boolean(evaluateQuantExpression(quantConfig.customEntry, ctx, false)) ? 1 : 0;
}

function quantPositionSizeFor(series, index, state = {}) {
  const maxExposure = quantRiskMultiplier();
  if (quantConfig.strategy !== "custom") return maxExposure;
  const ctx = buildQuantContext(series, index, state);
  const size = Number(evaluateQuantExpression(quantConfig.customSize, ctx, maxExposure));
  if (!Number.isFinite(size)) return maxExposure;
  return Math.max(0.05, Math.min(maxExposure, size));
}

function quantSignalFor(series, index, state = {}) {
  if (quantConfig.strategy === "custom") return customQuantSignalFor(series, index, state);
  const fast = Math.max(3, Number(quantConfig.fast) || 12);
  const slow = Math.max(fast + 2, Number(quantConfig.slow) || 36);
  const close = Number(series[index]?.close || 0);
  const priorClose = Number(series[index - 1]?.close || close);
  const fastMa = movingAverageValue(series, index, fast);
  const slowMa = movingAverageValue(series, index, slow);
  if (!fastMa || !slowMa || !close) return 0;
  if (quantConfig.strategy === "trend") {
    return fastMa > slowMa && close > slowMa ? 1 : 0;
  }
  if (quantConfig.strategy === "mean") {
    const window = series.slice(index - slow + 1, index + 1).map(bar => Number(bar.close));
    const sigma = stdev(window) || Math.max(close * 0.004, 0.01);
    const zScore = (close - slowMa) / sigma;
    return zScore < -0.85 ? 1 : zScore > 0.25 ? 0 : null;
  }
  const lookback = series.slice(Math.max(0, index - slow), index);
  const priorHigh = Math.max(...lookback.map(bar => Number(bar.high || bar.close)));
  const avgVolume = mean(lookback.map(bar => Number(bar.volume || 0)));
  const volumeOk = !avgVolume || Number(series[index].volume || 0) >= avgVolume * 0.9;
  return close > priorHigh && volumeOk ? 1 : close < fastMa || close < priorClose * 0.985 ? 0 : null;
}

function periodFactorForQuant() {
  const config = timeframeConfig();
  const interval = config?.interval || "1d";
  if (interval.endsWith("m")) return 252 * 6.5 * (60 / Math.max(1, Number(interval.replace("m", "")) || 1));
  if (interval === "60m") return 252 * 6.5;
  if (interval === "1wk") return 52;
  return 252;
}

function runQuantBacktest() {
  const series = quantSeries();
  const fast = Math.max(3, Number(quantConfig.fast) || 12);
  const slow = Math.max(fast + 2, Number(quantConfig.slow) || 36);
  const cost = Math.max(0, Number(quantConfig.costBps) || 0) / 10000;
  quantFormulaError = "";
  if (quantConfig.strategy === "custom") {
    const compiled = compileQuantCode();
    if (!compiled.ok) {
      quantFormulaError = compiled.message;
      quantConfig.customEntry = "false";
      quantConfig.customExit = "true";
      quantConfig.customSize = "0.05";
    }
  }
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let position = 0;
  let entryPrice = 0;
  let entryIndex = 0;
  let wins = 0;
  let losses = 0;
  let tradeReturns = [];
  let dailyReturns = [];
  let signals = [];
  let longBars = 0;
  for (let i = 1; i < series.length; i += 1) {
    const close = Number(series[i].close);
    const barsHeld = position > 0 ? i - entryIndex : 0;
    const unrealized = position > 0 ? (close - entryPrice) / Math.max(entryPrice, 0.01) : 0;
    const state = { position, entryPrice, equity, peak, barsHeld };
    const rawSignal = quantSignalFor(series, i, state);
    const targetSize = quantPositionSizeFor(series, i, state);
    let desired = rawSignal === null ? position : rawSignal ? targetSize : 0;
    const stopLoss = Math.max(0, Number(quantConfig.stopLossPct) || 0) / 100;
    const takeProfit = Math.max(0, Number(quantConfig.takeProfitPct) || 0) / 100;
    const maxHold = Math.max(0, Number(quantConfig.maxHoldBars) || 0);
    if (position > 0 && ((stopLoss && unrealized <= -stopLoss) || (takeProfit && unrealized >= takeProfit) || (maxHold && barsHeld >= maxHold))) {
      desired = 0;
    }
    if (Math.abs(desired - position) > 0.001) {
      equity *= Math.max(0.01, 1 - cost);
      if (desired > position) {
        entryPrice = close;
        entryIndex = i;
        signals.push({ type: "Entry", index: i, price: close, date: series[i].date });
      } else if (position > 0) {
        const tradeReturn = (close - entryPrice) / Math.max(entryPrice, 0.01);
        tradeReturns.push(tradeReturn);
        if (tradeReturn >= 0) wins += 1;
        else losses += 1;
        signals.push({ type: "Exit", index: i, price: close, date: series[i].date, tradeReturn });
      }
      position = desired;
    }
    const previous = Number(series[i - 1].close || series[i].close);
    const current = Number(series[i].close || previous);
    const assetReturn = previous ? (current - previous) / previous : 0;
    const strategyReturn = assetReturn * position;
    equity *= Math.max(0.01, 1 + strategyReturn);
    dailyReturns.push(strategyReturn);
    if (position > 0) longBars += 1;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity / peak - 1);
  }
  if (position > 0 && series.length) {
    const last = series.at(-1);
    const tradeReturn = (Number(last.close) - entryPrice) / Math.max(entryPrice, 0.01);
    tradeReturns.push(tradeReturn);
    if (tradeReturn >= 0) wins += 1;
    else losses += 1;
    signals.push({ type: "Open", index: series.length - 1, price: Number(last.close), date: last.date, tradeReturn });
  }
  const factor = periodFactorForQuant();
  const avgReturn = mean(dailyReturns);
  const volatility = stdev(dailyReturns);
  const sharpe = volatility ? (avgReturn / volatility) * Math.sqrt(factor) : 0;
  const totalReturn = equity - 1;
  const periods = Math.max(1, dailyReturns.length);
  const annualized = Math.pow(Math.max(equity, 0.01), factor / periods) - 1;
  const buyHoldStart = Number(series[0]?.close || 1);
  const buyHoldEnd = Number(series.at(-1)?.close || buyHoldStart);
  const buyHold = buyHoldEnd / Math.max(buyHoldStart, 0.01) - 1;
  quantBacktest = {
    series,
    fast,
    slow,
    totalReturn,
    annualized,
    maxDrawdown,
    sharpe,
    winRate: tradeReturns.length ? wins / tradeReturns.length : 0,
    trades: tradeReturns.length,
    wins,
    losses,
    exposure: periods ? longBars / periods : 0,
    buyHold,
    signals: signals.slice(-8),
    critique: quantCritique({ totalReturn, maxDrawdown, sharpe, trades: tradeReturns.length, exposure: periods ? longBars / periods : 0 })
  };
  return quantBacktest;
}

function quantCritique(test) {
  const notes = [];
  if (test.trades < 4) notes.push("Too few trades for confidence. Treat this as a hypothesis, not evidence.");
  if (test.maxDrawdown < -0.18) notes.push("Drawdown is large enough that many real users would abandon the rule.");
  if (test.sharpe < 0.5) notes.push("Risk-adjusted return is weak. Try a different asset, timeframe, or slower rule.");
  if (test.exposure > 0.82) notes.push("The strategy is almost always long, so compare it carefully with buy-and-hold.");
  return notes;
}

function formatPct(value) {
  const number = Number(value || 0) * 100;
  return `${number >= 0 ? "+" : ""}${number.toFixed(1)}%`;
}

function renderQuantComingSoon() {
  setUtilityPanel("");
  const gearLetter = id => {
    const points = Array.from({ length: 48 }, (_, index) => {
      const angle = index / 48 * Math.PI * 2;
      const radius = index % 4 === 1 || index % 4 === 2 ? 46 : 39;
      return `${(50 + Math.cos(angle) * radius).toFixed(2)},${(50 + Math.sin(angle) * radius).toFixed(2)}`;
    }).join(" ");
    return `<svg class="quant-gear-letter" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <mask id="quantGearHole${id}"><rect width="100" height="100" fill="white"/><circle cx="50" cy="50" r="25" fill="black"/></mask>
      <g mask="url(#quantGearHole${id})"><polygon points="${points}" fill="var(--gold)" stroke="var(--ink)" stroke-width="2"/>
      <circle cx="50" cy="50" r="33" fill="none" stroke="var(--ink)" stroke-opacity=".3" stroke-width="2"/>
      <path d="M21 28l8-6m46 48-7 8M28 73l5 3M68 24l7 4" stroke="var(--paper)" stroke-opacity=".65" stroke-width="3"/></g></svg>`;
  };
  const corner = className => `<svg class="quant-corner-decoration ${className}" viewBox="0 0 140 140" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width=".8"><path d="M1 1l132 8M1 1l115 51M1 1l84 83M1 1l49 115M1 1l8 132M29 3q-1 10-4 12q-5 3-8 3q-3 6-3 8q-6 1-11 3M57 5q-1 16-10 18q-7 7-11 10q-9 3-12 17q-9 4-19 7M85 6q-2 20-20 24q-11 9-15 17q-15 6-16 27q-15 10-28 11M111 8q-3 24-24 31q-16 8-20 22q-19 11-25 34q-18 14-34 16M133 9q-5 33-30 38q-20 12-23 31q-26 13-29 40q-18 13-42 15"/></g>
    <g class="quant-corner-dust" fill="var(--gold)">${Array.from({ length: 23 }, (_, i) => `<circle cx="${8 + i * 29 % 113}" cy="${7 + i * 43 % 122}" r="${i % 4 === 0 ? 1.6 : .7}"/>`).join("")}</g></svg>`;
  const spider = `<svg class="quant-hanging-spider" viewBox="0 0 40 70" aria-hidden="true" focusable="false">
    <path class="quant-spider-thread" d="M20 0v40" fill="none" stroke="currentColor" stroke-width=".9"/>
    <g fill="currentColor"><circle cx="20" cy="43" r="3"/><ellipse cx="20" cy="51" rx="5" ry="7"/></g>
    <path d="M16 45l-7-4-3-5m10 12-8 1-3-4m11 6-7 4-3 6m10-7-5 9-1 4m14-22 7-4 3-5m-10 12 8 1 3-4m-11 6 7 4 3 6m-10-7 5 9 1 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
  modeSurface.innerHTML = `<section class="quant-coming-soon" aria-labelledby="quantComingSoonTitle">
    ${corner("quant-corner-top")}
    <h1 id="quantComingSoonTitle" aria-label="Coming Soon"><span class="quant-letter-word" aria-hidden="true">C${gearLetter(1)}ming</span><span class="quant-letter-word" aria-hidden="true">S${gearLetter(2)}${gearLetter(3)}<span class="quant-final-n">n${spider}</span></span></h1>
    ${corner("quant-corner-bottom")}
  </section>`;
}

// Explicit library saves are separate from the automatically saved recovery draft.
function loadQuantAlgorithms() {
  try {
    const raw = localStorage.getItem(QUANT_LIBRARY_KEY);
    if (!raw || new TextEncoder().encode(raw).length > 65536) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value.algorithms)) return [];
    return value.algorithms.slice(0, 8).filter(item =>
      item && typeof item.id === "string" && item.id.length <= 80 &&
      typeof item.name === "string" && item.name.length <= 80 &&
      item.config && typeof item.config === "object" && !Array.isArray(item.config)
    ).map(item => ({
      id: item.id, name: item.name,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt.slice(0, 40) : "",
      // Accept known settings as data; never execute stored source while loading.
      config: Object.fromEntries(Object.entries(DEFAULT_QUANT_CONFIG).map(([key, fallback]) => [
        key, typeof item.config[key] === typeof fallback
          ? (typeof fallback === "string" ? item.config[key].slice(0, 5000) : item.config[key]) : fallback
      ]))
    }));
  } catch {
    // Leave unreadable storage intact; a later Save reports write failures.
    return [];
  }
}

function quantAlgorithms() {
  return Array.isArray(quantConfig.algorithms) ? quantConfig.algorithms.slice(0, 8).filter(item =>
    item && typeof item.id === "string" && typeof item.name === "string" && item.config && typeof item.config === "object") : [];
}

function restoreQuantDocument(value, preserveDraft = false) {
  const restored = { ...structuredClone(DEFAULT_QUANT_CONFIG), ...value };
  // Preserve the single strategy saved by the original Quant Lab as a library item.
  if (!Array.isArray(value.algorithms)) {
    const { algorithms, ...config } = restored;
    restored.algorithms = [{ id: "legacy-strategy", name: "My saved strategy", config }];
  }
  if (preserveDraft) {
    quantConfig.algorithms = restored.algorithms;
    return;
  }
  quantConfig = restored;
  quantDraftId = "";
  quantDraftName = "Untitled algorithm";
  quantBacktest = null;
}

function captureQuantDraft() {
  const editor = document.getElementById("quantCode");
  if (editor) quantConfig.customCode = editor.value.slice(0, 5000);
  const name = document.getElementById("quantAlgorithmName");
  if (name) quantDraftName = name.value.trim().slice(0, 80) || "Untitled algorithm";
}

function scheduleQuantDraftSave() {
  captureQuantDraft();
  quantDraftDirty = true;
  // Throttle rather than debounce so continuous typing still saves every second.
  if (quantDraftSaveTimer === null) quantDraftSaveTimer = setTimeout(flushQuantDraftSave, 1000);
}

function flushQuantDraftSave() {
  clearTimeout(quantDraftSaveTimer);
  quantDraftSaveTimer = null;
  if (!quantDraftDirty) return;
  captureQuantDraft();
  const config = Object.fromEntries(Object.keys(DEFAULT_QUANT_CONFIG).map(key => [key, quantConfig[key]]));
  try {
    const serialized = JSON.stringify({ id: quantDraftId, name: quantDraftName, config });
    if (new TextEncoder().encode(serialized).length > 65536) throw new Error("Draft too large");
    localStorage.setItem(QUANT_DRAFT_KEY, serialized);
    quantDraftDirty = false;
    quantDraftSaveMessage = "Draft autosaved in this browser. Open Build to resume after reloading.";
  } catch {
    quantDraftSaveMessage = "Draft could not be autosaved. Browser storage is full or unavailable. Copy your code before closing this tab.";
  }
  const status = document.getElementById("quantBuildStatus");
  if (status && (!quantFormulaError || quantDraftDirty)) status.textContent = quantDraftSaveMessage;
}

function restoreQuantDraft(id = null) {
  try {
    const raw = localStorage.getItem(QUANT_DRAFT_KEY);
    if (!raw || new TextEncoder().encode(raw).length > 65536) return false;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.id !== "string" || draft.id.length > 80 ||
        (id !== null && draft.id !== id) || typeof draft.name !== "string" || draft.name.length > 80 ||
        !draft.config || typeof draft.config !== "object" || Array.isArray(draft.config)) return false;
    const config = Object.fromEntries(Object.entries(DEFAULT_QUANT_CONFIG).map(([key, fallback]) => [
      key, typeof draft.config[key] === typeof fallback && (typeof fallback !== "number" || Number.isFinite(draft.config[key]))
        ? (typeof fallback === "string" ? draft.config[key].slice(0, 5000) : draft.config[key]) : fallback
    ]));
    quantConfig = { ...config, algorithms: quantAlgorithms() };
    quantDraftId = draft.id;
    quantDraftName = draft.name;
    quantBacktest = null;
    quantFormulaError = "";
    quantDraftSaveMessage = "Autosaved draft restored from this browser.";
    return true;
  } catch {
    return false;
  }
}

function openQuantView(view, id = "") {
  if (quantView === "testing") updateQuantConfigFromForm();
  captureQuantDraft();
  flushQuantDraftSave();
  if (id) {
    const algorithm = quantAlgorithms().find(item => item.id === id);
    if (!algorithm) return;
    const algorithms = quantAlgorithms();
    quantConfig = { ...structuredClone(DEFAULT_QUANT_CONFIG), ...algorithm.config, algorithms };
    quantDraftId = algorithm.id;
    quantDraftName = algorithm.name;
    quantBacktest = null;
    quantFormulaError = "";
    quantDraftSaveMessage = "";
    restoreQuantDraft(id);
  }
  if (view === "build" && quantView === "landing" && !id && !restoreQuantDraft()) {
    const algorithms = quantAlgorithms();
    quantConfig = { ...structuredClone(DEFAULT_QUANT_CONFIG), strategy: "custom", algorithms };
    quantDraftId = "";
    quantDraftName = example?.name || "Untitled algorithm";
    if (example) {
      quantConfig.customCode = example.code;
      quantBacktest = null;
    }
    quantFormulaError = "";
    quantDraftSaveMessage = "";
  }
  quantView = view;
  renderQuantLab();
  window.scrollTo(0, 0);
  document.getElementById(view === "build" ? "quantAlgorithmName" : "quantViewTitle")?.focus({ preventScroll: true });
  if (view === "testing") requestAnimationFrame(() => drawChart());
}

async function saveQuantAlgorithm() {
  captureQuantDraft();
  const algorithms = quantAlgorithms();
  if (!quantDraftId && algorithms.length >= 8) {
    showToast("Your library holds up to 8 algorithms. Open an existing algorithm to update it.");
    return;
  }
  const id = quantDraftId || globalThis.crypto.randomUUID();
  const { algorithms: omitted, ...config } = quantConfig;
  const item = { id, name: quantDraftName, updatedAt: new Date().toISOString(), config };
  const next = algorithms.some(saved => saved.id === id)
    ? algorithms.map(saved => saved.id === id ? item : saved) : [item, ...algorithms];
  const serialized = JSON.stringify({ algorithms: next });
  if (new TextEncoder().encode(serialized).length > 65536) {
    showToast("This library is too large to save. Shorten the strategy source and try again.");
    return;
  }
  try {
    localStorage.setItem(QUANT_LIBRARY_KEY, serialized);
  } catch {
    const message = "Algorithm could not be saved. Browser storage is full or unavailable. Copy your code before closing this tab and try again.";
    const status = document.getElementById("quantBuildStatus");
    if (status) status.textContent = message;
    showToast(message);
    return false;
  }
  quantConfig.algorithms = next;
  quantDraftId = id;
  quantDraftDirty = true;
  flushQuantDraftSave();
  const message = "Algorithm saved in this browser.";
  const status = document.getElementById("quantBuildStatus");
  if (status) status.textContent = message;
  showToast(message);
  return true;
}

function testQuantDraft() {
  captureQuantDraft();
  quantConfig.strategy = "custom";
  const compiled = quantConfig.customCode.trim() ? compileQuantCode() : { ok: false, message: "Add strategy source before testing." };
  quantFormulaError = compiled.ok ? "" : compiled.message;
  if (!compiled.ok) {
    const status = document.getElementById("quantBuildStatus");
    if (status) status.textContent = compiled.message;
    document.getElementById("quantCode")?.focus();
    return;
  }
  quantBacktest = null;
  openQuantView("testing");
}

function quantNavigationHtml() {
  return `<nav class="quant-view-nav" aria-label="Quant Lab views">
    <button type="button" class="secondary" data-action="quant-landing">← Quant Lab</button>
    <button type="button" class="secondary" data-action="quant-edit">Build</button>
    <button type="button" class="secondary" data-action="quant-testing" ${quantView === "testing" ? 'aria-current="page"' : ""}>Testing</button>
  </nav>`;
}

const quantLearningPrompts = {
  plan: "Help me turn an idea into Quant Lab pseudocode. First ask what behavior I want to test. Then lay out the inputs, entry, exit, and position size in everyday language.",
  generate: "Generate a small Quant Lab strategy for a beginner. Show pseudocode, then the runnable Quant Lab code, explain each rule, and suggest one change I can test.",
};

const quantExamples = {
  ema: {
    name: "EMA trend following",
    summary: "Follow a trend by comparing a fast average with a slow one.",
    pseudocode: "When out of the market and EMA(10) > EMA(30): enter.\nWhen holding and EMA(10) < EMA(30): exit.\nOtherwise: keep the current position.\nOn entry: allocate 20% of simulated equity.",
    code: `def entry():
    return ema(10) > ema(30)

def exit():
    return ema(10) < ema(30)

def size():
    return 0.20`,
    steps: [
      ["Inputs", "An EMA is an average that gives recent closes more weight. The 10-candle EMA reacts faster than the 30-candle EMA."],
      ["Entry", "If you are out and the fast EMA is above the slow one (say, 101 vs. 99), open a simulated position. It can enter even if the averages crossed earlier."],
      ["Exit", "If you are holding and the fast EMA falls below the slow one, close the position. Equality alone does not trigger a trade."],
      ["Size", "0.20 targets 20% of simulated equity, subject to the lab's exposure limit."],
    ],
    experiment: "Try 5 and 15 candles instead. Do the faster averages take more trades in a sideways market? Compare after costs.",
    source: "https://www.quantconnect.com/docs/v2/writing-algorithms/optimization/walk-forward-optimization",
    adaptation: "Adapted from QuantConnect's EMA crossover example. This version uses fixed windows, one chart, and a smaller fixed allocation.",
  },
  bands: {
    name: "Bollinger Band mean reversion",
    summary: "Test whether an unusually low close returns toward its recent average.",
    pseudocode: "Measure how far the close is from its 20-candle average.\nWhen out and the close is over 2 standard deviations below it: enter.\nWhen holding and the close reaches or passes the average: exit.\nOn entry: allocate 15% of simulated equity.",
    code: `def entry():
    return zscore(20) < -2

def exit():
    return zscore(20) >= 0

def size():
    return 0.15`,
    steps: [
      ["Inputs", "zscore(20) measures the close's distance from its recent average in standard deviations, a unit of price spread."],
      ["Entry", "Below −2, the close sits under the lower Bollinger Band. For example, a close of 95 against an average of 100 and a spread of 2 gives (95 − 100) / 2 = −2.5. The price can keep falling."],
      ["Exit", "At zero or higher, price has reached or passed the middle band, the recent average."],
      ["Size", "0.15 targets 15% of simulated equity, subject to the lab's exposure limit."],
    ],
    experiment: "Try an entry threshold of −1.5 instead of −2. Compare trade count and drawdown on both a calm and a falling market.",
    source: "https://www.quantconnect.com/docs/v2/writing-algorithms/key-concepts/behavioral-finance",
    adaptation: "Adapted from QuantConnect's Bollinger Band example. The lab expresses the bands with a z-score and uses a fixed allocation.",
  },
};

function quantLearningHtml() {
  return `<section class="quant-library quant-learning" aria-labelledby="quantLearningTitle">
    <div>
      <h2 id="quantLearningTitle">Learn to build an algorithm</h2>
      <p>Start with a rule in plain language, turn it into pseudocode, then test it on historical candles.</p>
      <div class="quant-row-actions">
        <button type="button" class="mini-button" data-action="quant-ai" data-quant-prompt="generate"><span aria-hidden="true">✦</span> Generate with AI</button>
        <button type="button" class="mini-button" data-action="quant-ai" data-quant-prompt="plan">Plan in pseudocode</button>
      </div>
      <p class="quant-learning-note">Pretium AI chat is available in private adult previews. The examples below work without AI.</p>
    </div>
    <div>
      <h3>Worked examples</h3>
      <p>Read how each rule works, then open a new draft and choose Test. The lab's stop, target, and holding limits can also close a position. Results are practice estimates; a signal can count the price move on the same candle.</p>
      <div class="quant-example-list">
        ${Object.entries(quantExamples).map(([id, example]) => `<details class="quant-example">
          <summary><strong>${escapeHtml(example.name)}</strong><span>${escapeHtml(example.summary)}</span></summary>
          <div class="quant-example-body">
            <div class="quant-example-rules">
              <div><h4>Pseudocode</h4><pre>${escapeHtml(example.pseudocode)}</pre></div>
              <div><h4>Quant Lab code</h4><pre><code>${escapeHtml(example.code)}</code></pre></div>
            </div>
            <ol>${example.steps.map(([step, description]) => `<li><strong>${escapeHtml(step)}:</strong> ${escapeHtml(description)}</li>`).join("")}</ol>
            <p><strong>Try it:</strong> ${escapeHtml(example.experiment)}</p>
            <p>${escapeHtml(example.adaptation)} <a href="${escapeHtml(example.source)}" target="_blank" rel="noopener noreferrer">Read the QuantConnect source <span aria-hidden="true">↗</span></a></p>
            <button type="button" class="mini-button" data-action="quant-example" data-quant-example="${id}" aria-label="Open as new draft: ${escapeHtml(example.name)}">Open as new draft</button>
          </div>
        </details>`).join("")}
      </div>
    </div>
  </section>`;
}

function renderQuantLanding() {
  const algorithms = quantAlgorithms();
  result.innerHTML = "";
  modeSurface.innerHTML = `<section class="quant-page quant-landing-page">
    <header class="quant-hero">
      <span>Advanced paper trading</span>
      <h1 id="quantViewTitle" tabindex="-1">Quant Lab</h1>
      <p>Build an idea. Test the rules. Refine your algorithm.</p>
      <div class="quant-landing-actions">
        <button type="button" class="mini-button" data-action="quant-build">Build <span aria-hidden="true">↗</span></button>
        <button type="button" class="secondary" data-action="quant-testing">Test <span aria-hidden="true">→</span></button>
      </div>
    </header>
    <section class="quant-library" aria-labelledby="quantLibraryTitle">
      <div class="section-head"><h2 id="quantLibraryTitle">Your algorithms</h2><span>${algorithms.length} / 8</span></div>
      <p class="quant-library-note">Your draft autosaves every second. Open Build to resume it after reload. Saved algorithms and drafts stay in this browser; clearing site data removes them. They do not sync across devices.</p>
      ${algorithms.length ? `<ul class="quant-algorithm-list">${algorithms.map(item => `<li>
        <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(quantLanguages[item.config.customLanguage]?.label || "Python")} · ${escapeHtml({trend:"Trend following",mean:"Mean reversion",breakout:"Volatility breakout",custom:"Custom strategy"}[item.config.strategy] || "Custom strategy")}</p></div>
        <div class="quant-row-actions"><button type="button" class="secondary" data-action="quant-edit" data-quant-id="${escapeHtml(item.id)}" aria-label="Build ${escapeHtml(item.name)}">Build</button><button type="button" class="mini-button" data-action="quant-testing" data-quant-id="${escapeHtml(item.id)}" aria-label="Test ${escapeHtml(item.name)}">Test</button></div>
      </li>`).join("")}</ul>` : `<div class="quant-library-empty"><span class="quant-empty-mark" aria-hidden="true">ƒ</span><h3>Your next idea starts here</h3><p>No saved algorithms yet. Open Build to write your first strategy, or Test to explore the testing workspace.</p></div>`}
    </section>
    ${quantLearningHtml()}
  </section>`;
}

const quantRuleLessons = {
  entry: ["Entry rule", "When there’s no open position, a true result opens a simulated position."],
  exit: ["Exit rule", "While a position is open, a true result closes it."],
  size: ["Position size", "The result is a fraction of simulated equity. Quant Lab applies its minimum and exposure limit."],
};

function quantLearningChunks(source, language) {
  const headers = {
    python: /^\s*def\s+(entry|exit|size)\s*\([^)]*\)\s*:/i,
    cpp: /^\s*(?:bool|double|float|int)\s+(entry|exit|size)\s*\(/i,
    java: /^\s*(?:boolean|double|float|int)\s+(entry|exit|size)\s*\(/i,
    csharp: /^\s*(?:bool|double|float|int|decimal)\s+(entry|exit|size)\s*\(/i,
    matlab: /^\s*function\s+\w+\s*=\s*(entry|exit|size)\s*\(/i,
    scala: /^\s*def\s+(entry|exit|size)\b/i,
    julia: /^\s*(?:function\s+)?(entry|exit|size)\s*\(/i,
  };
  const lines = source.split("\n");
  const masked = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*/g, comment => comment.replace(/[^\n]/g, " "))
    .split("\n")
    .map(line => language === "matlab" && /^\s*%/.test(line) ? "" : line);
  const marks = [];
  for (const [index, line] of masked.entries()) {
    const header = headers[language]?.exec(line);
    if (header) marks.push({ start: index, rule: header[1].toLowerCase() });
  }

  let cursor = 0;
  const chunks = [];
  for (const [index, mark] of marks.entries()) {
    const { start, rule } = mark;
    const next = marks[index + 1]?.start ?? lines.length;
    if (cursor < start) chunks.push({ source: lines.slice(cursor, start).join("\n") });
    let end = next;
    if (language === "python") {
      const indentation = masked[start].match(/^\s*/)[0].length;
      const dedent = lines.slice(start + 1, next).findIndex(line => line.trim() && line.search(/\S/) <= indentation);
      if (dedent >= 0) end = start + dedent + 1;
    } else if (language === "matlab" || (language === "julia" && /^\s*function\b/.test(masked[start]))) {
      const closing = masked.slice(start + 1, next).findIndex(line => /^\s*end\s*;?\s*$/.test(line));
      if (closing >= 0) end = start + closing + 2;
    } else {
      const block = masked.slice(start, next).join("\n");
      const opening = block.indexOf("{");
      if (opening >= 0) {
        let depth = 0;
        for (let i = opening; i < block.length; i += 1) {
          if (block[i] === "{") depth += 1;
          if (block[i] === "}" && --depth === 0) {
            end = start + block.slice(0, i + 1).split("\n").length;
            break;
          }
        }
      }
    }
    while (end > start + 1 && !lines[end - 1].trim()) end -= 1;
    chunks.push({ rule, source: lines.slice(start, end).join("\n") });
    cursor = end;
  }
  if (cursor < lines.length) chunks.push({ source: lines.slice(cursor).join("\n") });
  return chunks;
}

const quantLessonNames = {
  close: "the closing price", open: "the opening price", high: "the candle’s high", low: "the candle’s low",
  volume: "the candle’s trading volume", return1: "the return since the previous candle",
  drawdown: "the portfolio’s change from its peak", unrealized: "the open position’s return",
  barsHeld: "the number of candles held", position: "the fraction currently invested",
  entryPrice: "the entry price", equity: "simulated equity", true: "true", false: "false", null: "zero",
};
const quantLessonRatioNames = new Set(["drawdown", "unrealized", "return1", "position"]);
const quantLessonOperators = {
  ">": "is above", ">=": "is at least", "<": "is below", "<=": "is at most", "==": "equals", "!=": "differs from",
  "+": "plus", "-": "minus", "*": "times", "/": "divided by", "%": "modulo",
};

function quantLessonNumber(node) {
  if (node.type === "number") return node.value;
  if (node.type !== "unary" || !["-", "+"].includes(node.op)) return undefined;
  const value = quantLessonNumber(node.argument);
  if (value !== undefined) return node.op === "-" ? -value : value;
}

function quantLessonPercent(fraction) {
  return `${Number((fraction * 100).toPrecision(10))}%`;
}

function describeQuantFormula(node) {
  const constant = quantLessonNumber(node);
  if (constant !== undefined) return String(constant);
  if (node.type === "name") return quantLessonNames[node.name] || node.name;
  if (node.type === "call") {
    const [first, second] = node.args.map(describeQuantFormula);
    if (first === undefined) return `the result of ${node.name}()`;
    const indicators = {
      ma: "simple moving average",
      rsi: "RSI (balance of recent gains and losses)", atr: "average true range (a measure of volatility)",
      roc: "price return", highest: "highest high", lowest: "lowest low",
      zscore: "price distance from its average, in standard deviations", volAvg: "average volume",
    };
    if (node.name === "ema") return `the ${first}-period exponential moving average (weighted toward recent prices)`;
    if (Object.hasOwn(indicators, node.name)) return `the ${indicators[node.name]} over ${first} candles`;
    if (node.name === "risk") {
      const fraction = quantLessonNumber(node.args[0]);
      const budget = fraction > 0 ? quantLessonPercent(fraction) : first;
      return `a risk budget of ${budget}, with the position adjusted for recent volatility`;
    }
    if (second !== undefined) {
      return `the ${first}-candle simple moving average crosses ${node.name === "crossOver" ? "above" : "below"} the ${second}-candle simple moving average`;
    }
    return `the result of ${node.name}(${first})`;
  }
  if (node.type === "unary") return `${{ "!": "the opposite of", "-": "negative", "+": "positive" }[node.op]} (${describeQuantFormula(node.argument)})`;
  if (node.type === "conditional") {
    return `${describeQuantFormula(node.whenTrue)} when ${describeQuantFormula(node.condition)}, or ${describeQuantFormula(node.whenFalse)} otherwise`;
  }
  const left = describeQuantFormula(node.left);
  const right = describeQuantFormula(node.right);
  if (node.op === "&&") return `both conditions hold: ${left}, and ${right}`;
  if (node.op === "||") return `at least one condition holds: ${left}, or ${right}`;
  const leftNumber = quantLessonNumber(node.left);
  const rightNumber = quantLessonNumber(node.right);
  const comparison = [">", ">=", "<", "<=", "==", "!="].includes(node.op);
  if (comparison && quantLessonRatioNames.has(node.left.name) && rightNumber !== undefined) {
    return `${left} ${quantLessonOperators[node.op]} ${quantLessonPercent(rightNumber)}`;
  }
  if (comparison && quantLessonRatioNames.has(node.right.name) && leftNumber !== undefined) {
    return `${quantLessonPercent(leftNumber)} ${quantLessonOperators[node.op]} ${right}`;
  }
  const phrase = `${left} ${quantLessonOperators[node.op]} ${right}`;
  return comparison ? phrase : `(${phrase})`;
}

function explainQuantChunk(chunk, language) {
  const [title, purpose] = quantRuleLessons[chunk.rule];
  const expression = extractQuantExpression(cleanQuantSource(chunk.source), language, chunk.rule);
  if (!expression) return { title, purpose, detail: "Add a supported return expression to get an explanation of this rule." };
  const result = validateQuantExpression(normalizeQuantExpression(expression));
  if (!result.ok) return { title, purpose, detail: `Quant Lab could not read this rule. ${result.message}` };
  const { ast } = result;
  const number = quantLessonNumber(ast);
  const description = describeQuantFormula(ast);
  let detail;
  if (chunk.rule === "size") {
    detail = number === undefined ? `This rule uses ${description}.` : `This rule requests ${quantLessonPercent(number)} of simulated equity.`;
  } else if (ast.type === "name" && ["true", "false"].includes(ast.name)) {
    detail = `This rule always returns ${description}.`;
  } else if (ast.op === "&&" || ast.op === "||") {
    detail = `This rule is true when ${description}.`;
  } else if (["<", ">", "<=", ">=", "==", "!=", "!"].includes(ast.op)
      || (["crossOver", "crossUnder"].includes(ast.name) && ast.args.length >= 2)) {
    detail = `This rule checks whether ${description}.`;
  } else {
    detail = `This rule returns ${description}. A nonzero result counts as true.`;
  }
  return { title, purpose, detail };
}

function mountQuantLearning(editor, language) {
  const toggle = document.getElementById("quantLearningToggle");
  const viewer = document.getElementById("quantCodeLearning");
  const source = viewer.querySelector(".quant-learn-source");
  const title = viewer.querySelector("h2");
  const detail = viewer.querySelector(".quant-learn-detail");
  const purpose = viewer.querySelector(".quant-learn-purpose");
  const announcement = viewer.querySelector("[role=status]");
  let selected;
  let displayed = null;

  function show(chunk) {
    if (displayed === chunk) return;
    displayed = chunk;
    title.textContent = chunk?.lesson.title || "Explore the strategy";
    purpose.textContent = chunk?.lesson.purpose || "";
    detail.textContent = chunk?.lesson.detail || "Define an entry, exit, or size rule to explore it here.";
  }
  function refresh() {
    if (viewer.hidden) return;
    selected = undefined;
    source.replaceChildren();
    for (const chunk of quantLearningChunks(editor.value, language.value)) {
      if (!chunk.source.trim()) {
        if (chunk.source) source.append(document.createTextNode(chunk.source + "\n"));
        continue;
      }
      const code = document.createElement("code");
      code.textContent = chunk.source;
      if (!chunk.rule) {
        code.className = "quant-learn-context";
        source.append(code);
        continue;
      }
      chunk.lesson = explainQuantChunk(chunk, language.value);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quant-learn-chunk";
      button.setAttribute("aria-label", chunk.lesson.title);
      button.setAttribute("aria-pressed", "false");
      code.id = `quantLearnChunk${source.children.length}`;
      button.setAttribute("aria-describedby", code.id);
      button.append(code);
      source.append(button);
      chunk.button = button;
      selected ||= chunk;
      button.addEventListener("pointermove", event => {
        if (event.pointerType === "mouse") show(chunk);
      });
      button.addEventListener("pointerleave", () => show(selected));
      button.addEventListener("click", () => {
        selected.button.setAttribute("aria-pressed", "false");
        selected = chunk;
        button.setAttribute("aria-pressed", "true");
        show(chunk);
        announcement.textContent = `${chunk.lesson.title}. ${chunk.lesson.detail} ${chunk.lesson.purpose}`;
      });
    }
    selected?.button.setAttribute("aria-pressed", "true");
    show(selected);
  }

  toggle.addEventListener("click", () => {
    const learning = viewer.hidden;
    toggle.setAttribute("aria-pressed", String(learning));
    viewer.hidden = !learning;
    editor.hidden = learning;
    announcement.textContent = "";
    if (learning) refresh();
    else editor.focus();
  });
  language.addEventListener("change", () => queueMicrotask(refresh));
  return refresh;
}

function renderQuantBuild() {
  result.innerHTML = "";
  modeSurface.innerHTML = `<section class="quant-ide" aria-labelledby="quantViewTitle">
    <header class="quant-ide-header">
      <div class="quant-ide-heading"><button type="button" class="secondary" data-action="quant-landing">← Quant Lab</button><h1 id="quantViewTitle">Build</h1></div>
      <div class="quant-row-actions"><button type="button" class="secondary quant-coach-jump" data-action="quant-ai">AI coach</button><button type="button" class="secondary" data-action="quant-save">Save algorithm</button><button type="button" class="mini-button" data-action="quant-test-code">Test →</button></div>
    </header>
    <div class="quant-ide-toolbar">
      <label>Algorithm name<input id="quantAlgorithmName" maxlength="80" value="${escapeHtml(quantDraftName)}" /></label>
      <label>Language<select id="quantLanguage">${quantLanguageOptions()}</select></label>
    </div>
    <div class="quant-ide-workspace">
      <div class="quant-ide-editor"><div class="quant-file-bar"><span>Strategy source</span><small>entry() · exit() · size()</small><button type="button" class="mini-button" id="quantLearningToggle" aria-pressed="false" aria-controls="quantCodeLearning">Learning mode</button><button type="button" class="mini-button" id="quantUndoAi" hidden>Undo AI change</button></div>
        <textarea id="quantCode" aria-label="Strategy source" spellcheck="false" autocapitalize="off" autocomplete="off" maxlength="5000" aria-describedby="quantBuildStatus">${escapeHtml(quantConfig.customCode)}</textarea>
        <p id="quantBuildStatus" role="status">${escapeHtml(quantFormulaError || quantDraftSaveMessage || "Draft changes autosave every second in this browser. Define entry(), exit(), and size(), then test your strategy.")}</p>
      </div>
      <aside class="quant-ide-side" aria-label="Quant Lab assistant and reference">
        <div id="quantCoachMount"><p>Pretium AI is loading…</p></div>
        <details class="quant-ide-reference"><summary>Strategy reference</summary>
        <p><code>entry()</code> — when to enter a position.</p><p><code>exit()</code> — when to close it.</p><p><code>size()</code> — how much to allocate.</p>
        <h3>Indicators</h3><p>ma(n), ema(n), rsi(n), atr(n), roc(n), highest(n), lowest(n), zscore(n), volAvg(n)</p>
        <h3>Signals &amp; risk</h3><p>crossOver(a,b), crossUnder(a,b), risk(decimal)</p>
      </aside>
    </div>
  </section>`;
  const editor = document.getElementById("quantCode");
  const language = document.getElementById("quantLanguage");
  const undo = document.getElementById("quantUndoAi");
  const status = document.getElementById("quantBuildStatus");
  const refreshLearning = mountQuantLearning(editor, language);
  let previous;
  function setEditor(code, dialect, message) {
    editor.value = code;
    language.value = quantConfig.customLanguage = dialect;
    captureQuantDraft();
    quantBacktest = null;
    quantFormulaError = "";
    status.textContent = message;
    refreshLearning();
    (editor.hidden ? document.getElementById("quantLearningToggle") : editor).focus();
  }
  function clearUndo() {
    previous = undefined;
    undo.hidden = true;
  }
  undo.addEventListener("click", () => {
    if (!previous) return;
    setEditor(previous.code, previous.language, "Previous draft restored.");
    clearUndo();
  });
  editor.addEventListener("input", clearUndo);
  language.addEventListener("change", clearUndo);
  const mount = document.getElementById("quantCoachMount");
  mount.quantCoach = {
    read: () => editor.value.trim(),
    apply(code) {
      const lines = cleanQuantSource(code).trim().split(/\r?\n/).filter(line => line.trim());
      const functions = new Set();
      for (let i = 0; i < lines.length; i += 2) {
        const declaration = /^def (entry|exit|size)\(\):\s*$/.exec(lines[i]);
        if (!declaration || !/^\s+return\s+[^\s;][^;]*$/.test(lines[i + 1] || "")) break;
        functions.add(declaration[1]);
      }
      if (lines.length !== 6 || functions.size !== 3) {
        return "Ask the coach for three Python functions with one return expression each.";
      }
      const compiled = compileQuantSource(code, "python");
      if (!compiled.ok) return compiled.message;
      previous = { code: editor.value, language: language.value };
      setEditor(code, "python", "AI draft loaded. Review the rules, then choose Test.");
      undo.hidden = false;
      return "";
    },
  };
  window.PretiumAI?.dock?.(mount);
}

function addQuantInfo(target, title, text, description = null) {
  const row = document.createElement("div");
  row.className = "quant-help-heading";
  target.replaceWith(row);
  const icon = document.createElement("button");
  icon.type = "button";
  icon.className = "quant-info";
  icon.setAttribute("aria-label", `About ${title}`);
  if (!description) {
    description = document.createElement("small");
    description.id = `quantHelp${modeSurface.querySelectorAll(".quant-info").length}`;
    description.textContent = text;
  }
  description.hidden = true;
  icon.setAttribute("aria-describedby", description.id);
  row.append(target, icon, description);
}

function attachQuantInfo() {
  const guide = Object.fromEntries([...modeSurface.querySelectorAll(".quant-guide dt")]
    .map(term => [term.textContent, term.nextElementSibling.textContent]));
  modeSurface.querySelectorAll(".quant-field-help, #quantLanguageHelp, #quantSourceHelp").forEach(description => {
    const control = modeSurface.querySelector(`[aria-describedby="${description.id}"]`);
    const oldLabel = control.closest("label");
    const field = document.createElement("div");
    field.className = `quant-field ${oldLabel.className}`;
    const label = document.createElement("label");
    label.htmlFor = control.id;
    label.append(oldLabel.querySelector("span"));
    oldLabel.replaceWith(field);
    field.append(label, control);
    addQuantInfo(label, label.textContent, description.textContent, description);
  });
  modeSurface.querySelectorAll(".quant-actions > button").forEach(button => {
    const title = button.textContent;
    addQuantInfo(button, title, guide[title]);
  });
  const resultHelp = {
    "Total return": guide["Total return & Buy/hold"],
    "Annualized": guide.Annualized,
    "Max drawdown": guide["Max drawdown"],
    "Sharpe-like": guide["Sharpe-like"],
    "Win rate": guide["Win rate"],
    "Exposure": guide["Exposure & trade count"],
    "Recent signals": guide["Recent signals"],
    "Strategy review": guide["Strategy review"],
    "entry()": "Returns true to buy when no position is open.",
    "exit()": "Returns true to close an open position.",
    "size()": "Allocation as a decimal: 0.5 means 50%, limited by the Risk-scaled exposure cap.",
    "Custom strategy compiler": "Optional editor for your own entry, exit, and size formulas. Select Custom formulas to use it. It supports a limited set of expressions, not full programs."
  };
  modeSurface.querySelectorAll(".quant-metrics article > span, .quant-signal-list h3, .quant-critique > strong, .quant-compiled-grid article > span, .quant-code-panel h3").forEach(title => {
    addQuantInfo(title, title.textContent, resultHelp[title.textContent]);
  });
}

let quantHelpAnchor = null;
let quantHelpPinned = false;

function hideQuantHelp() {
  document.getElementById("quantHelpTooltip")?.remove();
  quantHelpAnchor = null;
  quantHelpPinned = false;
}

function showQuantHelp(anchor, pinned = false) {
  hideQuantHelp();
  const description = document.getElementById(anchor.getAttribute("aria-describedby"));
  if (!description) return;
  const tooltip = document.createElement("div");
  tooltip.id = "quantHelpTooltip";
  tooltip.className = "quant-help-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.textContent = description.textContent;
  document.body.append(tooltip);
  quantHelpAnchor = anchor;
  quantHelpPinned = pinned;
  positionQuantHelp();
}

function positionQuantHelp() {
  const tooltip = document.getElementById("quantHelpTooltip");
  if (!tooltip) return;
  if (!quantHelpAnchor?.isConnected) return hideQuantHelp();
  const box = quantHelpAnchor.getBoundingClientRect();
  if (box.bottom < 0 || box.top > innerHeight) return hideQuantHelp();
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const left = Math.max(12, Math.min(innerWidth - width - 12, box.right - width));
  const below = box.bottom;
  const top = below + height <= innerHeight - 12 ? below : Math.max(12, box.top - height);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function renderQuantLab() {
  const parameters = modeSurface.querySelector(".quant-parameters");
  if (parameters) quantParametersExpanded = parameters.open;
  hideQuantHelp();
  if (quantView !== "build") window.PretiumAI?.dock?.(null);
  document.body.classList.toggle("quant-landing", quantView === "landing");
  document.body.classList.toggle("quant-build", quantView === "build");
  setUtilityPanel("");
  if (quantView === "landing") return renderQuantLanding();
  if (quantView === "build") return renderQuantBuild();
  document.getElementById("modeLabel").textContent = "TESTING";

  const test = runQuantBacktest();
  setUtilityPanel("");
  const strategyCopy = {
    trend: "Fast moving average above slow moving average, with price confirming trend.",
    mean: "Buy stretched dips below the slow average; exit when price mean-reverts.",
    breakout: "Buy new highs after a lookback window, then exit on trend failure.",
    custom: "Your formulas decide entries, exits, and position size using only local candle data."
  };
  modeSurface.innerHTML = `<section class="quant-page">
    ${quantNavigationHtml()}
    <div class="quant-hero">
      <span>Advanced paper trading</span>
      <h2 id="quantViewTitle" tabindex="-1">Testing</h2>
    </div>
    <details class="free-randomizer quant-parameters" aria-labelledby="quantParametersTitle" ${quantParametersExpanded ? "open" : ""}>
      <summary><div><span id="quantParametersTitle">Parameters</span></div></summary>
      <div class="free-randomizer-body quant-parameters-body">
    <section class="quant-builder">
      <label><span id="quantStrategyLabel">Strategy</span><select id="quantStrategy" aria-labelledby="quantStrategyLabel" aria-describedby="quantStrategyHelp">
        <option value="trend" ${quantConfig.strategy === "trend" ? "selected" : ""}>Trend following</option>
        <option value="mean" ${quantConfig.strategy === "mean" ? "selected" : ""}>Mean reversion</option>
        <option value="breakout" ${quantConfig.strategy === "breakout" ? "selected" : ""}>Volatility breakout</option>
        <option value="custom" ${quantConfig.strategy === "custom" ? "selected" : ""}>Custom formulas</option>
      </select><small class="quant-field-help" id="quantStrategyHelp">The rule for buying and exiting. Trend following buys a rising trend; Mean reversion buys dips below an average; Volatility breakout buys new highs with volume confirmation; Custom formulas uses your code. The strategy guide below explains the exact rules.</small></label>
      <label><span id="quantFastLabel">Fast lookback</span><input id="quantFast" aria-labelledby="quantFastLabel" aria-describedby="quantFastHelp" type="number" min="3" max="80" value="${test.fast}" /><small class="quant-field-help" id="quantFastHelp">Candles in the short moving average (average closing price). 12 means the latest 12 candles. Smaller values react faster. Mean reversion does not use this setting.</small></label>
      <label><span id="quantSlowLabel">Slow lookback</span><input id="quantSlow" aria-labelledby="quantSlowLabel" aria-describedby="quantSlowHelp" type="number" min="8" max="180" value="${test.slow}" /><small class="quant-field-help" id="quantSlowHelp">Candles in the longer average, or the prior-high window for breakouts. Larger values use more history. The test keeps this at least 2 above Fast lookback.</small></label>
      <label><span id="quantRiskLabel">Risk</span><select id="quantRisk" aria-labelledby="quantRiskLabel" aria-describedby="quantRiskHelp">
        <option value="conservative" ${quantConfig.risk === "conservative" ? "selected" : ""}>Conservative</option>
        <option value="balanced" ${quantConfig.risk === "balanced" ? "selected" : ""}>Balanced</option>
        <option value="aggressive" ${quantConfig.risk === "aggressive" ? "selected" : ""}>Aggressive</option>
      </select><small class="quant-field-help" id="quantRiskHelp">Scales the exposure setting: Conservative ×0.6, Balanced ×1, Aggressive ×1.25. Bigger positions magnify gains and losses; the simulator caps allocation at 150%.</small></label>
      <label><span id="quantCostLabel">Cost, bps</span><input id="quantCost" aria-labelledby="quantCostLabel" aria-describedby="quantCostHelp" type="number" min="0" max="75" value="${quantConfig.costBps}" /><small class="quant-field-help" id="quantCostHelp">Simulated trading cost. 1 basis point (bp) = 0.01%; 5 bps = 0.05%. The test deducts this percentage of simulated equity each time the position changes, including entry and exit.</small></label>
      <label><span id="quantStopLabel">Stop loss %</span><input id="quantStop" aria-labelledby="quantStopLabel" aria-describedby="quantStopHelp" type="number" min="0" max="80" step="0.5" value="${quantConfig.stopLossPct}" /><small class="quant-field-help" id="quantStopHelp">Exit when the candle's closing price is this far below entry. 8 means an 8% price drop; 0 turns this exit rule off. Checked at candle closes, so the loss can exceed the threshold.</small></label>
      <label><span id="quantTakeLabel">Take profit %</span><input id="quantTake" aria-labelledby="quantTakeLabel" aria-describedby="quantTakeHelp" type="number" min="0" max="200" step="0.5" value="${quantConfig.takeProfitPct}" /><small class="quant-field-help" id="quantTakeHelp">Exit when the candle's closing price is this far above entry. 18 means an 18% price gain; 0 turns this exit rule off. A strategy signal can still exit earlier.</small></label>
      <label><span id="quantHoldLabel">Max hold bars</span><input id="quantHold" aria-labelledby="quantHoldLabel" aria-describedby="quantHoldHelp" type="number" min="0" max="500" value="${quantConfig.maxHoldBars}" /><small class="quant-field-help" id="quantHoldHelp">Exit after holding for this many candles. 60 means 60 candle intervals after entry. 0 removes the time limit; other exit rules still apply.</small></label>
      <label><span id="quantExposureLabel">Max exposure %</span><input id="quantExposure" aria-labelledby="quantExposureLabel" aria-describedby="quantExposureHelp" type="number" min="5" max="150" value="${quantConfig.maxExposurePct}" /><small class="quant-field-help" id="quantExposureHelp">Base allocation before Risk scales it. 100 with Balanced uses 100% of simulated equity; with Aggressive it uses 125%. Above 100% simulates leverage, increasing gains and losses.</small></label>
      <div class="quant-actions">
        <button type="button" data-action="quant-run">Run backtest</button>
        <button type="button" data-action="quant-apply">Mark signals</button>
        <button type="button" data-action="quant-random">Try another market</button>
      </div>
      <details class="quant-guide">
        <summary>Strategy &amp; action guide</summary>
        <dl>
          <dt>Trend following</dt><dd>Buy while the fast average is above the slow average and the closing price is above the slow average. Exit when either condition fails.</dd>
          <dt>Mean reversion</dt><dd>Buy a dip more than 0.85 standard deviations below the slow average. Standard deviation measures how spread out prices are. Hold until price rises more than 0.25 standard deviations above that average, unless another exit rule fires. Fast lookback is unused.</dd>
          <dt>Volatility breakout</dt><dd>Buy when price closes above the highest high in the previous Slow lookback candles, with volume at least 90% of that window's average (or no volume data). Exit below the fast average or after a one-candle closing-price drop greater than 1.5%.</dd>
          <dt>Custom formulas</dt><dd>Your entry(), exit(), and size() expressions replace the built-in rules. Set indicator lookbacks in your code, such as ma(8); the Fast and Slow lookback controls do not change them. Cost and the stop, profit, hold, and allocation limits still apply.</dd>
          <dt>Run backtest</dt><dd>Apply your current settings and recalculate the simulated results below. This does not place real trades.</dd>
          <dt>Mark signals</dt><dd>Recalculate with your settings, replace the chart drawings with vertical lines for up to six recent signals, and turn on the SMA and EMA overlays (simple and exponential moving averages).</dd>
          <dt>Try another market</dt><dd>Keep your settings and test a randomly selected symbol from SPY, QQQ, TLT, NVDA, BTC-USD, and GC=F. The random choice can repeat the current market.</dd>
        </dl>
      </details>
    </section>
    <section class="quant-code-panel">
      <div class="section-head"><h3>Custom strategy compiler</h3><span>Sandboxed locally</span></div>
      <label><span>Language</span><select id="quantLanguage" aria-describedby="quantLanguageHelp">${quantLanguageOptions()}</select></label>
      <p id="quantLanguageHelp">Select the syntax used by your strategy source. This is a limited formula editor, not a full programming-language runtime.</p>
      <label class="quant-code-editor"><span>Strategy source</span><textarea id="quantCode" aria-describedby="quantSourceHelp" rows="12" spellcheck="false">${escapeHtml(quantConfig.customCode || quantLanguageTemplate())}</textarea></label>
      <p id="quantSourceHelp">entry() returns true to buy when out of the market. exit() returns true to close an open position. size() returns an allocation as a decimal: 0.5 means 50%. The test limits it between 5% and the Risk-scaled exposure cap.</p>
      <div class="quant-compiled-grid">
        <article><span>entry()</span><code>${escapeHtml(quantConfig.customEntry)}</code></article>
        <article><span>exit()</span><code>${escapeHtml(quantConfig.customExit)}</code></article>
        <article><span>size()</span><code>${escapeHtml(quantConfig.customSize)}</code></article>
      </div>
      <details class="quant-guide">
        <summary>Formula helper &amp; variable guide</summary>
        <dl>
          <dt>ma(n) &amp; ema(n)</dt><dd>Moving averages controlled by the candle count n. ma averages the latest n closing prices; ema gives recent prices more weight. For example, ma(8) &gt; ma(24) checks whether the shorter average is above the longer one.</dd>
          <dt>rsi(n), atr(n) &amp; roc(n)</dt><dd>RSI measures recent gains versus losses on a 0–100 scale. ATR measures typical candle movement in price units, including gaps. ROC is the closing-price change over n candles as a decimal: 0.05 means 5%.</dd>
          <dt>highest(n), lowest(n), zscore(n) &amp; volAvg(n)</dt><dd>The highest high, lowest low, distance from the average in standard deviations, and average volume over n candles. These windows include the current candle.</dd>
          <dt>crossOver(a,b) &amp; crossUnder(a,b)</dt><dd>Check whether one simple moving average just crossed above or below another. Pass candle counts, such as crossOver(8,24), rather than prices or average values.</dd>
          <dt>risk(decimal)</dt><dd>Suggests a position size using 14-candle ATR relative to price. risk(0.01) uses a 1% sizing budget and reduces allocation as volatility rises. It does not guarantee a 1% maximum loss; allocation limits still apply.</dd>
          <dt>open, high, low, close &amp; volume</dt><dd>The current candle's opening price, highest price, lowest price, closing price, and traded volume.</dd>
          <dt>return1, drawdown &amp; unrealized</dt><dd>The one-candle price return, simulated equity change from its peak, and price return since entry. These use decimals: −0.08 means −8%.</dd>
          <dt>barsHeld, position &amp; equity</dt><dd>Candles since entry, current allocation as a decimal (0 means no position), and simulated account value starting at 1. An equity value of 1.1 means a 10% gain.</dd>
        </dl>
      </details>
    </section>
      </div>
    </details>
    <section class="quant-rule-card">
      <strong>${escapeHtml(strategyCopy[quantConfig.strategy])}</strong>
      <span>${currentSymbol.ticker} - ${timeframe} - ${test.series.length} candles - ${quantConfig.costBps} bps per position change - ${quantConfig.maxExposurePct}% max exposure</span>
      ${quantFormulaError ? `<em>${escapeHtml(quantFormulaError)}</em>` : ""}
    </section>
    <section class="quant-metrics">
      <article><span>Total return</span><strong>${formatPct(test.totalReturn)}</strong><small>Buy/hold ${formatPct(test.buyHold)}</small></article>
      <article><span>Annualized</span><strong>${formatPct(test.annualized)}</strong><small>Rough period-adjusted rate</small></article>
      <article><span>Max drawdown</span><strong>${formatPct(test.maxDrawdown)}</strong><small>Worst equity peak-to-trough</small></article>
      <article><span>Sharpe-like</span><strong>${test.sharpe.toFixed(2)}</strong><small>Return per unit volatility</small></article>
      <article><span>Win rate</span><strong>${Math.round(test.winRate * 100)}%</strong><small>${test.wins} wins / ${test.losses} losses</small></article>
      <article><span>Exposure</span><strong>${Math.round(test.exposure * 100)}%</strong><small>${test.trades} completed trades</small></article>
    </section>
    <section class="quant-signal-list">
      <div class="section-head"><h3>Recent signals</h3><span>${test.signals.length || 0}</span></div>
      ${test.signals.length ? test.signals.map(signal => `<article>
        <strong>${signal.type}</strong>
        <span>${formatDate(signal)}</span>
        <small>${currentSymbol.ticker} at ${signal.price.toFixed(2)}${signal.tradeReturn !== undefined ? ` - trade ${formatPct(signal.tradeReturn)}` : ""}</small>
      </article>`).join("") : `<article><strong>No signal yet</strong><small>Try shorter lookbacks or a more active timeframe.</small></article>`}
    </section>
    ${test.critique.length ? `<section class="quant-critique">
      <strong>Strategy review</strong>
      ${test.critique.map(item => `<p>${escapeHtml(item)}</p>`).join("")}
    </section>` : ""}
    <details class="quant-rule-card quant-guide">
      <summary>How to read the results</summary>
      <dl>
        <dt>Total return &amp; Buy/hold</dt><dd>Total return is the simulated equity change after position-change costs. Buy/hold is the market's first-to-last closing-price change without those costs. Compare both over the same candle window.</dd>
        <dt>Annualized</dt><dd>Projects the test's growth rate over a year using the candle interval. A short sample can produce extreme values; this is not a forecast.</dd>
        <dt>Max drawdown</dt><dd>The largest percentage drop from a simulated equity peak to a later low. A value of −20% means equity fell 20% from its earlier peak.</dd>
        <dt>Sharpe-like</dt><dd>Average strategy return divided by its variability, scaled to a year. Higher values indicate more return per unit of variability in this sample. This simplified measure uses candle returns before trading costs and no risk-free-rate adjustment.</dd>
        <dt>Win rate</dt><dd>The share of recorded trades with a nonnegative entry-to-exit price change, before costs. An open position at the end is counted using the final close, and break-even trades count as wins.</dd>
        <dt>Exposure &amp; trade count</dt><dd>Exposure here is the percentage of tested candle intervals spent holding a position, not the allocation size. The trade count includes any position still open at the end, even though the metric labels it completed.</dd>
        <dt>Recent signals</dt><dd>Up to eight recent events: Entry means buying or increasing a position, Exit means reducing or closing it, and Open means a position remains at the end. Trade percentages show price changes before costs.</dd>
        <dt>Strategy review</dt><dd>Automatic notes flag small samples, large drawdowns, weak risk-adjusted returns, or being invested almost all the time. Test other markets and candle windows before drawing conclusions; simulated results do not guarantee future returns.</dd>
      </dl>
    </details>
  </section>`;
  result.innerHTML = `<strong>${escapeHtml(currentSymbol.ticker)} strategy test</strong><p>${escapeHtml(strategyCopy[quantConfig.strategy])}</p><p><b>Review:</b> compare return, drawdown, exposure, and buy/hold before trusting a rule.</p>`;
  attachQuantInfo();
}

function updateQuantConfigFromForm() {
  const fast = Math.max(3, Math.min(80, Number(document.getElementById("quantFast")?.value || quantConfig.fast)));
  const slow = Math.max(fast + 2, Math.min(180, Number(document.getElementById("quantSlow")?.value || quantConfig.slow)));
  quantConfig = {
    ...quantConfig,
    strategy: document.getElementById("quantStrategy")?.value || quantConfig.strategy,
    fast,
    slow,
    risk: document.getElementById("quantRisk")?.value || quantConfig.risk,
    costBps: Math.max(0, Math.min(75, Number(document.getElementById("quantCost")?.value || quantConfig.costBps))),
    stopLossPct: Math.max(0, Math.min(80, Number(document.getElementById("quantStop")?.value || quantConfig.stopLossPct))),
    takeProfitPct: Math.max(0, Math.min(200, Number(document.getElementById("quantTake")?.value || quantConfig.takeProfitPct))),
    maxHoldBars: Math.max(0, Math.min(500, Number(document.getElementById("quantHold")?.value || quantConfig.maxHoldBars))),
    maxExposurePct: Math.max(5, Math.min(150, Number(document.getElementById("quantExposure")?.value || quantConfig.maxExposurePct))),
    customLanguage: quantLanguages[document.getElementById("quantLanguage")?.value] ? document.getElementById("quantLanguage")?.value : quantConfig.customLanguage,
    customCode: document.getElementById("quantCode")?.value ?? quantConfig.customCode,
    customEntry: quantConfig.customEntry,
    customExit: quantConfig.customExit,
    customSize: quantConfig.customSize
  };
  if (quantConfig.strategy === "custom") {
    const compiled = compileQuantCode();
    quantFormulaError = compiled.ok ? "" : compiled.message;
  }
  if (typeof saveAccountDocument === "function") saveAccountDocument("quant");
}

function applyQuantSignalsToChart() {
  const test = quantBacktest || runQuantBacktest();
  commitDrawings(test.signals.slice(-6).map(signal => ({
    type: "vertical",
    a: { i: Math.min(latestSeries.length - 1, Math.max(0, signal.index - Math.max(0, test.series.length - latestSeries.length))), price: signal.price }
  })));
  showSMA = true;
  showEMA = true;
  document.querySelector('[data-indicator="sma"]')?.classList.add("active");
  document.querySelector('[data-indicator="ema"]')?.classList.add("active");
  drawChart();
}

function chartSeriesForMode() {
  if (isEventPackPaper()) {
    const end = Math.min(rawCandles.length, packPaperIndex + 1);
    return rawCandles.slice(Math.max(0, end - timeframeSize()), end)
      .map(bar => ({ ...bar, future: false, observedEnd: Math.min(end, timeframeSize()) }));
  }
  return appMode === "paper" || appMode === "quant" ? currentChartCandles() : challengeCandles();
}

function answerFor(series) {
  if (series.at(-1)?.dailyAnswer) return series.at(-1).dailyAnswer;
  if (series.at(-1)?.liveAnswer) return series.at(-1).liveAnswer;
  const observedEnd = series[0]?.observedEnd || Math.floor(series.length * .64);
  const outcome = series.slice(observedEnd);
  const start = outcome[0]?.open || series[0].open;
  const end = outcome.at(-1)?.close || series.at(-1).close;
  const move = (end - start) / Math.max(start, 1);
  const avgRange = outcome.reduce((sum, bar) => sum + (bar.high - bar.low), 0) / Math.max(1, outcome.length);
  const volatility = avgRange / Math.max(start, 1);
  if (volatility > 0.055) return "Volatility spike";
  if (move > 0.06) return "Breakout";
  if (move > 0.02) return "Up";
  if (move < -0.035) return "Down";
  if (Math.abs(move) < 0.012) return "Sideways";
  return "Reversal";
}

function liveAnswerFor(priorClose, close) {
  const move = (close - priorClose) / priorClose;
  const tolerance = .0001 + Number.EPSILON * 8;
  return move > tolerance ? "Up" : move < -tolerance ? "Down" : "Sideways";
}

function cancelLivePuzzle() {
  if (typeof refundRankedRound === "function" && refundRankedRound() === false) return false;
  clearTimeout(livePollTimer);
  clearTimeout(liveMarketTimer);
  clearInterval(liveClockTimer);
  livePollTimer = null;
  liveClockTimer = null;
  liveRound = null;
  liveMarketClosed = false;
  liveMarketTimer = null;
  liveMarketSymbol = "";
  if (typeof renderRankedCoins === "function") renderRankedCoins();
  const clock = document.getElementById("livePuzzleClock");
  if (clock) clock.querySelectorAll("[data-ranked-countdown]").forEach(display => { display.textContent = ""; });
  document.querySelectorAll('#tickerInput, #assetSelect, [data-timeframe]').forEach(control => { control.disabled = false; });
}

function scheduleLiveMarketCheck(symbol, requestId, delay = 60000) {
  clearTimeout(liveMarketTimer);
  if (appMode !== "ranked" || !liveMarketClosed || requestId !== chartRequestId) return;
  liveMarketTimer = setTimeout(() => refreshLiveMarket(symbol, requestId), delay);
}

async function refreshLiveMarket(symbol, requestId) {
  if (appMode !== "ranked" || !liveMarketClosed || requestId !== chartRequestId) return;
  let delay = 60000;
  try {
    if (!document.hidden) {
      // Check fresh minute bars; the selected chart settings apply on Load Chart.
      const data = await api(`/api/live-chart?symbol=${encodeURIComponent(symbol)}&interval=1m&history=1D`);
      if (appMode !== "ranked" || !liveMarketClosed || requestId !== chartRequestId) return;
      if (data.verifiedLive === true && data.candles?.length) {
        liveMarketClosed = false;
        liveMarketTimer = null;
        symbolStatus.classList.remove("error");
        setLivePuzzleStatus("Market open. Select Load Chart to start a live puzzle.");
        drawChart();
        syncNextChartButton();
        return;
      }
    }
  } catch (error) {
    delay = Math.max(delay, (Number(error.retryAfter) || 0) * 1000);
  }
  scheduleLiveMarketCheck(symbol, requestId, delay);
}

function livePuzzleControlsHtml() {
  return `<section class="live-puzzle-controls" aria-label="Live puzzle status">
    <p id="livePuzzleStatus" role="status"></p><div id="livePuzzleClock" class="live-puzzle-clock" role="group" aria-label="Ranked round countdowns" aria-live="off">
      <div data-ranked-countdown="start"></div><div data-ranked-countdown="reveal"></div>
    </div>
  </section>`;
}

function setLivePuzzleStatus(message) {
  if (liveRound) liveRound.status = message;
  const status = document.getElementById("livePuzzleStatus");
  if (status && status.textContent !== message) status.textContent = message;
}

function syncLiveClock() {
  if (!liveRound || appMode !== "ranked") return;
  const clock = document.getElementById("livePuzzleClock");
  const locked = rankedRoundCommitted();
  document.querySelectorAll('#tickerInput, #assetSelect, [data-timeframe]').forEach(control => { control.disabled = locked; });
  const remaining = Math.max(0, Math.ceil((liveRound.targetEnd * 1000 - Date.now() - liveRound.clockOffset) / 1000));
  const untilStart = Math.max(0, Math.ceil((liveRound.targetStart * 1000 - Date.now() - liveRound.clockOffset) / 1000));
  const countdown = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const startClock = clock?.querySelector('[data-ranked-countdown="start"]');
  const revealClock = clock?.querySelector('[data-ranked-countdown="reveal"]');
  if (startClock) startClock.textContent = liveRound.failed ? "Next candle unavailable"
    : untilStart ? `Next candle starts in ${countdown(untilStart)}` : remaining ? "Candle is live" : "Candle closed";
  if (revealClock) revealClock.textContent = liveRound.resolved ? "Prediction revealed"
    : liveRound.failed ? "Prediction unavailable"
    : remaining ? `Prediction reveal in ${countdown(remaining)}` : "Prediction reveal: waiting for verified candle data";
  if ((untilStart <= 5 || liveRound.expired) && !liveRound.choice && !liveRound.serverAttemptId && !liveRound.serverSaving) {
    liveRound.expired = true;
    if (typeof refundRankedRound === "function") refundRankedRound(liveRound, { automatic: true });
    document.querySelectorAll("#choices button").forEach(button => { button.disabled = true; });
    setLivePuzzleStatus("Betting closed five seconds before the candle starts. No XP or rewards. Load a new Ranked puzzle.");
    const message = "<strong>Betting closed</strong><p>No prediction submitted. Entry and any stake are refunded. Load a new Ranked puzzle.</p>";
    if (result.innerHTML !== message) result.innerHTML = message;
  }
  if (typeof renderRankedCoins === "function") renderRankedCoins();
}

async function loadLivePuzzle(input) {
  if (cancelLivePuzzle() === false) return false;
  // New rounds always use the fast format, even after restoring older settings.
  liveInterval = "1m";
  liveHistory = "1D";
  const requestId = ++chartRequestId;
  const symbol = normalizeSymbol(input);
  liveMarketSymbol = symbol;
  rawCandles = [];
  latestSeries = [];
  revealed = false;
  result.innerHTML = "";
  clearPracticeChoices();
  drawChart();
  setLivePuzzleStatus("Connecting to real-time market data…");
  try {
    if (location.protocol === "file:") throw new Error("Live needs the application server. Open http://127.0.0.1:8766/index.html.");
    const data = await api(`/api/live-chart?symbol=${encodeURIComponent(symbol)}&interval=${liveInterval}&history=${liveHistory}`);
    if (requestId !== chartRequestId || appMode !== "ranked") return false;
    if (data.verifiedLive !== true || !data.candles?.length) throw new Error("Verified Live candles are unavailable.");
    const localInfo = localSymbols.find(([ticker]) => ticker === normalizeSymbol(data.ticker || symbol));
    currentSymbol = { ticker: data.ticker, name: data.name && data.name !== data.ticker ? data.name : localInfo?.[1] || data.name || data.ticker,
      asset: data.asset, exchange: data.exchange, currency: data.currency };
    rawCandles = data.candles.map(bar => ({ ...bar, date: new Date(bar.time * 1000) }));
    liveRound = { symbol: data.ticker, interval: liveInterval, history: liveHistory,
      targetStart: data.targetStart, targetEnd: data.targetEnd, requestId, serverPuzzleId: data.puzzleId,
      rankedVersion: data.rankedVersion,
      clockOffset: data.serverTime * 1000 - Date.now(), source: data.source, feed: data.sourceNote };
    loadCurrentSymbol();
    setLivePuzzleStatus(`${data.source} · ${data.sourceNote}. ${liveHistory} history${data.historyLimited ? " (latest 10,000 minute bars shown)" : ""}. Predict the full future candle. Betting closes five seconds before it starts.`);
    syncLiveClock();
    liveClockTimer = setInterval(syncLiveClock, 1000);
    return true;
  } catch (error) {
    if (requestId !== chartRequestId || appMode !== "ranked") return false;
    liveMarketClosed = error.marketClosed === true || /No fresh market candles/i.test(error.message);
    if (liveMarketClosed) scheduleLiveMarketCheck(symbol, requestId);
    setLivePuzzleStatus(liveMarketClosed ? "Market Closed" : error.message);
    clearPracticeChoices();
    throw error;
  }
}

function lockLivePrediction(choice, button) {
  const round = liveRound;
  if (!round || round.choice || revealed) return;
  if (round.betSaving) { showToast("Wait for your bet to save before predicting."); return; }
  if (!round.serverAttemptId && (round.expired || !(Date.now() + round.clockOffset < (round.targetStart - 5) * 1000))) {
    syncLiveClock();
    return;
  }
  if (rankedRoundEntry(round)?.status !== "open") {
    showToast("Pay the 100-coin entry fee before making a Ranked prediction.");
    renderRankedCoins();
    return;
  }

  try {
    if (!(typeof accountHistoryEnabled === "function" && accountHistoryEnabled()) && !coinWallet().lockRanked(rankedRoundId(round), choice)) return;
  } catch { showToast("Your prediction could not be saved. Please try again."); return; }
  round.choice = choice;
  round.button = button;
  document.querySelectorAll("#choices button").forEach(item => { item.disabled = true; });
  button.classList.add("selected");
  result.innerHTML = `<strong>${escapeHtml(choice)} locked</strong><p>The result will appear after the candle closes and the real market data arrives.</p>`;
  setLivePuzzleStatus("Prediction locked. Waiting for the candle to close.");
  syncLiveClock();
  syncNextChartButton();
  const wait = Math.max(0, round.targetEnd * 1000 - Date.now() - round.clockOffset + 1500);
  livePollTimer = setTimeout(() => resolveLivePrediction(round), wait);
  saveReloadSession();
}

async function resolveLivePrediction(round) {

  if (liveRound !== round || round.resolved || round.failed || round.expired || appMode !== "ranked" || round.requestId !== chartRequestId) return;
  const deadline = (round.targetEnd + 120) * 1000;
  if (Date.now() + round.clockOffset > deadline) {
    clearInterval(liveClockTimer);
    round.failed = true;
    if (typeof refundRankedRound === "function") refundRankedRound(round, { automatic: true });
    setLivePuzzleStatus("The completed candle is unavailable. This market may have closed or its feed is delayed. No result or XP was recorded. Load a new puzzle.");
    syncNextChartButton();
    syncLiveClock();
    return;
  }
  let retryDelay = 5000;
  try {
    const data = await api(`/api/live-chart?symbol=${encodeURIComponent(round.symbol)}&interval=${round.interval}&history=${round.history}&target=${round.targetStart}`);
    if (liveRound !== round || round.expired || round.requestId !== chartRequestId || appMode !== "ranked") return;
    const outcome = data.candles?.find(bar => bar.time === round.targetStart);
    if (data.verifiedLive !== true) throw new Error("The provider did not verify this Live candle.");
    if (outcome && data.serverTime >= round.targetEnd) {
      const savedResult = null;
      if (liveRound !== round || round.requestId !== chartRequestId || appMode !== "ranked") return;
      if (typeof rankedRoundEntry === "function") {
        const entry = rankedRoundEntry(round);
        if (!entry || entry.status === "refunded" || entry.choice !== round.choice) {
          round.failed = true;
          refundRankedRound(round, { automatic: true });
          setLivePuzzleStatus("Ranked entry unavailable. No result recorded. Load a new round.");
          syncLiveClock();
          syncNextChartButton();
          return;
        }
        round.betPayout = rankedRoundWallet(round).settleRanked(rankedRoundId(round),
          round.choice === liveAnswerFor(round.rankedVersion === "live-v2" ? outcome.open : rawCandles.at(-1).close, outcome.close));
      }
      round.outcome = { ...outcome, date: new Date(outcome.time * 1000) };
      round.answer = liveAnswerFor(round.rankedVersion === "live-v2" ? outcome.open : rawCandles.at(-1).close, outcome.close);
      round.resolved = true;
      clearInterval(liveClockTimer);
      drawChart();
      predict(round.choice, round.button, savedResult);
      setLivePuzzleStatus(`Candle closed. ${round.source} · ${round.feed}.`);
      syncLiveClock();
      syncNextChartButton();
      if (round.betPayout) window.CoinRewards.playCollection(round.button, round.betPayout);
      if (typeof saveReloadSession === "function") saveReloadSession();
      return;
    }
    setLivePuzzleStatus("Candle closed; waiting for the provider to publish its completed bar.");
  } catch (error) {
    if (liveRound !== round || round.requestId !== chartRequestId) return;
    setLivePuzzleStatus(`${error.message} Your prediction stays locked while we retry.`);
    const retrySeconds = Number(error.retryAfter);
    if (Number.isFinite(retrySeconds) && retrySeconds > 0) retryDelay = Math.max(retryDelay, retrySeconds * 1000);
  }
  // A long provider cooldown can expire the round, without fetching early.
  livePollTimer = setTimeout(() => resolveLivePrediction(round), Math.min(retryDelay, Math.max(1, deadline - Date.now() - round.clockOffset + 1)));
}

function explanationFor(answer) {
  const copy = {
    "Up": `${currentSymbol.ticker} rose in the hidden window. The lesson is to look for buyers defending higher lows before assuming a trend is finished.`,
    "Down": `${currentSymbol.ticker} fell after the cutoff. Failed bounces and lower highs often warn that sellers still control the next leg.`,
    "Sideways": `${currentSymbol.ticker} stayed rangebound. When candles compress and neither side expands range, the best call is often no clear trend.`,
    "Breakout": `${currentSymbol.ticker} broke out from the visible range. Tight price compression can turn into a strong directional move when stops and momentum align.`,
    "Reversal": `${currentSymbol.ticker} reversed after the visible move stretched. Exhaustion shows up when price extends but follow-through weakens.`,
    "Volatility spike": `${currentSymbol.ticker} saw candle ranges expand sharply. That means the right read was instability, not simply direction.`
  };
  return copy[answer];
}

function restoreHistoricalChartScale(candles) {
  if (!rawCandles[0]?.indexedPrice || candles[0]?.indexedPrice) return;
  const factor = candles[0].open / rawCandles[0].open;
  // Drawings use candle indices and prices. Keep them and their undo snapshots
  // aligned when a committed reveal restores the original market price scale.
  const points = new Set();
  for (const drawing of [...drawings, ...drawingHistory.flat()]) {
    for (const point of [drawing.a, drawing.b, ...(drawing.points || [])]) {
      if (point && !points.has(point) && Number.isFinite(point.price)) {
        point.price *= factor;
        points.add(point);
      }
    }
  }
  priceOffset *= factor;
  // A timed Competitive reveal can arrive while a pointer is still down.
  // Cancel the unfinished gesture rather than mixing indexed and real prices.
  clearChartTouches();
  resetDrawingGesture();
  chartTip.hidden = true;
}

function loadCurrentSymbol() {
  revealed = false;
  zoom = 1;
  pan = 0;
  priceOffset = 0;
  priceScale = 1;
  hoverIndex = null;
  drawings = [];
  drawingHistory = [];
  resetDrawingGesture();
  updateDrawingActions();
  if (typeof restoreSavedDrawings === "function") restoreSavedDrawings();
  chartTip.hidden = true;
  title.innerHTML = `<span class="chart-ticker">${escapeHtml(currentSymbol.ticker)}</span><span class="chart-company-name">${escapeHtml(currentSymbol.name)}</span>`;
  tickerInput.value = currentSymbol.ticker;
  assetSelect.value = currentSymbol.asset in assetDefaults ? currentSymbol.asset : "stocks";
  symbolStatus.classList.remove("error", "loading");
  symbolStatus.textContent = `${currentSymbol.ticker} - ${currentSymbol.name}${currentSymbol.exchange ? ` - ${currentSymbol.exchange}` : ""}`;
  tickerInput.classList.remove("invalid");
  tickerInput.classList.add("valid");
  setLoading(false);
  if (appMode === "quant") {
    renderQuantLab();
    clearPracticeChoices();
  } else if (practiceControlsActive()) {
    revealTag.textContent = "";
    result.innerHTML = "";
    renderChoices();
  } else {
    clearPracticeChoices();
  }
  if (isEventPackPaper()) {
    restoreEventPackPaperTime();
    const quote = eventPackPaperQuote();
    if (quote) updatePaperPositionQuote(quote);
    renderPaperTrading();
  }
  drawChart();
}

function showSymbolError(value, message) {
  setLoading(false);
  symbolStatus.classList.remove("loading");
  symbolStatus.classList.add("error");
  symbolStatus.textContent = message || `No market-data match for "${value}". Try a launch-supported symbol like AAPL, RIVN, SPY, QQQ, BTC-USD, or ETH-USD.`;
  tickerInput.classList.remove("valid");
  tickerInput.classList.add("invalid");
  showToast(symbolStatus.textContent);
}

function renderNews() {
  setUtilityPanel("Source board", "MarketPulse News", "Explore original market news, historical comparisons and on-device personalization.");
  if (!window.MarketPulseNews) {
    modeSurface.innerHTML = '<p role="status">MarketPulse News could not load. Refresh to try again.</p>';
    return;
  }
  window.MarketPulseNews.mount(modeSurface, {
    escape: escapeHtml,
    saved: savedNews,
    isCurrent: () => appMode === "news" && Boolean(modeSurface.querySelector(".marketpulse-page")),
    openPaper: () => setMode("paper", { loadChart: false })
  });
}

function practiceChartPreviewSnapshot(series = []) {
  if (!Array.isArray(series) || !series.length) return { candles: [], observedEnd: 0 };
  const firstFuture = series.findIndex(bar => bar?.future === true);
  const recordedObservedEnd = Math.trunc(Number(series[0]?.observedEnd));
  const observedEnd = Math.max(1, Math.min(series.length,
    firstFuture >= 0 ? firstFuture : Number.isFinite(recordedObservedEnd) ? recordedObservedEnd : series.length
  ));
  const start = Math.max(0, observedEnd - 28);
  const end = Math.min(series.length, observedEnd + 16);
  const compactPrice = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 1e6) / 1e6 : null;
  };
  const candles = series.slice(start, end).map(bar => {
    const date = new Date(bar?.date || 0);
    return [
      Number.isNaN(date.getTime()) ? 0 : date.getTime(),
      compactPrice(bar?.open),
      compactPrice(bar?.high),
      compactPrice(bar?.low),
      compactPrice(bar?.close)
    ];
  }).filter(candle => candle[0] > 0 && candle.slice(1).every(Number.isFinite));
  return {
    candles,
    observedEnd: Math.max(1, Math.min(candles.length, observedEnd - start))
  };
}

function makePracticeEntry(answer, choice, correct, extra = {}) {
  const series = latestSeries.length ? latestSeries : [];
  const chartPreview = practiceChartPreviewSnapshot(series);
  return {
    id: extra.id || `practice-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: extra.type || "single",
    mode: extra.mode || appMode,
    answer,
    choice,
    correct,
    ticker: currentSymbol.ticker,
    name: currentSymbol.name,
    asset: currentSymbol.asset,
    timeframe,
    at: extra.at || new Date().toISOString(),
    citation: chartCitation?.textContent || "",
    windowStart: series[0]?.date?.toISOString?.() || "",
    windowEnd: series.at(-1)?.date?.toISOString?.() || "",
    ...(chartPreview.candles.length ? {
      chartPreview: chartPreview.candles,
      chartObservedEnd: chartPreview.observedEnd
    } : {}),
    ...extra
  };
}

function recordPracticeResult(answer, choice, correct, extra = {}) {
  if (!choice || ["Timed out", "Skipped", "Skip"].includes(choice)) return;
  const entry = makePracticeEntry(answer, choice, correct, extra);
  recordHeaderAccuracy(entry);
  practiceHistory.unshift(entry);
  recordFreePlayDayAnswer(entry);
  practiceHistory.length = Math.min(practiceHistory.length, 120);
  savePracticeHistory();
  renderPracticePlan(answer);
}

function latestPracticeEntry() {
  const latest = practiceHistory[0];
  if (!latest) return null;
  if (latest.type === "versus-match") return latest.rounds?.at(-1) || null;
  return latest;
}

function mistakeRecords() {
  return practiceHistory.flatMap(record => {
    if (record.type === "versus-match") {
      return (record.rounds || [])
        .filter(round => !round.correct)
        .map(round => ({ ...round, parentId: record.id, parentLabel: `Versus vs ${record.opponent}`, parentScore: record.score }));
    }
    return record.correct ? [] : [record];
  });
}

function historyRecordCount(records = practiceHistory) {
  return records.reduce((sum, record) => sum + (record.type === "versus-match" ? (record.rounds?.length || 0) : 1), 0);
}

function renderPracticePlan(activeAnswer = latestPracticeEntry()?.answer || "Breakout") {
  if (!patternProgress || !patternLab) return;
  const lesson = patternLessons[activeAnswer] || patternLessons.Breakout;
  const misses = mistakeRecords().length;
  const latest = latestPracticeEntry();
  patternProgress.textContent = practiceHistory.length
    ? `${historyRecordCount()} logged ${historyRecordCount() === 1 ? "reveal" : "reveals"} - ${misses} to review`
    : "Ready after reveal";
  patternLab.innerHTML = `
    <article>
      <strong>${latest ? `Last reveal: ${latest.ticker} was ${latest.answer}` : "Start with one prediction"}</strong>
      <span>${latest ? `You chose ${latest.choice}. ${latest.correct ? "Keep the read, then test it on a fresh chart." : "Review the missed setup before the next chart."}` : "Reveal a chart to get a specific drill and checklist."}</span>
      <div class="plan-actions">
        <button type="button" data-plan-action="start-drill">Start drill</button>
        <button type="button" data-plan-action="open-review">Open review</button>
      </div>
    </article>
    <article>
      <strong>Next drill: ${lesson.title}</strong>
      <span>${lesson.drill}</span>
      <div class="lesson-actions">${lesson.checklist.map(item => `<span>${item}</span>`).join("")}</div>
      <div class="plan-actions">
        <button type="button" data-plan-action="start-drill">Practice this setup</button>
      </div>
    </article>
    <article>
      <strong>Drawing suggestion</strong>
      <span>Use Ruler for exact move size, Price for the key level, and Delete to remove any annotation that is not helping the read.</span>
      <div class="plan-actions">
        <button type="button" data-plan-action="arm-ruler">Arm Ruler</button>
        <button type="button" data-plan-action="clear-drawings">Clear drawings</button>
      </div>
    </article>`;
}

function formatHistoryTime(value) {
  if (!value) return "just now";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function historyTitle(record) {
  if (record.type === "versus-match") return `${record.opponent}`;
  return `${record.ticker} - ${record.mode === "daily" ? "Daily" : record.mode}`;
}

function reviewReplayAttributes(recordId, roundNumber = "") {
  if (!reviewChartActive) return "";
  const id = String(recordId || "");
  const round = roundNumber === "" ? "" : String(roundNumber);
  const roundAttribute = round ? ` data-review-round="${escapeHtml(round)}"` : "";
  const isCurrent = id === activeReviewRecordId && round === activeReviewRound;
  return ` data-action="review-open" data-review-id="${escapeHtml(id)}"${roundAttribute} aria-current="${isCurrent ? "true" : "false"}"`;
}

function reviewRoundHtml(round, matchId) {
  return `<details class="review-round ${reviewRecordState(round)}">
    <summary${reviewReplayAttributes(matchId, round.round)}><span>Round ${escapeHtml(String(round.round))}</span>${reviewRecordInstrumentHtml(round)}<small>You chose ${escapeHtml(round.choice)} · <span data-review-status>${reviewRecordStatus(round)}</span></small></summary>
    ${reviewChartActive ? "" : reviewRecordPreviewHtml(round, recordId, roundNumber)}
  </details>`;
}

function reviewRecordStatus(record) {
  return record?.correct ? "Correct" : record?.reviewedCorrect === true || record?.reviewChecked === true ? "Reviewed" : "Needs review";
}

function reviewRecordState(record) {
  return record?.correct ? "correct" : record?.reviewedCorrect === true || record?.reviewChecked === true ? "reviewed" : "missed";
}

function syncReviewControls({ resetHint = false } = {}) {
  const actions = document.getElementById("reviewActions");
  const hint = document.getElementById("reviewHint");
  const hintButton = document.getElementById("reviewHintBtn");
  const statusButton = document.getElementById("reviewStatusBtn");
  const record = appMode === "review" && reviewChartActive
    ? findReviewTarget(activeReviewRecordId, activeReviewRound) : null;
  actions.hidden = !record;
  if (resetHint || !record) hint.hidden = true;
  hintButton.setAttribute("aria-expanded", String(!hint.hidden));
  if (!record) return;
  hint.innerHTML = `<strong>Reviewing ${record.correct ? "correct" : "missed"} call: ${escapeHtml(record.answer || "")}</strong><p>You chose ${escapeHtml(record.choice || "")}. Replay the chart, redraw the level, and compare your thesis with the hidden outcome.</p><p><b>Drill:</b> ${escapeHtml(patternLessons[record.answer]?.drill || "Mark the decisive level before revealing again.")}</p>`;
  statusButton.textContent = reviewRecordStatus(record);
  statusButton.dataset.reviewState = reviewRecordState(record);
  statusButton.setAttribute("aria-pressed", String(reviewRecordState(record) !== "missed"));
  statusButton.disabled = record.correct === true;
  statusButton.setAttribute("aria-label", record.correct ? "Correct" : `${reviewRecordStatus(record)}. Mark as ${reviewRecordState(record) === "missed" ? "Reviewed" : "Needs review"}`);
}

function toggleReviewHint() {
  const record = findReviewTarget(activeReviewRecordId, activeReviewRound);
  if (appMode !== "review" || !reviewChartActive || !record) return;
  const hint = document.getElementById("reviewHint");
  hint.hidden = !hint.hidden;
  if (!hint.hidden && !record.correct && !revealed) {
    record.reviewXpBlocked = true;
    savePracticeHistory();
  }
  syncReviewControls();
  if (!hint.hidden) requestAnimationFrame(() => {
    if (hint.hidden) return;
    // Stop focus scrolling before revealing content inside the panel scrollport.
    window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: "instant" });
    const panel = hint.parentElement;
    const visibleBottom = Math.min(panel.getBoundingClientRect().bottom, window.innerHeight);
    // Opening a hint is intentional panel scrolling, rather than wheel inertia.
    predictionPanelRestoreTop = null;
    predictionPanelPageY = window.scrollY;
    panel.scrollBy({ top: Math.max(0, hint.getBoundingClientRect().bottom - visibleBottom), behavior: "instant" });
  });
}

function toggleActiveReviewStatus() {
  const record = findReviewTarget(activeReviewRecordId, activeReviewRound);
  if (appMode !== "review" || !reviewChartActive || !record || record.correct) return;
  const checked = reviewRecordState(record) === "missed";
  record.reviewXpBlocked = true;
  record.reviewChecked = checked;
  record.reviewedCorrect = false;
  savePracticeHistory();
  syncReviewCheckedControls();
  syncReviewControls();
}

function resolveReviewPrediction(correct, now = Date.now()) {
  const record = findReviewTarget(activeReviewRecordId, activeReviewRound);
  if (!record || record.correct || !correct) return 0;
  const parent = practiceHistory.find(item => item.id === activeReviewRecordId);
  const attemptedAt = new Date(record.at || parent?.at || "").getTime();
  const eligible = correct && choices.includes(record.answer)
    && reviewRecordState(record) === "missed"
    && !record.reviewXpBlocked && !record.reviewXpAwarded
    && Number.isFinite(attemptedAt) && now - attemptedAt >= 3 * 60 * 60 * 1000;
  const earnedXp = eligible ? (120 + stats.streak * 4) / 2 : 0;
  if (earnedXp) record.reviewXpAwarded = earnedXp;
  savePracticeHistory();
  return earnedXp;
}

function reviewChartQueue() {
  return visibleReviewRecords().flatMap(record => record.type === "versus-match"
    ? (record.rounds || []).map(round => ({ id: String(record.id), round: String(round.round) }))
    : [{ id: String(record.id), round: "" }]);
}

async function nextReviewChart() {
  if (nextChartLoading || symbolStatus.classList.contains("loading")) return;
  const queue = reviewChartQueue();
  if (queue.length < 2) return;
  const index = queue.findIndex(item => item.id === activeReviewRecordId && item.round === activeReviewRound);
  const next = queue[(index + 1) % queue.length];
  nextChartLoading = true;
  syncNextChartButton();
  try {
    await openReviewRecord(next.id, next.round || undefined);
  } finally {
    nextChartLoading = false;
    syncNextChartButton();
  }
}

async function shuffleReviewChart() {
  if (appMode !== "review" || !reviewChartActive || nextChartLoading || symbolStatus.classList.contains("loading")) return;
  const queue = reviewChartQueue();
  const alternatives = queue.filter(item => item.id !== activeReviewRecordId || item.round !== activeReviewRound);
  nextChartLoading = true;
  syncNextChartButton();
  try {
    const next = randomItem(alternatives.length ? alternatives : queue);
    if (!next) return;
    await openReviewRecord(next.id, next.round || undefined);
  } catch (error) {
    showToast(error.message || "Review shuffle could not load. Please retry.");
  } finally {
    nextChartLoading = false;
    syncNextChartButton();
    modeSurface.querySelector('[data-action="review-shuffle"]')?.focus({ preventScroll: true });
  }
}

function markActiveReviewCorrect() {
  const record = findReviewTarget(activeReviewRecordId, activeReviewRound);
  if (!record || record.correct || record.reviewedCorrect === true) return false;
  // Keep the original attempt and accuracy intact; a correct retry is separate progress.
  record.reviewedCorrect = true;
  record.reviewChecked = true;
  savePracticeHistory();
  modeSurface.querySelectorAll('summary[data-action="review-open"]').forEach(summary => {
    if (summary.dataset.reviewId !== activeReviewRecordId
      || (summary.dataset.reviewRound || "") !== activeReviewRound) return;
    const row = summary.parentElement;
    row.classList.remove("missed");
    row.classList.add("reviewed");
    const status = summary.querySelector("[data-review-status]");
    if (status) status.textContent = reviewRecordStatus(record);
    const resultStatus = row.querySelector("[data-review-result]");
    if (resultStatus) {
      resultStatus.textContent = reviewRecordStatus(record);
      resultStatus.className = "reviewed";
    }
  });
  return true;
}

function reviewRecordInstrumentHtml(record) {
  const ticker = escapeHtml(record?.ticker || "Trade");
  const name = record?.name && record.name !== record.ticker ? escapeHtml(record.name) : "";
  const timeframeLabel = escapeHtml(record?.timeframe || "—");
  return `<strong class="review-record-instrument"><span class="review-record-ticker">${ticker}</span><span class="review-record-company">${name}</span><span class="review-record-timeframe">${timeframeLabel}</span></strong>`;
}

function visibleReviewRecords() {
  return practiceHistory.filter(record =>
    record?.mode !== "review"
    && !isPrivateReviewRecord(record)
    && (reviewChartActive || reviewRecordFilter !== "favorites" || record.favorite === true)
    && (!reviewGameModes.length || reviewGameModes.includes(record.type === "versus-match" ? "versus" : record.mode))
    && (!(record.type === "versus-match" || record.mode === "versus")
      || !reviewGameModes.some(mode => mode.startsWith("versus-"))
      || reviewGameModes.includes(`versus-${String(record.competitiveMode
        || (record.matchType === "private" || /^Private match /i.test(record.opponent || "") ? "Private" : "")).toLowerCase()}`))
  );
}

function reviewRecordChecked(record) {
  if (typeof record?.reviewChecked === "boolean") return record.reviewChecked;
  if (record?.type === "versus-match") {
    return Boolean(record.rounds?.length) && record.rounds.every(round => round.correct === true || round.reviewedCorrect === true);
  }
  return record?.correct === true || record?.reviewedCorrect === true;
}

function updateReviewRecordChecked(record, checked) {
  record.reviewChecked = Boolean(checked);
  if (checked && !record.correct) record.reviewXpBlocked = true;
  if (record.type === "versus-match") {
    (record.rounds || []).forEach(round => updateReviewRecordChecked(round, checked));
  }
}

function setReviewRecordChecked(recordId, checked) {
  const record = practiceHistory.find(item => String(item.id) === String(recordId) && item.mode !== "review");
  if (!record) return false;
  updateReviewRecordChecked(record, checked);
  savePracticeHistory();
  return true;
}

function setVisibleReviewRecordsChecked(checked) {
  const records = visibleReviewRecords();
  records.forEach(record => updateReviewRecordChecked(record, checked));
  if (records.length) savePracticeHistory();
  return records.length;
}

function setVisibleReviewRecordsFavorite(favorite) {
  const records = visibleReviewRecords();
  records.forEach(record => {
    if (favorite && record.favorite !== true) {
      // Remember only hearts added by the bulk button, including across reloads.
      record.bulkFavoriteAdded = true;
      record.favorite = true;
    } else if (!favorite && record.bulkFavoriteAdded === true) {
      delete record.favorite;
      delete record.bulkFavoriteAdded;
    }
  });
  if (records.length) savePracticeHistory();
  return records.length;
}

function reviewRecordControlsHtml(record) {
  if (reviewChartActive) return "";
  const recordId = escapeHtml(String(record.id || ""));
  const recordLabel = escapeHtml(historyTitle(record));
  const favorite = record.favorite === true;
  return `<div class="review-record-actions">
    <button class="review-record-favorite${favorite ? " active" : ""}" type="button" data-action="review-favorite" data-review-id="${recordId}" aria-pressed="${favorite}" aria-label="${favorite ? "Remove" : "Add"} ${recordLabel} ${favorite ? "from" : "to"} favorites"><span aria-hidden="true">${favorite ? "♥" : "♡"}</span></button>
    <label class="review-record-select"><input type="checkbox" data-review-select="${recordId}" aria-label="Mark ${recordLabel} checked" ${reviewRecordChecked(record) ? "checked" : ""} /></label>
  </div>`;
}

function syncReviewCheckedControls() {
  modeSurface.querySelectorAll(".review-record[data-review-record-id]").forEach(row => {
    const record = practiceHistory.find(item => String(item.id) === row.dataset.reviewRecordId);
    if (!record) return;
    if (record.type === "versus-match") {
      row.querySelectorAll(".review-round").forEach((roundRow, index) => {
        syncReviewRecordStatus(roundRow, record.rounds[index]);
      });
    } else {
      syncReviewRecordStatus(row, record);
    }
  });
  const visible = visibleReviewRecords();
  const checkedCount = visible.filter(reviewRecordChecked).length;
  const selectAll = modeSurface.querySelector("[data-review-select-all]");
  if (selectAll) {
    selectAll.checked = visible.length > 0 && checkedCount === visible.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < visible.length;
  }
  const count = modeSurface.querySelector(".review-selected-count");
  if (count) count.textContent = `${practiceHistory.filter(record => record.mode !== "review" && reviewRecordChecked(record)).length} Reviewed`;
}

function syncReviewRecordStatus(row, record) {
  const state = reviewRecordState(record);
  row.classList.remove("correct", "missed", "reviewed");
  row.classList.add(state);
  const status = row.querySelector("[data-review-status]");
  if (status) status.textContent = reviewRecordStatus(record);
  const result = row.querySelector("[data-review-result]");
  if (result) {
    result.textContent = state === "missed" ? "Missed" : reviewRecordStatus(record);
    result.className = state === "reviewed" ? "reviewed" : state === "correct" ? "positive" : "negative";
  }
}

function reviewFilterIconHtml() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2.5"/><circle cx="16" cy="12" r="2.5"/><circle cx="11" cy="18" r="2.5"/></svg>`;
}

function reviewGameModeSelected(mode, modes) {
  if (mode === "all") return !modes.length;
  if (!modes.length) return true;
  return modes.includes(mode);
}

function reviewGameModeMenuHtml() {
  const row = ([mode, label, icon]) => `<button type="button" class="review-game-mode" role="switch" aria-checked="${reviewGameModeSelected(mode, reviewGameModes)}" data-action="review-game-mode" data-review-game-mode="${mode}"><span class="review-game-icon" aria-hidden="true">${icon}</span><span>${label}</span><span class="review-game-switch" aria-hidden="true"></span></button>`;
  return `<dialog class="review-game-menu" id="reviewGameMenu" aria-labelledby="reviewGameMenuTitle">
    <div class="review-game-menu-head"><h3 id="reviewGameMenuTitle">Game Modes</h3></div>
    <div class="review-game-menu-scroll" tabindex="0" aria-label="Game modes, scroll for more options">
      ${row(["all", "All", "▦"])}
      ${reviewGameModeOptions.slice(0, 3).map(row).join("")}
      <details class="review-game-more" open><summary>More</summary><div>${reviewGameModeOptions.slice(3).filter(([mode]) => mode !== "quant").map(row).join("")}</div></details>
    </div>
    <div class="review-game-menu-footer"><button type="button" data-action="review-game-reset">Reset</button><button type="button" data-action="review-game-apply">Apply</button></div>
  </dialog>`;
}

function toggleReviewGameMode(mode) {
  if (mode === "all") reviewGameModeDraft = [];
  else if (reviewGameModeOptions.some(option => option[0] === mode)) {
    const selected = reviewGameModeDraft.length
      ? reviewGameModeDraft.filter(item => item !== "none")
      : reviewGameModeOptions.map(option => option[0]);
    reviewGameModeDraft = selected.includes(mode)
      ? selected.filter(item => item !== mode)
      : [...selected, mode];
    if (!reviewGameModeDraft.length) reviewGameModeDraft = ["none"];
  }
  modeSurface.querySelectorAll("[data-review-game-mode]").forEach(button => {
    const selected = reviewGameModeSelected(button.dataset.reviewGameMode, reviewGameModeDraft);
    button.setAttribute("aria-checked", selected);
  });
}

function closeReviewGameMenu() {
  const menu = document.getElementById("reviewGameMenu");
  if (!menu?.open) return;
  menu.close();
  const trigger = modeSurface.querySelector('[aria-controls="reviewGameMenu"]');
  trigger?.setAttribute("aria-expanded", "false");
  trigger?.focus({ preventScroll: true });
}

function applyReviewGameModes() {
  const changed = reviewGameModes.length !== reviewGameModeDraft.length
    || reviewGameModes.some(mode => !reviewGameModeDraft.includes(mode));
  reviewGameModes = [...reviewGameModeDraft];
  closeReviewGameMenu();
  if (changed && reviewChartActive) {
    // Keep the expanded workspace, but invalidate the previous puzzle and its request.
    chartRequestId += 1;
    activeReviewRecordId = "";
    activeReviewRound = "";
    activeReviewAnswer = "";
    rawCandles = [];
    latestSeries = [];
    revealed = false;
    hoverIndex = null;
    drawings = [];
    drawingHistory = [];
    resetDrawingGesture();
    updateDrawingActions();
    chartTip.hidden = true;
    setLoading(false);
    title.textContent = "Expanded Review Chart";
    symbolStatus.textContent = "";
    chartCitation.textContent = "";
    setUtilityPanel("", "choose a new puzzle");
    renderChoices();
    drawChart();
  }
  renderReview();
  syncReviewControls();
  modeSurface.querySelector('[aria-controls="reviewGameMenu"]')?.focus({ preventScroll: true });
}

function positionReviewGameMenu() {
  const menu = document.getElementById("reviewGameMenu");
  const trigger = modeSurface.querySelector('[aria-controls="reviewGameMenu"]');
  if (!menu?.open || !trigger) return;
  const margin = 16;
  const gap = 8;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const bounds = trigger.getBoundingClientRect();
  const width = menu.getBoundingClientRect().width;
  let height = Math.min(560, viewportHeight - margin * 2);
  let left;
  let top = bounds.top;
  if (bounds.left - gap - width >= margin) {
    left = bounds.left - gap - width;
  } else if (bounds.right + gap + width <= viewportWidth - margin) {
    left = bounds.right + gap;
  } else {
    // Stack next to the icon vertically when neither side has room.
    left = bounds.left;
    const below = viewportHeight - margin - bounds.bottom - gap;
    const above = bounds.top - gap - margin;
    const placeBelow = below >= above;
    height = Math.min(height, Math.max(0, placeBelow ? below : above));
    top = placeBelow ? bounds.bottom + gap : bounds.top - gap - height;
  }
  menu.style.height = `${height}px`;
  menu.style.setProperty("--review-menu-left", `${Math.max(margin, Math.min(left, viewportWidth - width - margin))}px`);
  menu.style.setProperty("--review-menu-top", `${Math.max(margin, Math.min(top, viewportHeight - height - margin))}px`);
}

function openReviewGameMenu() {
  const menu = document.getElementById("reviewGameMenu");
  const trigger = modeSurface.querySelector('[aria-controls="reviewGameMenu"]');
  if (!menu || !trigger || menu.open) return;
  reviewGameModeDraft = [...reviewGameModes];
  toggleReviewGameMode("");
  menu.classList.add("is-anchored");
  menu.showModal();
  menu.querySelector(".review-game-menu-scroll").scrollTop = 0;
  trigger.setAttribute("aria-expanded", "true");
  menu.querySelector(".review-game-menu-scroll")?.focus({ preventScroll: true });
  positionReviewGameMenu();
  menu.oncancel = event => { event.preventDefault(); closeReviewGameMenu(); };
  menu.onclick = event => {
    if (event.target !== menu) return;
    const rect = menu.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeReviewGameMenu();
  };
}

function reviewChartCandles(record) {
  if (!Array.isArray(record?.chartPreview)) return [];
  return record.chartPreview.map(candle => {
    if (!Array.isArray(candle) || candle.length < 5) return null;
    const [at, open, high, low, close] = candle.map(Number);
    if (![at, open, high, low, close].every(Number.isFinite) || at <= 0) return null;
    return { at, open, high, low, close };
  }).filter(Boolean);
}

const reviewPreviewRequests = new Map();

async function recoverReviewChartPreview(record) {
  const config = timeframeConfigFor(record?.timeframe || "3M") || timeframeConfigFor("3M");
  const windowStart = new Date(record?.windowStart || "");
  const windowEnd = new Date(record?.windowEnd || "");
  const hasSavedWindow = Number.isFinite(windowStart.getTime())
    && Number.isFinite(windowEnd.getTime())
    && windowEnd > windowStart;
  const params = new URLSearchParams({
    symbol: normalizeSymbol(record?.ticker || "AAPL"),
    interval: config.interval
  });
  if (hasSavedWindow) {
    params.set("start", windowStart.toISOString());
    params.set("end", windowEnd.toISOString());
  } else {
    params.set("range", config.range);
  }
  const data = await api(`/api/chart?${params}`);
  let candles = (Array.isArray(data?.candles) ? data.candles : []).map(item => ({
    ...item,
    date: new Date(Number(item.time) * 1000)
  })).filter(item => Number.isFinite(item.date.getTime()) && [item.open, item.high, item.low, item.close].every(value => Number.isFinite(Number(value))));
  candles = aggregateTimeframeCandles(candles, config);
  if (hasSavedWindow) {
    candles = candles.filter(item => item.date >= windowStart && item.date <= windowEnd);
  }
  if (candles.length < 2) throw new Error("Saved chart window is unavailable.");
  const observedEnd = Math.max(1, Math.min(candles.length - 1, Math.floor(candles.length * .64)));
  const snapshot = practiceChartPreviewSnapshot(candles.map((bar, index) => ({
    ...bar,
    future: index >= observedEnd,
    observedEnd
  })));
  if (snapshot.candles.length < 2) throw new Error("Saved chart window is unavailable.");
  record.chartPreview = snapshot.candles;
  record.chartObservedEnd = snapshot.observedEnd;
  record.chartPreviewRecovered = true;
  savePracticeHistory();
  return reviewChartCandles(record);
}

async function hydrateReviewPreviewHost(host) {
  if (!host || host.dataset.reviewPreviewState === "ready" || host.dataset.reviewPreviewState === "loading") return;
  const record = findReviewTarget(host.dataset.reviewId, host.dataset.reviewRound);
  if (!record) return;
  const existing = reviewChartCandles(record);
  if (existing.length >= 2) {
    host.innerHTML = reviewChartPreviewSvg(record, existing);
    host.dataset.reviewPreviewState = "ready";
    return;
  }
  host.dataset.reviewPreviewState = "loading";
  host.innerHTML = reviewChartPreviewSvg(record, existing);
  const requestKey = `${host.dataset.reviewId || ""}:${host.dataset.reviewRound || ""}`;
  let request = reviewPreviewRequests.get(requestKey);
  if (!request) {
    request = recoverReviewChartPreview(record).finally(() => reviewPreviewRequests.delete(requestKey));
    reviewPreviewRequests.set(requestKey, request);
  }
  try {
    const candles = await request;
    if (!host.isConnected || host.dataset.reviewPreviewState !== "loading") return;
    host.innerHTML = reviewChartPreviewSvg(record, candles);
    host.dataset.reviewPreviewState = "ready";
    const move = reviewChartMove(record, candles);
    const moveElement = host.closest(".review-trade-preview")?.querySelector("[data-review-price-move]");
    if (moveElement) moveElement.textContent = move.label;
    const rangeElement = host.closest(".review-trade-preview")?.querySelector("[data-review-chart-range]");
    if (rangeElement) rangeElement.textContent = reviewChartRangeLabel(record, candles);
    const profit = reviewProfitSummary(record, candles);
    const amountElement = host.closest(".review-trade-preview")?.querySelector("[data-review-profit-amount]");
    const percentElement = host.closest(".review-trade-preview")?.querySelector("[data-review-profit-percent]");
    [amountElement, percentElement].forEach(element => {
      if (!element) return;
      element.classList.remove("positive", "negative");
      if (profit.className) element.classList.add(profit.className);
    });
    if (amountElement) amountElement.textContent = profit.amountLabel;
    if (percentElement) percentElement.textContent = profit.percentLabel;
    animateLoadingDots(amountElement);
    animateLoadingDots(percentElement);
  } catch {
    if (!host.isConnected || host.dataset.reviewPreviewState !== "loading") return;
    host.dataset.reviewPreviewState = "error";
    host.innerHTML = `<div class="review-chart-load-error"><strong>Preview could not refresh</strong><span>The saved market window is temporarily unavailable.</span><button type="button" data-action="review-preview-retry">Retry preview</button></div>`;
  }
}

function reviewModeLabel(record) {
  const mode = record?.mode || "free";
  const label = reviewGameModeOptions.find(option => option[0] === mode)?.[1]
    || (mode === "daily" ? "Daily" : mode);
  return record?.trust === "legacy" ? `${label} · Legacy` : label;
}

function reviewChartRangeLabel(record, candles = reviewChartCandles(record)) {
  const start = new Date(record?.windowStart || candles[0]?.at || "");
  const end = new Date(record?.windowEnd || candles.at(-1)?.at || "");
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "Unavailable";
  const format = value => value.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric", year: "numeric" });
  return `${format(start)} – ${format(end)}`;
}

function reviewAssetLabel(record) {
  const inferredAsset = localSymbols.find(([ticker]) => ticker === record?.ticker)?.[2] || "";
  const asset = String(record?.asset || inferredAsset).toLowerCase();
  return freePlayAssetLabels[asset] || (asset ? asset.charAt(0).toUpperCase() + asset.slice(1) : "Market");
}

function reviewChartMove(record, candles = reviewChartCandles(record)) {
  const observedEnd = Math.max(1, Math.min(candles.length, Math.trunc(Number(record?.chartObservedEnd)) || candles.length));
  const outcome = candles.slice(observedEnd);
  const start = Number(outcome[0]?.open ?? candles[Math.max(0, observedEnd - 1)]?.close ?? 0);
  const end = Number(outcome.at(-1)?.close ?? candles.at(-1)?.close ?? start);
  const amount = end - start;
  const percent = start ? (end - start) / Math.abs(start) * 100 : 0;
  return {
    observedEnd,
    start,
    end,
    amount,
    percent,
    label: `${percent > 0 ? "+" : percent < 0 ? "−" : ""}${Math.abs(percent).toFixed(1)}%`
  };
}

function reviewProfitSummary(record, candles = reviewChartCandles(record)) {
  const move = reviewChartMove(record, candles);
  const savedNumber = (...values) => {
    const value = values.find(candidate => candidate !== null && candidate !== undefined && candidate !== "" && Number.isFinite(Number(candidate)));
    return value === undefined ? null : Number(value);
  };
  const savedAmount = savedNumber(record?.profitAmount, record?.pnl, record?.realizedProfit, record?.profit);
  const savedPercent = savedNumber(record?.profitPercent, record?.pnlPercent, record?.returnPercent, record?.returnPct);
  const costBasis = savedNumber(record?.costBasis, record?.entryValue, record?.investedAmount, record?.notional);
  const direction = String(record?.choice || "").toLowerCase() === "down" ? -1 : 1;
  const amount = savedAmount ?? move.amount * direction;
  const percent = savedPercent ?? (savedAmount !== null && costBasis ? savedAmount / Math.abs(costBasis) * 100 : move.percent * direction);
  const ready = savedAmount !== null || savedPercent !== null || candles.length >= 2;
  const currency = /^[A-Z]{3}$/.test(String(record?.currency || "USD").toUpperCase())
    ? String(record?.currency || "USD").toUpperCase()
    : "USD";
  const className = amount > 0 || (!amount && percent > 0) ? "positive" : amount < 0 || percent < 0 ? "negative" : "";
  return {
    amount,
    percent,
    className,
    amountLabel: ready ? `${amount > 0 ? "+" : ""}${formatMoney(amount, currency)}` : "Loading…",
    percentLabel: ready ? `${percent > 0 ? "+" : percent < 0 ? "−" : ""}${Math.abs(percent).toFixed(1)}%` : "Loading…"
  };
}

function reviewChartPreviewSvg(record, candles = reviewChartCandles(record)) {
  if (candles.length < 2) return `<div class="review-chart-loading" role="status"><span aria-hidden="true"></span><strong>${loadingTextHtml("Loading chart preview")}</strong></div>`;
  const width = 560;
  const height = 220;
  const pad = { top: 32, right: 16, bottom: 25, left: 16 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const rawMin = Math.min(...candles.map(candle => candle.low));
  const rawMax = Math.max(...candles.map(candle => candle.high));
  const pricePadding = Math.max((rawMax - rawMin) * .08, Math.abs(rawMax || 1) * .002);
  const minPrice = rawMin - pricePadding;
  const maxPrice = rawMax + pricePadding;
  const range = Math.max(maxPrice - minPrice, 1e-9);
  const x = index => pad.left + index / Math.max(1, candles.length - 1) * plotWidth;
  const y = price => pad.top + (maxPrice - price) / range * plotHeight;
  const candleWidth = Math.max(3, Math.min(10, plotWidth / Math.max(1, candles.length) * .56));
  const move = reviewChartMove(record, candles);
  const decisionIndex = Math.max(0, Math.min(candles.length - 1, move.observedEnd - 1));
  const decisionX = move.observedEnd < candles.length
    ? (x(decisionIndex) + x(move.observedEnd)) / 2
    : x(decisionIndex);
  const resultColor = record?.correct ? "var(--green)" : "var(--red)";
  const labelX = Math.max(98, Math.min(width - 98, decisionX));
  const final = candles.at(-1);
  const grid = [0, 1, 2, 3].map(index => {
    const lineY = pad.top + index / 3 * plotHeight;
    return `<path d="M${pad.left} ${lineY.toFixed(2)}H${width - pad.right}" />`;
  }).join("") + [0, 1, 2, 3, 4].map(index => {
    const lineX = pad.left + index / 4 * plotWidth;
    return `<path d="M${lineX.toFixed(2)} ${pad.top}V${height - pad.bottom}" />`;
  }).join("");
  const candleMarkup = candles.map((candle, index) => {
    const candleX = x(index);
    const openY = y(candle.open);
    const closeY = y(candle.close);
    const color = candle.close >= candle.open ? "var(--green)" : "var(--red)";
    return `<path d="M${candleX.toFixed(2)} ${y(candle.high).toFixed(2)}V${y(candle.low).toFixed(2)}" stroke="${color}" />
      <rect x="${(candleX - candleWidth / 2).toFixed(2)}" y="${Math.min(openY, closeY).toFixed(2)}" width="${candleWidth.toFixed(2)}" height="${Math.max(2.5, Math.abs(closeY - openY)).toFixed(2)}" rx="1.5" fill="${color}" />`;
  }).join("");
  const firstDate = new Date(candles[0].at).toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric" });
  const lastDate = new Date(final.at).toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric" });
  const aria = escapeHtml(`${record.ticker || "Trade"} chart preview. Prediction ${record.choice || "unknown"}; outcome ${record.answer || "unknown"}; ${record.correct ? "correct" : "missed"}.`);
  const prediction = escapeHtml(String(record.choice || "Prediction").toUpperCase());
  const answer = escapeHtml(String(record.answer || "Outcome").toUpperCase());
  return `<svg class="review-chart-preview-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${aria}">
    <rect width="${width}" height="${height}" fill="var(--panel)" />
    <rect x="${decisionX.toFixed(2)}" y="${pad.top}" width="${Math.max(0, width - pad.right - decisionX).toFixed(2)}" height="${plotHeight}" fill="var(--panel-soft)" />
    <g class="review-chart-grid">${grid}</g>
    <g>${candleMarkup}</g>
    <path class="review-chart-decision" d="M${decisionX.toFixed(2)} ${pad.top - 12}V${height - pad.bottom}" />
    <rect class="review-chart-prediction-label" x="${(labelX - 64).toFixed(2)}" y="6" width="128" height="21" rx="10.5" />
    <text class="review-chart-prediction-text" x="${labelX.toFixed(2)}" y="20" text-anchor="middle">PREDICTION · ${prediction}</text>
    <circle cx="${x(candles.length - 1).toFixed(2)}" cy="${y(final.close).toFixed(2)}" r="5" fill="${resultColor}" stroke="var(--panel)" stroke-width="2" />
    <text class="review-chart-outcome-text" x="${(width - pad.right).toFixed(2)}" y="${Math.max(pad.top + 12, y(final.close) - 8).toFixed(2)}" text-anchor="end" fill="${resultColor}">${answer}</text>
    <text class="review-chart-axis-text" x="${pad.left}" y="${height - 7}">${escapeHtml(firstDate)}</text>
    <text class="review-chart-axis-text" x="${width - pad.right}" y="${height - 7}" text-anchor="end">${escapeHtml(lastDate)}</text>
  </svg>`;
}

function reviewRecordPreviewHtml(record, recordId = record?.id, roundNumber = "") {
  const candles = reviewChartCandles(record);
  const move = reviewChartMove(record, candles);
  const profit = reviewProfitSummary(record, candles);
  const ticker = escapeHtml(record?.ticker || "Trade");
  const timeframeLabel = escapeHtml(record?.timeframe || "—");
  const choice = escapeHtml(record?.choice || "—");
  const modeLabel = escapeHtml(reviewModeLabel(record));
  const chartRange = escapeHtml(reviewChartRangeLabel(record, candles));
  const assetLabel = escapeHtml(reviewAssetLabel(record));
  const reward = record?.rewardSummary;
  const rewardValue = key => typeof reward?.[key] === "number" && Number.isFinite(reward[key]) && reward[key] >= 0
    ? reward[key].toLocaleString() : "—";
  const resultClass = record?.correct ? "positive" : "negative";
  const replayId = escapeHtml(String(recordId || ""));
  const replayRound = roundNumber === "" ? "" : ` data-review-round="${escapeHtml(String(roundNumber))}"`;
  const previewRound = roundNumber === "" ? "" : ` data-review-round="${escapeHtml(String(roundNumber))}"`;
  return `<section class="review-trade-preview" aria-label="${ticker} Trade Metadata View">
    <div class="review-preview-head">
      <div><h4>${ticker} · Trade Metadata View</h4></div>
    </div>
    <div class="review-preview-layout">
      <figure class="review-preview-chart">
        <figcaption><strong>${ticker} · ${timeframeLabel}</strong><span>${escapeHtml(formatHistoryTime(record?.at))}</span></figcaption>
        <div class="review-chart-host" data-review-preview-state="idle" data-review-id="${replayId}"${previewRound}></div>
      </figure>
      <aside class="review-preview-details" aria-label="Trade and chart details">
        <div class="review-preview-context review-preview-row-1"><span>Game mode</span><strong>${modeLabel}</strong></div>
        <div class="review-preview-primary review-preview-row-1"><span>Prediction</span><strong>${choice}</strong></div>
        <div class="review-preview-context review-preview-row-2"><span>Chart dates</span><strong data-review-chart-range>${chartRange}</strong></div>
        <div class="review-preview-primary review-preview-row-2"><span>Price move</span><strong class="${resultClass}" data-review-price-move>${candles.length ? move.label : loadingTextHtml("Loading…")}</strong></div>
        <div class="review-preview-context review-preview-row-3"><span>Asset type</span><strong>${assetLabel}</strong></div>
        <div class="review-preview-primary review-preview-row-3" data-review-reward="coinsBet"><span>Coins bet</span><strong>${record?.mode === "ranked" ? rewardValue("coinsBet") : "—"}</strong></div>
        <div class="review-preview-context review-preview-row-4" data-review-reward="coinsEarned"><span>Coins earned</span><strong title="Puzzle reward plus bet profit; returned stake and entry fee excluded.">${rewardValue("coinsEarned")}</strong></div>
        <div class="review-preview-primary review-preview-row-4" data-review-reward="xpEarned"><span>XP earned</span><strong>${rewardValue("xpEarned")}</strong></div>
        <div class="review-preview-profit" data-review-profit><span>Profit made</span><strong class="review-profit-values"><span><small>Full amount</small><b class="${profit.className}" data-review-profit-amount>${loadingTextHtml(profit.amountLabel)}</b></span><span><small>Percentage</small><b class="${profit.className}" data-review-profit-percent>${loadingTextHtml(profit.percentLabel)}</b></span></strong></div>
        <button type="button" data-action="review-open" data-review-id="${replayId}"${replayRound}>Review</button>
      </aside>
    </div>
  </section>`;
}

function historyRecordHtml(record) {
  // Expanded Review opens the main chart from each row; its metadata previews
  // are only used on the Review overview. Keep their SVG trees out of this list.
  if (record.type === "versus-match") {
    return `<details class="review-record group${reviewChartActive ? "" : " has-review-controls"}" aria-label="Trade Record Listing" data-review-record-id="${escapeHtml(String(record.id || ""))}">
      <summary><span class="review-record-mode">${escapeHtml(reviewModeLabel(record))}</span><strong>${escapeHtml(historyTitle(record))}</strong><small class="review-record-status-date"><span>${escapeHtml(record.score || "")} · ${escapeHtml(record.winner || "")}</span><time>${escapeHtml(formatHistoryTime(record.at))}</time></small>${reviewRecordControlsHtml(record)}</summary>
      <div class="review-round-list">${(record.rounds || []).map(round => reviewRoundHtml(round, record.id)).join("")}</div>
    </details>`;
  }
  return `<details class="review-record ${reviewRecordState(record)}${reviewChartActive ? "" : " has-review-controls"}" aria-label="Trade Record Listing" data-review-record-id="${escapeHtml(String(record.id || ""))}">
    <summary${reviewReplayAttributes(record.id)}><span class="review-record-mode">${escapeHtml(reviewModeLabel(record))}</span>${reviewRecordInstrumentHtml(record)}<small class="review-record-status-date"><span data-review-status>${reviewRecordStatus(record)}</span><time>${escapeHtml(formatHistoryTime(record.at))}</time></small>${reviewRecordControlsHtml(record)}</summary>
    ${reviewChartActive ? "" : reviewRecordPreviewHtml(record)}
  </details>`;
}

function reviewAccuracyEntries(modes = []) {
  return practiceHistory.filter(record => record?.mode !== "review")
    .filter(record => !isPrivateReviewRecord(record))
    .filter(record => !modes.length || modes.includes(record.type === "versus-match" ? "versus" : record.mode || "free"))
    .flatMap(record => {
    if (record.type !== "versus-match") return [record];
    return (record.rounds || []).map(round => ({ ...round, at: round.at || record.at }));
  }).filter(record => typeof record?.correct === "boolean");
}

function reviewAccuracySummary(records) {
  const total = records.length;
  const correct = records.reduce((sum, record) => sum + (record.correct ? 1 : 0), 0);
  return { correct, total, percent: total ? Math.round(correct / total * 100) : 0 };
}

function reviewPatternStatistics(records = reviewAccuracyEntries()) {

  return choices.map(pattern => {
    const attempts = records.filter(record => record?.answer === pattern);
    const summary = reviewAccuracySummary(attempts);
    return {
      pattern,
      ...summary,
      missed: Math.max(0, summary.total - summary.correct)
    };
  });
}

function reviewStatistics(now = new Date()) {
  const history = reviewAccuracyEntries();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const recordsSince = start => history.filter(record => {
    const recordedAt = new Date(record.at || "");
    return !Number.isNaN(recordedAt.getTime()) && recordedAt >= start && recordedAt <= now;
  });
  const lifetimeTotal = Math.max(0, Number(stats.total) || 0);
  const lifetimeCorrect = Math.min(lifetimeTotal, Math.max(0, Number(stats.correct) || 0));
  return {
    weekly: (typeof serverDateAccuracy === "function" && serverDateAccuracy(weekStart, now)) || reviewAccuracySummary(recordsSince(weekStart)),
    today: (typeof serverDateAccuracy === "function" && serverDateAccuracy(todayStart, now)) || reviewAccuracySummary(recordsSince(todayStart)),
    total: (typeof serverAccuracy === "function" && serverAccuracy()) || reviewAccuracySummary(history),
    lifetime: {
      correct: lifetimeCorrect,
      total: lifetimeTotal,
      percent: lifetimeTotal ? Math.round(lifetimeCorrect / lifetimeTotal * 100) : 0
    }
  };
}

function reviewWeekOptions(now = new Date(), count = 8) {
  const history = reviewAccuracyEntries();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(todayStart);
  currentWeekStart.setDate(currentWeekStart.getDate() - 6);
  const weekCount = Math.max(1, Math.min(52, Math.trunc(Number(count)) || 8));
  const shortDate = value => value.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric" });

  return Array.from({ length: weekCount }, (_, index) => {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - index * 7);
    const end = index === 0 ? new Date(now) : new Date(currentWeekStart);
    if (index > 0) end.setDate(end.getDate() - (index - 1) * 7);
    const records = history.filter(record => {
      const recordedAt = new Date(record.at || "");
      return !Number.isNaN(recordedAt.getTime())
        && recordedAt >= start
        && (index === 0 ? recordedAt <= end : recordedAt < end);
    });
    const displayEnd = new Date(end);
    if (index > 0) displayEnd.setMilliseconds(displayEnd.getMilliseconds() - 1);
    return {
      number: index + 1,
      label: `${shortDate(start)} - ${shortDate(displayEnd)}`,
      ...(typeof serverDateAccuracy === "function" && serverDateAccuracy(start, displayEnd)) || reviewAccuracySummary(records)
    };
  });
}

function reviewStatisticCardHtml(key, label, summary) {
  const expanded = expandedReviewStatistic === key;
  return `<button class="review-stat-card${expanded ? " active" : ""}" type="button" data-action="review-stat-toggle" data-review-stat="${key}" aria-expanded="${expanded}" aria-controls="reviewStatisticsDetail" aria-label="${label}: ${summary.percent} percent, ${summary.correct} of ${summary.total} correct. ${expanded ? "Hide" : "Show"} more statistics">
    <span>${label}</span>
    <strong>${summary.percent}%</strong>
    <small>${summary.correct}/${summary.total} correct</small>
  </button>`;
}

function resetReviewPatternHint() {
  selectedReviewPattern = "";
  reviewPatternHintVisible = null;
}

function shouldShowReviewPatternHint() {

  if (selectedReviewPattern) {
    reviewPatternHintVisible = false;
    return false;
  }
  if (reviewPatternHintVisible !== null) return reviewPatternHintVisible;
  const key = accountScopedKey(REVIEW_PATTERN_HINT_KEY);
  let views = 0;
  try {
    const saved = Number(localStorage.getItem(key));
    if (Number.isFinite(saved)) views = Math.max(0, Math.floor(saved));
  } catch {}
  reviewPatternHintVisible = views < REVIEW_PATTERN_HINT_LIMIT;
  if (reviewPatternHintVisible) {
    try { localStorage.setItem(key, String(views + 1)); } catch {}
  }
  return reviewPatternHintVisible;
}

function reviewPatternStatisticsDetailHtml() {
  const patterns = reviewPatternStatistics();
  if (!patterns.some(item => item.pattern === selectedReviewPattern)) {
    selectedReviewPattern = "";
  }
  const selected = patterns.find(item => item.pattern === selectedReviewPattern);
  const lessonTitle = patternLessons[selected?.pattern]?.title || "Pattern recognition";
  const showHint = shouldShowReviewPatternHint();

  return `<div class="review-stat-detail review-pattern-detail" id="reviewStatisticsDetail">
    <div class="review-stat-detail-head">
      <div>
        <h4>Pattern-specific accuracy</h4>
      </div>
      <div class="review-stat-detail-highlight" aria-label="${selected ? `${escapeHtml(selected.pattern)} accuracy summary` : "Choose a pattern to see its accuracy"}">
        <strong>${selected ? `${selected.percent}%` : "—"}</strong>
      </div>
    </div>
    <div class="review-pattern-picker" role="group" aria-label="Choose a chart pattern">
      ${patterns.map(item => `<button type="button" data-action="review-pattern-select" data-review-pattern="${escapeHtml(item.pattern)}" class="${item.pattern === selectedReviewPattern ? "active" : ""}" aria-pressed="${item.pattern === selectedReviewPattern}"><span>${escapeHtml(item.pattern)}</span><small>${item.total ? `${item.percent}% · ${item.total} ${item.total === 1 ? "attempt" : "attempts"}` : "No attempts yet"}</small></button>`).join("")}
    </div>
    <div class="review-pattern-heading">
      <div><span>Selected pattern</span><strong>${selected ? escapeHtml(selected.pattern) : "Choose a pattern"}</strong></div>
      <small>${escapeHtml(lessonTitle)}</small>
    </div>
    <div class="review-week-metrics review-pattern-metrics" aria-live="polite">
      <div><span>Accuracy</span><strong>${selected ? `${selected.percent}%` : "—"}</strong></div>
      <div data-review-count="correct"><span>Correct</span><strong>${selected?.correct ?? "—"}</strong></div>
      <div data-review-count="missed"><span>Missed</span><strong>${selected?.missed ?? "—"}</strong></div>
      <div><span>Attempts</span><strong>${selected?.total ?? "—"}</strong></div>
    </div>
    ${showHint ? `<div class="review-pattern-insight" aria-live="polite">
      <span>Skill signal</span><strong>Choose a pattern</strong><p>Select a box above to see its accuracy and practice insights.</p>
    </div>` : ""}
  </div>`;
}

function reviewStatisticsDetailHtml(accuracy) {
  if (!expandedReviewStatistic) return "";
  if (expandedReviewStatistic === "patterns") return reviewPatternStatisticsDetailHtml();
  if (expandedReviewStatistic === "modes") return reviewModeStatisticsDetailHtml();
  const labels = {
    weekly: "Weekly accuracy",
    today: "Today accuracy",
    total: "Total accuracy"
  };
  const weeks = reviewWeekOptions();
  selectedReviewWeek = Math.max(1, Math.min(weeks.length, selectedReviewWeek));
  const week = weeks[selectedReviewWeek - 1];
  const cardSummary = expandedReviewStatistic === "weekly"
    ? week
    : accuracy[expandedReviewStatistic] || accuracy.weekly;
  const missed = Math.max(0, week.total - week.correct);

  return `<div class="review-stat-detail" id="reviewStatisticsDetail">
    <div class="review-stat-detail-head">
      <div>
        <h4>${labels[expandedReviewStatistic] || "Accuracy"} details</h4>
      </div>
      <div class="review-stat-detail-highlight" aria-label="Selected statistic summary">
        <strong>${cardSummary.percent}%</strong>
      </div>
    </div>
    <div class="review-week-picker" role="group" aria-label="Choose a week">
      ${weeks.map(item => `<button type="button" data-action="review-week-select" data-review-week="${item.number}" class="${item.number === selectedReviewWeek ? "active" : ""}" aria-pressed="${item.number === selectedReviewWeek}" aria-label="Week ${item.number}, ${item.label}">${item.number}</button>`).join("")}
    </div>
    <div class="review-week-heading">
      <span>Week ${week.number}</span>
      <strong>${week.label}</strong>
    </div>
    <div class="review-week-metrics" aria-live="polite">
      <div><span>Accuracy</span><strong>${week.percent}%</strong></div>
      <div data-review-count="correct"><span>Correct</span><strong>${week.correct}</strong></div>
      <div data-review-count="missed"><span>Missed</span><strong>${missed}</strong></div>
      <div><span>Attempts</span><strong>${week.total}</strong></div>
    </div>
  </div>`;
}

function reviewModeStatisticsDetailHtml() {
  const summary = reviewAccuracySummary(reviewAccuracyEntries(selectedReviewAccuracyModes));
  const options = reviewGameModeOptions.filter(([mode]) => mode !== "quant");
  const selectedLabel = selectedReviewAccuracyModes.length
    ? options.filter(([mode]) => selectedReviewAccuracyModes.includes(mode)).map(([, label]) => label).join(", ")
    : "All modes";
  return `<div class="review-stat-detail review-mode-detail" id="reviewStatisticsDetail">
    <div class="review-stat-detail-head">
      <div><h4>Mode-specific accuracy</h4><p>Choose one or more modes to view their combined accuracy and statistics.</p></div>
      <div class="review-stat-detail-highlight" aria-label="Selected modes accuracy"><strong>${summary.total ? `${summary.percent}%` : "—"}</strong></div>
    </div>
    <div class="review-mode-picker" role="group" aria-label="Choose game modes for accuracy">
      ${[["all", "All modes"], ...options].map(([mode, label]) => {
        const selected = mode === "all" ? !selectedReviewAccuracyModes.length : selectedReviewAccuracyModes.includes(mode);
        return `<button type="button" data-action="review-accuracy-mode" data-review-accuracy-mode="${mode}" class="${selected ? "active" : ""}" aria-pressed="${selected}">${escapeHtml(label)}</button>`;
      }).join("")}
    </div>
    <div class="review-week-heading"><span>Saved attempts · All time</span><strong>${escapeHtml(selectedLabel)}</strong></div>
    <div class="review-week-metrics" aria-live="polite">
      <div><span>Accuracy</span><strong>${summary.total ? `${summary.percent}%` : "—"}</strong></div>
      <div data-review-count="correct"><span>Correct</span><strong>${summary.correct}</strong></div>
      <div data-review-count="missed"><span>Missed</span><strong>${summary.total - summary.correct}</strong></div>
      <div><span>Attempts</span><strong>${summary.total}</strong></div>
    </div>
    ${summary.total ? "" : '<p role="status">No attempts yet for the selected modes.</p>'}
  </div>`;
}

function renderReview() {
  const previousRecords = modeSurface.querySelector(".review-records");
  const recordsScrollTop = previousRecords?.scrollTop || 0;
  const recordsFocused = previousRecords === document.activeElement;
  const expandedRecords = new Map();
  modeSurface.querySelectorAll(".review-record[open]").forEach(record => {
    expandedRecords.set(record.dataset.reviewRecordId,
      [...record.querySelectorAll(".review-round")].map(round => round.open));
  });
  chartPanel?.classList.toggle("review-awaiting-puzzle", reviewChartActive && !activeReviewRecordId);
  if (!reviewChartActive) {
    setUtilityPanel("Review");
  }
  const accuracy = reviewChartActive ? null : reviewStatistics();
  const history = practiceHistory.filter(record => record?.mode !== "review");
  const visibleHistory = visibleReviewRecords();
  const favoriteCount = history.filter(record => record.favorite === true).length;
  const allVisibleChecked = visibleHistory.length > 0 && visibleHistory.every(reviewRecordChecked);
  const allVisibleFavorited = visibleHistory.length > 0 && visibleHistory.every(record => record.favorite === true);
  const selectedGameModeLabels = reviewGameModeOptions
    .filter(option => option[0] !== "quant" && reviewGameModes.includes(option[0]))
    .map(option => option[1]);
  const activeGameModeFilterLabel = selectedGameModeLabels.length ? selectedGameModeLabels.join(", ") : reviewGameModes.length ? "No game modes" : "All game modes";
  const overview = reviewChartActive ? "" : `<section class="review-section review-statistics" aria-labelledby="reviewStatisticsTitle">
      <div class="section-head"><h3 id="reviewStatisticsTitle">Statistics</h3></div>
      <div class="review-stat-grid">
        ${reviewStatisticCardHtml("modes", "Mode-specific accuracy", (typeof serverAccuracy === "function" && serverAccuracy(selectedReviewAccuracyModes)) || reviewAccuracySummary(reviewAccuracyEntries(selectedReviewAccuracyModes)))}
        ${reviewStatisticCardHtml("today", "Today accuracy", accuracy.today)}
        ${reviewStatisticCardHtml("total", "Total accuracy", accuracy.total)}
        ${reviewStatisticCardHtml("patterns", "Pattern-specific accuracy", accuracy.total)}
      </div>
      ${reviewStatisticsDetailHtml(accuracy)}
    </section>`;
  modeSurface.innerHTML = `${overview}
    ${reviewChartActive ? `<section class="review-section review-disclosure review-chart-records" aria-label="All Trade Records">
      <div class="section-head review-record-heading">
        <div class="review-filter-trigger-wrap">
          <button class="review-game-trigger${reviewGameModes.length ? " active" : ""}" type="button" data-action="review-hover-menu" aria-label="Filter records by game modes. ${escapeHtml(activeGameModeFilterLabel)}" aria-haspopup="dialog" aria-controls="reviewGameMenu" aria-expanded="false">
            ${reviewFilterIconHtml()}
          </button>
          <button class="review-game-trigger${reviewGameModes.length ? " active" : ""}" type="button" data-action="review-shuffle" aria-label="Shuffle review puzzles" title="Shuffle review puzzles" ${reviewChartQueue().length || (typeof accountHistoryCanShuffle === "function" && accountHistoryCanShuffle()) ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 14 4 4-4 4M18 2l4 4-4 4M2 18h2.5a6 6 0 0 0 5-2.7l5-7.6a6 6 0 0 1 5-2.7H22M2 6h2.5a6 6 0 0 1 5 2.7l5 7.6a6 6 0 0 0 5 2.7H22"/></svg>
          </button>
        </div>
        <span class="review-visible-count" aria-live="polite">${visibleHistory.length} ${visibleHistory.length === 1 ? "trade" : "trades"}</span>
      </div>` : `<details class="review-section review-disclosure" open>
      <summary class="section-head"><h3>All Trade Records</h3><span>${history.length}</span></summary>`}
      ${reviewChartActive ? "" : `<div class="review-record-toolbar">
        <div class="review-record-filters" role="group" aria-label="Filter trade records">
          <button type="button" data-action="review-filter" data-review-filter="all" class="${reviewRecordFilter === "all" ? "active" : ""}" aria-pressed="${reviewRecordFilter === "all"}">All</button>
          <button type="button" data-action="review-filter" data-review-filter="favorites" class="${reviewRecordFilter === "favorites" ? "active" : ""}" aria-pressed="${reviewRecordFilter === "favorites"}">Favorites <span>${favoriteCount}</span></button>
        </div>
        <div class="review-record-bulk-actions" role="group" aria-label="Update all visible trade records">
          <label class="review-select-all" title="Check all visible trade records"><input type="checkbox" data-review-select-all aria-label="Check all visible trade records" ${allVisibleChecked ? "checked" : ""} ${visibleHistory.length ? "" : "disabled"} /></label>
          <button class="review-favorite-all${allVisibleFavorited ? " active" : ""}" type="button" data-action="review-favorite-all" aria-pressed="${allVisibleFavorited}" aria-label="${allVisibleFavorited ? "Restore previous favorites for visible trade records" : "Add all visible trade records to favorites"}" title="${allVisibleFavorited ? "Restore previous favorites for visible trade records" : "Favorite all visible trade records"}" ${visibleHistory.length ? "" : "disabled"}><span aria-hidden="true">${allVisibleFavorited ? "♥" : "♡"}</span></button>
          <span class="review-selected-count" aria-live="polite"></span>
        </div>
        <div class="review-game-control">
          <span class="review-visible-count" aria-live="polite">${visibleHistory.length} ${visibleHistory.length === 1 ? "trade" : "trades"}</span>
          <button class="review-game-trigger${reviewGameModes.length ? " active" : ""}" type="button" data-action="review-game-menu" aria-label="Filter records by game modes${reviewGameModes.length ? `, ${reviewGameModes.length} selected` : ""}" aria-haspopup="dialog" aria-controls="reviewGameMenu" aria-expanded="false" title="Game Modes">${reviewFilterIconHtml()}</button>
        </div>
      </div>`}
      ${reviewGameModeMenuHtml()}
      ${reviewGameModes.length ? `<p class="review-game-filter-status" role="status">${visibleHistory.length} records · ${activeGameModeFilterLabel}</p>` : ""}
      <div class="review-records"${reviewChartActive ? ' tabindex="0" aria-label="Trade records"' : ""}>${visibleHistory.length ? visibleHistory.map(historyRecordHtml).join("") : `<article class="review-record review-record-empty"><strong>${reviewGameModes.length ? "No trade records match these game modes" : !reviewChartActive && reviewRecordFilter === "favorites" ? "No favorite trade records yet" : "No trade records yet"}</strong><small>${reviewGameModes.length ? "Open Game Modes and select All to reset the mode filter." : !reviewChartActive && reviewRecordFilter === "favorites" ? "Use the heart on any trade record to save it here." : "Every completed prediction will be saved here. Versus rounds are grouped by match."}</small></article>`}${typeof accountHistoryPaginationHtml === "function" ? accountHistoryPaginationHtml() : ""}</div>
    ${reviewChartActive ? "</section>" : "</details>"}`;
  modeSurface.querySelectorAll(".review-record").forEach(record => {
    const rounds = expandedRecords.get(record.dataset.reviewRecordId);
    if (!rounds) return;
    record.open = true;
    record.querySelectorAll(".review-round").forEach((round, index) => { round.open = Boolean(rounds[index]); });
  });
  if (!reviewChartActive) syncReviewCheckedControls();
  const records = modeSurface.querySelector(".review-records");
  if (records) records.scrollTop = recordsScrollTop;
  if (recordsFocused) records?.focus({ preventScroll: true });
  if (typeof syncAccountHistoryPagination === "function") syncAccountHistoryPagination();
}

function setTimeframe(next) {
  timeframe = next;
  document.querySelectorAll("[data-timeframe]").forEach(item => item.classList.toggle("active", item.dataset.timeframe === next));
  syncAdvancedIntervalsLayout(next);
}

function findReviewTarget(id, roundNumber) {
  const record = practiceHistory.find(item => item.id === id);
  if (!record) return null;
  if (record.type === "versus-match") return (record.rounds || []).find(round => String(round.round) === String(roundNumber)) || null;
  return record;
}

async function openReviewRecord(id, roundNumber) {
  const record = findReviewTarget(id, roundNumber);
  if (!record) {
    showToast("Review record not found.");
    return;
  }
  const activeRecords = modeSurface.querySelector(".review-chart-records > .review-records");
  const previousScrollTop = activeRecords?.scrollTop || 0;
  const expandedMatchIds = [...modeSurface.querySelectorAll(".review-chart-records details.review-record.group[open]")]
    .map(item => item.dataset.reviewRecordId);
  const wasReviewing = reviewChartActive;
  activeReviewRecordId = String(id);
  activeReviewRound = roundNumber === undefined ? "" : String(roundNumber);
  activeReviewAnswer = choices.includes(record.answer) ? record.answer : "";
  reviewChartActive = true;
  revealed = false;
  result.innerHTML = "";
  syncReviewControls({ resetHint: true });
  renderModeSurface();
  if (wasReviewing) {
    const groupRecords = [...modeSurface.querySelectorAll(".review-chart-records details.review-record.group")];
    expandedMatchIds.forEach(recordId => {
      const disclosure = groupRecords.find(item => item.dataset.reviewRecordId === recordId);
      if (disclosure) disclosure.open = true;
    });
    const nextRecords = modeSurface.querySelector(".review-chart-records > .review-records");
    if (nextRecords) nextRecords.scrollTop = previousScrollTop;
    modeSurface.querySelector('.review-chart-records summary[aria-current="true"]')?.focus({ preventScroll: true });
  }
  setTimeframe(record.timeframe || "3M");
  const replayKey = `${activeReviewRecordId}:${activeReviewRound}`;
  const loaded = await submitSymbol(record.ticker, { remember: false });
  if (!loaded || `${activeReviewRecordId}:${activeReviewRound}` !== replayKey) return;
  syncReviewControls();
  revealTag.textContent = "Expanded Review Chart";
  if (!wasReviewing) chartPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function randomPracticeSymbol() {
  const pool = ["AAPL", "MSFT", "NVDA", "RIVN", "BTC-USD", "ETH-USD", "EURUSD=X", "GC=F", "CL=F", "ES=F", "SPY", "QQQ", "TLT", "^GSPC", "^IXIC", "GBPUSD=X"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomItem(items) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : null;
}

function freePlayAssetCandidates(settings = freePlayRandomSettings) {
  const selectedAssets = settings.assetTypes;
  if (!settings.assetSelected) return [];
  return localSymbols.filter(([, , asset]) => !selectedAssets.length || selectedAssets.includes(asset));
}

function freePlayInstrumentCandidates(settings = freePlayRandomSettings) {
  const selectedSymbols = new Set(settings.instruments);
  return freePlayAssetCandidates(settings).filter(([ticker]) => selectedSymbols.has(ticker));
}

function freePlayScopeCandidates(settings = freePlayRandomSettings) {
  if (!settings.assetSelected) return [];
  const instruments = settings.instrumentSelected ? freePlayInstrumentCandidates(settings) : [];
  return instruments.length ? instruments : freePlayAssetCandidates(settings);
}

function freePlayInstrumentOptionsHtml(settings = freePlayRandomSettings) {
  const selectedInstruments = new Set(settings.instrumentSelected ? settings.instruments : []);
  const availableInstruments = freePlayAssetCandidates(settings)
    .map(([ticker, name, asset]) => `<label><input type="checkbox" name="freeInstrumentScope" value="${ticker}" ${selectedInstruments.has(ticker) ? "checked" : ""} /><span>${escapeHtml(name)} (${ticker}) · ${freePlayAssetLabels[asset]}</span></label>`)
    .join("");
  return availableInstruments || '<p class="free-instrument-empty">Select Assets to see available instruments.</p>';
}

function randomFreePlaySymbol(settings = freePlayRandomSettings, mode = "free") {
  if (settings.randomSelected !== false) return randomPracticeSymbol();
  if (!settings.assetSelected && !settings.instrumentSelected) {
    return settings.manualSymbol || symbolForMode(mode);
  }
  const candidates = freePlayScopeCandidates(settings);
  const availableAssets = [...new Set(candidates.map(([, , asset]) => asset))];
  const asset = randomItem(availableAssets);
  const selected = asset ? randomItem(candidates.filter(([, , candidateAsset]) => candidateAsset === asset)) : null;
  return selected?.[0] || "";
}

function syncInstrumentSearch(field) {
  if (!field) return;
  const picker = field.closest(".free-instrument-picker");
  const query = field.value.trim().toLowerCase();
  const options = [...picker.querySelectorAll(".free-instrument-options label")];
  let matches = 0;
  options.forEach(option => {
    option.hidden = !option.textContent.toLowerCase().includes(query);
    if (!option.hidden) matches++;
  });
  picker.querySelector("[data-instrument-search-empty]").hidden = !query || !options.length || matches > 0;
}

function freePlayRandomizerHtml(settings = freePlayRandomSettings, expanded = freeRandomizerExpanded, settingsExpanded = freePlaySettingsExpanded, searchQuery = "") {
  const selectedAssets = new Set(settings.assetTypes);
  const randomSelected = settings.randomSelected !== false;
  const assetSelected = !randomSelected && settings.assetSelected;
  const instrumentSelected = !randomSelected && settings.instrumentSelected;
  return `<details class="free-randomizer" aria-labelledby="freeRandomizerTitle" ${expanded ? "open" : ""}>
    <summary>
      <div><span id="freeRandomizerTitle">Parameters</span></div>
    </summary>
    <div class="free-randomizer-body">
    <div class="free-random-modes" role="group" aria-label="Random practice settings">
      <details class="free-random-mode" data-free-settings="asset" ${!randomSelected && settingsExpanded.asset ? "open" : ""}>
        <summary class="free-random-label${assetSelected ? " active" : randomSelected ? " is-muted" : ""}" aria-label="Assets${assetSelected ? ", selected" : ""}" aria-controls="freeassetSettings"><b>Assets</b></summary>
        <div class="free-settings-inline" id="freeassetSettings">
      <fieldset class="free-asset-picker">
        <legend>Asset classes</legend>
        <p>Choose one or more markets. Each selected class gets an equal chance.</p>
        <div class="free-asset-options">
          ${Object.entries(freePlayAssetLabels).map(([asset, label]) => `<label>
            <input type="checkbox" name="freeAssetScope" value="${asset}" ${selectedAssets.has(asset) ? "checked" : ""} />
            <span>${asset === "commodities" ? "Commods" : label}</span>
          </label>`).join("")}
        </div>
      </fieldset>
        </div>
      </details>
      <details class="free-random-mode" data-free-settings="instrument" ${!randomSelected && settingsExpanded.instrument ? "open" : ""}>
        <summary class="free-random-label${instrumentSelected ? " active" : randomSelected ? " is-muted" : ""}" aria-label="Instruments${instrumentSelected ? ", selected" : ""}" aria-controls="freeinstrumentSettings"><b>Instruments</b></summary>
        <div class="free-settings-inline" id="freeinstrumentSettings">
      <fieldset class="free-instrument-picker">
        <legend>Instruments</legend>
        <small>Choose one or more instruments from the selected asset classes.</small>
        <input type="search" class="free-instrument-search" aria-label="Search instruments" placeholder="Search instruments…" value="${escapeHtml(searchQuery)}" autocomplete="off" />
        <div class="free-instrument-options" role="group" aria-label="Instruments for random practice">
          ${freePlayInstrumentOptionsHtml(settings)}
        </div>
        <p class="free-instrument-empty" data-instrument-search-empty role="status" hidden>No matching instruments.</p>
      </fieldset>
        </div>
      </details>
      <button type="button" data-free-random-mode="both" class="${randomSelected ? "active" : assetSelected || instrumentSelected ? "is-muted" : ""}" aria-pressed="${randomSelected}"><b>Random</b></button>
    </div>
    </div>
  </details>`;
}

function syncFreePlayScopeSelection() {
  for (const [scope, label] of [["asset", "Assets"], ["instrument", "Instruments"]]) {
    const summary = modeSurface.querySelector(`[data-free-settings="${scope}"] > summary`);
    const selected = freePlayRandomSettings[`${scope}Selected`] === true;
    summary?.classList.toggle("active", selected);
    summary?.setAttribute("aria-label", `${label}${selected ? ", selected" : ""}`);
  }
  modeSurface.querySelector('[data-free-random-mode="both"]')?.classList.toggle("is-muted",
    freePlayRandomSettings.assetSelected || freePlayRandomSettings.instrumentSelected);
}

function showFreePlayScopeOverrideNotice() {
  if (loadFreePlayRandomSettings().hideScopeOverrideNotice || !toastRegion
    || toastRegion.querySelector(".free-play-scope-notice")) return;
  const notice = document.createElement("div");
  notice.className = "toast free-play-scope-notice";
  notice.setAttribute("role", "group");
  notice.setAttribute("aria-label", "Free Play filter update");
  notice.innerHTML = `<p>Since you chose a specific instrument, your Assets and Instruments selections no longer apply.</p>
    <div class="free-play-scope-notice-actions">
      <label><input type="checkbox" data-free-scope-hide /> <span>Do not show me again</span></label>
      <button type="button" data-free-scope-dismiss>ok</button>
    </div>`;
  notice.querySelector("[data-free-scope-hide]").addEventListener("change", event => {
    freePlayRandomSettings = { ...freePlayRandomSettings, hideScopeOverrideNotice: event.target.checked };
    saveFreePlayRandomSettings({ hideScopeOverrideNotice: event.target.checked });
  });
  notice.querySelector("[data-free-scope-dismiss]").addEventListener("click", () => {
    const restoreFocus = notice.contains(document.activeElement);
    notice.remove();
    if (restoreFocus && appMode === "free") {
      const target = document.body.classList.contains("symbol-results-open") ? symbolResultsInput : tickerInput;
      target?.focus({ preventScroll: true });
    }
  });
  // This notice remains available until the user explicitly dismisses it.
  toastRegion.appendChild(notice);
}

function selectFreePlayManualSymbol(symbol = "") {
  if (appMode !== "free") return;
  const hadScope = freePlayRandomSettings.assetSelected || freePlayRandomSettings.instrumentSelected;
  chartRequestId += 1;
  freePlayRandomSettings = {
    ...freePlayRandomSettings,
    randomSelected: false,
    assetSelected: false,
    instrumentSelected: false,
    manualSymbol: symbol ? normalizeSymbol(symbol) : freePlayRandomSettings.manualSymbol
  };
  saveFreePlayRandomSettings();
  setLoading(false);
  renderModeSurface();
  if (hadScope) showFreePlayScopeOverrideNotice();
}

async function loadFreePlayChart() {
  if (appMode !== "free") return false;
  const symbol = randomFreePlaySymbol();
  const emptyScopeMessage = "Choose at least one asset class.";
  // Invalidate pending loads, but retain the last chart until a replacement succeeds.
  chartRequestId += 1;
  searchRequestId += 1;
  if (!document.getElementById("choices").children.length) renderChoices();
  document.querySelectorAll("#choices button").forEach(button => { button.disabled = true; });
  if (!symbol) {
    setLoading(false);
    symbolStatus.classList.remove("error", "loading");
    symbolStatus.textContent = emptyScopeMessage;
    result.innerHTML = `<strong>${escapeHtml(emptyScopeMessage)}</strong>`;
    drawChart();
    syncNextChartButton();
    return false;
  }
  const loaded = await submitSymbol(symbol, { randomWindow: true, preserveFreePlayScope: true });
  if (loaded) {
    freePlayRedoAvailable = false;
    syncNextChartButton();
  }
  return loaded;
}

function randomPracticeScenario(used = new Set()) {
  const pool = [
    { symbol: "AAPL", timeframe: "3M", label: "Apple stock" },
    { symbol: "RIVN", timeframe: "1D", label: "Rivian intraday stock" },
    { symbol: "BTC-USD", timeframe: "5D", label: "Bitcoin crypto" },
    { symbol: "ETH-USD", timeframe: "1h", label: "Ethereum hourly crypto" },
    { symbol: "EURUSD=X", timeframe: "30m", label: "EUR/USD forex" },
    { symbol: "GBPUSD=X", timeframe: "4h", label: "GBP/USD forex" },
    { symbol: "GC=F", timeframe: "1Y", label: "Gold futures" },
    { symbol: "CL=F", timeframe: "15m", label: "Crude oil futures" },
    { symbol: "ES=F", timeframe: "1D", label: "S&P futures" },
    { symbol: "SPY", timeframe: "6M", label: "S&P 500 ETF" },
    { symbol: "QQQ", timeframe: "1M", label: "Nasdaq ETF" },
    { symbol: "TLT", timeframe: "5Y", label: "Treasury bond ETF" },
    { symbol: "^GSPC", timeframe: "3M", label: "S&P 500 index" },
    { symbol: "^IXIC", timeframe: "1Y", label: "Nasdaq Composite" },
    { symbol: "DX-Y.NYB", timeframe: "6M", label: "US Dollar Index" }
  ];
  const available = pool.filter(item => !used.has(`${item.symbol}:${item.timeframe}`));
  const selection = (available.length ? available : pool)[Math.floor(Math.random() * (available.length ? available.length : pool.length))];
  used.add(`${selection.symbol}:${selection.timeframe}`);
  return selection;
}

function symbolForMode(mode) {
  if (mode === "daily") return dailyRound?.data.ticker || "SPY";
  return modeSymbols[mode] || "AAPL";
}

async function loadModeChart(mode) {
  if (mode === "ranked") return submitSymbol(symbolForMode("ranked"));
  if (mode === "daily") return startDaily();
  if (!["free", "paper", "daily", "review", "packs", "quant"].includes(mode)) return;
  if (mode === "review" && !reviewChartActive) return;
  if (mode === "packs") return packChartActive && activePackId ? loadPack(activePackId, packPracticeMode) : undefined;
  if (mode === "free") {
    freePlayRandomSettings = {
      ...freePlayRandomSettings,
      randomSelected: false,
      assetSelected: false,
      instrumentSelected: false,
      manualSymbol: freePlayRandomSettings.lastSymbol || symbolForMode("free"),
      assetTypes: [],
      instruments: []
    };
    freePlaySettingsExpanded = { asset: false, instrument: false };
    saveFreePlayRandomSettings();
    renderModeSurface();
    return loadFreePlayChart();
  }
  const symbol = symbolForMode(mode);
  if (currentSymbol.ticker === normalizeSymbol(symbol) && rawCandles.length && !rawCandles[0]?.backendPuzzleId) {
    loadCurrentSymbol();
    if (mode === "paper") await refreshPaperQuote(currentSymbol.ticker);
    return;
  }
  await submitSymbol(symbol, { remember: false });
}

function todayIso() {
  const now = new Date();
  return dateToIso(now.getFullYear(), now.getMonth(), now.getDate());
}

function dailyRecord(date = dailyToday()) {
  return dailyState.identity === dailyIdentityKey() ? dailyState.attempts[date] || null : null;
}

function isDailyComplete(date = dailyToday()) {
  return Boolean(dailyRecord(date)?.completed);
}

function isArchiveUnlocked() {
  return dailyState.ready && isDailyComplete(dailyToday());
}

function setPracticeControlsLocked(locked) {
  assetSelect.disabled = locked;
  tickerInput.disabled = locked;
  const searchButton = document.querySelector("#tickerForm button");
  if (searchButton) searchButton.disabled = locked;
  if (locked) suggestions.hidden = true;
}

function dateToIso(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function renderDailyCalendar() {
  if (!dailyCalendarGrid || !dailyCalendarMonthLabel) return;
  const year = dailyCalendarMonth.getFullYear();
  const month = dailyCalendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = dailyToday();
  dailyCalendarMonthLabel.textContent = dailyCalendarMonth.toLocaleDateString(globalThis.siteI18n?.locale, { month: "long", year: "numeric" });
  const monthIso = dateToIso(year, month, 1).slice(0, 7);
  dailyCalendarNext.disabled = monthIso >= today.slice(0, 7);
  dailyCalendarPrev.disabled = monthIso <= (dailyState.firstDate || today).slice(0, 7);
  const blanks = Array.from({ length: firstDay }, () => `<span class="calendar-blank"></span>`).join("");
  const dates = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const iso = dateToIso(year, month, day);
    const record = dailyRecord(iso);
    const future = iso > today || iso < (dailyState.firstDate || today);
    const locked = future || !isArchiveUnlocked();
    const state = locked ? "locked" : record?.completed ? (record.correct ? "correct" : "missed") : "open";
    const label = locked ? "Unavailable puzzle" : record?.completed ? `${record.correct ? "Correct" : "Reviewed"}: ${record.ticker}` : "Available puzzle";
    return `<button type="button" class="${state} ${iso === selectedDailyDate ? "selected" : ""}" data-calendar-date="${iso}" ${locked ? "disabled" : ""} aria-label="${iso}: ${label}">
      <span>${day}</span><small>${state === "correct" ? "✓" : state === "missed" ? "×" : ""}</small>
    </button>`;
  }).join("");
  dailyCalendarGrid.innerHTML = blanks + dates;
}

async function openDailyCalendar() {
  dailyCalendarMonth = new Date(`${selectedDailyDate}T12:00:00`);
  if (!await refreshDailyStatus(selectedDailyDate.slice(0, 7))) {
    if (appMode === "daily") {
      showToast(dailyState.error);
      renderModeSurface();
    }
    return;
  }
  if (appMode !== "daily" || !isArchiveUnlocked()) return;
  renderDailyCalendar();
  openAccessibleModal(dailyCalendarModal);
  dailyCalendarClose.focus();
}

function closeDailyCalendar() {
  closeAccessibleModal(dailyCalendarModal, modeSurface);
}

function dockSidePanel() {
  document.body.classList.remove("panel-staged");
  closeAccessibleModal(roundModal, modeSurface.querySelector("h1, h2") || modeSurface);
}

function showRoundModal(mode = appMode) {
  if (!PAGE_TUTORIALS_ENABLED || mode === "quant") {
    dockSidePanel();
    return;
  }
  const intro = modeIntros[mode] || modeIntros.free;
  if (document.activeElement.closest("#sideMenu")) modalReturnFocus.set(roundModal, document.activeElement);
  roundModal.classList.toggle("iq-preview-active", mode === "learn");
  roundModal.setAttribute("aria-labelledby", "roundTitle");
  roundModal.setAttribute("aria-describedby", "roundText");
  roundKicker.textContent = intro.kicker;
  roundTitle.textContent = intro.title;
  roundText.textContent = mode === "paper" ? "" : modes[mode] || modes.free;
  roundText.hidden = mode === "paper";
  roundBullets.innerHTML = intro.bullets.map(item => `<li>${item}</li>`).join("");
  if (roundStart) roundStart.textContent = intro.action || "Open Practice Panel";
  document.body.classList.add("panel-staged");
  openAccessibleModal(roundModal);
  if (roundPagesViewport) roundPagesViewport.scrollLeft = 0;
  roundStart.focus();
}

function scenariosForPack(packId, pack) {
  return (eventPackScenarios[packId] || [pack.symbol]).map(symbol => ({
    symbol,
    label: `${symbol} during ${pack.title}`
  }));
}

function pickPackScenario(packId, pack) {
  const scenarios = scenariosForPack(packId, pack);
  const seed = Date.now() + scenarios.length + currentSymbol.ticker.length;
  return scenarios[seed % scenarios.length];
}

function packCardsHtml(compact = false) {
  return Object.entries(eventPacks).map(([id, pack]) => `
    <button class="pack-card${compact ? " compact" : ""}" data-pack="${id}" type="button">
      <span>${pack.tag}</span>
      <strong>${pack.title}</strong>
      <small>${scenariosForPack(id, pack).length} markets - ${pack.difficulty}</small>
      ${compact ? "" : `<em>${pack.focus}</em><em>${scenariosForPack(id, pack).slice(0, 5).map(item => item.symbol).join(", ")}${scenariosForPack(id, pack).length > 5 ? ", ..." : ""}</em>`}
    </button>
  `).join("");
}

function renderPackLibrary() {
  const library = document.getElementById("packLibrary");
  if (library) library.innerHTML = packCardsHtml();
}

function packPeriodLabel(packId) {
  const window = eventPackWindows[packId];
  const format = value => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return window ? `${format(window.start)} – ${format(window.end)}` : "Historical event";
}

function eventPackChartReady() {
  return packChartActive && packDataVerified && Boolean(activePackWindow) && rawCandles.length >= 40
    && !symbolStatus.classList.contains("loading") && !symbolStatus.classList.contains("error");
}

function validateEventPackChart(data, symbol, window) {
  const start = Date.parse(`${window?.start}T00:00:00Z`) / 1000;
  const end = Date.parse(`${window?.end}T00:00:00Z`) / 1000 + 86400;
  const source = `${data?.source || ""} ${data?.exchange || ""}`;
  const slots = data?.puzzleId ? data.candleTimes : data?.candles?.map(bar => bar.time);
  if (!data?.source || /preview|fallback|synthetic|simulated/i.test(source)
    || normalizeSymbol(data.ticker || "") !== symbol || data.interval !== "1d"
    || !Number.isFinite(start) || !Number.isFinite(end) || start >= end
    || !Array.isArray(data.candles) || !data.candles.length || !Array.isArray(slots) || slots.length < 40
    || slots.some(time => !Number.isFinite(time) || time < start || time >= end)
    || data.candles.some(bar => !Number.isFinite(bar.time) || bar.time < start || bar.time >= end
      || ![bar.open, bar.high, bar.low, bar.close].every(Number.isFinite) || bar.high < bar.low)) {
    throw new Error("Event pack unavailable. Its historical market data could not be loaded.");
  }
}

function showEventPackUnavailable() {
  packDataVerified = false;
  activePackWindow = null;
  rawCandles = [];
  latestSeries = [];
  clearPracticeChoices();
  symbolStatus.classList.add("error");
  setLoading(false);
  setPracticeControlsLocked(true);
  result.innerHTML = "";
  renderEventPacks();
  drawChart();
}

function eventPackChartHeaderHtml(pack, status) {
  const expanded = modeSurface.querySelector(`.event-pack-info[data-pack-info="${activePackId}"]`)?.open;
  return `<div class="event-pack-chart-header">
    <details class="event-pack-info" data-pack-info="${activePackId}" ${expanded ? "open" : ""}>
      <summary class="mini-button"><span>${escapeHtml(pack.title)}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg></summary>
      <div class="event-pack-info-content">
        <small class="event-pack-copy">${status} · ${packPeriodLabel(activePackId)}${status === "Paper trading" ? " · Separate event paper account" : ""}</small>
        <p class="event-pack-copy">${escapeHtml(pack.brief)}</p>
        <p class="event-pack-copy"><b>Scenario:</b> ${escapeHtml(modeSymbols.packs)} during ${escapeHtml(pack.title)}</p>
        <h3 class="event-pack-subtitle">Practice focus</h3>
        <ul class="event-pack-focus">${pack.focus.split(", ").map(topic => `<li>${escapeHtml(topic)}</li>`).join("")}</ul>
      </div>
    </details>
    <div class="mode-actions event-pack-home-action"><button class="event-pack-home" type="button" data-action="pack-browse" aria-label="All event packs" title="All event packs"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/></svg></button></div>
  </div>`;
}

function renderEventPacks() {
  const pack = eventPacks[activePackId];
  if (packChartActive && pack && symbolStatus.classList.contains("error")) {
    modeSurface.innerHTML = `${eventPackChartHeaderHtml(pack, "Unavailable")}
      <p class="event-pack-copy" role="alert">This event pack is unavailable because its historical market data did not load. Practice is paused. Retry or choose another pack.</p>
      <div class="mode-actions"><button type="button" data-pack="${activePackId}" data-pack-practice="${packPracticeMode}">Retry event pack</button></div>`;
    return;
  }
  if (isEventPackPaper() && pack) { renderPaperTrading(); return; }
  if (packChartActive && pack) {
    modeSurface.innerHTML = `${eventPackChartHeaderHtml(pack, pack.difficulty)}
      <div class="mode-actions"><button type="button" data-pack="${activePackId}">Another market in this pack</button></div>`;
    return;
  }
  setUtilityPanel("");
  modeSurface.innerHTML = `<section class="event-packs-home" aria-labelledby="eventPacksTitle">
    <header class="event-packs-intro">
      <div><span class="round-kicker">Event Packs · ${Object.keys(eventPacks).length} curated collections</span>
        <h1 id="eventPacksTitle">Choose an event.<br>Practice. Study the Pattern. Be Prepared.</h1>
        <p>Explore the crashes, squeezes, and turning points that shaped markets. Get the context, choose a pack, then test your chart reading in the extended view.</p></div>
      <ol class="event-packs-steps" aria-label="How Event Packs works"><li><span>01</span> Explore a pack</li><li><span>02</span> Read the setup</li><li><span>03</span> Practice on the chart</li></ol>
    </header>
    <div class="section-head"><h2>Explore the packs</h2><span class="event-pack-copy">Open a pack to learn more</span></div>
    <div class="event-packs-grid">${Object.entries(eventPacks).map(([id, item], index) => {
      const scenarios = scenariosForPack(id, item);
      return `<details class="event-pack-entry" id="event-pack-${id}" ${id === activePackId ? "open" : ""}>
        <summary aria-controls="event-pack-details-${id}">
          <span class="event-pack-eyebrow"><span>${item.tag}</span><span>${String(index + 1).padStart(2, "0")}</span></span>
          <h3>${item.title}</h3><span class="event-pack-period">${packPeriodLabel(id)}</span>
          <span class="event-pack-description">${item.brief}</span>
          <span class="event-pack-meta"><span>${item.difficulty}</span><span>${scenarios.length} markets</span></span>
          <span class="event-pack-explore"><span class="event-pack-closed-label">Explore pack</span><span class="event-pack-open-label">Close details</span><span aria-hidden="true">+</span></span>
        </summary>
        <div class="event-pack-details" id="event-pack-details-${id}">
          <div><h4>What you'll practice</h4><ul class="event-pack-focus">${item.focus.split(", ").map(topic => `<li>${topic}</li>`).join("")}</ul></div>
          <div><h4>Markets in this pack</h4><ul class="event-pack-markets">${scenarios.map(scenario => `<li>${scenario.symbol}</li>`).join("")}</ul>
            <p>Practice predictions or paper trade with market data from this event window.</p></div>
          <div><h4 class="event-pack-practice-label">Start practicing</h4>
            <div class="mode-actions event-pack-practice-options" role="group" aria-label="Start practicing ${item.title}"><button type="button" data-pack="${id}" data-pack-practice="paper">Paper trading</button><button type="button" data-pack="${id}" data-pack-practice="prediction">Prediction puzzles</button></div></div>
        </div>
      </details>`;
    }).join("")}</div>
  </section>`;
}

function learnModuleId(index) {
  return `learn-module-${index}`;
}

function renderLearnFlashcards(module, index) {
  const activity = learnChapterActivity(index);
  return `<section class="course-activity-card">
    <div class="course-activity-head">
      <div><span>Flashcards</span><strong>Tap to reveal definitions</strong></div>
      <small>${module.terms.length} term cards</small>
    </div>
    <div class="course-flashcards">
      ${module.terms.map(([term, copy], termIndex) => {
        const revealedCard = activity.flashcards.includes(termIndex);
        return `<details class="course-flashcard ${revealedCard ? "flipped" : ""}" ${revealedCard ? "open" : ""}>
          <summary><strong>${term}</strong><small>Click to reveal</small></summary>
          <p>${copy}</p>
        </details>`;
      }).join("")}
    </div>
  </section>`;
}

function renderLearnQuizReview(module, index, feedback) {
  const answerKeyOnly = !feedback?.answers && learnProgress.has(index);
  if (answerKeyOnly) feedback = { passed: true, score: module.quiz.length, answers: module.quiz.map(question => question.correctIndex) };
  if (!feedback?.answers) return "";
  if (feedback.answers.some(answer => Number(answer) < 0)) return "";
  return `<section class="quiz-review-panel">
    <div class="quiz-review-head">
      <strong>${answerKeyOnly ? "Answer explanations" : feedback.passed ? "Quiz review: 3/3" : `Quiz review: ${feedback.score}/3`}</strong>
      <small>${feedback.passed ? "Great work. This chapter is complete, and you can still review every answer." : "Review the missed items, change answers, and resubmit when you are ready."}</small>
    </div>
    ${module.quiz.map((question, questionIndex) => {
      const chosen = Number(feedback.answers[questionIndex]);
      const correctIndex = question.correctIndex;
      const correct = chosen === correctIndex;
      return `<article class="${correct ? "correct" : "missed"}">
        <span>Question ${questionIndex + 1}</span>
        <strong>${escapeHtml(question.prompt)}</strong>
        <p><b>${answerKeyOnly ? "Correct answer" : "Your answer"}:</b> ${chosen >= 0 ? escapeHtml(question.options[chosen]) : "Not answered"}</p>
        ${correct ? `<small>Correct</small>` : `<p><b>Correct answer:</b> ${escapeHtml(question.options[correctIndex])}</p>`}
        ${question.explanation ? `<p>${escapeHtml(question.explanation)}</p>` : ""}
      </article>`;
    }).join("")}
  </section>`;
}

function renderLearnReflection(module, index) {
  const activity = learnChapterActivity(index);
  const prompt = `In one paragraph, explain how ${module.title.toLowerCase()} changes a real decision.`;
  return `<section class="course-activity-card course-reflection">
    <div class="course-activity-head">
      <div><span>Written checkpoint</span><strong>Apply it in your own words</strong></div>
      <small>${"Temporary for this page"}</small>
    </div>
    <p>${prompt}</p>
    <textarea id="learnReflection" rows="5" maxlength="700" placeholder="${prompt}">${escapeHtml(activity.reflection || "")}</textarea>
    <div class="mode-actions">
      <button type="button" data-action="learn-save-reflection">Save reflection</button>
      <button type="button" data-action="learn-mark-reflection">Mark reflection done</button>
    </div>
  </section>`;
}

function renderLearnQuiz(module, index) {
  const completed = learnProgress.has(index);
  const started = completed || learnQuizStarted.has(index);
  const feedback = learnQuizFeedback[index];
  if (completed) {
    return `<div class="quiz-launch complete">
      <div>
        <strong>Quiz passed</strong>
        <small>Lesson ${index + 1} is complete. Explore or review any lesson.</small>
      </div>
    </div>
    <details class="iq-disclosure"><summary>Review answers</summary>${renderLearnQuizReview(module, index, feedback)}</details>`;
  }
  if (!started) {
    return `<div class="quiz-launch">
      <div>
        <strong>Check your understanding</strong>
        <small>Start whenever you are ready. Pass all 3 questions to complete this lesson.</small>
      </div>
      <button type="button" data-learn-quiz-start="${index}">Start knowledge check</button>
    </div>`;
  }
  return `<form class="module-quiz" tabindex="-1" data-quiz-index="${index}">
    <div class="quiz-head">
      <strong>Knowledge check</strong>
      <small>Pass all 3 questions to complete this lesson.</small>
    </div>
    ${module.quiz.map((question, questionIndex) => `<fieldset>
      <legend>${questionIndex + 1}. ${question.prompt}</legend>
      ${question.options.map((option, optionIndex) => `<label>
        <input type="radio" name="learn-${index}-${questionIndex}" value="${optionIndex}" data-learn-answer="${index}:${questionIndex}" ${Number(learnQuizAnswers[index]?.[questionIndex]) === optionIndex ? "checked" : ""} />
        <span>${option}</span>
      </label>`).join("")}
    </fieldset>`).join("")}
    ${feedback ? `<p class="quiz-feedback ${feedback.passed ? "pass" : "retry"}">${feedback.passed ? "Passed. Progress saved." : feedback.message}</p>${renderLearnQuizReview(module, index, feedback)}` : ""}
    <button type="button" data-learn-quiz-submit="${index}">Submit quiz</button>
  </form>`;
}

function renderLearnChecklist(module, index) {
  const activity = learnChapterActivity(index);
  const steps = [
    ["terms", "Study key terms", `Review ${module.terms.slice(0, 3).map(([term]) => term).join(", ")}.`],
    ["reflection", "Write reflection", "Explain the chapter in your own words."],
    ["quiz", "Pass checkpoint", "Score 3/3 on the chapter quiz."]
  ];
  const doneCount = steps.filter(([id]) => id === "quiz" ? learnProgress.has(index) : activity.steps.includes(id)).length;
  return `<section class="course-activity-card">
    <div class="course-activity-head">
      <div><span>Lesson activity</span><strong>${doneCount}/${steps.length} steps complete</strong></div>
      <small>${doneCount === steps.length ? "Chapter complete" : "Study at your own pace"}</small>
    </div>
    <div class="course-checklist">
      ${steps.map(([id, label, hint]) => {
        const checked = id === "quiz" ? learnProgress.has(index) : activity.steps.includes(id);
        return `<label class="${checked ? "complete" : ""}">
          <input type="checkbox" data-learn-step-check="${id}" ${checked ? "checked" : ""} ${id === "quiz" ? "disabled" : ""} />
          <span>${checked ? "&#10003;" : "&#9675;"}</span>
          <div><strong>${label}</strong><small>${hint}</small></div>
        </label>`;
      }).join("")}
    </div>
  </section>`;
}

function renderLearnSources(module) {
  return `<details class="iq-disclosure iq-sources">
    <summary>Sources &amp; credits</summary>
    <p>Original Pretium Labs explanations, examples, and quizzes. These independent lessons cover concepts also taught in the courses below; they are not university courseware or an accredited qualification.</p>
    <ul>${module.sources.map(key => {
      const source = IQ_SOURCES[key];
      return `<li><span>${escapeHtml(source.kind)} · ${escapeHtml(source.author)}</span><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} <span class="iq-external">(opens in new tab)</span></a></li>`;
    }).join("")}</ul>
    <p>Pretium Labs is not affiliated with or endorsed by Harvard, Yale, edX, or the SEC. Linked providers set their own access and certificate terms. Open Yale's recorded course is from 2011; check current rules separately.</p>
    <p>We link to external course materials rather than republishing their text, videos, slides, or assessments. <a href="https://www.edx.org/edx-terms-service" target="_blank" rel="noopener noreferrer">edX terms</a> · <a href="https://oyc.yale.edu/terms" target="_blank" rel="noopener noreferrer">Open Yale terms</a></p>
  </details>`;
}

function renderLearn() {
  const total = learnModules.length;
  const completed = [...learnProgress].filter(index => Number.isInteger(index) && index >= 0 && index < total).length;
  const percent = Math.round(completed / total * 100);
  if (!learnChapterUnlocked(activeLearnChapter)) activeLearnChapter = nextLearnTargetIndex();
  const module = learnModules[activeLearnChapter];
  const chapterComplete = learnProgress.has(activeLearnChapter);
  document.getElementById("choices").innerHTML = "";
  document.getElementById("nextBtn").hidden = true;
  result.innerHTML = "";
  revealTag.textContent = "Pretium Labs IQ";
  modeSurface.innerHTML = `<section class="iq-course" aria-label="Pretium Labs IQ course">
    <header class="iq-header">
      <div><span class="iq-eyebrow">Pretium Labs IQ</span><h2>Better decisions start here.</h2><p>Money, investing, and markets. ${total} focused lessons you can put to work.</p></div>
      <div class="iq-progress"><span id="learnProgressText"><strong>${completed} / ${total}</strong> lessons complete</span><progress max="${total}" value="${completed}" aria-label="Pretium Labs IQ course progress">${percent}%</progress><small>Progress is saved in this browser</small></div>
    </header>
    ${completed === total ? `<p class="iq-finished" role="status">Course complete. Revisit any lesson or put your process to work in practice.</p>` : ""}
    <label class="iq-mobile-picker" for="iqLessonSelect">Choose a lesson<select id="iqLessonSelect">${IQ_TRACKS.map((track, trackIndex) => `<optgroup label="${escapeHtml(track.title)}">${learnModules.map((item, index) => item.trackIndex === trackIndex ? `<option value="${index}" ${index === activeLearnChapter ? "selected" : ""}>${index + 1}. ${escapeHtml(item.title)}${learnProgress.has(index) ? " · Complete" : ""}</option>` : "").join("")}</optgroup>`).join("")}</select></label>
    <div class="iq-workspace">
      <nav class="iq-syllabus" aria-label="Course lessons">
        <div class="iq-syllabus-heading"><strong>Your learning path</strong><small>Explore in any order</small></div>
        ${IQ_TRACKS.map((track, trackIndex) => {
          const lessons = learnModules.map((item, index) => ({ item, index })).filter(({ item }) => item.trackIndex === trackIndex);
          const done = lessons.filter(({ index }) => learnProgress.has(index)).length;
          return `<details class="iq-track" ${module.trackIndex === trackIndex ? "open" : ""}><summary><span><small>PATH ${String(trackIndex + 1).padStart(2, "0")} · ${done}/${lessons.length}</small><strong>${escapeHtml(track.title)}</strong></span></summary>
            <p>${escapeHtml(track.description)}</p><div class="iq-lesson-list">${lessons.map(({ item, index }) => `<button type="button" data-learn-chapter="${index}" ${index === activeLearnChapter ? 'aria-current="step"' : ""}><span class="iq-lesson-number">${learnProgress.has(index) ? "✓" : String(index + 1).padStart(2, "0")}</span><span><strong>${escapeHtml(item.title)}</strong><small>${item.minutes} min${learnProgress.has(index) ? " · Complete" : ""}</small></span></button>`).join("")}</div>
          </details>`;
        }).join("")}
      </nav>
      <article class="iq-lesson course-lesson" id="${learnModuleId(activeLearnChapter)}" tabindex="-1" aria-labelledby="iqLessonTitle">
        <div class="iq-lesson-meta"><span>${escapeHtml(module.track)} · ${module.minutes} min</span><span>${chapterComplete ? "✓ Complete" : `Lesson ${activeLearnChapter + 1} of ${total}`}</span></div>
        <h3 id="iqLessonTitle">${escapeHtml(module.title)}</h3><p class="iq-intro">${escapeHtml(module.summary)}</p>
        <div class="iq-reading">${module.details.map(([heading, copy]) => `<section><h4>${escapeHtml(heading)}</h4><p>${escapeHtml(copy)}</p></section>`).join("")}</div>
        <section class="iq-example" aria-labelledby="iqExampleTitle"><span class="iq-eyebrow">WORKED EXAMPLE</span><h4 id="iqExampleTitle">${escapeHtml(module.example.title)}</h4><p>${escapeHtml(module.example.prompt)}</p><ol>${module.example.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol><p class="iq-takeaway"><strong>Take it with you</strong>${escapeHtml(module.example.takeaway)}</p></section>
        <details class="iq-disclosure"><summary>Two terms to know</summary><dl>${module.terms.map(([term, copy]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(copy)}</dd></div>`).join("")}</dl></details>
        <section class="iq-checkpoint" tabindex="-1" aria-label="Lesson knowledge check">${renderLearnQuiz(module, activeLearnChapter)}</section>
        ${module.practice ? `<div class="iq-practice"><p>${module.practice === "free" ? "Try describing the visible evidence before revealing a practice chart." : "Compare a past prediction with the evidence available when you made it."}</p><button type="button" data-home-mode="${module.practice}">${module.practice === "free" ? "Practice a chart" : "Open Review"}</button></div>` : ""}
        ${renderLearnSources(module)}
        <footer class="iq-lesson-nav"><button type="button" data-learn-chapter="${activeLearnChapter - 1}" ${activeLearnChapter === 0 ? "disabled" : ""}>Previous</button><span>${activeLearnChapter + 1} / ${total}</span>${activeLearnChapter < total - 1 ? `<button type="button" data-learn-chapter="${activeLearnChapter + 1}">Next lesson</button>` : `<button type="button" data-action="learn-scroll-next">${completed === total ? "Review course" : "Next unfinished"}</button>`}</footer>
      </article>
    </div>
    <p class="iq-footnote">Independent financial education. Examples are hypothetical, not investment advice. Day trading can cause substantial losses.</p>
  </section>`;
}

function renderHome() {
  const name = accountDisplayName();
  const totalReads = Number(stats?.total || 0);
  const accuracy = totalReads ? Math.round((Number(stats.correct || 0) / totalReads) * 100) : 0;
  const homeSections = [
    {
      eyebrow: "Practice",
      title: "Read the chart. Make the call.",
      copy: "Build pattern recognition with hidden futures, Daily, and focused review.",
      accent: "practice",
      links: [["Free Play", "free"], ["Daily", "daily"]]
    },
    {
      eyebrow: "Trading Lab",
      title: "Test ideas without risking money.",
      copy: "Use simulated cash, explore strategy logic, and revisit major market events.",
      accent: "lab",
      links: [["Paper Trading", "paper"], ["Quant Lab", "quant"], ["Event Packs", "packs"]]
    },
    {
      eyebrow: "Growth",
      title: "Turn activity into understanding.",
      copy: "Follow primary-source news and review your progress.",
      accent: "growth",
      links: [["MarketPulse News", "news"], ["Review", "review"]]
    },
  ];
  modeSurface.innerHTML = `<section class="home-hero">
      <div class="home-hero-copy">
        <span>Welcome, ${escapeHtml(name)}</span>
        <h1>Your market-learning workspace.</h1>
        <p>Choose where you want to go. Practice a chart, test a strategy, or explore market news.</p>
        <div class="home-hero-actions">
          <button type="button" data-home-mode="free">Continue Free Play</button>
        </div>
      </div>
      <div class="home-progress" aria-label="Your progress overview">
        <article><span>Chart reads</span><strong>${totalReads.toLocaleString()}</strong><small>completed</small></article>
        <article><span>Accuracy</span><strong>${accuracy}%</strong><small>all trades</small></article>
      </div>
    </section>
    <section class="home-launchpad" aria-labelledby="homeLaunchpadTitle">
      <header><div><h2 id="homeLaunchpadTitle">Where do you want to go?</h2></div></header>
      <div class="home-destination-grid">
        ${homeSections.map(section => `<article class="home-destination home-destination-${section.accent}">
          <span>${section.eyebrow}</span>
          <h3>${section.title}</h3>
          <p>${section.copy}</p>
          <div>${section.links.map(([label, mode]) => `<button type="button" data-home-mode="${mode}">${label}<i aria-hidden="true">→</i></button>`).join("")}</div>
        </article>`).join("")}
      </div>
    </section>
    <section class="home-account-strip">
      <div><span>Your space</span><strong>Progress, preferences, and rewards live with you.</strong></div>
      <div><button type="button" data-home-mode="account">Settings</button></div>
    </section>`;
}

function localDataCounts() {
  return {
    practice: practiceHistory.length,
    orders: paperAccount.orders?.length || 0,
    positions: paperAccount.positions?.length || 0
  };
}

function collectLocalDataExport() {
  const account = sessionProfile;
  loadDailyBrowserPuzzles();
  let quantDraft = null;
  try { quantDraft = JSON.parse(readBrowserPreference(QUANT_DRAFT_KEY)); } catch {}
  return {
    product: "Pretium Labs",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    scope: "local-browser-prototype",
    stats: cleanStats(stats),
    coins: coinWalletState(),
    learnProgress: [...learnProgress].sort((a, b) => a - b),
    learnActivity,
    practiceHistory,
    freePlayDailyAnswers,
    legacyStreakDays: [...legacyStreakDays].sort(),
    savedNews: [...savedNews],
    paperAccount: cleanPaperAccount(paperAccount),
    eventPortfolios: Object.fromEntries(guestPaperAccounts),
    dailyPuzzles: Object.fromEntries(dailyPreviewPuzzles),
    workspace: JSON.parse(JSON.stringify(reloadWorkspaceState(), (key, value) => ["button", "marketLayer"].includes(key) ? undefined : value)),
    quantSettings: Object.fromEntries(Object.keys(DEFAULT_QUANT_CONFIG).map(key => [key, quantConfig[key]])),
    quantDraft,
    algorithms: quantAlgorithms(),
    profile: { ...sessionProfile },
    privacyNote: "This export contains practice progress saved in this browser."
  };
}

function safeExportFileName() { return `pretium-labs-data-${todayIso()}.json`; }

function exportLocalAccountData() {

  const payload = collectLocalDataExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeExportFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  showToast("Local data export prepared.");
  return payload;
}

function updateNicknameInput() {
  const input = document.getElementById("nicknameInput");
  document.getElementById("nicknameCount").textContent = `${input.value.length}/15`;
  document.getElementById("nicknameTextViewport").classList.toggle("is-scrolled", input.scrollLeft > 0);
}

function openNicknameDialog() {
  const account = sessionProfile;
  if (!account) return;
  const input = document.getElementById("nicknameInput");
  input.value = "";
  updateNicknameInput();
  input.removeAttribute("aria-invalid");
  document.getElementById("nicknameError").hidden = true;
  openAccessibleModal(nicknameModal);
  input.focus({ preventScroll: true });
}

function closeNicknameDialog() {
  closeAccessibleModal(nicknameModal, document.getElementById("nicknameEdit"));
  document.getElementById("nicknameForm").reset();
  updateNicknameInput();
}

function saveNickname(event) {
  event.preventDefault();
  const account = sessionProfile;
  if (!account) return;
  const input = document.getElementById("nicknameInput");
  const nickname = input.value.trim();
  const error = document.getElementById("nicknameError");
  const message = !nickname || nickname.length > 15
    ? "Enter a nickname between 1 and 15 characters."
    : containsInappropriateName(nickname) ? "Choose a nickname without offensive or inappropriate language." : "";
  if (message) {
    error.textContent = message;
    error.hidden = false;
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }
  const previous = account.nickname;
  if (nickname === (previous || account.name)) {
    closeNicknameDialog();
    return;
  }

  try {
    const paid = coinWallet().purchase(50, () => {
      account.nickname = nickname;
      writeBrowserData("pretiumlabs-profile-v1", { nickname }, true);
    });
    if (!paid) {
      error.textContent = "You need 50 Coins to change your nickname.";
      error.hidden = false;
      input.focus();
      return;
    }
  } catch {
    account.nickname = previous;
    error.textContent = "Your nickname could not be saved. Try again.";
    error.hidden = false;
    return;
  }
  renderAccountLevel();
  renderAccountPanel();
  closeNicknameDialog();
}

function renderAccountPage() {
  const account = sessionProfile;
  const level = currentLevel();
  const next = nextReachableLevel(level);
  const sections = [
    { id: "profile", label: "General", topics: [["language", "Language"]] },
    ...(typeof document !== "undefined" && document.body.dataset.theme === "gamify"
      ? [{ id: "cosmetics", label: "Cosmetics", topics: [["cosmetics", "Your cosmetics"]] }] : []),
    { id: "appearance", label: "Appearance", topics: [["theme", "Theme"], ["animations", "Animations"], ["weather", "Local weather clouds"]] },
    { id: "progress", label: "Progress", topics: [["rank", "Rank"], ["xp", "XP & streak"]] },
    { id: "data", label: "Data", topics: [["export", "Export data"]] },
    { id: "security", label: "Storage", topics: [["storage", "Practice storage"]] }
  ];
  const section = sections.find(item => item.id === activeSettingsSection) || sections[0];
  activeSettingsSection = section.id;
  const topic = (id, title, content) => `<section class="settings-topic" aria-labelledby="settings-${id}"><h3 id="settings-${id}" tabindex="-1">${title}</h3>${content}</section>`;
  const language = topic("language", "Language", `<select id="websiteLanguage" aria-labelledby="settings-language" aria-describedby="websiteLanguageStatus" translate="no">${window.siteI18n.languageOptions()}</select><p id="websiteLanguageStatus" role="status" aria-live="polite"></p>`);
  const appearance = topic("theme", "Theme", `<span class="theme-options settings-theme-options" role="group" aria-label="Choose appearance theme"><button type="button" data-theme-choice="light" aria-pressed="false">Light</button><button type="button" data-theme-choice="dark" aria-pressed="false">Dark</button><button type="button" data-theme-choice="gamify" aria-pressed="false">Gamify</button></span>`)
    + topic("animations", "Animations", `<span class="animation-options" role="group" aria-label="Animation preferences"><label><input type="checkbox" data-animation-option="xp"><span>XP animations</span></label><label><input type="checkbox" data-animation-option="correct"><span>Correct predictions</span></label><label><input type="checkbox" data-animation-option="trail"><span>Cursor trail</span></label><label><input type="checkbox" data-animation-option="graph"><span>Cursor graph lines</span></label><span>Display preferences stay on this device. Turning animations off does not affect XP or scoring.</span></span>`)
    + topic("weather", "Local weather clouds", `<span class="cloud-weather-options settings-cloud-weather-options"><button class="secondary" type="button" data-cloud-weather-toggle aria-pressed="false" aria-describedby="settingsCloudWeatherPrivacy settingsCloudWeatherStatus">Use my weather</button><span id="settingsCloudWeatherStatus" data-cloud-weather-status role="status">Match Gamify clouds to your local weather.</span><span id="settingsCloudWeatherPrivacy">With permission, approximate location is sent to <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>. This app does not save your location.</span></span>`);
  const content = {
    profile: language,
    cosmetics: topic("cosmetics", "Your cosmetics", `<p>No cosmetics available yet.</p>`),
    appearance,
    progress: topic("rank", "Rank", `<strong class="settings-stat">${escapeHtml(level.title)}</strong><p>Increment ${level.tierIncrement} of 20${next.level === level.level ? " • Maximum rank reached." : ` • ${formatXp(Math.max(0, next.xp - stats.xp))} to ${next.title === level.title ? "the final increment" : escapeHtml(next.title)}`}</p>`)
      + topic("xp", "XP & streak", `<strong class="settings-stat">${stats.xp.toLocaleString()} XP</strong><p>${currentDayStreak()} day streak</p>`),
    data: topic("export", "Export data", `<p>Export this browser's progress, puzzle history, algorithms, and paper trades.</p><div class="account-data-actions"><button type="button" data-action="account-export-data">Export data</button></div>`),
    security: topic("storage", "Practice storage", `<p>Progress and preferences are saved in this browser on this site. They survive reloads but do not sync across devices. Clearing site data or ending private browsing can remove saves. Export a backup of valuable work. Browser saves can be edited and are for local practice.</p>`)
  };
  setUtilityPanel("Settings", "", "");
  modeSurface.innerHTML = `<div class="settings-page">
    <header class="settings-heading"><h2>Settings</h2></header>
    <div class="settings-layout">
      <nav class="settings-nav" aria-label="Settings sections"><span class="settings-nav-label">Settings</span>${sections.map(item => `<button type="button" data-settings-section="${item.id}"${item.id === section.id ? ' aria-current="page"' : ""}>${item.label}</button>`).join("")}</nav>
      <div class="settings-content" id="settingsContent" role="region" aria-labelledby="settingsSectionTitle">
        <header class="settings-section-heading"><h2 id="settingsSectionTitle" tabindex="-1">${section.label}</h2></header>
        ${content[section.id]}
      </div>
      <nav class="settings-outline" aria-label="In this section"><span class="settings-nav-label">In this section</span>${section.topics.map(([id, label], index) => `<button type="button" data-settings-topic="${id}"${index === 0 ? ' aria-current="location"' : ""}>${label}</button>`).join("")}</nav>
    </div>
  </div>`;
  if (typeof document !== "undefined") {
    updateThemeToggleLabel();
    syncAnimationPreferences();
    syncCloudWeatherControls(cloudWeatherStatusMessage);
  }
}

function showPredictionLesson(choice) {
  const lesson = patternLessons[choice];
  if (!lesson) return;
  result.innerHTML = `<strong>${choice}: ${lesson.title}</strong><p>${lesson.why}</p><p><b>Rule trigger:</b> ${predictionTriggers[choice]}</p><p><b>Drill:</b> ${lesson.drill}</p>`;
  revealTag.textContent = "Course lesson";
}

async function loadPack(packId, practiceMode = "prediction") {
  const pack = eventPacks[packId];
  if (!pack) return;
  stopEventPackPlayback();
  const scenario = pickPackScenario(packId, pack);
  if (appMode !== "packs") {
    setMode("packs");
  }
  activePackId = packId;
  packPracticeMode = practiceMode === "paper" ? "paper" : "prediction";
  packChartActive = true;
  packDataVerified = false;
  activePackWindow = null;
  // Never carry a previous market or generated preview into a new event attempt.
  rawCandles = [];
  latestSeries = [];
  clearPracticeChoices();
  symbolStatus.classList.remove("error");
  paperSellAllPending = false;
  modeSymbols.packs = scenario.symbol;
  renderModeSurface();
  dockSidePanel();
  modeSurface.querySelector('[data-action="pack-browse"]')?.focus({ preventScroll: true });
  chartPanel?.scrollIntoView({ block: "start" });
  const packWindow = eventPackWindows[packId] || null;
  timeframe = "3M";
  document.querySelectorAll("[data-timeframe]").forEach(item => item.classList.toggle("active", item.dataset.timeframe === "3M"));
  advancedIntervals.hidden = true;
  advancedMode = false;
  document.body.classList.remove("advanced-chart");
  advancedToggle.classList.remove("active");
  advancedToggle.setAttribute("aria-expanded", "false");
  syncAdvancedIntervalsLayout();
  revealTag.textContent = "";
  symbolStatus.textContent = `Loading pack: ${pack.title} (${scenario.symbol})...`;
  animateLoadingDots(symbolStatus);
  result.innerHTML = "";
  const pending = submitSymbol(scenario.symbol, { remember: false, packWindow });
  const requestId = chartRequestId;
  const loaded = await pending;
  if (appMode !== "packs" || !packChartActive || activePackId !== packId || requestId !== chartRequestId) return;
  if (!loaded) {
    showEventPackUnavailable();
    return;
  }
  if (isEventPackPaper()) renderPaperTrading();
  showToast(`${pack.title} scenario loaded.`);
}

function syncNextChartButton() {
  const nextButton = document.getElementById("nextBtn");
  if (!nextButton) return;
  const available = appMode === "free" || appMode === "ranked"
    || (appMode === "packs" && packChartActive && !isEventPackPaper())
    || (appMode === "review" && reviewChartActive && Boolean(activeReviewRecordId));
  nextButton.hidden = !available;
  const loading = nextChartLoading || (["free", "ranked", "review", "packs"].includes(appMode) && symbolStatus.classList.contains("loading"));
  const freePlayUnavailable = appMode === "free"
    && freePlayRandomSettings.randomSelected === false
    && (freePlayRandomSettings.assetSelected || freePlayRandomSettings.instrumentSelected)
    && !freePlayScopeCandidates().length;
  nextButton.disabled = !available || loading || freePlayUnavailable
    || (appMode === "packs" && !eventPackChartReady());
  if (appMode === "review" && available) nextButton.disabled = loading || reviewChartQueue().length < 2;
  nextButton.textContent = loading ? "Loading next chart..."
    : appMode === "free" && freePlayRedoAvailable ? "Redo" : "Next chart";
  nextButton.setAttribute("aria-busy", String(loading));
  if (appMode === "ranked") {
    const waiting = liveRound?.choice && !liveRound.resolved && !liveRound.failed;
    const committed = rankedRoundCommitted();
    nextButton.disabled = liveMarketClosed || loading || committed;
    nextButton.textContent = liveMarketClosed ? "Market Closed" : loading ? "Loading Live chart…" : waiting ? "Waiting for candle close…" : committed ? "Round entered" : "Load Chart";
  }
  animateLoadingDots(nextButton);
}

function timeframeGroupFor(value) {
  if (value === "All") return "all";
  if (value === "YTD" || /^(\d+Y|12mo)$/.test(value)) return "years";
  if (/^\d+m$/.test(value)) return "minutes";
  if (/^\d+h$/.test(value)) return "hours";
  if (/^\d+[Dd]$/.test(value)) return "days";
  if (/^\d+[Ww]$/.test(value)) return "weeks";
  return "months";
}

function syncAdvancedIntervalsLayout(selectedValue) {
  const row = document.querySelector(".primary-timeframes");
  row.hidden = appMode === "ranked" || appMode === "daily" || isEventPackPaper();
  const focused = document.activeElement;
  const buttons = [...document.querySelectorAll("[data-timeframe]")];
  const available = buttons.filter(button => appMode !== "ranked" || !button.hasAttribute("data-historical-only"));
  const selected = selectedValue || (appMode === "ranked"
    ? (["minutes", "hours"].includes(activeTimeframeGroup) ? liveInterval : liveHistory)
    : appMode === "daily" ? dailyRound?.data?.timeframe || "3M" : timeframe);
  activeTimeframeGroup = timeframeGroupFor(selected);
  timeframeGroupChoices[activeTimeframeGroup] = selected;
  if (appMode === "ranked") {
    timeframeGroupChoices[timeframeGroupFor(liveInterval)] = liveInterval;
    timeframeGroupChoices[timeframeGroupFor(liveHistory)] = liveHistory;
  }
  const primary = new Set();
  for (const [group, preferred] of Object.entries(timeframeGroupChoices)) {
    const choices = available.filter(button => timeframeGroupFor(button.dataset.timeframe) === group);
    const choice = choices.find(button => button.dataset.timeframe === preferred) || choices[0];
    if (!choice) continue;
    primary.add(choice);
    row.insertBefore(choice, advancedToggle);
  }
  row.append(advancedIntervals);
  for (const button of buttons) {
    const group = timeframeGroupFor(button.dataset.timeframe);
    button.dataset.timeframeGroup = group;
    button.dataset.timeframeLabel ||= button.textContent;
    const isPrimary = primary.has(button);
    if (!isPrimary) advancedIntervals.append(button);
    button.hidden = !isPrimary && (group !== activeTimeframeGroup || !available.includes(button));
    // Keep the compact shortcut legible when a candle interval replaces a range.
    button.textContent = isPrimary ? button.dataset.timeframeLabel.replace(" bars", "") : button.dataset.timeframeLabel;
    button.setAttribute("aria-label", button.dataset.timeframeLabel);
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  }
  const hasOptions = [...advancedIntervals.children].some(button => !button.hidden);
  if (!hasOptions || row.hidden) advancedMode = false;
  advancedIntervals.hidden = !advancedMode;
  advancedToggle.disabled = !hasOptions;
  advancedToggle.hidden = !hasOptions;
  advancedToggle.classList.toggle("active", advancedMode);
  advancedToggle.setAttribute("aria-expanded", String(advancedMode));
  document.body.classList.toggle("advanced-chart", advancedMode);
  const unit = { minutes: "minute", hours: "hour", days: "day", weeks: "week", months: "month", years: "year", all: "all-history" }[activeTimeframeGroup];
  const label = hasOptions ? `${advancedMode ? "Hide" : "Show"} ${unit} options` : "All history has no additional options";
  advancedToggle.setAttribute("aria-label", label);
  advancedToggle.title = label;
  advancedIntervals.setAttribute("aria-label", `${unit[0].toUpperCase()}${unit.slice(1)} options`);
  if (focused?.matches("[data-timeframe], #advancedToggle") && !focused.hidden && !focused.closest("[hidden]")) {
    focused.focus({ preventScroll: true });
  }
}

function loadNavigationPage() {
  try {
    const page = readBrowserData(NAVIGATION_PAGE_KEY, null);
    return Object.prototype.hasOwnProperty.call(modes, page) ? page : null;
  } catch {
    return null;
  }
}

function saveNavigationPage() {
  if (browserPrivacyLeaving || !navigationReady) return;
  writeBrowserData(NAVIGATION_PAGE_KEY, appMode);
}

// Only serializable workspace state belongs here. Scores/history stay in their
// existing stores; restoring a view must never submit or score a prediction.
function reloadWorkspaceState(saved = null) {
  const current = {
    currentSymbol, rawCandles, revealed, timeframe, chartType, zoom, pan, priceOffset, priceScale,
    chartWindowStart, chartWindowScale, challengeObservedRatio, showSMA, showEMA, showBollinger, showVolume,
    activeTool, advancedMode, activeTimeframeGroup, drawings, drawingHistory, activePackWindow, packChartActive, packDataVerified, activePackId, packPracticeMode, packPaperIndex,
    freePlayRandomSettings, freeRandomizerExpanded, freePlaySettingsExpanded, freePlayRedoAvailable,
    liveInterval, liveHistory, liveRound, liveMarketClosed, liveMarketSymbol,

    reviewChartActive, activeReviewRecordId, activeReviewRound,
    activeReviewAnswer, reviewRecordFilter, reviewGameModes, expandedReviewStatistic,
    selectedReviewWeek, selectedReviewPattern, selectedDailyDate, dailyCalendarMonth, dailyRound, dailyState,
    activeSettingsSection, activeLearnChapter,
    paperChartSymbol, paperQuote, lastProductMode
  };
  if (saved) {
    ({ currentSymbol, rawCandles, revealed, timeframe, chartType, zoom, pan, priceOffset, priceScale,
      chartWindowStart, chartWindowScale, challengeObservedRatio, showSMA, showEMA, showBollinger, showVolume,
      activeTool, advancedMode, activeTimeframeGroup, drawings, drawingHistory, activePackWindow, packChartActive, packDataVerified, activePackId, packPracticeMode, packPaperIndex,
      freePlayRandomSettings, freeRandomizerExpanded, freePlaySettingsExpanded, freePlayRedoAvailable,
      liveInterval, liveHistory, liveRound, liveMarketClosed, liveMarketSymbol,

      reviewChartActive, activeReviewRecordId, activeReviewRound,
      activeReviewAnswer, reviewRecordFilter, reviewGameModes, expandedReviewStatistic,
      selectedReviewWeek, selectedReviewPattern, selectedDailyDate, dailyCalendarMonth, dailyRound, dailyState,
      activeSettingsSection, activeLearnChapter,
      paperChartSymbol, paperQuote, lastProductMode } = { ...current, ...saved });
  }
  return current;
}

function browserResultNodes(nodes = result.childNodes) {
  const allowed = new Set(["STRONG", "P", "B", "BR", "SPAN", "BUTTON"]);
  return [...nodes].map(node => node.nodeType === 3 ? { text: node.textContent }
    : allowed.has(node.nodeName) ? { tag: node.nodeName,
      replay: node.nodeName === "BUTTON" && node.hasAttribute("data-free-play-replay"),
      children: browserResultNodes(node.childNodes) } : { text: node.textContent });
}

function restoreBrowserResult(nodes, parent = result, depth = 0) {
  if (!Array.isArray(nodes) || depth > 12) return;
  const allowed = new Set(["STRONG", "P", "B", "BR", "SPAN", "BUTTON"]);
  for (const node of nodes.slice(0, 100)) {
    if (typeof node?.text === "string") parent.append(document.createTextNode(node.text));
    else if (allowed.has(node?.tag)) {
      const element = document.createElement(node.tag.toLowerCase());
      if (node.tag === "BUTTON") {
        element.type = "button";
        element.className = "secondary";
        if (node.replay === true) element.setAttribute("data-free-play-replay", "");
      }
      restoreBrowserResult(node.children, element, depth + 1);
      parent.append(element);
    }
  }
}

function saveReloadSession() {
  if (!navigationReady) return;
  const state = JSON.parse(JSON.stringify(reloadWorkspaceState(), (key, value) => ["button", "marketLayer"].includes(key) ? undefined : value));
  // Pending network/UI locks cannot survive a page reload.
  if (state.liveRound) for (const key of ["entrySaving", "betSaving", "serverSaving"]) state.liveRound[key] = false;
  if (state.dailyRound) { state.dailyRound.busy = false; state.dailyRound.grading = false; }
  return writeBrowserData(RELOAD_SESSION_KEY, { version: 1, mode: appMode, state, reconcileDaily: appMode === "daily", view: {
    timeframeGroups: { ...timeframeGroupChoices }, symbols: { ...modeSymbols },
    ticker: tickerInput.value, asset: assetSelect.value,
    choices: [...document.querySelectorAll("#choices button")].map(button => ({ choice: button.dataset.choice,
      selected: button.classList.contains("selected"), disabled: button.disabled, state: button.dataset.state })),
    resultNodes: browserResultNodes(), tag: revealTag.textContent,
    reviewHintOpen: !document.getElementById("reviewHint")?.hidden,
    drawingTools: !document.getElementById("drawingTools").hidden,
    details: [...document.querySelectorAll("details")].map(element => element.open),
    scrollX: window.scrollX, scrollY: window.scrollY, panelScroll: predictionPanel?.scrollTop || 0
  } });
}

function loadReloadSession() {
  const saved = readBrowserData(RELOAD_SESSION_KEY, null);
  if (saved?.version !== 1 || saved.mode !== appMode || !saved.state || !saved.view
      || !Array.isArray(saved.state.rawCandles) || !Array.isArray(saved.view.choices)
      || !saved.state.rawCandles.every(bar => bar && typeof bar === "object")
      || !Array.isArray(saved.view.details)) return null;
  for (const bar of saved.state.rawCandles) bar.date = new Date(bar.date || bar.time * 1000);
  saved.state.dailyCalendarMonth = new Date(saved.state.dailyCalendarMonth || Date.now());
  return saved;
}

function restoreReloadDetails(savedDetails) {
  document.querySelectorAll("details").forEach((element, index) => {
    // Ignore legacy saved expansions for trade listings and their match rounds.
    if (element.closest(".review-records")) element.open = false;
    else if (index < savedDetails.length) element.open = savedDetails[index];
  });
}

function restoreReloadSession(saved) {
  if (!saved) return false;
  reloadWorkspaceState(saved.state);
  if (isEventPackPaper() && eventPackChartReady()) {
    restoreEventPackPaperTime(packPaperIndex);
    const quote = eventPackPaperQuote();
    if (quote) updatePaperPositionQuote(quote);
  }

  Object.assign(timeframeGroupChoices, saved.view.timeframeGroups);
  Object.assign(modeSymbols, saved.view.symbols);
  latestSeries = [];
  hoverIndex = null;
  resetDrawingGesture();
  renderModeSurface();
  setLoading(false);
  tickerInput.value = saved.view.ticker;
  assetSelect.value = saved.view.asset;
  if (saved.view.choices.length) renderChoices();
  else clearPracticeChoices();
  document.querySelectorAll("#choices button").forEach(button => {
    const choice = saved.view.choices.find(item => item.choice === button.dataset.choice);
    if (!choice) return;
    button.disabled = choice.disabled;
    button.classList.toggle("selected", choice.selected);
    if (choice.state === "correct" || choice.state === "wrong") {
      button.dataset.state = choice.state;
      button.classList.toggle("correct", choice.state === "correct");
      button.classList.toggle("wrong", choice.state === "wrong");
      applyPredictionResultColor(button, choice.state);
    }
  });
  // Stored browser data is text, never executable markup.
  result.replaceChildren();
  restoreBrowserResult(saved.view.resultNodes);
  revealTag.textContent = saved.view.tag;
  const reviewHint = document.getElementById("reviewHint");
  if (reviewHint && appMode === "review" && reviewChartActive) {
    reviewHint.hidden = !saved.view.reviewHintOpen;
    if (typeof syncReviewControls === "function") syncReviewControls();
  }
  document.querySelectorAll("[data-timeframe]").forEach(button => {
    button.classList.toggle("active", appMode === "ranked"
      ? [liveInterval, liveHistory].includes(button.dataset.timeframe) : button.dataset.timeframe === timeframe);
  });
  // Retain both the remembered group shortcuts and the order of expanded options.
  for (const value of saved.view.timeframeOrder || []) {
    const button = [...document.querySelectorAll("[data-timeframe]")].find(item => item.dataset.timeframe === value);
    if (button?.parentElement === advancedIntervals) advancedIntervals.append(button);
    else if (button) advancedToggle.parentElement.insertBefore(button, advancedToggle);
  }
  document.querySelectorAll("[data-chart-type]").forEach(button => button.classList.toggle("active", button.dataset.chartType === chartType));
  const indicators = { sma: showSMA, ema: showEMA, bb: showBollinger, volume: showVolume };
  document.querySelectorAll("[data-indicator]").forEach(button => button.classList.toggle("active", indicators[button.dataset.indicator]));
  if (saved.view.mobileChart) openMobileChart(saved.view.drawingTools);
  else setDrawingToolsOpen(saved.view.drawingTools, { persist: false });
  activeTool = saved.state.activeTool;
  updateDrawingToolButtons();
  canvas.style.cursor = activeTool ? "crosshair" : "grab";
  updateDrawingActions();
  restoreReloadDetails(saved.view.details);
  if (saved.view.calendar && appMode === "daily") {
    renderDailyCalendar();
    openAccessibleModal(dailyCalendarModal);
  }
  syncNextChartButton();
  resizeChartCanvas();
  drawChart();
  requestAnimationFrame(() => {
    window.scrollTo({ left: saved.view.scrollX, top: saved.view.scrollY, behavior: "instant" });
    if (predictionPanel) predictionPanel.scrollTop = saved.view.panelScroll;
  });
  resumeReloadedRound(saved);
  if (appMode === "packs" && packChartActive && !packDataVerified) showEventPackUnavailable();
  return true;
}

function resumeReloadedRound(saved) {
  if (appMode === "ranked") {
    if (liveRound) {
      liveRound.requestId = chartRequestId;
      liveRound.button = [...document.querySelectorAll("#choices button")].find(button => button.dataset.choice === liveRound.choice);
      syncLiveClock();
      if (!liveRound.resolved && !liveRound.failed) {
        liveClockTimer = setInterval(syncLiveClock, 1000);
        if (liveRound.choice && !liveRound.expired) {
          const round = liveRound;
          const wait = Math.max(0, round.targetEnd * 1000 - Date.now() - round.clockOffset + 1500);
          livePollTimer = setTimeout(() => resolveLivePrediction(round), wait);
        }
      }
    } else if (liveMarketClosed) scheduleLiveMarketCheck(liveMarketSymbol, chartRequestId);
  }
  if (appMode === "daily" && saved.reconcileDaily) loadDailyPuzzle();
}

window.getPretiumAIContext = function () {
  if (appMode === "account") return { page: "account" };
  if (appMode === "news") {
    const article = window.MarketPulseNews?.activeArticle();
    return article ? { page: "news", article } : { page: "news" };
  }
  if (appMode === "paper" || isEventPackPaper() || appMode === "quant") {
    const paper = appMode !== "quant";
    const quote = paper ? paperTradingQuote() : null;
    const portfolio = paper ? paperPortfolioSummary() : null;
    return {
      page: paper ? "paper" : "quant",
      ...(rawCandles.length ? { ticker: currentSymbol.ticker, timeframe,
        bars: chartSeriesForMode().slice(-12).map(bar => [bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume ?? null])
      } : {}),
      ...(paper ? {
        simulation: isEventPackPaper() ? "Historical replay" : "Paper trading",
        cash: portfolio.cash, equity: portfolio.equity, realized: portfolio.realized, unrealized: portfolio.unrealized,
        ...(quote && quote.ticker === currentSymbol.ticker && Number.isFinite(quote.price) && Number.isFinite(quote.quoteTime)
          ? { quote: quote.price, quoteTime: quote.quoteTime } : {}),
      } : {}),
    };
  }
  if (["free", "daily", "ranked", "speed", "packs", "review"].includes(appMode)) {
    return { page: "chart", ...(["free", "review", "packs"].includes(appMode) && revealed && rawCandles.length
      ? { ticker: currentSymbol.ticker, timeframe,
          bars: chartSeriesForMode().filter(bar => !bar.future).slice(-12)
            .map(bar => [bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume ?? null]) }
      : {}) };
  }
  if (appMode === "learn") return { page: "learn" };
  if (appMode === "home") {
    const account = paperTradingAccount();
    if (account.orders?.length || Object.keys(account.positions || {}).length) {
      const { cash, equity, realized, unrealized } = paperPortfolioSummary();
      return { page: "home", cash, equity, realized, unrealized };
    }
  }
  return { page: appMode === "home" ? "home" : "other" };
};

window.navigatePretiumAIFeature = function (feature) {
  const mode = feature === "practice" ? "free" : ["news", "paper"].includes(feature) ? feature : "";
  const control = mode && document.querySelector(`.nav[data-mode="${mode}"]`);
  if (!control) return false;
  control.click();
  return true;
};

function renderModeSurface() {
  document.dispatchEvent(new Event("pretium-ai:context"));
  const displayMode = appMode;
  if (typeof renderRankedCoins === "function") renderRankedCoins();
  setPaperLedgerOpen(false);
  paperLedger.hidden = !(appMode === "paper" || isEventPackPaper());
  saveNavigationPage();
  document.body.classList.toggle("prediction-mode",
    ["free", "ranked", "daily"].includes(displayMode)
    || (displayMode === "packs" && packChartActive && !isEventPackPaper())
    || (displayMode === "review" && reviewChartActive));
  updateBreadcrumb();
  settingsShortcut?.setAttribute("aria-current", displayMode === "account" ? "page" : "false");
  document.body.classList.toggle("learn-mode", displayMode === "learn");
  document.body.classList.toggle("home-mode", displayMode === "home");
  document.body.classList.toggle("free-mode", displayMode === "free" || displayMode === "ranked");
  syncAdvancedIntervalsLayout();
  document.body.classList.toggle("daily-mode", displayMode === "daily");
  document.body.classList.toggle("news-mode", displayMode === "news");
  document.body.classList.toggle("paper-mode", displayMode === "paper" || isEventPackPaper());
  document.body.classList.toggle("paper-chart-open", displayMode === "paper" && Boolean(paperChartSymbol));
  document.body.classList.toggle("quant-mode", displayMode === "quant");
  document.body.classList.toggle("quant-landing", displayMode === "quant" && quantView === "landing");
  document.body.classList.toggle("quant-build", displayMode === "quant" && quantView === "build");
  document.body.classList.toggle("account-mode", displayMode === "account");
  document.body.classList.toggle("review-mode", displayMode === "review");
  document.body.classList.toggle("packs-mode", displayMode === "packs");
  document.body.classList.toggle("packs-home", displayMode === "packs" && !packChartActive);
  document.body.classList.toggle("review-empty", displayMode === "review" && !reviewChartActive);
  document.querySelectorAll("[data-timeframe], #advancedToggle").forEach(control => {
    if (isEventPackPaper()) { control.disabled = true; control.dataset.packPaperLocked = "true"; }
    else if (control.dataset.packPaperLocked) { control.disabled = false; delete control.dataset.packPaperLocked; }
  });
  setPracticeControlsLocked(isEventPackPaper() || appMode === "daily");
  if (appMode !== "daily") {
    document.querySelectorAll("[data-daily-timeframe-locked]").forEach(control => {
      control.disabled = false;
      control.removeAttribute("data-daily-timeframe-locked");
    });
  }
  const nextButton = document.getElementById("nextBtn");
  syncNextChartButton();
  syncReviewControls();
  if (nextButton.hidden && appMode !== "daily") document.getElementById("choices").innerHTML = "";
  if (appMode === "home") {
    renderHome();
  } else if (appMode === "free") {
    modeSurface.innerHTML = freePlayRandomizerHtml(freePlayRandomSettings, freeRandomizerExpanded, freePlaySettingsExpanded, instrumentSearchQueries.free);
  } else if (appMode === "ranked") {
    modeSurface.innerHTML = `<div class="mode-row"><strong>Ranked</strong><span>1-minute live candles</span></div>
      ${livePuzzleControlsHtml()}`;
    if (liveRound) { setLivePuzzleStatus(liveRound.status || ""); syncLiveClock(); }
  } else if (appMode === "paper") {
    renderPaperTrading();
  } else if (appMode === "quant") {
    renderQuantLab();
  } else if (appMode === "daily") {
    if (!dailyRound) clearPracticeChoices();
    const today = dailyToday();
    const completedToday = isDailyComplete(today);
    const archiveUnlocked = isArchiveUnlocked();
    const completed = isDailyComplete(selectedDailyDate);
    modeSurface.innerHTML = `<div class="mode-row"><strong>Daily</strong><span>${selectedDailyDate === today ? completedToday ? "Completed today" : "Ready" : selectedDailyDate}</span></div>
      <label class="date-control"><span>Practice date archive${archiveUnlocked ? "" : " (locked)"}</span><input id="dailyDate" type="date" min="${dailyState.firstDate || today}" max="${today}" value="${selectedDailyDate}" ${archiveUnlocked ? "" : "disabled"} /></label>
      <div class="mode-actions daily-actions"><button data-action="daily-start" ${dailyRound?.busy ? "disabled" : ""}>${completed ? "Review Daily Puzzle" : "Start Daily Puzzle"}</button><button data-action="daily-calendar" ${archiveUnlocked ? "" : "disabled"}>Open calendar</button></div>`;
    document.querySelectorAll("[data-timeframe]").forEach(control => {
      control.disabled = true;
      control.dataset.dailyTimeframeLocked = "true";
      control.classList.toggle("active", control.dataset.timeframe === (dailyRound?.data.timeframe || "3M"));
    });
    syncAdvancedIntervalsLayout(dailyRound?.data?.timeframe || "3M");
  } else if (appMode === "review") {
    renderReview();
  } else if (appMode === "learn") {
    renderLearn();
  } else if (appMode === "news") {
    renderNews();
  } else if (appMode === "account") {
    renderAccountPage();
  } else if (appMode === "packs") {
    revealTag.textContent = "";
    renderEventPacks();
  }
  syncInstrumentSearch(modeSurface.querySelector(".free-instrument-search"));
  updatePredictionPanelScroll();
}

document.getElementById("homeLogo")?.addEventListener("click", () => setMode("home"));
function setMode(mode, options = {}) {
  if (appMode === "ranked" && rankedRoundCommitted()) {
    showToast("You have bought into this Ranked round. Finish it before switching pages or charts.");
    return Promise.resolve(false);
  }
  if (!Object.hasOwn(modes, mode)) mode = "home";

  stopEventPackPlayback();
  closeSymbolResults({ focus: false, instant: true });
  setMobileChartSearchOpen(false);
  if (typeof refundRankedRound === "function" && refundRankedRound() === false) return Promise.resolve(false);
  chartRequestId += 1;
  searchRequestId += 1;
  if (appMode === "daily" || mode === "daily") {
    dailyRound = null;
    rawCandles = [];
    latestSeries = [];
  }
  if (mode === "daily") selectedDailyDate = new Date().toISOString().slice(0, 10);
  if (liveRound) { rawCandles = []; latestSeries = []; }
  cancelLivePuzzle();
  document.querySelectorAll('[data-timeframe]').forEach(control => {
    control.disabled = false;
    control.classList.toggle("active", mode === "ranked"
      ? [liveInterval, liveHistory].includes(control.dataset.timeframe) : control.dataset.timeframe === timeframe);
  });
  if (!["home", "account"].includes(mode)) lastProductMode = mode;
  if (mode === "news" && appMode !== "news") selectedNewsTopics.clear();
  if (appMode === "quant") { captureQuantDraft(); flushQuantDraftSave(); }
  if (mode === "quant" && appMode !== "quant") quantView = "landing";
  appMode = mode;
  if (mode === "packs") { packChartActive = false; activePackWindow = null; }
  if (appMode !== "packs") activePackWindow = null;
  if (appMode === "review") {
    resetReviewPatternHint();
    reviewChartActive = false;
    activeReviewRecordId = "";
    activeReviewRound = "";
    activeReviewAnswer = "";
  }
  if (appMode !== "paper") paperChartSymbol = "";
  if (appMode !== "quant") quantBacktest = null;
  const activeNav = [...document.querySelectorAll(".nav")].find(nav =>
    nav.dataset.mode === mode
  ) || document.querySelector(`.nav[data-mode="${mode}"]`);
  document.querySelectorAll(".nav").forEach(nav => nav.classList.toggle("active", nav === activeNav));
  let activeFolder = activeNav?.closest(".nav-folder");
  while (activeFolder) {
    activeFolder.open = true;
    activeFolder = activeFolder.parentElement?.closest(".nav-folder") || null;
  }
  document.body.classList.remove("mobile-nav-open");
  document.getElementById("mobileNavToggle")?.setAttribute("aria-expanded", "false");
  const mobileToggleMark = document.querySelector("#mobileNavToggle b");
  if (mobileToggleMark) mobileToggleMark.textContent = "+";
  document.getElementById("modeLabel").textContent = mode === "free" ? "FREE PLAY" : mode === "daily" ? "DAILY" : mode.toUpperCase();
  renderModeSurface();
  if (mode === "home") dockSidePanel();
  if (options.loadChart) return loadModeChart(mode);
  return Promise.resolve();
}

function resetDrawingGesture() {
  dragging = false;
  pendingToolStart = null;
  draftDrawing = null;
  brushPoints = [];
  eraserGesture = null;
}

function updateDrawingActions() {
  document.getElementById("undoDrawing").disabled = drawingHistory.length === 0;
  document.getElementById("clearDrawings").disabled = drawings.length === 0;
}

function commitDrawings(nextDrawings) {
  drawingHistory.push(drawings.slice());
  if (drawingHistory.length > 100) drawingHistory.shift();
  drawings = nextDrawings;
  updateDrawingActions();
  if (typeof saveAccountDocument === "function") saveAccountDocument("workspace");
}

function undoDrawingChange() {
  if (!drawingHistory.length) return;
  drawings = drawingHistory.pop();
  resetDrawingGesture();
  updateDrawingActions();
  drawChart();
  if (typeof saveAccountDocument === "function") saveAccountDocument("workspace");
}

function clearAllDrawings() {
  resetDrawingGesture();
  if (drawings.length) commitDrawings([]);
  drawChart();
}

function updateDrawingToolButtons() {
  canvas.classList.toggle("eraser-active", activeTool === "delete");
  document.querySelectorAll("[data-tool]").forEach(button => {
    const selected = activeTool ? button.dataset.tool === activeTool : button.dataset.tool === "cursor";
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function armDrawingTool(tool) {
  const toolButton = document.querySelector(`[data-tool="${tool}"]`);
  if (!toolButton) return;
  const nextTool = tool === "cursor" ? null : tool;
  activeTool = nextTool;
  resetDrawingGesture();
  updateDrawingToolButtons();
  canvas.style.cursor = activeTool ? "crosshair" : "grab";
  chartPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
  drawChart();
}

async function handlePracticePlanAction(action) {
  if (action === "start-drill") {
    await setMode("review", { loadChart: false });
    const firstMiss = mistakeRecords()[0];
    if (firstMiss) await openReviewRecord(firstMiss.parentId || firstMiss.id, firstMiss.round);
    else showToast("Review opened. Missed charts will appear after practice.");
    return;
  }
  if (action === "open-review") {
    await setMode("review", { loadChart: false });
    modeSurface.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Review workspace opened.");
    return;
  }
  if (action === "arm-ruler") {
    armDrawingTool("measure");
    return;
  }
  if (action === "clear-drawings") {
    clearAllDrawings();
  }
}

function viewport(data) {
  const lineChart = chartType === "line";
  const lowFor = bar => lineChart ? bar.close : bar.low;
  const highFor = bar => lineChart ? bar.close : bar.high;
  const visibleCount = Math.max(24, Math.round(data.length / zoom));
  const maxPan = Math.max(0, data.length - visibleCount);
  pan = Math.max(0, Math.min(maxPan, pan));
  const start = Math.round(pan);
  const end = Math.min(data.length, start + visibleCount);
  const visible = data.slice(start, end).filter(bar => revealed || !bar.future);
  const boundedPrices = appMode !== "paper" && appMode !== "quant";
  const known = boundedPrices ? data.filter(bar => revealed || !bar.future) : [];
  const basis = visible.length ? visible : known.length ? known : data.slice(start, end);
  const baseMin = Math.min(...basis.map(lowFor));
  const baseMax = Math.max(...basis.map(highFor));
  const observedRange = baseMax - baseMin;
  const baseRange = lineChart && observedRange > 0 ? observedRange
    : Math.max(observedRange, Math.abs((baseMin + baseMax) / 2) * .001, .000001);
  let range = baseRange * priceScale;
  let lowerBound;
  let upperBound;
  if (boundedPrices) {
    // Puzzle navigation stays inside known prices across the loaded interval.
    // Hidden future candles must not influence either limit before the reveal.
    const bounds = known.length ? known : basis;
    const low = Math.min(...bounds.map(lowFor));
    const high = Math.max(...bounds.map(highFor));
    const fullRange = lineChart && high > low ? high - low
      : Math.max(high - low, Math.abs((low + high) / 2) * .001, .000001);
    const padding = (fullRange - (high - low)) / 2;
    lowerBound = low - padding;
    upperBound = high + padding;
    range = Math.min(range, fullRange);
    priceScale = range / baseRange;
  }
  const rangePadding = (range - observedRange) / 2;
  const minOffset = boundedPrices ? lowerBound - baseMin + rangePadding : -range * 3;
  const maxOffset = boundedPrices ? upperBound - baseMax - rangePadding : range * 3;
  priceOffset = Math.max(minOffset, Math.min(maxOffset, priceOffset));
  const min = baseMin - rangePadding + priceOffset;
  const max = baseMax + rangePadding + priceOffset;
  const pad = { left: chartWidth < 520 ? 52 : 68, right: chartWidth < 520 ? 14 : 76, top: 34, bottom: showVolume ? 96 : 50 };
  const width = chartWidth - pad.left - pad.right;
  const height = chartHeight - pad.top - pad.bottom;
  // Ranked already includes its next-candle slot in data. Extra timeline slots
  // made history stop short of the border and disagreed with zoom/pan anchors.
  // Lines span point-to-point; candle bodies keep their centered time slots.
  const pointInset = lineChart && end - start > 1 ? 0 : .5;
  const xStep = width / Math.max(end - start - (pointInset === 0 ? 1 : 0), 1);
  const y = v => pad.top + ((max - v) / range) * height;
  const xFor = i => pad.left + (i - start + pointInset) * xStep;
  return { start, end, min, max, pad, width, height, xStep, pointInset, y, xFor, windowed: data.slice(start, end) };
}

function formatCitationDate(bar) {
  if (bar?.challengeIndex) return `Candle ${bar.challengeIndex}`;
  if (!bar?.date) return "";
  if (typeof isEventPackPaper === "function" && isEventPackPaper()) return bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  const intraday = (typeof liveRound !== "undefined" && liveRound && appMode === "ranked") || ["1D", "5D", "1W", "2W", "1m", "2m", "3m", "5m", "10m", "15m", "30m", "45m", "1h", "2h", "3h", "4h"].includes(timeframe);
  return intraday
    ? bar.date.toLocaleString(globalThis.siteI18n?.locale, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric", year: "numeric",
      ...(["1w", "1mo", "3mo", "6mo", "12mo", "All"].includes(timeframe) ? { timeZone: "UTC" } : {}) });
}

function updateChartCitation(data) {
  if (!chartCitation) return;
  if (!data.length || chartMetadataUnavailable()) {
    setLoadingText(chartCitation, "Loading…");
    return;
  }
  const first = data[0];
  const observedEnd = data[0]?.observedEnd ?? Math.floor(data.length * .64);
  const cutoff = data[Math.max(0, observedEnd - 1)] || first;
  const last = data.at(-1) || cutoff;
  if (first.indexedPrice) {
    chartCitation.textContent = `Chart: ${currentSymbol.ticker} | ${timeframe} | indexed prices (start = 100) | dates and volume hidden until reveal`;
    if (!first.challengeIndex) chartCitation.textContent = `Chart: ${currentSymbol.ticker} | ${timeframe} | ${formatCitationDate(first)} - ${formatCitationDate(last)} | indexed prices (start = 100); volume hidden until reveal`;
    return;
  }
  if (typeof liveRound !== "undefined" && liveRound && appMode === "ranked") {
    chartCitation.textContent = `Live: ${currentSymbol.ticker} | ${liveInterval} | ${liveHistory} history | ${formatCitationDate(first)} - ${formatCitationDate(cutoff)} | ${liveRound.source}`;
    return;
  }
  if (appMode === "packs" && packPracticeMode === "paper") {
    chartCitation.textContent = `Chart: ${currentSymbol.ticker} | ${timeframe} | ${formatCitationDate(first)} - ${formatCitationDate(last)} | historical replay`;
    return;
  }
  if (!data.some(bar => bar.future)) {
    chartCitation.textContent = `Chart: ${currentSymbol.ticker} | ${timeframe} | ${formatCitationDate(first)} - ${formatCitationDate(last)} | latest available`;
    return;
  }
  chartCitation.textContent = `Chart: ${currentSymbol.ticker} | ${timeframe} | ${formatCitationDate(first)} - ${formatCitationDate(last)} | hidden after ${formatCitationDate(cutoff)}`;
}

function formatDate(bar) {
  if (bar?.challengeIndex) return `Candle ${bar.challengeIndex}`;
  if (!bar?.date) return "";
  if (typeof isEventPackPaper === "function" && isEventPackPaper()) return bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { year: "2-digit", month: "short", day: "numeric", timeZone: "UTC" });
  if ((typeof liveRound !== "undefined" && liveRound && appMode === "ranked") || ["1D", "5D", "1W", "2W", "1m", "2m", "3m", "5m", "10m", "15m", "30m", "45m", "1h", "2h", "3h", "4h"].includes(timeframe)) {
    return bar.date.toLocaleString(globalThis.siteI18n?.locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  return bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric", year: "2-digit",
    ...(["1w", "1mo", "3mo", "6mo", "12mo", "All"].includes(timeframe) ? { timeZone: "UTC" } : {}) });
}

function niceStep(rawStep) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const base = rawStep / (10 ** exponent);
  const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 2.5 ? 2.5 : base <= 5 ? 5 : 10;
  return niceBase * (10 ** exponent);
}

function axisDecimals(step) {
  if (step >= 100) return 0;
  if (step >= 1) return 2;
  if (step >= 0.01) return 3;
  return 4;
}

function formatAxisPrice(value, step) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: axisDecimals(step),
    maximumFractionDigits: axisDecimals(step)
  });
}

function formatAxisTime(bar, previousBar) {
  if (bar?.challengeIndex) return `#${bar.challengeIndex}`;
  if (!bar?.date) return "";
  if (typeof isEventPackPaper === "function" && isEventPackPaper()) return bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric", timeZone: "UTC" });
  if (["1w", "1mo", "3mo", "6mo", "12mo", "All"].includes(timeframe)) {
    return bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  const intraday = ["1D", "5D", "1W", "2W", "1m", "2m", "3m", "5m", "10m", "15m", "30m", "45m", "1h", "2h", "3h", "4h"].includes(timeframe);
  const newYear = previousBar?.date && bar.date.getFullYear() !== previousBar.date.getFullYear();
  const newMonth = previousBar?.date && bar.date.getMonth() !== previousBar.date.getMonth();
  if (intraday) {
    const date = bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric" });
    const time = bar.date.toLocaleTimeString(globalThis.siteI18n?.locale, { hour: "numeric", minute: "2-digit" });
    return newMonth || !previousBar ? `${date} ${time}` : time;
  }
  if (newYear || !previousBar) return bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", year: "2-digit" });
  if (newMonth) return bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { month: "short", day: "numeric" });
  return bar.date.toLocaleDateString(globalThis.siteI18n?.locale, { day: "numeric" });
}

function drawAxes(view) {
  const gridRight = chartWidth - view.pad.right;
  const gridBottom = chartHeight - view.pad.bottom;
  const gridLeft = view.pad.left;
  const top = view.pad.top;
  const range = Math.max(view.max - view.min, 0.0001);
  const majorStep = niceStep(range / 9);
  const minorStep = majorStep / 2;
  const firstMajor = Math.ceil(view.min / majorStep) * majorStep;
  const firstMinor = Math.ceil(view.min / minorStep) * minorStep;
  ctx.save();
  ctx.strokeStyle = cssVar("--line");
  ctx.lineWidth = 1.25;
  ctx.strokeRect(gridLeft, top, view.width, view.height);
  ctx.font = "800 11px Georgia, serif";
  ctx.textBaseline = "middle";
  for (let value = firstMinor; value <= view.max + minorStep / 2; value += minorStep) {
    const yy = view.y(value);
    if (yy < top || yy > gridBottom) continue;
    const major = Math.abs(value / majorStep - Math.round(value / majorStep)) < 0.001;
    ctx.strokeStyle = major ? cssVar("--line") : "rgba(125, 137, 150, .18)";
    ctx.lineWidth = major ? 1 : .75;
    ctx.beginPath();
    ctx.moveTo(gridLeft, yy);
    ctx.lineTo(gridRight, yy);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = cssVar("--chart-axis-number");
      ctx.textAlign = "right";
      ctx.fillText(formatAxisPrice(value, majorStep), gridLeft - 10, yy);
      ctx.textAlign = "left";
      if (chartWidth >= 520) ctx.fillText(formatAxisPrice(value, majorStep), gridRight + 10, yy);
      ctx.strokeStyle = "rgba(125, 137, 150, .38)";
      ctx.beginPath();
      ctx.moveTo(gridRight, yy);
      ctx.lineTo(gridRight + 5, yy);
      ctx.stroke();
    }
  }
  const visibleBars = Math.max(1, view.end - view.start);
  const targetLabels = Math.max(2, Math.min(13, Math.floor(view.width / 86)));
  const step = Math.max(1, Math.round(visibleBars / targetLabels));
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  ctx.font = "800 10.5px Georgia, serif";
  for (let i = view.start; i < view.end; i += step) {
    const bar = latestSeries[i];
    if (!bar) continue;
    const x = view.xFor(i);
    const previous = latestSeries[Math.max(view.start, i - step)];
    const strongBoundary = !previous || bar.date?.getMonth() !== previous.date?.getMonth() || bar.date?.getFullYear() !== previous.date?.getFullYear();
    ctx.strokeStyle = strongBoundary ? "rgba(47, 129, 120, .42)" : "rgba(125, 137, 150, .22)";
    ctx.lineWidth = strongBoundary ? 1.1 : .75;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, gridBottom);
    ctx.stroke();
    ctx.fillStyle = strongBoundary ? cssVar("--chart-axis-strong") : cssVar("--chart-axis-time");
    ctx.fillText(formatAxisTime(bar, previous), x, chartHeight - 18);
    ctx.strokeStyle = "rgba(125, 137, 150, .42)";
    ctx.beginPath();
    ctx.moveTo(x, gridBottom);
    ctx.lineTo(x, gridBottom + 5);
    ctx.stroke();
  }
  const last = latestSeries[Math.max(view.start, view.end - 1)];
  const first = latestSeries[view.start];
  ctx.fillStyle = cssVar("--chart-symbol-label");
  ctx.textAlign = "left";
  ctx.font = "900 11px Georgia, serif";
  if (view.width >= 340) ctx.fillText(globalThis.siteI18n?.t(`Range: ${formatDate(first)} - ${formatDate(last)}`) ?? `Range: ${formatDate(first)} - ${formatDate(last)}`, gridLeft + 118, 18, view.width - 118);
  ctx.restore();
}

function drawGamifyFutureClouds(left, top, width, height, field) {
  if (width <= 0 || height <= 0) return;
  const dispersal = field.dispersal || 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();

  // Opaque backing is independent of cloud spacing and motion: no price can leak.
  // Once revealed, let the sky clear while the banks drift out from the middle.
  const opacity = ctx.globalAlpha;
  ctx.globalAlpha = opacity * Math.max(0, 1 - dispersal * 4);
  ctx.fillStyle = "#dbe5f5";
  ctx.fillRect(left, top, width, height);
  ctx.globalAlpha = opacity * Math.min(1, (1 - dispersal) * 4);
  // Stable, individually varied banks replace the mirrored screenshot tiles.
  // Coordinates remain attached to the observed chart when panning or zooming.
  const noise = (x, y, salt) => {
    const value = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const motion = drawGamifyFutureClouds.motion;
  const weather = drawGamifyFutureClouds.weather;
  cloudWeatherArt.beginFrame(weather);
  // Interaction redraws reuse the last animation frame instead of advancing drift.
  const time = field.time ?? (motion && !motion.media.matches ? (motion.time || 0) : 0);
  const polygon = points => {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
  };
  for (let layer = 0; layer < 2; layer += 1) {
    const scale = field.scale * Math.min(1, Math.max(.4, chartWidth / 900)) * (layer ? 1 : 1.35);
    const stepX = 170 * scale * (weather?.spacing || 1), stepY = 125 * scale * (weather?.spacing || 1);
    // Include the full rotated bank and bounded drift beyond every clip edge.
    const margin = 260 * scale;
    const firstColumn = Math.floor((left - field.x - margin) / stepX);
    const lastColumn = Math.ceil((left + width - field.x + margin) / stepX);
    const firstRow = Math.floor((top - field.y - margin) / stepY);
    const lastRow = Math.ceil((top + height - field.y + margin) / stepY);
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const n = salt => noise(column, row, salt + layer * 17);
        const phase = n(1) * Math.PI * 2;
        const angle = -.58 + n(6) * .16;
        const stretchX = .75 + n(4) * .65, stretchY = .85 + n(5) * .35;
        // Move along each bank's painted axis, including its unequal x/y scale.
        const drift = time ? Math.sin(time * .12 * (weather?.wind || 1) + phase) * 16 : 0;
        const driftX = Math.cos(angle) * stretchX * drift;
        const driftY = Math.sin(angle) * stretchY * drift;
        let x = field.x + (column + n(2) * .9) * stepX + driftX * scale;
        let y = field.y + (row + n(3) * .85) * stepY + driftY * scale;
        if (dispersal) {
          const direction = x < left + width / 2 ? -1 : 1;
          const travel = direction * (width / 2 + margin) * (1 - (1 - dispersal) ** 2);
          x += travel;
          y += travel * Math.tan(angle) * stretchY / stretchX;
        }
        if (x + margin < left || x - margin > left + width || y + margin < top || y - margin > top + height) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale * stretchX, scale * stretchY);
        ctx.rotate(angle);
        const crown = -44 - n(7) * 22, shoulder = -22 - n(8) * 16;
        const points = [[-110, -8], [-99, -20], [-64, -20], [-64, shoulder],
          [-52, shoulder - 12], [-17, shoulder - 12], [-17, crown + 10], [-6, crown],
          [34, crown], [47, crown + 13], [47, -26], [77, -26], [90, -13],
          [90, 1], [112, 1], [124, 13], [124, 30], [110, 44], [65, 44],
          [54, 55], [12, 55], [1, 44], [-48, 44], [-60, 33], [-96, 33], [-110, 19]];
        if (weather?.storm) {
          cloudWeatherArt.recordBank(`${layer}:${row}:${column}`, x, y, scale, stretchX, stretchY, angle, points);
        }
        // Narrow blue/lavender undersides give the white, chamfered tops depth.
        ctx.save();
        ctx.translate(3, 9);
        polygon(points);
        ctx.fillStyle = layer ? "#bccde7" : "#c4d3ea";
        ctx.fill();
        ctx.restore();
        polygon(points);
        const face = ctx.createLinearGradient(0, crown, 30, 55);
        face.addColorStop(0, layer ? "#ffffff" : "#f4f7ff");
        face.addColorStop(.65, layer ? "#f8fbff" : "#eaf0fb");
        face.addColorStop(1, layer ? "#e2eafa" : "#dbe5f5");
        ctx.fillStyle = face;
        ctx.fill();
        polygon([[1, 44], [12, 32], [54, 32], [65, 21], [110, 21], [124, 13],
          [124, 30], [110, 44], [65, 44], [54, 55], [12, 55]]);
        ctx.fillStyle = layer ? "#e0e9f8" : "#d7e2f3";
        ctx.fill();
        ctx.restore();
      }
    }
  }
  if (weather) {
    ctx.globalAlpha *= 1 - dispersal;
    drawCloudWeatherEffects(left, top, width, height, weather, time);
  }
  ctx.restore();
}

const cloudWeatherArt = (() => {
  const state = { kind: null, started: 0, last: 0, cloudBanks: [], anchorSlots: new Map() };
  // Hidden-region dimensions measured at the desktop playback reference.
  const motionReference = { width: 412, height: 648 };
  const media = { matches: true };
  const seed = (i, salt = 0) => {
    const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const wrap = (value, extent) => ((value % extent) + extent) % extent;

  function beginFrame(weather) {
    if (!weather) {
      state.kind = null;
      state.anchorSlots.clear();
    }
    if (weather?.storm) state.cloudBanks = [];
  }
  function recordBank(key, x, y, scale, stretchX, stretchY, angle, points) {
    const world = ([px, py]) => [
      x + scale * stretchX * (Math.cos(angle) * px - Math.sin(angle) * py),
      y + scale * stretchY * (Math.sin(angle) * px + Math.cos(angle) * py)
    ];
    state.cloudBanks.push({
      key, face: points.map(world),
      shadow: points.map(([px, py]) => world([px + 3, py + 9])),
      origins: [[27, 63.4], [45, 63.4], [-24, 52.4], [86, 52.4]].map(world)
    });
  }

  function drawRain(left,top,width,height,time,storm) {
    const count = storm ? 100 : 65;
    const motionX = (width + 40) / (motionReference.width + 40);
    const motionY = (height + 60) / (motionReference.height + 60);
    ctx.lineCap = 'round';
    for (let i=0;i<count;i++) {
      const depth = seed(i,4), length = 6 + depth * (storm ? 24 : 17);
      const speed = 250 + seed(i,8)*210;
      const y = top + wrap(seed(i,3)*(height+60)+time*speed*motionY,height+60)-30;
      const x = left + wrap(seed(i,5)*(width+40)-time*speed*.24*motionX,width+40)-20;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-length*.24,y+length);
      ctx.lineWidth = .75 + depth * 1.05;
      ctx.strokeStyle = storm ? `rgba(211,227,255,${.2+depth*.42})` : `rgba(75,119,172,${.28+depth*.43})`;
      ctx.stroke();
      if (depth>.8) {
        ctx.strokeStyle = 'rgba(239,248,255,.52)';ctx.lineWidth=.55;ctx.stroke();
      }
    }
  }

  function drawSnow(left,top,width,height,time) {
    const motionX = (width + 24) / (motionReference.width + 24);
    const motionY = (height + 28) / (motionReference.height + 28);
    for (let i=0;i<58;i++) {
      const type=i%4, depth=seed(i,9), radius=type===0 ? 1.1+depth*1.2 : 2.6+depth*3.3;
      const speed=12+depth*23;
      const x=left+wrap(seed(i,2)*(width+24)+(Math.sin(time*.5+i)*8+time*(2+depth*3))*motionX,width+24)-12;
      const y=top+wrap(seed(i,6)*(height+28)+time*speed*motionY,height+28)-14;
      ctx.save();ctx.translate(x,y);ctx.rotate(seed(i,1)*Math.PI+time*(depth-.5)*.13);
      ctx.globalAlpha=.65+depth*.35;ctx.fillStyle='#ffffff';ctx.strokeStyle='rgba(106,139,182,.8)';ctx.lineWidth=.85;
      ctx.beginPath();
      if (type===0) { ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.stroke(); }
      else if (type===1) {
        ctx.moveTo(0,-radius);ctx.lineTo(radius*.7,0);ctx.lineTo(0,radius);ctx.lineTo(-radius*.7,0);ctx.closePath();ctx.fill();ctx.stroke();
      } else if (type===2) {
        for(let j=0;j<8;j++) {const a=j*Math.PI/4,r=j%2 ? radius*.42 : radius;const x=Math.cos(a)*r,y=Math.sin(a)*r;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}
        ctx.closePath();ctx.fill();ctx.stroke();
      } else {
        for(let j=0;j<6;j++) {
          const a=j*Math.PI/3,ux=Math.cos(a),uy=Math.sin(a);
          ctx.moveTo(0,0);ctx.lineTo(ux*radius,uy*radius);
          for(const side of [-1,1]) {
            ctx.moveTo(ux*radius*.55,uy*radius*.55);
            const ba=a+side*.8;ctx.lineTo(ux*radius*.55+Math.cos(ba)*radius*.35,uy*radius*.55+Math.sin(ba)*radius*.35);
          }
        }
        ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(111,142,181,.78)';ctx.lineWidth=2.4;ctx.stroke();
        ctx.strokeStyle='#ffffff';ctx.lineWidth=1.15;ctx.stroke();
      }
      ctx.restore();
    }
  }

  const bolts = new Map();
  function boltGeometry(id) {
    if (bolts.has(id)) return bolts.get(id);
    const pts=[[0,0]];
    for(let j=1;j<=24;j++) pts.push([(seed(j,id+20)-.5)*.15+j*.0015,j/24]);
    const paths=[{points:pts,weight:1}];
    for(const index of [5,11,17]) {
      const start=pts[index],side=seed(index,id+6)>.5?1:-1,points=[start];
      for(let j=1;j<=6;j++) points.push([start[0]+side*j*.018+(seed(j,id+index)-.5)*.035,start[1]+j*.026]);
      paths.push({points,weight:.43});
    }
    bolts.set(id,paths);return paths;
  }
  function drawBolt(x,y,width,height,id,alpha,progress,flash) {
    ctx.save();ctx.globalAlpha=alpha;
    // The light follows the bolt itself; no circular emitter at its cloud root.
    ctx.lineCap='butt';ctx.lineJoin='round';
    for (const path of boltGeometry(id)) {
      const segments=[];
      for(let i=1;i<path.points.length;i++) {
        const a=path.points[i-1],b=path.points[i];
        if(a[1]>=progress) break;
        const fraction=Math.min(1,(progress-a[1])/(b[1]-a[1]));
        segments.push({a,b:[a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction],index:i});
      }
      if(!segments.length) continue;
      ctx.beginPath();ctx.moveTo(x+segments[0].a[0]*width,y+segments[0].a[1]*height);
      segments.forEach(({b})=>ctx.lineTo(x+b[0]*width,y+b[1]*height));
      ctx.strokeStyle='rgba(255,174,25,.16)';ctx.lineWidth=(15+flash*5)*path.weight;ctx.stroke();
      ctx.strokeStyle='rgba(255,213,58,.6)';ctx.lineWidth=(6+flash*2)*path.weight;ctx.stroke();
      for(const {a,b,index} of segments) {
        ctx.beginPath();ctx.moveTo(x+a[0]*width,y+a[1]*height);ctx.lineTo(x+b[0]*width,y+b[1]*height);
        ctx.lineWidth=Math.max(.35,(2.8-index/path.points.length*2+flash*.8)*path.weight);ctx.strokeStyle='#fff29a';ctx.stroke();
      }
    }
    ctx.restore();
  }
  function insideCloud(point,polygon) {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const a=polygon[i],b=polygon[j];
      if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function boltBounds(origin,span,id) {
    const xs=boltGeometry(id).flatMap(path=>path.points.map(p=>origin[0]+p[0]*span));
    // Includes all branches, the widest flash glow, and a small drift allowance.
    return {left:Math.min(...xs)-13,right:Math.max(...xs)+13};
  }
  function separateBounds(a,b) {return a.right<b.left||b.right<a.left;}
  function cloudOrigin(slot,target,left,top,width,height,span,id,avoid) {
    const banks=state.cloudBanks;
    state.anchorSlots ||= new Map();
    const clear=point=>avoid.every(other=>separateBounds(boltBounds(point,span,id),other));
    const saved=state.anchorSlots.get(slot);
    if(saved) {
      const order=banks.findIndex(b=>b.key===saved.key),bank=banks[order];
      if(bank) {
        const point=bank.origins[saved.index];
        const visible=point[0]>=left+20&&point[0]<=left+width-20&&point[1]>=top+16&&point[1]<=top+height*.58
          &&!banks.slice(order+1).some(b=>insideCloud(point,b.face)||insideCloud(point,b.shadow));
        if(visible)return clear(point)?point:null;
      }
    }
    let best=null;
    banks.forEach((bank,order)=>bank.origins.forEach((point,index)=>{
      if(point[0]<left+20||point[0]>left+width-20||point[1]<top+16||point[1]>top+height*.58)return;
      if(!clear(point))return;
      if(banks.slice(order+1).some(b=>insideCloud(point,b.face)||insideCloud(point,b.shadow)))return;
      const score=Math.hypot(point[0]-target[0],(point[1]-target[1])*.8);
      if(!best||score<best.score) best={key:bank.key,index,point,score};
    }));
    if(!best)return null;
    // Reuse the bank identity during a strike; its origin follows the cloud drift.
    state.anchorSlots.set(slot,best);
    return best.point;
  }
  function strikeEnvelope(age) {
    age*=1.1;
    if(age<0||age>=1.02)return {alpha:0,progress:0,flash:0};
    const progress=Math.min(age/.38,1);
    const flash=Math.exp(-Math.pow((age-.43)/.09,2));
    const alpha=age<.46?.4+.6*progress:Math.pow(Math.max(0,(1.02-age)/.56),1.3);
    return {alpha,progress,flash};
  }
  // Seeded, varied 30–90 second gaps use the existing pause-aware animation clock.
  const lightningStarts=[];
  let lightningPeriod=0;
  for(let i=0;i<24;i++) {
    lightningPeriod+=30+seed(i,77)*60;
    lightningStarts.push(lightningPeriod);
  }
  function lightningMoment(time) {
    const loop=Math.floor(time/lightningPeriod),phase=time%lightningPeriod;
    for(let i=lightningStarts.length-2;i>=0;i--) {
      if(phase>=lightningStarts[i])return {event:i,age:phase-lightningStarts[i]};
    }
    // The last burst starts at the period boundary. There is no burst on load.
    return loop>0?{event:23,age:phase}:{event:0,age:-1};
  }
  function drawLightning(left,top,width,height,time) {
    const still=media.matches;
    const moment=lightningMoment(time),strikes=[];
    const eventNumber=still?0:moment.event;
    const cycle=Math.floor(eventNumber/3),event=eventNumber%3;
      const count=seed(eventNumber,31)<.5?1:2;
      for(let fork=0;fork<count;fork++) {
        const envelope=still?{alpha:.85,progress:1,flash:0}:strikeEnvelope(moment.age-fork*.04);
        if(!envelope.alpha)continue;
        const target=[left+width*(.15+seed(eventNumber*2+fork,41)*.7),top+height*(.06+seed(eventNumber*2+fork,44)*.4)];
        const span=width*(fork?.7:1),id=cycle*6+event*2+fork;
        const origin=cloudOrigin(`${cycle}:${event}:${fork}`,target,left,top,width,height,span,id,strikes.map(s=>s.bounds));
        if(!origin)continue;
        strikes.push({...envelope,origin,id,width:span,height:(top+height-origin[1])*(fork?.87:1.06),bounds:boltBounds(origin,span,id)});
      }
    if(!still&&strikes.length) {
      const darkness=Math.max(...strikes.map(s=>s.alpha*(.16+s.flash*.43)));
      ctx.fillStyle=`rgba(12,16,35,${darkness})`;ctx.fillRect(left,top,width,height);
    }
    for(const strike of strikes) {
      drawBolt(...strike.origin,strike.width,strike.height,strike.id,strike.alpha,strike.progress,strike.flash);
    }
  }

  function draw(left, top, width, height, weather, time) {
    const kind = weather.storm ? "storm" : weather.snow ? "snow" : weather.rain ? "rain" : weather.kind;
    media.matches = !drawGamifyFutureClouds.motion || drawGamifyFutureClouds.motion.media.matches;
    if (state.kind !== kind || time < state.last || state.reduced !== media.matches) {
      state.kind = kind;
      state.started = time;
      state.anchorSlots.clear();
    }
    state.reduced = media.matches;
    state.last = time;
    if (weather.shade) {
      ctx.fillStyle = `rgba(38, 53, 91, ${weather.shade})`;
      ctx.fillRect(left, top, width, height);
    }
    if (weather.fog) {
      ctx.fillStyle = "rgba(246, 249, 255, .28)";
      ctx.fillRect(left, top, width, height);
    }
    if (weather.snow) {
      ctx.fillStyle = "rgba(246,250,255,.12)";
      ctx.fillRect(left, top, width, height);
      drawSnow(left, top, width, height, time);
    } else if (weather.rain) {
      drawRain(left, top, width, height, time, weather.storm);
      if (weather.storm) drawLightning(left, top, width, height, Math.max(0, time - state.started));
    }
  }
  return { beginFrame, recordBank, draw };
})();

function drawCloudWeatherEffects(left, top, width, height, weather, time) {
  // The caller's clip and opaque backing conceal all future data in every phase.
  cloudWeatherArt.draw(left, top, width, height, weather, time);
}

function drawFutureCloudReveal() {
  const cover = drawGamifyFutureClouds.cover;
  const motion = drawGamifyFutureClouds.motion;
  if (!revealed || !cover) return;
  if (document.body.dataset.theme !== "gamify" || motion?.media.matches
    || document.hidden || motion?.visible === false || cover.candles !== rawCandles
    || cover.mode !== appMode || cover.chartWidth !== chartWidth || cover.chartHeight !== chartHeight) {
    drawGamifyFutureClouds.cover = null;
    drawGamifyFutureClouds.reveal = null;
    return;
  }
  const now = performance.now();
  const reveal = drawGamifyFutureClouds.reveal ||= { started: now, time: motion?.time || 0 };
  const progress = Math.min(1, Math.max(0, (now - reveal.started) / 520));
  if (progress >= 1) {
    drawGamifyFutureClouds.cover = null;
    drawGamifyFutureClouds.reveal = null;
    return;
  }
  drawGamifyFutureClouds(cover.left, cover.top, cover.width, cover.height,
    { ...cover.field, time: reveal.time, dispersal: progress });
}

function animateFutureClouds() {
  let motion = drawGamifyFutureClouds.motion;
  if (!motion) {
    motion = { media: window.matchMedia("(prefers-reduced-motion: reduce)"), visible: true, frame: 0, last: 0 };
    drawGamifyFutureClouds.motion = motion;
    const refresh = () => drawChart();
    motion.media.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    if (typeof IntersectionObserver !== "undefined") {
      motion.observer = new IntersectionObserver(entries => {
        motion.visible = entries[0].isIntersecting;
        refresh();
      });
      motion.observer.observe(canvas);
    }
  }
  if (motion.frame) cancelAnimationFrame(motion.frame);
  motion.frame = 0;
  const dispersing = revealed && Boolean(drawGamifyFutureClouds.reveal);
  if (motion.media.matches || document.hidden || !motion.visible || (revealed && !dispersing)
    || document.body.dataset.theme !== "gamify" || !rawCandles.length
    || !latestSeries.some(bar => bar.future)) return;
  const view = viewport(latestSeries);
  if (view.end <= (latestSeries[0]?.observedEnd ?? Math.floor(latestSeries.length * .64))) return;
  const tick = now => {
    motion.frame = 0;
    // Smooth the brief reveal; cap idle drift at 24 fps or less on costly devices.
    const reveal = drawGamifyFutureClouds.reveal;
    const revealFinished = reveal && now >= reveal.started + 520;
    if (revealFinished || now - motion.last >= (dispersing ? 1000 / 60 : motion.interval || 1000 / 24)) {
      motion.last = now;
      motion.time = now / 1000;
      const started = performance.now();
      drawChart();
      const cost = performance.now() - started;
      motion.cost = motion.cost === undefined ? cost : motion.cost * .8 + cost * .2;
      // Aim to spend at most about 8% of main-thread time on decorative redraws.
      motion.interval = Math.max(1000 / 24, motion.cost * 12);
    } else {
      motion.frame = requestAnimationFrame(tick);
    }
  };
  motion.frame = requestAnimationFrame(tick);
}

function drawHiddenFuture(data, view) {
  if (!revealed) {
    drawGamifyFutureClouds.cover = null;
    drawGamifyFutureClouds.reveal = null;
  }
  if (!data.some(bar => bar.future)) return;
  const observedEnd = data[0]?.observedEnd ?? Math.floor(data.length * .64);
  if (view.end <= observedEnd) return;

  const gridLeft = view.pad.left;
  const gridRight = chartWidth - view.pad.right;
  // Point-based lines need a half-interval for the final hidden slot too.
  const rawSplitX = view.xFor(observedEnd - (view.pointInset === 0 ? .5 : 0));
  const futureLeft = view.start >= observedEnd
    ? gridLeft
    : Math.max(gridLeft, Math.min(gridRight, rawSplitX));
  const futureWidth = Math.max(0, gridRight - futureLeft);
  if (!futureWidth) return;
  const darkHidden = !revealed && document.body.dataset.theme === "dark";

  ctx.fillStyle = cssVar("--future-zone");
  ctx.fillRect(futureLeft, view.pad.top, futureWidth, view.height);
  if (!darkHidden && rawSplitX > gridLeft && rawSplitX < gridRight) {
    // Preserve Gamify's divider width without depending on the removed label.
    if (!revealed && document.body.dataset.theme === "gamify") ctx.lineWidth = 2;
    ctx.strokeStyle = cssVar("--chart-line");
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(rawSplitX, view.pad.top);
    ctx.lineTo(rawSplitX, view.pad.top + view.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (!revealed) {
    const maskLeft = Math.min(gridRight, futureLeft + (!darkHidden && rawSplitX > gridLeft ? 1 : 0));
    const maskWidth = Math.max(0, gridRight - maskLeft);
    if (darkHidden) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(maskLeft, view.pad.top, maskWidth, view.height);
      ctx.clip();
      // An opaque chart-colored backing keeps every hidden price concealed.
      ctx.fillStyle = cssVar("--chart-bg");
      ctx.fillRect(maskLeft, view.pad.top, maskWidth, view.height);
      ctx.fillStyle = cssVar("--future-hidden-tint");
      ctx.fillRect(maskLeft, view.pad.top, maskWidth, view.height);
      ctx.strokeStyle = cssVar("--future-hidden-slash");
      ctx.lineWidth = 1.25;
      ctx.setLineDash([]);
      ctx.beginPath();
      const bottom = view.pad.top + view.height;
      for (let x = maskLeft - view.height; x < gridRight; x += 28) {
        ctx.moveTo(x, bottom);
        ctx.lineTo(x + view.height, view.pad.top);
      }
      ctx.stroke();
      ctx.restore();
    } else if (document.body.dataset.theme === "gamify") {
      // Use observed prices only: the background must not reveal future data.
      const observed = data.slice(0, observedEnd);
      const anchorPrice = Math.max(...observed.map(bar => bar.high));
      const field = {
        x: rawSplitX,
        y: view.y(anchorPrice),
        scale: Math.sqrt(data.length / Math.max(1, view.end - view.start))
      };
      drawGamifyFutureClouds(maskLeft, view.pad.top, maskWidth, view.height, field);
      drawGamifyFutureClouds.cover = { left: maskLeft, top: view.pad.top, width: maskWidth,
        height: view.height, field, candles: rawCandles, mode: appMode, chartWidth, chartHeight };
      drawGamifyFutureClouds.reveal = null;
    } else {
      ctx.fillStyle = cssVar("--gold-2");
      ctx.fillRect(maskLeft, view.pad.top, maskWidth, view.height);
    }
  }
}

function chartRenderBars(data, view) {
  // Aggregate only for display when several candles would occupy the same
  // pixels. Source indices, tooltips, indicators and scoring retain raw bars.
  const groupSize = Math.max(1, Math.ceil(4 / Math.max(view.xStep, .0001)));
  const bars = [];
  let group;
  for (let i = view.start; i < view.end; i += 1) {
    const bar = data[i];
    if (bar.future && !revealed) { group = null; continue; }
    const bucket = Math.floor(i / groupSize);
    // The outcome remains separate even after reveal, so it never changes an
    // observed candle's open/close or draws across the prediction boundary.
    if (!group || group.bucket !== bucket || group.future !== Boolean(bar.future)) {
      group = { bucket, start: i, end: i + 1, future: Boolean(bar.future),
        open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume || 0 };
      bars.push(group);
    } else {
      group.end = i + 1;
      group.high = Math.max(group.high, bar.high);
      group.low = Math.min(group.low, bar.low);
      group.close = bar.close;
      group.volume += bar.volume || 0;
    }
  }
  return bars;
}

function drawVolume(data, view, paint = ctx) {
  if (!showVolume || data[0]?.indexedPrice) return;
  const upColor = cssVar("--chart-volume-up");
  const downColor = cssVar("--chart-volume-down");
  const bars = chartRenderBars(data, view);
  const maxVol = Math.max(...bars.map(bar => bar.volume), 1);
  const base = chartHeight - 46;
  const height = 44;
  bars.forEach(bar => {
    const volHeight = Math.max(2, ((bar.volume || 0) / maxVol) * height);
    const x = view.xFor((bar.start + bar.end - 1) / 2);
    const width = (bar.end - bar.start) * view.xStep * .6;
    paint.fillStyle = bar.close >= bar.open ? upColor : downColor;
    const left = view.pointInset === 0 ? Math.max(view.pad.left, x - width / 2) : x - width / 2;
    const right = view.pointInset === 0 ? Math.min(view.pad.left + view.width, x + width / 2) : x + width / 2;
    paint.fillRect(left, base - volHeight, right - left, volHeight);
  });
}

function drawPrice(data, view, paint = ctx) {
  if (chartType === "line") {
    paint.strokeStyle = cssVar("--chart-line-color");
    paint.lineWidth = 2.5;
    paint.beginPath();
    let started = false;
    data.forEach((bar, i) => {
      if (i < view.start || i >= view.end || (bar.future && !revealed)) return;
      const x = view.xFor(i);
      const y = view.y(bar.close);
      if (!started) {
        paint.moveTo(x, y);
        started = true;
      } else {
        paint.lineTo(x, y);
      }
    });
    paint.stroke();
    return;
  }
  const upColor = cssVar("--chart-up");
  const downColor = cssVar("--chart-down");
  chartRenderBars(data, view).forEach(bar => {
    const x = view.xFor((bar.start + bar.end - 1) / 2);
    const spacing = (bar.end - bar.start) * view.xStep;
    const up = bar.close >= bar.open;
    paint.strokeStyle = up ? upColor : downColor;
    paint.fillStyle = up ? upColor : downColor;
    paint.lineWidth = Math.min(2, spacing * .2);
    paint.beginPath();
    paint.moveTo(x, view.y(bar.high));
    paint.lineTo(x, view.y(bar.low));
    paint.stroke();
    const top = view.y(Math.max(bar.open, bar.close));
    const height = Math.max(Math.min(3, spacing * .5), Math.abs(view.y(bar.open) - view.y(bar.close)));
    const bodyWidth = spacing * .56;
    const bodyX = x - bodyWidth / 2;
    paint.fillRect(bodyX, top, bodyWidth, height);
    paint.strokeRect(bodyX, top, bodyWidth, height);
  });
}

function drawSMA(data, view, paint = ctx) {
  if (!showSMA) return;
  paint.strokeStyle = cssVar("--chart-sma");
  paint.lineWidth = 2;
  paint.beginPath();
  let started = false;
  data.forEach((bar, i) => {
    if (i < 9 || i < view.start || i >= view.end || (bar.future && !revealed)) return;
    const avg = data.slice(i - 9, i + 1).reduce((sum, item) => sum + item.close, 0) / 10;
    const x = view.xFor(i);
    const y = view.y(avg);
    if (!started) {
      paint.moveTo(x, y);
      started = true;
    } else {
      paint.lineTo(x, y);
    }
  });
  paint.stroke();
}

function drawEMA(data, view, paint = ctx) {
  if (!showEMA) return;
  const period = 20;
  const multiplier = 2 / (period + 1);
  let ema = null;
  paint.strokeStyle = cssVar("--chart-ema");
  paint.lineWidth = 2;
  paint.beginPath();
  let started = false;
  data.forEach((bar, i) => {
    ema = ema === null ? bar.close : (bar.close - ema) * multiplier + ema;
    if (i < period || i < view.start || i >= view.end || (bar.future && !revealed)) return;
    const x = view.xFor(i);
    const y = view.y(ema);
    if (!started) {
      paint.moveTo(x, y);
      started = true;
    } else {
      paint.lineTo(x, y);
    }
  });
  paint.stroke();
}

function drawBollinger(data, view, paint = ctx) {
  if (!showBollinger) return;
  const period = 20;
  const points = [];
  data.forEach((bar, i) => {
    if (i < period - 1 || i < view.start || i >= view.end || (bar.future && !revealed)) return;
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((sum, item) => sum + item.close, 0) / period;
    const variance = slice.reduce((sum, item) => sum + Math.pow(item.close - mean, 2), 0) / period;
    const deviation = Math.sqrt(variance) * 2;
    points.push({ x: view.xFor(i), upper: view.y(mean + deviation), middle: view.y(mean), lower: view.y(mean - deviation) });
  });
  if (points.length < 2) return;
  paint.strokeStyle = cssVar("--chart-bb");
  paint.fillStyle = cssVar("--chart-bb-fill");
  paint.lineWidth = 1.5;
  paint.beginPath();
  points.forEach((point, idx) => idx ? paint.lineTo(point.x, point.upper) : paint.moveTo(point.x, point.upper));
  [...points].reverse().forEach(point => paint.lineTo(point.x, point.lower));
  paint.closePath();
  paint.fill();
  ["upper", "middle", "lower"].forEach(key => {
    paint.beginPath();
    points.forEach((point, idx) => idx ? paint.lineTo(point.x, point[key]) : paint.moveTo(point.x, point[key]));
    paint.stroke();
  });
}

function lineEndForRay(a, b, view) {
  const ax = view.xFor(a.i);
  const ay = view.y(a.price);
  const bx = view.xFor(b.i);
  const by = view.y(b.price);
  const dx = bx - ax || 1;
  const dy = by - ay;
  const t = (chartWidth - view.pad.right - ax) / dx;
  return { x: ax + dx * Math.max(1, t), y: ay + dy * Math.max(1, t) };
}

function drawOneDrawing(item, view) {
  const chartText = value => globalThis.siteI18n?.t(value) ?? value;
  ctx.strokeStyle = item.type === "measure" ? cssVar("--chart-measure") : cssVar("--chart-drawing");
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = item.type === "brush" ? 2.5 : 2;
  ctx.setLineDash(item.type === "measure" ? [6, 5] : []);
  if (item.type === "brush") {
    ctx.beginPath();
    item.points.forEach((point, idx) => {
      const x = view.xFor(point.i);
      const y = view.y(point.price);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  if (item.type === "text") {
    ctx.font = "900 13px Georgia, serif";
    ctx.fillText(item.text, view.xFor(item.a.i), view.y(item.a.price));
    ctx.setLineDash([]);
    return;
  }
  const a = item.a;
  const b = item.b || item.a;
  const ax = view.xFor(a.i);
  const ay = view.y(a.price);
  const bx = view.xFor(b.i);
  const by = view.y(b.price);
  const priceAtY = y => view.max - ((y - view.pad.top) / Math.max(view.height, 1)) * (view.max - view.min);
  ctx.beginPath();
  if (item.type === "horizontal") {
    ctx.moveTo(view.pad.left, ay);
    ctx.lineTo(chartWidth - view.pad.right, ay);
  } else if (item.type === "fib") {
    ctx.setLineDash([]);
    ctx.font = "800 11px Georgia, serif";
    ctx.textAlign = "left";
    [0, .236, .382, .5, .618, .786, 1].forEach(level => {
      const yy = ay + (by - ay) * level;
      ctx.strokeStyle = cssVar("--chart-fib");
      ctx.fillStyle = cssVar("--chart-axis-number");
      ctx.beginPath();
      ctx.moveTo(view.pad.left, yy);
      ctx.lineTo(chartWidth - view.pad.right, yy);
      ctx.stroke();
      ctx.fillText(`${Math.round(level * 1000) / 10}%  ${priceAtY(yy).toFixed(2)}`, view.pad.left + 8, yy - 5);
    });
    return;
  } else if (item.type === "channel") {
    const offset = Math.max(28, Math.min(92, Math.abs(by - ay) * .45 || 42));
    const direction = by >= ay ? 1 : -1;
    ctx.strokeStyle = cssVar("--chart-drawing");
    ctx.fillStyle = cssVar("--chart-zone");
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx, by + offset * direction);
    ctx.lineTo(ax, ay + offset * direction);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay + offset * direction);
    ctx.lineTo(bx, by + offset * direction);
    ctx.stroke();
    return;
  } else if (item.type === "long" || item.type === "short") {
    const risk = Math.max(24, Math.min(96, Math.abs(by - ay) * .45 || 42));
    const stopY = item.type === "long" ? ay + risk : ay - risk;
    const x1 = Math.min(ax, bx);
    const x2 = Math.max(ax, bx);
    ctx.font = "900 11px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillStyle = cssVar("--chart-profit-zone");
    ctx.fillRect(x1, Math.min(ay, by), x2 - x1, Math.abs(by - ay));
    ctx.fillStyle = cssVar("--chart-risk-zone");
    ctx.fillRect(x1, Math.min(ay, stopY), x2 - x1, Math.abs(stopY - ay));
    ctx.strokeStyle = cssVar("--chart-up");
    ctx.strokeRect(x1, Math.min(ay, by), x2 - x1, Math.abs(by - ay));
    ctx.strokeStyle = cssVar("--chart-down");
    ctx.strokeRect(x1, Math.min(ay, stopY), x2 - x1, Math.abs(stopY - ay));
    ctx.fillStyle = cssVar("--chart-axis-number");
    const rewardPct = ((b.price - a.price) / Math.max(a.price, .01)) * 100 * (item.type === "short" ? -1 : 1);
    ctx.fillText(chartText(`${chartText(item.type === "long" ? "Long" : "Short")} reward ${rewardPct.toFixed(2)}%`), x1 + 8, Math.min(ay, by) + 16);
    ctx.fillText(chartText(`Risk stop ${priceAtY(stopY).toFixed(2)}`), x1 + 8, Math.min(ay, stopY) + 16);
    return;
  } else if (item.type === "vertical") {
    ctx.moveTo(ax, view.pad.top);
    ctx.lineTo(ax, chartHeight - view.pad.bottom);
  } else if (item.type === "rect") {
    ctx.strokeRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
    ctx.fillStyle = cssVar("--future-zone");
    ctx.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
  } else if (item.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse((ax + bx) / 2, (ay + by) / 2, Math.max(3, Math.abs(bx - ax) / 2), Math.max(3, Math.abs(by - ay) / 2), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = cssVar("--future-zone");
    ctx.fill();
  } else if (item.type === "arrow") {
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    const angle = Math.atan2(by - ay, bx - ax);
    const size = 12;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - size * Math.cos(angle - Math.PI / 6), by - size * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - size * Math.cos(angle + Math.PI / 6), by - size * Math.sin(angle + Math.PI / 6));
  } else if (item.type === "ray") {
    const end = lineEndForRay(a, b, view);
    ctx.moveTo(ax, ay);
    ctx.lineTo(end.x, end.y);
  } else {
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  if (item.type === "measure") {
    const bars = Math.abs(b.i - a.i);
    const pct = ((b.price - a.price) / Math.max(a.price, .01)) * 100;
    const delta = b.price - a.price;
    const label = chartText(`${bars} bars | ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} | ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`);
    ctx.save();
    ctx.strokeStyle = cssVar("--chart-measure");
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "900 12px Georgia, serif";
    const labelX = Math.min(chartWidth - view.pad.right - 190, Math.max(view.pad.left + 6, (ax + bx) / 2 + 8));
    const labelY = Math.max(view.pad.top + 20, Math.min(chartHeight - view.pad.bottom - 12, (ay + by) / 2 - 8));
    const metrics = ctx.measureText(label);
    ctx.fillStyle = cssVar("--chart-label-bg");
    ctx.fillRect(labelX - 6, labelY - 16, metrics.width + 12, 23);
    ctx.strokeStyle = cssVar("--chart-measure");
    ctx.strokeRect(labelX - 6, labelY - 16, metrics.width + 12, 23);
    ctx.fillStyle = cssVar("--chart-label-text");
    ctx.fillText(label, labelX, labelY);
    ctx.restore();
  }
}

function drawDrawings(view) {
  drawings.concat(draftDrawing ? [draftDrawing] : []).forEach(item => drawOneDrawing(item, view));
}

function drawInsidePlot(view, draw, paint = ctx) {
  paint.save();
  paint.beginPath();
  paint.rect(view.pad.left, view.pad.top, view.width, view.height);
  paint.clip();
  draw();
  paint.restore();
}

function drawCrosshair(data, view) {
  if (hoverIndex === null || hoverIndex < view.start || hoverIndex >= view.end) return;
  const bar = data[hoverIndex];
  if (bar.future && !revealed) return;
  const x = view.xFor(hoverIndex);
  const y = view.y(bar.close);
  ctx.strokeStyle = cssVar("--chart-line");
  ctx.lineWidth = 1;
  drawInsidePlot(view, () => {
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, view.pad.top);
    ctx.lineTo(x, chartHeight - view.pad.bottom);
    ctx.moveTo(view.pad.left, y);
    ctx.lineTo(chartWidth - view.pad.right, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.fillStyle = cssVar("--chart-crosshair-bg");
  ctx.fillRect(chartWidth - view.pad.right + 4, y - 11, 66, 22);
  ctx.fillRect(x - 40, chartHeight - 38, 80, 20);
  ctx.fillStyle = cssVar("--chart-crosshair-text");
  ctx.font = "900 11px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(bar.close.toFixed(2), chartWidth - view.pad.right + 37, y + 4);
  ctx.fillText(formatDate(bar), x, chartHeight - 24);
}

function drawRankedMarketLayer(data, view) {
  if (appMode !== "ranked" || !liveRound) return false;
  // Only prices/indicators are cached. Clouds, crosshair and drawings stay live.
  const palette = ["--chart-up", "--chart-down", "--chart-line-color", "--chart-volume-up",
    "--chart-volume-down", "--chart-sma", "--chart-ema", "--chart-bb", "--chart-bb-fill"].map(cssVar).join("|");
  const key = [chartWidth, chartHeight, chartPixelRatio, view.start, view.end, view.min, view.max,
    view.xStep, view.pad.left, view.pad.top, view.pad.bottom, view.width, view.height,
    chartType, showVolume, showSMA, showEMA, showBollinger, revealed, palette].join("|");
  let layer = liveRound.marketLayer;
  if (!layer || layer.series !== data || layer.key !== key) {
    const bitmap = layer?.bitmap || document.createElement("canvas");
    bitmap.width = Math.round(chartWidth * chartPixelRatio);
    bitmap.height = Math.round(chartHeight * chartPixelRatio);
    const paint = bitmap.getContext("2d");
    if (!paint) return false;
    paint.setTransform(chartPixelRatio, 0, 0, chartPixelRatio, 0, 0);
    drawVolume(data, view, paint);
    drawInsidePlot(view, () => {
      drawBollinger(data, view, paint);
      drawPrice(data, view, paint);
      drawSMA(data, view, paint);
      drawEMA(data, view, paint);
    }, paint);
    layer = liveRound.marketLayer = { bitmap, series: data, key };
  }
  ctx.drawImage(layer.bitmap, 0, 0, chartWidth, chartHeight);
  return true;
}

function drawChart() {
  resizeChartCanvas();
  if (appMode === "review" && reviewChartActive && !activeReviewRecordId) {
    syncChartMetadata();
    ctx.clearRect(0, 0, chartWidth, chartHeight);
    chartTip.hidden = true;
    drawGamifyFutureClouds(0, 0, chartWidth, chartHeight, { x: 0, y: 0, scale: 1 });
    animateFutureClouds();
    return;
  }
  if (!rawCandles.length) {
    syncChartMetadata();
    animateFutureClouds();
    ctx.clearRect(0, 0, chartWidth, chartHeight);
    if (appMode === "ranked" && liveMarketClosed) {
      chartTip.hidden = true;
      drawGamifyFutureClouds(0, 0, chartWidth, chartHeight, { x: 0, y: 0, scale: 1 });
    }
    return;
  }
  latestSeries = chartSeriesForMode();
  updateChartCitation(latestSeries);
  const view = viewport(latestSeries);
  ctx.clearRect(0, 0, chartWidth, chartHeight);
  ctx.fillStyle = cssVar("--chart-bg");
  ctx.fillRect(0, 0, chartWidth, chartHeight);
  drawAxes(view);
  drawHiddenFuture(latestSeries, view);
  if (drawRankedMarketLayer(latestSeries, view)) {
    drawInsidePlot(view, () => drawDrawings(view));
  } else {
    drawVolume(latestSeries, view);
    drawInsidePlot(view, () => {
      drawBollinger(latestSeries, view);
      drawPrice(latestSeries, view);
      drawSMA(latestSeries, view);
      drawEMA(latestSeries, view);
      drawDrawings(view);
    });
  }
  // Clouds must pass over the newly visible candles, then leave a clear chart.
  drawFutureCloudReveal();
  drawCrosshair(latestSeries, view);
  animateFutureClouds();
}

function chartPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left - canvas.clientLeft;
  const yPos = event.clientY - rect.top - canvas.clientTop;
  const data = latestSeries.length ? latestSeries : challengeCandles();
  const view = viewport(data);
  const raw = Math.round((x - view.pad.left) / view.xStep + view.start - (view.pointInset ?? .5));
  const i = Math.max(0, Math.min(data.length - 1, raw));
  const price = view.max - ((yPos - view.pad.top) / Math.max(view.height, 1)) * (view.max - view.min);
  return { i, price, view };
}

function drawingPointFromEvent(event) {
  const point = chartPointFromEvent(event);
  if (activeTool === "delete") {
    const rect = canvas.getBoundingClientRect();
    return { ...point, screen: { x: event.clientX - rect.left - canvas.clientLeft,
      y: event.clientY - rect.top - canvas.clientTop } };
  }
  if (!activeTool || activeTool === "brush" || activeTool === "delete"
    || chartType === "line" || !rawCandles.length || !latestSeries.length) return point;
  const { view } = point;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left - canvas.clientLeft;
  const y = event.clientY - rect.top - canvas.clientTop;
  if (x < view.pad.left || x > view.pad.left + view.width
    || y < view.pad.top || y > view.pad.top + view.height) return point;
  // Measure proximity in CSS pixels so snapping stays consistent at any zoom/DPR.
  const radius = event.pointerType === "touch" ? 24 : 12;
  const reach = Math.ceil(radius / Math.max(view.xStep, .0001));
  let closest = point;
  let distance = radius;
  for (let i = Math.max(view.start, point.i - reach); i < Math.min(view.end, latestSeries.length, point.i + reach + 1); i += 1) {
    const bar = latestSeries[i];
    if (!bar || (bar.future && !revealed)) continue;
    const candleX = view.xFor(i);
    if (Math.abs(candleX - x) > radius) continue;
    for (const price of [bar.open, bar.high, bar.low, bar.close]) {
      if (!Number.isFinite(price)) continue;
      const candleY = view.y(price);
      if (candleY < view.pad.top || candleY > view.pad.top + view.height) continue;
      const nextDistance = Math.hypot(candleX - x, candleY - y);
      if (nextDistance < distance) {
        closest = { i, price, view };
        distance = nextDistance;
      }
    }
  }
  return closest;
}

function screenPoint(point, view) {
  return { x: view.xFor(point.i), y: view.y(point.price) };
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}

function drawingDistance(item, point) {
  const view = point.view;
  const cursor = point.screen || screenPoint(point, view);
  if (item.type === "brush") {
    return item.points.reduce((best, brushPoint, idx, points) => {
      if (!idx) return best;
      return Math.min(best, distanceToSegment(cursor, screenPoint(points[idx - 1], view), screenPoint(brushPoint, view)));
    }, Infinity);
  }
  const a = screenPoint(item.a, view);
  const b = screenPoint(item.b || item.a, view);
  if (item.type === "horizontal") return Math.abs(cursor.y - a.y);
  if (item.type === "fib") return Math.min(...[0, .236, .382, .5, .618, .786, 1]
    .map(level => Math.abs(cursor.y - (a.y + (b.y - a.y) * level))));
  if (item.type === "ray") return distanceToSegment(cursor, a, lineEndForRay(item.a, item.b || item.a, view));
  if (item.type === "vertical") return Math.abs(cursor.x - a.x);
  if (item.type === "text") {
    ctx.save();
    ctx.font = "900 13px Georgia, serif";
    const width = ctx.measureText(item.text || "").width;
    ctx.restore();
    return Math.hypot(Math.max(a.x - cursor.x, 0, cursor.x - a.x - width),
      Math.max(a.y - 13 - cursor.y, 0, cursor.y - a.y));
  }
  if (item.type === "channel") {
    const offset = Math.max(28, Math.min(92, Math.abs(b.y - a.y) * .45 || 42)) * (b.y >= a.y ? 1 : -1);
    if (a.x !== b.x && cursor.x >= Math.min(a.x, b.x) && cursor.x <= Math.max(a.x, b.x)) {
      const y = a.y + (b.y - a.y) * (cursor.x - a.x) / (b.x - a.x);
      if (cursor.y >= Math.min(y, y + offset) && cursor.y <= Math.max(y, y + offset)) return 0;
    }
    return Math.min(distanceToSegment(cursor, a, b),
      distanceToSegment(cursor, { x: a.x, y: a.y + offset }, { x: b.x, y: b.y + offset }),
      distanceToSegment(cursor, a, { x: a.x, y: a.y + offset }),
      distanceToSegment(cursor, b, { x: b.x, y: b.y + offset }));
  }
  if (item.type === "long" || item.type === "short") {
    const risk = Math.max(24, Math.min(96, Math.abs(b.y - a.y) * .45 || 42));
    const stopY = item.type === "long" ? a.y + risk : a.y - risk;
    return Math.hypot(Math.max(Math.min(a.x, b.x) - cursor.x, 0, cursor.x - Math.max(a.x, b.x)),
      Math.max(Math.min(a.y, b.y, stopY) - cursor.y, 0, cursor.y - Math.max(a.y, b.y, stopY)));
  }
  if (item.type === "measure") return Math.min(distanceToSegment(cursor, a, b),
    distanceToSegment(cursor, a, { x: b.x, y: a.y }),
    distanceToSegment(cursor, { x: b.x, y: a.y }, b));
  if (item.type === "rect" || item.type === "ellipse" || item.type === "long" || item.type === "short" || item.type === "channel") {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    if (cursor.x >= left && cursor.x <= right && cursor.y >= top && cursor.y <= bottom) return 0;
  }
  return distanceToSegment(cursor, a, b);
}

function deleteNearestDrawing(point, recordHistory = true) {
  if (!drawings.length) return false;
  const ranked = drawings
    .map((item, index) => ({ index, distance: drawingDistance(item, point) }))
    .sort((a, b) => a.distance - b.distance || b.index - a.index);
  if (!ranked.length || ranked[0].distance > 34) return false;
  const remaining = drawings.filter((_, index) => index !== ranked[0].index);
  if (recordHistory) commitDrawings(remaining);
  else {
    drawings = remaining;
    updateDrawingActions();
  }
  return true;
}

function eraseDrawingStroke(point) {
  if (!eraserGesture) return;
  const start = eraserGesture.lastPoint || point;
  const a = start.screen || screenPoint(start, point.view);
  const b = point.screen || screenPoint(point, point.view);
  if (eraserGesture.lastPoint && a.x === b.x && a.y === b.y) return;
  // Sample the entire sweep so fast pointer movements cannot skip thin drawings.
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
  for (let step = 1; step <= steps; step += 1) {
    const screen = { x: a.x + (b.x - a.x) * step / steps, y: a.y + (b.y - a.y) * step / steps };
    const { view } = point;
    if (screen.x < view.pad.left || screen.x > view.pad.left + view.width
      || screen.y < view.pad.top || screen.y > view.pad.top + view.height) continue;
    if (deleteNearestDrawing({ ...point, screen }, !eraserGesture.changed)) eraserGesture.changed = true;
  }
  eraserGesture.lastPoint = point;
}

function moveTip(event) {
  const rect = canvas.getBoundingClientRect();
  const bar = latestSeries[hoverIndex];
  if (!bar || (bar.future && !revealed)) {
    chartTip.hidden = true;
    return;
  }
  chartTip.hidden = false;
  chartTip.style.left = `${Math.min(rect.width - 230, Math.max(10, event.clientX - rect.left + 14))}px`;
  chartTip.style.top = `${Math.min(rect.height - 142, Math.max(54, event.clientY - rect.top + 14))}px`;
  chartTip.innerHTML = `<strong>${currentSymbol.ticker} - ${formatDate(bar)}${bar.future ? " - outcome" : ""}</strong><span>${bar.indexedPrice ? "Indexed prices<br>" : ""}O ${bar.open.toFixed(2)} H ${bar.high.toFixed(2)}<br>L ${bar.low.toFixed(2)} C ${bar.close.toFixed(2)}<br>${bar.indexedPrice ? "Volume hidden until reveal" : `Vol ${(bar.volume || 0).toLocaleString()}`}</span>`;
  if (event.pointerType === "touch") {
    const shell = chartTip.offsetParent.getBoundingClientRect();
    const x = event.clientX - shell.left, y = event.clientY - shell.top;
    const width = chartTip.offsetWidth, height = chartTip.offsetHeight;
    const left = x < shell.width / 2 ? x + 24 : x - width - 24;
    const top = y - height - 24;
    chartTip.style.left = `${Math.max(4, Math.min(shell.width - width - 4, left))}px`;
    chartTip.style.top = `${Math.max(4, Math.min(shell.height - height - 4, top))}px`;
  }
}

function fitPredictionChoiceLabels() {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return;
  document.querySelectorAll("#choices .prediction-choice").forEach(button => {
    const label = button.querySelector(".choice-label");
    if (!label || !button.clientWidth) return;
    label.style.removeProperty("--choice-text-scale");
    const style = getComputedStyle(label);
    const buttonStyle = getComputedStyle(button);
    const lines = [label.getAttribute("aria-label") || label.textContent.replace(/\s+/g, " ").trim()];
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const spacing = parseFloat(style.letterSpacing) || 0;
    const textWidth = Math.max(...lines.map(line => {
      const text = style.textTransform === "uppercase" ? line.toUpperCase() : line;
      return context.measureText(text).width + spacing * text.length;
    }));
    const textHeight = parseFloat(style.lineHeight) * lines.length;
    const width = button.clientWidth - parseFloat(buttonStyle.paddingLeft) - parseFloat(buttonStyle.paddingRight);
    const height = button.clientHeight - parseFloat(buttonStyle.paddingTop) - parseFloat(buttonStyle.paddingBottom);
    const scale = Math.min(1, width / Math.max(1, textWidth), height / Math.max(1, textHeight));
    label.style.setProperty("--choice-text-scale", String(Math.max(0, scale)));
  });
}

const predictionChoiceResizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver(fitPredictionChoiceLabels)
  : null;
predictionChoiceResizeObserver?.observe(document.getElementById("choices"));
document.fonts?.ready.then(fitPredictionChoiceLabels);

function renderChoices() {
  const box = document.getElementById("choices");
  box.innerHTML = "";
  const reviewAwaitingPuzzle = appMode === "review" && reviewChartActive && !activeReviewRecordId;
  if (!practiceControlsActive() && !reviewAwaitingPuzzle) return;
  const dailyLocked = appMode === "daily";
  const availableChoices = appMode === "ranked" ? ["Up", "Down", "Sideways"] : choices;
  availableChoices.forEach(choice => {
    const button = document.createElement("button");
    button.classList.add("prediction-choice");
    button.dataset.choice = choice;
    button.textContent = choice;
    if (choice === "Up") button.classList.add("direction-choice-up");
    if (choice === "Down") button.classList.add("direction-choice-down");
    if (choice === "Up") {
      button.classList.add("up-choice");
      button.innerHTML = `
        <span class="choice-label">Up</span>
        <span class="up-arrow-flood" aria-hidden="true">
          ${Array.from({ length: 15 }, (_, index) => `<span class="up-arrow up-arrow-${index + 1}">↑</span>`).join("")}
        </span>
      `;
    }
    if (choice === "Down") {
      button.classList.add("down-choice");
      button.innerHTML = `
        <span class="choice-label down-choice-label" aria-label="Down">
          ${["D", "o", "w", "n"].map((letter, index) => `<span class="down-letter down-letter-${index + 1}" aria-hidden="true">${letter}</span>`).join("")}
        </span>
        <span class="down-arrow-flood" aria-hidden="true">
          ${Array.from({ length: 18 }, (_, index) => `<span class="down-arrow down-arrow-${index + 1}">&#8595;</span>`).join("")}
        </span>
      `;
    }
    if (choice === "Sideways") {
      button.classList.add("sideways-choice");
      button.innerHTML = `
        <span class="choice-label">Sideways</span>
        <span class="choice-action-effect sideways-lanes" aria-hidden="true">
          <span class="sideways-range"></span>
          <span class="sideways-arrow sideways-arrow-right">&#8594;</span>
          <span class="sideways-arrow sideways-arrow-left">&#8592;</span>
        </span>
      `;
    }
    if (choice === "Breakout") {
      button.classList.add("breakout-choice");
      button.innerHTML = `
        <span class="choice-label">Breakout</span>
        <span class="choice-action-effect breakout-stage" aria-hidden="true">
          <span class="breakout-ceiling"></span>
          <span class="breakout-arrow">&#8599;</span>
          ${Array.from({ length: 7 }, (_, index) => `<span class="breakout-shard breakout-shard-${index + 1}">&#9670;</span>`).join("")}
        </span>
      `;
    }
    if (choice === "Reversal") {
      button.classList.add("reversal-choice");
      button.innerHTML = `
        <span class="choice-label">Reversal</span>
        <span class="choice-action-effect reversal-orbit" aria-hidden="true">
          <span class="reversal-arrow reversal-arrow-out">&#8599;</span>
          <span class="reversal-arrow reversal-arrow-back">&#8601;</span>
          <span class="reversal-pivot"></span>
        </span>
      `;
    }
    if (choice === "Volatility spike") {
      button.classList.add("volatility-choice");
      button.innerHTML = `
        <span class="choice-label volatility-choice-label"><span>Volatility</span> <b>spike</b></span>
        <span class="choice-action-effect volatility-meter" aria-hidden="true">
          ${[3, 7, 11, 17, 11, 7, 3].map((height, index) => `<span class="volatility-bar volatility-bar-${index + 1}" style="--bar-height:${height}px"></span>`).join("")}
          <span class="volatility-bolt volatility-bolt-left">&#9889;</span>
          <span class="volatility-bolt volatility-bolt-right">&#9889;</span>
        </span>
      `;
    }
    button.disabled = (appMode === "packs" && !eventPackChartReady())
      || (appMode === "ranked" && (rankedRoundEntry()?.status !== "open" || !rankedRoundOpen()
        || liveRound?.choice || liveRound?.serverSaving || liveRound?.betSaving))
      || reviewAwaitingPuzzle || (dailyLocked && dailyPredictionLocked(choice));
    button.onclick = () => predict(choice, button);
    box.appendChild(button);
  });
  requestAnimationFrame(fitPredictionChoiceLabels);
}

function applyPredictionResultColor(button, state) {
  const palette = state === "correct"
    ? { background: "#16a34a", border: "#15803d" }
    : state === "wrong"
      ? { background: "#dc2626", border: "#b91c1c" }
      : null;
  if (!palette) return;
  button.style.setProperty("background", palette.background, "important");
  button.style.setProperty("background-color", palette.background, "important");
  button.style.setProperty("border-color", palette.border, "important");
  button.style.setProperty("color", "#ffffff", "important");
  button.style.setProperty("filter", "none", "important");
  button.style.setProperty("opacity", "1");
  button.querySelectorAll(".choice-label, .choice-label b").forEach(label => {
    label.style.setProperty("color", "#ffffff", "important");
  });
}

function freePlayOutcomeAlreadyPlayed() {
  // Hidden charts use masked dates until reveal. Account rewards are checked by
  // the server; only the browser's guest rewards need this local outcome check.
  if (accountHistoryEnabled() || rawCandles[0]?.backendPuzzleId && !rawCandles[0].backendRevealed) return false;
  const series = latestSeries.length ? latestSeries : challengeCandles();
  const end = series.at(-1)?.date?.getTime?.();
  if (!Number.isFinite(end)) return false;
  const ticker = currentSymbol.ticker;
  const seen = coinWalletState().seen || [];
  return seen.includes(`free:${ticker}:outcome:${end}`)
    // Keep outcomes paid with the previous crop/timeframe identity consumed.
    || seen.some(id => id.startsWith(`free:${ticker}:`) && id.endsWith(`:${end}`))
    || practiceHistory.some(record => record.mode === "free" && record.ticker === ticker
      && Date.parse(record.windowEnd) === end);
}

function replayFreePlayPuzzle() {
  if (appMode !== "free" || !revealed || !rawCandles[0]?.freePlayCompletedAnswer) return;
  freePlayRedoAvailable = false;
  revealed = false;
  latestSeries = challengeCandles();
  result.innerHTML = "<p>Practice replay. This puzzle is already completed; no additional XP or coins.</p>";
  revealTag.textContent = "Practice replay · no rewards";
  renderChoices();
  drawChart();
  syncNextChartButton();
  document.querySelector("#choices button")?.focus({ preventScroll: true });
}

function predict(choice, button, serverResult = null) {
  const isFreePlayReplay = appMode === "free"
    && (Boolean(rawCandles[0]?.freePlayCompletedAnswer) || freePlayOutcomeAlreadyPlayed());
  if (revealed && !isFreePlayReplay) return;
  if (appMode === "packs" && (!eventPackChartReady() || isEventPackPaper())) return;
  if (appMode === "daily" && !dailyRound?.grading) {
    submitDailyPrediction(choice);
    return;
  }
  const isLive = typeof liveRound !== "undefined" && appMode === "ranked";
  if (isLive && (liveRound?.expired || liveRound?.failed
    || (liveRound?.resolved && (!liveRound.choice || choice !== liveRound.choice)))) return;
  if (isLive && !liveRound?.resolved) {
    lockLivePrediction(choice, button);
    return;
  }
  const isReviewReplay = appMode === "review" && reviewChartActive;
  if (isReviewReplay && (!activeReviewRecordId || !activeReviewAnswer || symbolStatus.classList.contains("loading"))) return;

  if (!isFreePlayReplay && !serverResult && rawCandles[0]?.backendPuzzleId && !rawCandles[0].backendRevealed) {
    void revealGuestPrediction(choice, button);
    return;
  }
  if (serverResult && !isReviewReplay) {
    choice = appMode === "free" ? serverResult.practiceChoice ?? serverResult.record.choice : serverResult.record.choice;
    if (button?.dataset?.choice !== choice) button = document.querySelector(`[data-choice="${choice}"]`);
  }
  const answer = isFreePlayReplay && rawCandles[0]?.freePlayCompletedAnswer ? rawCandles[0].freePlayCompletedAnswer : serverResult ? serverResult.record.answer : isReviewReplay && activeReviewAnswer
    ? activeReviewAnswer
    : answerFor(latestSeries.length ? latestSeries : challengeCandles());
  const startingXp = stats.xp;
  const startingLevel = currentLevel();
  const xpOrbCollection = isReviewReplay || isFreePlayReplay ? null : prepareXpOrbCollection(button, startingXp);
  revealed = true;
  if (appMode === "free" && rawCandles.length) rawCandles[0].freePlayCompletedAnswer = answer;
  const correct = choice === answer;
  const reviewXp = isReviewReplay ? (serverResult ? serverResult.reviewXp || 0 : resolveReviewPrediction(correct)) : 0;
  if (isReviewReplay && correct) markActiveReviewCorrect();
  if (isReviewReplay && serverResult) syncReviewControls();
  if (serverResult) serverResult.creditedCoins = serverResult.guestDay
    ? applyGuestProgress({ day: serverResult.guestDay, summary: serverResult.summary }) : applyHistorySummary(serverResult.summary);
  if (isReviewReplay && !serverResult) {
    stats.xp += reviewXp;
    syncReviewControls();
  }
  if (!isFreePlayReplay && !isReviewReplay && !serverResult) {
    stats.total += 1;
    if (correct) {
      stats.correct += 1;
      const earnedXp = 120 + stats.streak * 4;
      stats.xp += earnedXp;
      stats.streak += 1;
    } else {
      stats.xp += 30;
      stats.streak = 0;
    }
  }
  [...document.querySelectorAll(".choices button")].forEach(btn => {
    btn.disabled = appMode !== "free";
    const isCorrectAnswer = btn.dataset.choice === answer;
    btn.dataset.state = isCorrectAnswer ? "correct" : "wrong";
    applyPredictionResultColor(btn, btn.dataset.state);
    btn.classList.toggle("selected", btn === button);
    btn.classList.toggle("correct", isCorrectAnswer);
    btn.classList.toggle("wrong", !isCorrectAnswer);
  });
  const correctAnimationEnabled = document.body.dataset.theme === "gamify" && document.body.dataset.animationCorrect !== "off";
  const isRewardReplay = isFreePlayReplay || (!isReviewReplay && serverResult
    && (serverResult.record.rewardEligible === false || serverResult.created === false));
  if (appMode === "free") freePlayRedoAvailable = Boolean(isRewardReplay);
  const animationOnlyUp = correctAnimationEnabled && !isLive && !isRewardReplay && document.body.dataset.theme === "gamify" && correct && choice === "Up";
  result.innerHTML = animationOnlyUp
    ? ""
    : `<strong>${correct ? "Correct call" : "Not this time"}: ${answer}</strong><p>${explanationFor(answer)}</p><p><b>Next drill:</b> ${patternLessons[answer]?.drill || "Replay the chart and mark the decisive level."}</p>`;
  if (reviewXp) result.innerHTML += `<p><b>Review reward:</b> +${reviewXp} XP (half XP).</p>`;
  revealTag.textContent = animationOnlyUp ? "" : isReviewReplay ? "Expanded Review Chart" : correct ? "Scored +XP" : "Review lesson";
  if (isLive) {
    const prior = liveRound.rankedVersion === "live-v2" ? liveRound.outcome.open : rawCandles.at(-1).close;
    const close = liveRound.outcome.close;
    const move = (close - prior) / prior * 100;
    result.innerHTML = `<strong>${correct ? "Correct call" : "Not this time"}: ${answer}</strong><p>${formatMoney(prior)} → ${formatMoney(close)} (${move >= 0 ? "+" : ""}${move.toFixed(3)}%).</p>`;
    revealTag.textContent = "Live candle closed";
  }
  if (isRewardReplay) {
    result.innerHTML += "<p>This market outcome was already played. Replay practice earns no additional XP or coins.</p>";
    revealTag.textContent = "Practice replay · no rewards";
  }
  if (appMode === "free") {
    result.innerHTML += '<p><button type="button" class="secondary" data-free-play-replay>Redo puzzle · no rewards</button></p>';
  }
  if (!animationOnlyUp) {
    showToast(isReviewReplay ? `Replay revealed: ${answer}.` : correct ? `Correct. ${answer}.` : `Revealed: ${answer}. ${"Try another chart."}`);
  }
  let correctCelebrationDuration = correctAnimationEnabled ? 220 : 0;
  if (correctAnimationEnabled && correct && choice === "Up") {
    correctCelebrationDuration = playCorrectUpCelebration();
  }
  if (correctAnimationEnabled && correct && choice === "Down") {
    playCorrectDownCelebration();
    correctCelebrationDuration = 1600;
  }
  if (correctAnimationEnabled && correct && choice === "Sideways") {
    correctCelebrationDuration = playCorrectSidewaysCelebration();
  }
  if (correctAnimationEnabled && correct && ["Breakout", "Reversal", "Volatility spike"].includes(choice)) {
    correctCelebrationDuration = playCorrectMarketCelebration(choice);
  }
  const cloudRevealDelay = correctAnimationEnabled && correct && document.body.dataset.theme === "gamify"
    && !drawGamifyFutureClouds.motion?.media?.matches && drawGamifyFutureClouds.cover
    ? correctCelebrationDuration : 0;
  if (cloudRevealDelay) {
    drawGamifyFutureClouds.reveal = { started: performance.now() + cloudRevealDelay,
      time: drawGamifyFutureClouds.motion?.time || 0 };
  }
  let practiceExtra = {};
  if (isLive) practiceExtra = { live: true, timeframe: liveRound.interval, liveInterval: liveRound.interval, liveHistory: liveRound.history,
    liveTargetStart: liveRound.targetStart, liveTargetEnd: liveRound.targetEnd, source: liveRound.source };
  if (!isFreePlayReplay && !isReviewReplay && !serverResult) {
    const stake = isLive ? rankedRoundEntry(liveRound)?.stake || 0 : 0;
    practiceExtra.rewardSummary = { coinsBet: stake,
      coinsEarned: isLive ? Math.max(0, (liveRound.betPayout || 0) - stake) : 0,
      xpEarned: stats.xp - startingXp };
  }
  if (!isFreePlayReplay && !isReviewReplay && !serverResult) recordPracticeResult(answer, choice, correct, practiceExtra);
  if (serverResult) {
    if (!serverResult.guestDay) mergeServerRecord(serverResult.record);
    renderHeaderAccuracy();
    if (!isReviewReplay) {
      if (serverResult.created) recordFreePlayDayAnswer(serverResult.record);
      coinWallet().recordPrediction({ mode: serverResult.record.mode, id: serverResult.record.id,
        correct: serverResult.record.correct, dailyDate: serverResult.record.dailyDate, serverRecorded: true });
      renderCoinRewards();
    }
    cacheAccountHistory();
  }
  if (appMode === "daily") {
    renderModeSurface();
  }
  if (!isFreePlayReplay && (!isReviewReplay || reviewXp)) updateStats(startingLevel);
  const rewardCollection = correct && !isReviewReplay && !isRewardReplay && document.body.dataset.theme === "gamify"
    && document.body.dataset.animationXp !== "off"
    ? globalThis.createRewardCollection?.({ delay: correctCelebrationDuration + 140 }) : null;
  if (correct && !isReviewReplay && !isRewardReplay) {
    playXpOrbCollection(xpOrbCollection, stats.xp - startingXp, stats.xp, {
      delay: correctCelebrationDuration + 140, collection: rewardCollection
    });
  }
  if (!isFreePlayReplay && !isReviewReplay && !serverResult) {
    const coins = globalThis.coinRewards?.recordPrediction(appMode, correct, button, correct ? correctCelebrationDuration + 140 : 0, rewardCollection);
    practiceExtra.rewardSummary.coinsEarned = typeof coins === "number" ? practiceExtra.rewardSummary.coinsEarned + coins : null;
    savePracticeHistory();
  }
  if (serverResult?.creditedCoins) window.CoinRewards.playCollection(button, serverResult.creditedCoins, { delay: correct ? correctCelebrationDuration + 140 : 0, collection: rewardCollection });
  drawChart();
  syncNextChartButton();
}

async function startDaily() {
  if (dailyRound?.busy) return false;
  return loadDailyPuzzle();
}

const accuracyTrigger = document.getElementById("accuracyTrigger");
const accuracyPopover = document.getElementById("accuracyPopover");
let accuracyCloseTimer = null;
// Keep the pop-up clear of header stacking contexts and narrow-screen clipping.
if (accuracyTrigger && accuracyPopover) {
  document.body.appendChild(accuracyPopover);
  const keepAccuracyMenuOpen = event => {
    if (!desktopRailQuery.matches || event.pointerType === "touch") return;
    clearTimeout(accuracyCloseTimer);
    setAccuracyMenuOpen(true);
  };
  const scheduleAccuracyMenuClose = event => {
    if (!desktopRailQuery.matches || event.pointerType === "touch") return;
    if (accuracyTrigger.contains(event.relatedTarget) || accuracyPopover.contains(event.relatedTarget)) return;
    clearTimeout(accuracyCloseTimer);
    accuracyCloseTimer = setTimeout(() => setAccuracyMenuOpen(false), 140);
  };
  accuracyTrigger.addEventListener("pointerenter", keepAccuracyMenuOpen);
  accuracyTrigger.addEventListener("pointerleave", scheduleAccuracyMenuClose);
  accuracyPopover.addEventListener("pointerenter", keepAccuracyMenuOpen);
  accuracyPopover.addEventListener("pointerleave", scheduleAccuracyMenuClose);
  accuracyTrigger.addEventListener("click", event => {
    if (desktopRailQuery.matches && event.pointerType !== "touch") return;
    clearTimeout(accuracyCloseTimer);
    setAccuracyMenuOpen(accuracyPopover.hidden);
  });
  accuracyTrigger.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setAccuracyMenuOpen(accuracyPopover.hidden, true);
  });
  accuracyPopover.addEventListener("change", event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    headerAccuracyState.selected = [...accuracyPopover.querySelectorAll("input:checked")].map(input => input.value);
    saveHeaderAccuracyState();
    renderHeaderAccuracy();
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || accuracyPopover.hidden) return;
    event.preventDefault();
    setAccuracyMenuOpen(false);
    accuracyTrigger.focus();
  });
  accuracyPopover.addEventListener("focusout", event => {
    if (!accuracyPopover.matches(":hover") && !accuracyTrigger.matches(":hover")
      && !accuracyPopover.contains(event.relatedTarget) && !accuracyTrigger.contains(event.relatedTarget)) setAccuracyMenuOpen(false);
  });
  window.addEventListener("resize", positionAccuracyMenu);
  window.addEventListener("scroll", positionAccuracyMenu, true);
}

function positionAccuracyMenu() {
  if (!accuracyPopover || accuracyPopover.hidden) return;
  positionHeaderPopover(accuracyTrigger, accuracyPopover, true);
}

function positionHeaderPopover(trigger, popover, keepTriggerVisible = false) {
  if (keepTriggerVisible && desktopRailQuery.matches) popover.style.maxHeight = "";
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  // Leave breathing room beyond the metric cards' raised theme shadows.
  const gap = 20;
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const left = Math.max(margin, Math.min(rect.right - width, document.documentElement.clientWidth - width - margin));
  const top = Math.max(margin, Math.min(rect.bottom + gap, window.innerHeight - height - margin));
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  if (keepTriggerVisible) {
    const below = Math.max(0, window.innerHeight - margin - (rect.bottom + gap));
    const above = Math.max(0, rect.top - gap - margin);
    const contentHeight = popover.scrollHeight + popover.offsetHeight - popover.clientHeight;
    const placeBelow = contentHeight <= below || below >= above;
    popover.style.maxHeight = `${placeBelow ? below : above}px`;
    popover.style.top = `${placeBelow ? rect.bottom + gap : rect.top - gap - popover.offsetHeight}px`;
  }
}

function setAccuracyMenuOpen(open, focusInput = false) {
  if (!accuracyTrigger || !accuracyPopover) return;
  clearTimeout(accuracyCloseTimer);
  if (open && streakPopover && !streakPopover.hidden) {
    streakMenuPinned = false;
    setStreakMenuOpen(false);
  }
  accuracyPopover.hidden = !open;
  accuracyTrigger.setAttribute("aria-expanded", String(open));
  if (open) {
    renderHeaderAccuracy();
    positionAccuracyMenu();
    if (focusInput) accuracyPopover.querySelector("input")?.focus({ preventScroll: true });
  }
}

function loadHeaderAccuracyState() {
  let saved;
  try {
    saved = readBrowserData(HEADER_ACCURACY_KEY, null);
  } catch {}
  const selected = Array.isArray(saved?.selected)
    ? HEADER_ACCURACY_MODES.filter(mode => saved.selected.includes(mode))
    : [...HEADER_ACCURACY_MODES];
  const totals = Object.fromEntries(HEADER_ACCURACY_MODES.map(mode => {
    const total = Math.max(0, Math.floor(Number(saved?.totals?.[mode]?.total) || 0));
    const correct = Math.min(total, Math.max(0, Math.floor(Number(saved?.totals?.[mode]?.correct) || 0)));
    return [mode, { total, correct }];
  }));
  if (!saved?.totals) {
    // Older aggregate stats cannot be split by mode. Seed the available history once;
    // keep cumulative counts from here on, independent of the 120-record history cap.
    practiceHistory.filter(record => record?.mode !== "review").flatMap(record => record.type === "versus-match"
      ? (record.rounds || []).map(round => ({ ...round, mode: "versus" }))
      : [record]).forEach(record => {
      if (!HEADER_ACCURACY_MODES.includes(record?.mode) || typeof record.correct !== "boolean") return;
      totals[record.mode].total += 1;
      totals[record.mode].correct += Number(record.correct);
    });
  }
  const state = { selected, totals };

  return state;
}

function saveHeaderAccuracyState() {
  return writeBrowserData(HEADER_ACCURACY_KEY, headerAccuracyState);
}

function recordHeaderAccuracy(record) {
  if (!HEADER_ACCURACY_MODES.includes(record?.mode) || typeof record.correct !== "boolean") return;
  const counts = headerAccuracyState.totals[record.mode];
  counts.total += 1;
  counts.correct += Number(record.correct);
  saveHeaderAccuracyState();
  renderHeaderAccuracy();
}

function headerAccuracyPercent(state = headerAccuracyState) {
  const played = state.selected.map(mode => state.totals[mode]).filter(counts => counts.total > 0);
  return played.length ? Math.round(played.reduce((sum, counts) => sum + counts.correct / counts.total * 100, 0) / played.length) : null;
}

function renderHeaderAccuracy() {
  const value = headerAccuracyPercent();
  const accuracy = document.getElementById("accuracy");
  if (accuracy) accuracy.textContent = value === null ? "—" : `${value}%`;
  document.querySelectorAll("#accuracyPopover input").forEach(input => {
    input.checked = headerAccuracyState.selected.includes(input.value);
  });
  document.querySelectorAll("[data-accuracy-mode]").forEach(output => {
    const counts = headerAccuracyState.totals[output.dataset.accuracyMode];
    output.textContent = counts.total ? `${Math.round(counts.correct / counts.total * 100)}%` : "Not played";
    output.title = `${counts.correct} correct / ${counts.total} attempts`;
  });
  const summary = document.getElementById("accuracySummary");
  if (summary) {
    summary.hidden = headerAccuracyState.selected.length > 0 && value !== null;
    summary.textContent = !headerAccuracyState.selected.length ? "Select a mode to display accuracy."
      : value === null ? "No attempts in the selected modes yet." : "";
  }
}

function updateStats() {
  if (typeof reconcileAccountProgress === "function") reconcileAccountProgress();
  stats = cleanStats(stats);
  saveStats();
  const xp = document.getElementById("xp");
  const streak = document.getElementById("streak");
  if (xp) window.updateXpReadout(stats.xp);
  if (streak) streak.textContent = currentDayStreak();
  renderHeaderAccuracy();
  renderStreakCalendar();
  renderAccountLevel();
}

function practiceActivityDates() {

  return new Set([...legacyStreakDays, ...Object.keys(freePlayDailyAnswers).filter(date => freePlayDailyAnswers[date] >= DAY_STREAK_PUZZLES_REQUIRED)]);
}

function currentDayStreak(activeDates = practiceActivityDates(), now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const key = () => dateToIso(day.getFullYear(), day.getMonth(), day.getDate());
  // Yesterday's streak remains alive until the end of today.
  if (!activeDates.has(key())) day.setDate(day.getDate() - 1);
  let count = 0;
  while (activeDates.has(key())) {
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

const STREAK_MONTH_ABBREVIATIONS = ["JA", "FE", "MR", "AP", "MY", "JN", "JL", "AU", "SE", "OC", "NV", "DE"];
const STREAK_MONTH_PAGE_SIZE = 7;
const STREAK_MONTH_SCROLL_BUFFER = 24;
let streakCalendarMonth = new Date();
streakCalendarMonth = new Date(streakCalendarMonth.getFullYear(), streakCalendarMonth.getMonth(), 1);
let streakMonthWindow = new Date(streakCalendarMonth);
let streakMonthStripStart = null;
let streakMonthPendingScroll = null;
let streakMonthScrollTimer = 0;
let streakMonthDrag = null;
let streakMonthSuppressClick = false;
let streakMonthInertiaFrame = 0;

function streakMonthStep() {
  if (!streakMonthStrip?.clientWidth) return 0;
  const button = streakMonthStrip?.firstElementChild;
  return button ? button.getBoundingClientRect().width + (parseFloat(getComputedStyle(streakMonthStrip).columnGap) || 0) : 0;
}

function positionStreakMonthStrip() {
  if (streakMonthPendingScroll === null || !streakMonthStrip?.clientWidth) return;
  const step = streakMonthStep();
  if (!step) return;
  streakMonthStrip.scrollLeft = (streakMonthPendingScroll - streakMonthStripStart) * step;
  streakMonthPendingScroll = null;
}

function syncStreakMonthScroll() {
  if (streakMonthPendingScroll !== null) return;
  const step = streakMonthStep();
  if (!step) return;
  const first = streakMonthStripStart + streakMonthStrip.scrollLeft / step;
  const center = Math.round(first) + Math.floor(STREAK_MONTH_PAGE_SIZE / 2);
  streakMonthWindow = new Date(Math.floor(center / 12), ((center % 12) + 12) % 12, 1);
  const firstYear = Math.floor(Math.floor(first + 0.01) / 12);
  const lastYear = Math.floor(Math.ceil(first + STREAK_MONTH_PAGE_SIZE - 1 - 0.01) / 12);
  streakMonthYear.textContent = firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`;
}

function stopStreakMonthInertia() {
  window.cancelAnimationFrame(streakMonthInertiaFrame);
  streakMonthInertiaFrame = 0;
}

function coastStreakMonths(velocity) {
  stopStreakMonthInertia();
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  velocity = Math.max(-2.8, Math.min(2.8, velocity));
  let previousTime = performance.now();
  const coast = now => {
    const elapsed = Math.min(32, now - previousTime);
    previousTime = now;
    const previousLeft = streakMonthStrip.scrollLeft;
    velocity *= Math.exp(-0.0044 * elapsed);
    streakMonthStrip.scrollLeft += velocity * elapsed;
    if (Math.abs(velocity) > 0.018 && Math.abs(streakMonthStrip.scrollLeft - previousLeft) > 0.1) {
      streakMonthInertiaFrame = window.requestAnimationFrame(coast);
    } else {
      streakMonthInertiaFrame = 0;
    }
  };
  streakMonthInertiaFrame = window.requestAnimationFrame(coast);
}

function endStreakMonthDrag(event, coast = true) {
  if (!streakMonthDrag || streakMonthDrag.pointerId !== event.pointerId) return;
  const drag = streakMonthDrag;
  streakMonthDrag = null;
  streakMonthSuppressClick = drag.moved;
  streakMonthStrip.classList.remove("is-dragging");
  if (streakMonthStrip.hasPointerCapture?.(event.pointerId)) streakMonthStrip.releasePointerCapture(event.pointerId);
  if (coast && drag.moved && performance.now() - drag.lastTime < 80) coastStreakMonths(drag.velocity);
  window.setTimeout(() => { streakMonthSuppressClick = false; }, 0);
}

function renderStreakCalendar() {
  if (!streakCalendar || !streakMonthLabel || !streakMonthYear || !streakMonthStrip || !streakPopoverCount) return;
  const now = new Date();
  const year = streakCalendarMonth.getFullYear();
  const month = streakCalendarMonth.getMonth();
  const windowYear = streakMonthWindow.getFullYear();
  const windowMonth = streakMonthWindow.getMonth();
  const today = dateToIso(now.getFullYear(), now.getMonth(), now.getDate());
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const activeDates = practiceActivityDates();
  streakPopoverCount.textContent = currentDayStreak(activeDates);
  const progress = document.getElementById("streakDailyProgress");
  if (progress) progress.textContent = `Today: ${freePlayDailyAnswers[today] || 0}/${DAY_STREAK_PUZZLES_REQUIRED} Free Play answers`;
  streakMonthLabel.textContent = streakCalendarMonth.toLocaleDateString(globalThis.siteI18n?.locale, { month: "long" });
  const firstYear = new Date(windowYear, windowMonth - Math.floor(STREAK_MONTH_PAGE_SIZE / 2), 1).getFullYear();
  const lastYear = new Date(windowYear, windowMonth + Math.floor(STREAK_MONTH_PAGE_SIZE / 2), 1).getFullYear();
  streakMonthYear.textContent = firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`;
  const firstMonth = windowYear * 12 + windowMonth - Math.floor(STREAK_MONTH_PAGE_SIZE / 2);
  // Hidden popovers have no scroll geometry; restore their month window when opened.
  if (!streakMonthStrip.clientWidth) streakMonthPendingScroll ??= firstMonth;
  if (streakMonthStripStart === null || firstMonth < streakMonthStripStart + STREAK_MONTH_PAGE_SIZE
    || firstMonth > streakMonthStripStart + STREAK_MONTH_SCROLL_BUFFER * 2 - STREAK_MONTH_PAGE_SIZE) {
    streakMonthPendingScroll ??= firstMonth;
    streakMonthStripStart = firstMonth - STREAK_MONTH_SCROLL_BUFFER;
  }
  const previousLeft = streakMonthStrip.scrollLeft;
  streakMonthStrip.innerHTML = Array.from({ length: STREAK_MONTH_PAGE_SIZE + STREAK_MONTH_SCROLL_BUFFER * 2 }, (_, index) => {
    const absoluteMonth = streakMonthStripStart + index;
    const option = new Date(Math.floor(absoluteMonth / 12), ((absoluteMonth % 12) + 12) % 12, 1);
    const offset = absoluteMonth - (windowYear * 12 + windowMonth);
    const selected = option.getFullYear() === year && option.getMonth() === month;
    const label = option.toLocaleDateString(globalThis.siteI18n?.locale, { month: "long", year: "numeric" });
    const key = `${option.getFullYear()}-${String(option.getMonth() + 1).padStart(2, "0")}-`;
    const activeDays = [...activeDates].filter(date => date.startsWith(key)).length;
    const optionDays = new Date(option.getFullYear(), option.getMonth() + 1, 0).getDate();
    const consistency = Math.min(100, Math.round((activeDays / optionDays) * 100));
    const activityLabel = `${activeDays} of ${optionDays} active days (${consistency}%)`;
    return `<button type="button" class="streak-month-button${selected ? " is-selected" : ""}" style="--streak-month-consistency:${consistency}%" data-streak-month-year="${option.getFullYear()}" data-streak-month-index="${option.getMonth()}" data-streak-month-window-offset="${offset}" aria-label="${label}: ${activityLabel}" aria-pressed="${selected}" title="${label}: ${activityLabel}">${STREAK_MONTH_ABBREVIATIONS[option.getMonth()]}</button>`;
  }).join("");
  streakMonthStrip.scrollLeft = previousLeft;
  positionStreakMonthStrip();
  syncStreakMonthScroll();
  const visibleCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const days = Array.from({ length: visibleCells }, (_, index) => {
    const date = new Date(year, month, 1 - firstWeekday + index);
    const day = date.getDate();
    const iso = dateToIso(date.getFullYear(), date.getMonth(), day);
    const outside = date.getMonth() !== month || date.getFullYear() !== year;
    const active = activeDates.has(iso);
    const state = outside ? "adjacent month" : active ? "streak day" : "no streak";
    return `<span class="streak-day${outside ? " is-outside" : ""}${active ? " is-active" : ""}${iso === today ? " is-today" : ""}" role="gridcell" aria-label="${iso}: ${state}" title="${state}">${day}</span>`;
  }).join("");
  streakCalendar.innerHTML = days;
  streakCalendar.setAttribute("aria-label", `${streakMonthLabel.textContent} ${year} streak activity`);
  positionStreakMenu();
}

function moveStreakCalendarMonth(offset) {
  if (!Number.isFinite(offset) || !offset) return;
  streakCalendarMonth = new Date(streakCalendarMonth.getFullYear(), streakCalendarMonth.getMonth() + offset, 1);
  const distance = (streakCalendarMonth.getFullYear() - streakMonthWindow.getFullYear()) * 12
    + streakCalendarMonth.getMonth() - streakMonthWindow.getMonth();
  const pageOffset = Math.floor((distance + Math.floor(STREAK_MONTH_PAGE_SIZE / 2)) / STREAK_MONTH_PAGE_SIZE);
  streakMonthWindow = new Date(streakMonthWindow.getFullYear(), streakMonthWindow.getMonth() + pageOffset * STREAK_MONTH_PAGE_SIZE, 1);
  if (pageOffset) {
    stopStreakMonthInertia();
    streakMonthPendingScroll = streakMonthWindow.getFullYear() * 12 + streakMonthWindow.getMonth() - Math.floor(STREAK_MONTH_PAGE_SIZE / 2);
  }
  renderStreakCalendar();
}

function moveStreakMonthWindow(offset) {
  if (!Number.isFinite(offset) || !offset) return;
  stopStreakMonthInertia();
  const months = offset * STREAK_MONTH_PAGE_SIZE;
  const selectionOffset = Math.max(-3, Math.min(3, (streakCalendarMonth.getFullYear() - streakMonthWindow.getFullYear()) * 12
    + streakCalendarMonth.getMonth() - streakMonthWindow.getMonth()));
  streakMonthWindow = new Date(streakMonthWindow.getFullYear(), streakMonthWindow.getMonth() + months, 1);
  streakCalendarMonth = new Date(streakMonthWindow.getFullYear(), streakMonthWindow.getMonth() + selectionOffset, 1);
  streakMonthPendingScroll = streakMonthWindow.getFullYear() * 12 + streakMonthWindow.getMonth() - Math.floor(STREAK_MONTH_PAGE_SIZE / 2);
  renderStreakCalendar();
}

function moveBothStreakMonthViews(offset) {
  moveStreakMonthWindow(offset);
}

function bindHorizontalMonthScroll(element, onMove) {
  if (!element) return;
  let wheelLocked = false;
  let pointerStartX = null;
  element.addEventListener("wheel", event => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 4) return;
    event.preventDefault();
    event.stopPropagation();
    if (wheelLocked) return;
    wheelLocked = true;
    onMove(delta > 0 ? 1 : -1);
    window.setTimeout(() => { wheelLocked = false; }, 140);
  }, { passive: false });
  element.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    onMove(event.key === "ArrowRight" ? 1 : -1);
  });
  element.addEventListener("pointerdown", event => { pointerStartX = event.clientX; });
  element.addEventListener("pointerup", event => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) < 28) return;
    event.preventDefault();
    event.stopPropagation();
    element.dataset.streakSwipeConsumed = "true";
    onMove(distance < 0 ? 1 : -1);
    window.setTimeout(() => { delete element.dataset.streakSwipeConsumed; }, 0);
  });
  element.addEventListener("pointercancel", () => { pointerStartX = null; });
}

let streakMenuPinned = false;
let streakMenuCloseTimer = 0;

function positionStreakMenu() {
  if (!streakPopover || streakPopover.hidden) return;
  positionHeaderPopover(streakMenu, streakPopover, true);
}

function setStreakMenuOpen(open) {
  if (!streakMenu || !streakTrigger || !streakPopover) return;
  window.clearTimeout(streakMenuCloseTimer);
  if (open) setAccuracyMenuOpen(false);
  const calendar = document.getElementById("streakAccountCalendar");
  if (calendar) calendar.hidden = false;
  streakPopover.setAttribute("aria-label", "Day streak calendar");
  if (open) renderStreakCalendar();
  streakPopover.setAttribute("aria-hidden", String(!open));
  streakMenu.classList.toggle("is-open", open);
  streakTrigger.setAttribute("aria-expanded", String(open));
  streakPopover.hidden = !open;
  if (open) {
    positionStreakMonthStrip();
    positionStreakMenu();
  } else stopStreakMonthInertia();
}

if (streakMenu && streakTrigger && streakPopover) {
  document.body.appendChild(streakPopover);
  window.addEventListener("resize", positionStreakMenu);
  window.addEventListener("scroll", positionStreakMenu, true);
  streakMenu.addEventListener("pointerover", event => {
    if (!desktopRailQuery.matches || event.pointerType !== "mouse" || streakMenu.classList.contains("is-open")) return;
    setStreakMenuOpen(true);
  });
  streakMenu.addEventListener("focusin", () => setStreakMenuOpen(true));
  const scheduleStreakClose = event => {
    if (streakMenu.contains(event.relatedTarget) || streakPopover.contains(event.relatedTarget)) return;
    if (streakMenuPinned) return;
    streakMenuCloseTimer = window.setTimeout(() => setStreakMenuOpen(false), 120);
  };
  streakMenu.addEventListener("mouseleave", scheduleStreakClose);
  streakPopover.addEventListener("pointerenter", () => window.clearTimeout(streakMenuCloseTimer));
  streakPopover.addEventListener("mouseleave", scheduleStreakClose);
  streakMenu.addEventListener("click", event => {
    if (streakPopover.contains(event.target)) return;
    if (!streakTrigger.contains(event.target) && desktopRailQuery.matches && event.pointerType !== "touch") return;
    streakMenuPinned = !streakMenuPinned;
    setStreakMenuOpen(streakMenuPinned);
    if (streakMenuPinned) streakPopover.querySelector("#streakAccountCalendar button")?.focus({ preventScroll: true });
  });
  const closeStreakOnFocusOut = event => {
    if (streakMenuPinned || streakMenu.contains(event.relatedTarget) || streakPopover.contains(event.relatedTarget)) return;
    setStreakMenuOpen(false);
  };
  streakMenu.addEventListener("focusout", closeStreakOnFocusOut);
  streakPopover.addEventListener("focusout", closeStreakOnFocusOut);
  document.addEventListener("click", event => {
    if (event.composedPath().includes(streakMenu) || event.composedPath().includes(streakPopover)) return;
    streakMenuPinned = false;
    setStreakMenuOpen(false);
  });
}

if (streakMonthStrip) {
  streakMonthStrip.addEventListener("scroll", () => {
    syncStreakMonthScroll();
    window.clearTimeout(streakMonthScrollTimer);
    // Refill only after scrolling settles, so native touch momentum is uninterrupted.
    streakMonthScrollTimer = window.setTimeout(() => {
      if (streakMonthDrag || streakMonthInertiaFrame || streakMonthPendingScroll !== null) return;
      const step = streakMonthStep();
      if (!step) return;
      const first = streakMonthStripStart + streakMonthStrip.scrollLeft / step;
      if (first >= streakMonthStripStart + STREAK_MONTH_PAGE_SIZE
        && first <= streakMonthStripStart + STREAK_MONTH_SCROLL_BUFFER * 2 - STREAK_MONTH_PAGE_SIZE) return;
      streakMonthPendingScroll = first;
      renderStreakCalendar();
    }, 180);
  });
  streakMonthStrip.addEventListener("wheel", event => {
    if (event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    stopStreakMonthInertia();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? streakMonthStrip.clientWidth : 1;
    streakMonthStrip.scrollLeft += (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
  }, { passive: false });
  streakMonthStrip.addEventListener("pointerdown", event => {
    if (event.isPrimary === false || event.button !== 0) return;
    stopStreakMonthInertia();
    // Native touch scrolling also starts on month buttons and preserves tap selection.
    if (event.pointerType === "touch") return;
    streakMonthDrag = { pointerId: event.pointerId, startX: event.clientX, lastX: event.clientX,
      startLeft: streakMonthStrip.scrollLeft, lastTime: performance.now(), velocity: 0, moved: false };
  });
  streakMonthStrip.addEventListener("pointermove", event => {
    if (!streakMonthDrag || streakMonthDrag.pointerId !== event.pointerId) return;
    const distance = event.clientX - streakMonthDrag.startX;
    if (!streakMonthDrag.moved && Math.abs(distance) < 4) return;
    if (!streakMonthDrag.moved) {
      streakMonthStrip.setPointerCapture?.(event.pointerId);
      streakMonthStrip.classList.add("is-dragging");
    }
    streakMonthDrag.moved = true;
    const now = performance.now();
    const elapsed = Math.max(1, now - streakMonthDrag.lastTime);
    streakMonthDrag.velocity = streakMonthDrag.velocity * 0.62 + (streakMonthDrag.lastX - event.clientX) / elapsed * 0.38;
    streakMonthDrag.lastX = event.clientX;
    streakMonthDrag.lastTime = now;
    streakMonthStrip.scrollLeft = streakMonthDrag.startLeft - distance;
    event.preventDefault();
  });
  streakMonthStrip.addEventListener("pointerup", endStreakMonthDrag);
  window.addEventListener("pointerup", endStreakMonthDrag);
  streakMonthStrip.addEventListener("pointercancel", event => endStreakMonthDrag(event, false));
  streakMonthStrip.addEventListener("lostpointercapture", event => endStreakMonthDrag(event, false));
  streakMonthStrip.addEventListener("click", event => {
    if (streakMonthSuppressClick) {
      event.preventDefault();
      return;
    }
    const button = event.target.closest("[data-streak-month-year][data-streak-month-index]");
    if (!button) return;
    stopStreakMonthInertia();
    streakCalendarMonth = new Date(Number(button.dataset.streakMonthYear), Number(button.dataset.streakMonthIndex), 1);
    renderStreakCalendar();
    streakMonthStrip.querySelector(".streak-month-button.is-selected")?.focus({ preventScroll: true });
  });
}

streakMonthPicker?.addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  moveStreakCalendarMonth(event.key === "ArrowRight" ? 1 : -1);
  streakMonthStrip.querySelector(".streak-month-button.is-selected")?.focus();
});
window.addEventListener("resize", () => {
  streakMonthPendingScroll = streakMonthWindow.getFullYear() * 12 + streakMonthWindow.getMonth() - Math.floor(STREAK_MONTH_PAGE_SIZE / 2);
  positionStreakMonthStrip();
});
bindHorizontalMonthScroll(streakCalendarPanel, moveStreakCalendarMonth);
streakMonthPrev?.addEventListener("click", () => moveStreakMonthWindow(-1));
streakMonthNext?.addEventListener("click", () => moveStreakMonthWindow(1));
streakCalendarPrev?.addEventListener("click", () => moveStreakCalendarMonth(-1));
streakCalendarNext?.addEventListener("click", () => moveStreakCalendarMonth(1));
streakLinkedPrev?.addEventListener("click", () => moveBothStreakMonthViews(-1));
streakLinkedNext?.addEventListener("click", () => moveBothStreakMonthViews(1));

function renderSuggestions(items) {
  lastSuggestions = items;
  suggestionIndex = -1;
  if (!items.length) {
    suggestions.hidden = true;
    tickerInput.setAttribute("aria-expanded", "false");
    return;
  }
  suggestions.innerHTML = items.map((symbol, idx) => `
    <button class="suggestion" type="button" role="option" data-index="${idx}">
      <strong>${escapeHtml(symbol.ticker)}</strong><span>${escapeHtml(symbol.name)}</span><small>${escapeHtml(symbol.asset)}</small>
    </button>
  `).join("");
  suggestions.hidden = false;
  tickerInput.setAttribute("aria-expanded", "true");
}

function closeSymbolResults(options = {}) {
  if (!symbolResultsPage || symbolResultsPage.hidden) return;
  symbolResultsPage.hidden = true;
  document.body.classList.remove("symbol-results-open");
  updateBreadcrumb();
  if (options.focus !== false) {
    tickerInput.focus();
    tickerInput.select();
  }
  window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });
}

function searchResultScore(item, query) {
  const needle = query.trim().toUpperCase();
  const ticker = normalizeSymbol(item?.ticker || "");
  const name = String(item?.name || "").toUpperCase();
  if (ticker === needle) return 0;
  if (name === needle) return 1;
  if (name.startsWith(needle)) return 2;
  if (ticker.startsWith(needle)) return 3;
  if (name.includes(needle)) return 4;
  if (ticker.includes(needle)) return 5;
  return 6;
}

function prepareSymbolResults(items, query) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .filter(item => {
      const ticker = normalizeSymbol(item?.ticker || "");
      if (!ticker || seen.has(ticker)) return false;
      seen.add(ticker);
      return true;
    })
    .map((item, index) => ({ ...item, _searchOrder: index }))
    .sort((a, b) => searchResultScore(a, query) - searchResultScore(b, query) || a._searchOrder - b._searchOrder);
}

function renderSymbolResults(query, items) {
  if (!symbolResultsPage) return;
  const matches = prepareSymbolResults(items, query);
  symbolResultsTitle.textContent = `Matches for "${query}"`;
  symbolResultsSummary.textContent = matches.length
    ? `${matches.length} available ${matches.length === 1 ? "option" : "options"} found. Choose one to open its Free Play chart.`
    : `No available symbols matched "${query}". Try a company name, ticker, ETF, index, or cryptocurrency.`;
  symbolResultsInput.value = query;
  symbolResultsList.innerHTML = matches.length ? matches.map(item => `
    <article class="symbol-result-row">
      <div class="symbol-result-identity">
        <h2 translate="no">${escapeHtml(item.name || item.ticker)}</h2>
        <p>
          <span class="symbol-result-ticker">${escapeHtml(item.ticker)}</span>
          <span class="symbol-result-separator" aria-hidden="true">&middot;</span>
          <span>${escapeHtml(item.asset || item.quoteType || "market")}</span>
        </p>
      </div>
      <div class="symbol-result-market">
        <span>Market</span>
        <strong>${escapeHtml(item.exchange || "Available market")}</strong>
      </div>
      <button type="button" data-symbol-result="${escapeHtml(item.ticker)}" aria-label="Open ${escapeHtml(item.name || item.ticker)}">Open</button>
    </article>
  `).join("") : `
    <div class="symbol-results-empty">
      <span>No matches yet</span>
      <h2>Try a broader search</h2>
      <p>For example: Tesla, TSLA, S&amp;P 500, Bitcoin, gold, or Nasdaq.</p>
      <button type="button" data-symbol-results-focus>Search again</button>
    </div>
  `;
  symbolResultsPage.hidden = false;
  document.body.classList.add("symbol-results-open");
  if (breadcrumb) breadcrumb.textContent = "Pretium Labs / Free Play / Symbol matches";
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.querySelector(".symbol-result-row [data-symbol-result]")?.focus();
  if (!matches.length) symbolResultsInput.focus();
  tickerInput.value = query;
  symbolStatus.classList.remove("loading");
  symbolStatus.classList.toggle("error", !matches.length);
  symbolStatus.textContent = matches.length
    ? `Choose the correct symbol for "${query}".`
    : `No symbol suggestions for "${query}".`;
}

async function openFreePlaySearchResults(raw) {
  const value = raw.trim();
  if (!value) {
    showSymbolError("blank", "Type a company name or market symbol first.");
    return false;
  }
  const normalized = normalizeSymbol(value);
  setMobileChartSearchOpen(false);
  selectFreePlayManualSymbol();
  if (aliases.has(value.toUpperCase())) return submitSymbol(normalized);
  const requestId = ++searchRequestId;
  suggestions.hidden = true;
  tickerInput.setAttribute("aria-expanded", "false");
  symbolStatus.classList.remove("error");
  symbolStatus.classList.add("loading");
  symbolStatus.textContent = `Finding matches for "${value}"...`;
  try {
    const items = await searchMarket(value);
    if (requestId !== searchRequestId || appMode !== "free") return false;
    const exact = items.find(item => normalizeSymbol(item.ticker || "") === normalized);
    if (exact) return submitSymbol(exact.ticker);
    renderSymbolResults(value, items);
    return false;
  } catch (error) {
    if (requestId !== searchRequestId || appMode !== "free") return false;
    showSymbolError(value, error.message);
    return false;
  }
}

async function submitSymbol(raw, options = {}) {
  if (appMode === "ranked" && rankedRoundCommitted()) {
    showToast("You have bought into this Ranked round. Finish it before switching pages or charts.");
    return false;
  }
  if (appMode === "review" && reviewChartActive && !activeReviewRecordId) return false;
  searchRequestId += 1;
  clearTimeout(searchTimer);
  const remember = options.remember !== false;
  const value = raw.trim();
  if (!value) {
    showSymbolError("blank", "Type a real market symbol first.");
    return false;
  }
  if (appMode === "free" && !options.preserveFreePlayScope) selectFreePlayManualSymbol(value);
  if ("packWindow" in options) activePackWindow = options.packWindow;
  else if (appMode !== "packs") activePackWindow = null;
  suggestions.hidden = true;
  symbolStatus.classList.remove("error");
  symbolStatus.classList.add("loading");
  symbolStatus.textContent = `Loading ${normalizeSymbol(value)}...`;
  tickerInput.classList.remove("valid", "invalid");
  setLoading(true, `Fetching ${normalizeSymbol(value)}...`);
  try {
    const loaded = await loadMarketChart(value, { randomWindow: options.randomWindow === true });
    if (!loaded) return false;
    if (appMode === "free") {
      freePlayRedoAvailable = false;
      freePlayRandomSettings = { ...freePlayRandomSettings, lastSymbol: currentSymbol.ticker };
      saveFreePlayRandomSettings();
      syncNextChartButton();
    }
    if (appMode === "paper") {
      paperChartSymbol = currentSymbol.ticker;
      const paperRequestId = chartRequestId;
      await refreshPaperQuote(currentSymbol.ticker);
      if (paperRequestId !== chartRequestId || appMode !== "paper") return false;
    }
    if (remember && appMode !== "daily") {
      modeSymbols[appMode] = currentSymbol.ticker;
    }
    return true;
  } catch (error) {
    setLoading(false);
    showSymbolError(value, appMode === "ranked" && liveMarketClosed ? "Market Closed" : error.message);
    if (appMode === "packs" && packChartActive) showEventPackUnavailable();
    if (appMode === "ranked") drawChart();
    return false;
  }
}

document.getElementById("reviewHintBtn").onclick = toggleReviewHint;
document.getElementById("reviewStatusBtn").onclick = toggleActiveReviewStatus;
result.addEventListener("click", event => {
  if (event.target.closest("[data-free-play-replay]")) replayFreePlayPuzzle();
});

document.getElementById("nextBtn").onclick = async () => {
  if (appMode === "packs" && (!eventPackChartReady() || isEventPackPaper())) return;
  if (appMode === "daily") return;
  if (nextChartLoading) return;
  if (appMode === "review") {
    await nextReviewChart();
    return;
  }
  if (appMode === "ranked") {
    if (liveMarketClosed) return;
    await submitSymbol(liveMarketSymbol || currentSymbol.ticker || symbolForMode("ranked"));
    return;
  }
  if (appMode === "free") {
    if (freePlayRedoAvailable && revealed && rawCandles[0]?.freePlayCompletedAnswer) {
      replayFreePlayPuzzle();
      return;
    }
    await loadFreePlayChart();
    return;
  }
  const nextButton = document.getElementById("nextBtn");
  nextChartLoading = true;
  nextButton.disabled = true;
  nextButton.textContent = "Loading next chart...";
  animateLoadingDots(nextButton);
  nextButton.setAttribute("aria-busy", "true");

  try {
    const symbol = currentSymbol.ticker;
    if (appMode === "packs" && rawCandles[0]?.backendPuzzleId) {
      await submitSymbol(symbol, { remember: false, packWindow: activePackWindow });
      return;
    }
    if (!symbol || !rawCandles.length || !randomizeCurrentChartWindow()) return;
    loadCurrentSymbol();
    if (appMode === "paper") renderPaperTradingIfCurrent();
  } finally {
    nextChartLoading = false;
    syncNextChartButton();
  }
};

const mobileSearchToggle = document.getElementById("mobileSearchToggle");
const mobileChartSearchQuery = window.matchMedia("(max-width: 620px), (max-width: 980px) and (max-height: 500px) and (pointer: coarse)");
const tickerSearchField = document.getElementById("tickerSearchField");
const tickerSearchHome = tickerSearchField.parentElement;

function updateMobileSearchViewport() {
  if (!tickerSearchField.classList.contains("mobile-search-sheet")) return;
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const bottom = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
  tickerSearchField.style.setProperty("--mobile-search-bottom", `${bottom}px`);
  tickerSearchField.style.setProperty("--mobile-search-height", `${height}px`);
  // The keyboard already covers the home indicator's safe area.
  tickerSearchField.style.setProperty("--mobile-search-safe-bottom", bottom > 80 ? "0px" : "env(safe-area-inset-bottom, 0px)");
}

function setMobileChartSearchOpen(open, { focus = false } = {}) {
  const expanded = open && mobileChartSearchQuery.matches && !tickerInput.disabled;
  const wasOpen = tickerSearchField.classList.contains("mobile-search-sheet");
  document.querySelector(".chart-head").classList.toggle("mobile-search-open", expanded);
  mobileSearchToggle.setAttribute("aria-expanded", String(expanded));
  mobileSearchToggle.setAttribute("aria-label", expanded ? "Close chart search" : "Open chart search");
  if (expanded) {
    if (!wasOpen) document.body.append(tickerSearchField);
    tickerSearchField.classList.add("mobile-search-sheet");
    updateMobileSearchViewport();
  } else if (wasOpen) {
    clearTimeout(searchTimer);
    searchRequestId += 1;
    suggestions.hidden = true;
    tickerInput.setAttribute("aria-expanded", "false");
    tickerInput.blur();
    tickerSearchField.classList.remove("mobile-search-sheet");
    tickerSearchField.style.removeProperty("--mobile-search-bottom");
    tickerSearchField.style.removeProperty("--mobile-search-height");
    tickerSearchField.style.removeProperty("--mobile-search-safe-bottom");
    tickerSearchHome.append(tickerSearchField);
  }
  if (expanded && focus) {
    // Keep focus inside the tap event so phone browsers can open their keyboard.
    tickerInput.focus({ preventScroll: true });
    tickerInput.select();
  } else if (!expanded && mobileChartSearchQuery.matches) {
    suggestions.hidden = true;
    if (document.activeElement === tickerInput) tickerInput.blur();
  }
}

mobileSearchToggle.addEventListener("click", () => {
  const open = mobileSearchToggle.getAttribute("aria-expanded") !== "true";
  setMobileChartSearchOpen(open, { focus: open });
});
mobileChartSearchQuery.addEventListener("change", () => setMobileChartSearchOpen(false));
window.visualViewport?.addEventListener("resize", updateMobileSearchViewport);
window.visualViewport?.addEventListener("scroll", updateMobileSearchViewport);
window.addEventListener("resize", updateMobileSearchViewport);
document.getElementById("mobileSearchClose").addEventListener("click", () => {
  setMobileChartSearchOpen(false);
  mobileSearchToggle.focus({ preventScroll: true });
});
tickerSearchField.addEventListener("keydown", event => {
  if (event.key === "Escape" && mobileSearchToggle.getAttribute("aria-expanded") === "true") {
    setMobileChartSearchOpen(false);
    mobileSearchToggle.focus();
  }
});
document.addEventListener("pointerdown", event => {
  if (tickerSearchField.classList.contains("mobile-search-sheet") &&
      !tickerSearchField.contains(event.target) && !mobileSearchToggle.contains(event.target)) {
    setMobileChartSearchOpen(false);
  }
});

document.getElementById("tickerForm").onsubmit = event => {
  event.preventDefault();
  if (tickerInput.value.trim()) setMobileChartSearchOpen(false);
  if (appMode === "free") openFreePlaySearchResults(tickerInput.value);
  else submitSymbol(tickerInput.value);
};

symbolResultsBack?.addEventListener("click", () => closeSymbolResults());

symbolResultsForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const query = symbolResultsInput.value.trim();
  if (!query) {
    symbolResultsInput.focus();
    return;
  }
  symbolResultsList.innerHTML = `<div class="symbol-results-loading"><strong>${loadingTextHtml("Finding available symbols...")}</strong><span>Checking company names and market tickers for "${escapeHtml(query)}".</span></div>`;
  try {
    renderSymbolResults(query, await searchMarket(query));
  } catch (error) {
    symbolResultsList.innerHTML = `<div class="symbol-results-empty"><span>Search unavailable</span><h2>We could not load matches</h2><p>${escapeHtml(error.message)}</p><button type="button" data-symbol-results-focus>Try again</button></div>`;
  }
});

symbolResultsList?.addEventListener("click", async event => {
  const selectButton = event.target.closest("[data-symbol-result]");
  if (selectButton) {
    const selectedSymbol = selectButton.dataset.symbolResult;
    closeSymbolResults({ focus: false, instant: true });
    tickerInput.value = selectedSymbol;
    await submitSymbol(selectedSymbol);
    return;
  }
  if (event.target.closest("[data-symbol-results-focus]")) symbolResultsInput.focus();
});

tickerInput.addEventListener("input", () => {
  if (tickerInput.disabled) return;
  clearTimeout(searchTimer);
  const query = tickerInput.value;
  const requestId = ++searchRequestId;
  tickerInput.classList.remove("valid", "invalid");
  if (!query.trim()) {
    suggestions.hidden = true;
    symbolStatus.textContent = "Type any real market symbol to practice.";
    symbolStatus.classList.remove("error", "loading");
    return;
  }
  symbolStatus.classList.remove("error");
  symbolStatus.classList.add("loading");
  symbolStatus.textContent = "Searching symbols...";
  searchTimer = setTimeout(async () => {
    try {
      const items = await searchMarket(query);
      if (requestId !== searchRequestId || query !== tickerInput.value) return;
      renderSuggestions(items);
      symbolStatus.classList.remove("loading");
      symbolStatus.textContent = items.length ? "Suggestions loaded." : `No symbol suggestions for "${query}".`;
      tickerInput.classList.toggle("valid", Boolean(items.length));
      tickerInput.classList.toggle("invalid", !items.length);
    } catch (error) {
      if (requestId !== searchRequestId || query !== tickerInput.value) return;
      showSymbolError(query, error.message);
    }
  }, 180);
});

tickerInput.addEventListener("keydown", event => {
  const items = [...suggestions.querySelectorAll(".suggestion")];
  if (suggestions.hidden || !items.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    suggestionIndex = event.key === "ArrowDown" ? Math.min(items.length - 1, suggestionIndex + 1) : Math.max(0, suggestionIndex - 1);
    items.forEach(item => item.classList.remove("active"));
    items[suggestionIndex].classList.add("active");
  }
  if (event.key === "Enter" && suggestionIndex >= 0) {
    event.preventDefault();
    setMobileChartSearchOpen(false);
    submitSymbol(lastSuggestions[suggestionIndex].ticker);
  }
  if (event.key === "Escape") suggestions.hidden = true;
});

suggestions.addEventListener("click", event => {
  const button = event.target.closest(".suggestion");
  if (button) {
    setMobileChartSearchOpen(false);
    showToast("Suggestion selected.");
    submitSymbol(lastSuggestions[Number(button.dataset.index)].ticker);
  }
});

assetSelect.onchange = async () => {
  await submitSymbol(assetDefaults[assetSelect.value]);
};

const appearanceMenu = document.getElementById("appearanceMenu");
const appearanceToggle = document.getElementById("appearanceToggle");
const appearancePopover = document.getElementById("appearancePopover");
let appearanceMenuPinned = false;

syncAnimationPreferences();
document.addEventListener("change", event => {
  const control = event.target.closest?.("[data-animation-option]");
  if (!control) return;
  animationPreferences[control.dataset.animationOption] = control.checked;
  try { localStorage.setItem(ANIMATION_KEY, JSON.stringify(animationPreferences)); } catch {}
  syncAnimationPreferences();
});

function setAppearanceMenuOpen(open) {
  appearancePopover.hidden = !open;
  appearanceToggle.setAttribute("aria-expanded", String(open));
  appearanceMenu.parentElement.classList.toggle("appearance-open", open);
  if (open) {
    const triggerTop = appearanceToggle.getBoundingClientRect().top;
    const availableTop = window.innerHeight - 8 - triggerTop - appearancePopover.offsetHeight;
    appearancePopover.style.top = `${Math.max(8 - triggerTop, Math.min(0, availableTop))}px`;
  }
}

window.addEventListener("resize", () => {
  if (!appearancePopover.hidden) setAppearanceMenuOpen(true);
});

appearanceMenu.addEventListener("pointerenter", event => {
  if (desktopRailQuery.matches && event.pointerType !== "touch") setAppearanceMenuOpen(true);
});
appearanceMenu.addEventListener("pointerleave", () => {
  if (!desktopRailQuery.matches) return;
  if (!appearanceMenuPinned && !appearanceMenu.contains(document.activeElement)) setAppearanceMenuOpen(false);
});
appearanceMenu.addEventListener("focusin", event => {
  if (desktopRailQuery.matches || event.target.matches(":focus-visible")) setAppearanceMenuOpen(true);
});
appearanceMenu.addEventListener("focusout", event => {
  if (!appearanceMenuPinned && !appearanceMenu.contains(event.relatedTarget)) setAppearanceMenuOpen(false);
});
appearanceToggle.addEventListener("click", () => {
  appearanceMenuPinned = !appearanceMenuPinned;
  setAppearanceMenuOpen(appearanceMenuPinned);
});
document.addEventListener("click", event => {
  if (appearanceMenu.contains(event.target)) return;
  appearanceMenuPinned = false;
  setAppearanceMenuOpen(false);
});
appearanceMenu.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  appearanceMenuPinned = false;
  appearanceToggle.focus();
  setAppearanceMenuOpen(false);
});

document.addEventListener("click", event => {
  const button = event.target.closest?.("[data-theme-choice]");
  if (!button) return;
    const nextTheme = button.dataset.themeChoice;
    document.body.dataset.theme = nextTheme;
    syncAnimationPreferences();
    requestAnimationFrame(fitPredictionChoiceLabels);
    writeBrowserPreference(THEME_KEY, nextTheme);
    updateThemeToggleLabel();
    if (appMode === "account") {
      const restoreThemeFocus = button === document.activeElement && modeSurface.contains(button);
      renderAccountPage();
      if (restoreThemeFocus) modeSurface.querySelector(`[data-theme-choice="${nextTheme}"]`)?.focus({ preventScroll: true });
    }
    syncSoundPreference();
    drawChart();
    const themeLabel = nextTheme === "gamify" ? "Gamify" : nextTheme === "dark" ? "Dark" : "Light";
    showToast(`${themeLabel} mode enabled.`);
    playUiSound(nextTheme === "gamify" ? "power" : "tap");
    if (nextTheme === "gamify") celebrateAction();
});

const drawingToolsToggle = document.getElementById("drawingToolsToggle");
const drawingTools = document.getElementById("drawingTools");

function setDrawingToolsOpen(open, { persist = true } = {}) {
  if (!drawingToolsToggle || !drawingTools) return;
  if (!open) {
    resetDrawingGesture();
    activeTool = null;
    updateDrawingToolButtons();
    canvas.style.cursor = "grab";
  }
  drawingTools.hidden = !open;
  drawingToolsToggle.classList.toggle("active", open);
  drawingToolsToggle.setAttribute("aria-expanded", String(open));
  drawingToolsToggle.title = open ? "Hide chart drawing tools" : "Show chart drawing tools";
  if (persist) writeBrowserPreference(DRAWING_TOOLS_KEY, String(open));
  window.requestAnimationFrame(() => {
    resizeChartCanvas();
    drawChart();
  });
}

setDrawingToolsOpen(!mobileChartSearchQuery.matches && readBrowserPreference(DRAWING_TOOLS_KEY) === "true", { persist: false });
drawingToolsToggle?.addEventListener("click", () => {
  if (mobileChartSearchQuery.matches) {
    openMobileChart(true);
    return;
  }
  setDrawingToolsOpen(drawingToolsToggle.getAttribute("aria-expanded") !== "true");
});

const mobileChartDialog = document.getElementById("mobileChartDialog");
const mobileChartDraw = document.getElementById("mobileChartDraw");
const mobileChartClose = document.getElementById("mobileChartClose");
const chartShell = canvas.closest(".chart-shell");
let mobileChartPlaceholder = null;
let mobileChartReturnFocus = null;
let mobileChartTap = null;

function setMobileChartDrawing(open) {
  setDrawingToolsOpen(open, { persist: false });
  mobileChartDialog.classList.toggle("is-drawing", open);
  mobileChartDraw.classList.toggle("active", open);
  mobileChartDraw.setAttribute("aria-expanded", String(open));
}

function syncMobileChartEntry() {
  const expandable = mobileChartSearchQuery.matches && !mobileChartDialog.open;
  canvas.tabIndex = expandable ? 0 : -1;
  if (expandable) {
    canvas.setAttribute("role", "button");
    canvas.setAttribute("aria-label", "Expand chart");
    canvas.setAttribute("aria-haspopup", "dialog");
  } else {
    canvas.removeAttribute("role");
    canvas.removeAttribute("aria-label");
    canvas.removeAttribute("aria-haspopup");
  }
}

function openMobileChart(withDrawingTools = false) {
  if (!mobileChartSearchQuery.matches || mobileChartDialog.open) return;
  mobileChartReturnFocus = withDrawingTools ? drawingToolsToggle : canvas;
  // Preserve the page's geometry while the same chart is enlarged.
  mobileChartPlaceholder = document.createElement("div");
  mobileChartPlaceholder.style.height = `${chartShell.getBoundingClientRect().height}px`;
  mobileChartPlaceholder.style.margin = getComputedStyle(chartShell).margin;
  mobileChartPlaceholder.style.flex = "0 0 auto";
  chartShell.before(mobileChartPlaceholder);
  mobileChartDialog.append(chartShell);
  clearChartTouches();
  resetDrawingGesture();
  activeTool = null;
  updateDrawingToolButtons();
  canvas.style.cursor = "grab";
  document.body.classList.add("mobile-chart-open");
  mobileChartDialog.showModal();
  setMobileChartDrawing(withDrawingTools);
  syncMobileChartEntry();
  mobileChartClose.focus({ preventScroll: true });
}

function closeMobileChart() {
  if (!mobileChartPlaceholder) return;
  clearChartTouches();
  resetDrawingGesture();
  activeTool = null;
  updateDrawingToolButtons();
  canvas.style.cursor = "grab";
  if (mobileChartDialog.open) mobileChartDialog.close();
  mobileChartPlaceholder.replaceWith(chartShell);
  mobileChartPlaceholder = null;
  document.body.classList.remove("mobile-chart-open");
  setMobileChartDrawing(false);
  syncMobileChartEntry();
  mobileChartReturnFocus?.focus({ preventScroll: true });
}

mobileChartDraw.addEventListener("click", () => {
  const open = drawingTools.hidden;
  if (!open) {
    resetDrawingGesture();
    activeTool = null;
    updateDrawingToolButtons();
    canvas.style.cursor = "grab";
  }
  setMobileChartDrawing(open);
});
mobileChartClose.addEventListener("click", closeMobileChart);
mobileChartDialog.addEventListener("cancel", event => {
  event.preventDefault();
  closeMobileChart();
});
mobileChartDialog.addEventListener("close", () => {
  if (!mobileChartDialog.open) closeMobileChart();
});
// Drawing beyond an edge must not count as an outside tap.
let mobileChartBackdropDown = false;
mobileChartDialog.addEventListener("pointerdown", event => {
  mobileChartBackdropDown = event.target === mobileChartDialog;
});
mobileChartDialog.addEventListener("click", event => {
  if (event.target === mobileChartDialog && mobileChartBackdropDown) closeMobileChart();
  mobileChartBackdropDown = false;
});
mobileChartSearchQuery.addEventListener("change", () => {
  closeMobileChart();
  if (mobileChartSearchQuery.matches) {
    clearChartTouches();
    resetDrawingGesture();
    activeTool = null;
    updateDrawingToolButtons();
    canvas.style.cursor = "grab";
  }
  setDrawingToolsOpen(!mobileChartSearchQuery.matches && readBrowserPreference(DRAWING_TOOLS_KEY) === "true", { persist: false });
  syncMobileChartEntry();
});
syncMobileChartEntry();

// Keep existing scrubbing/pinch/drag behavior; only a short stationary tap expands.
canvas.addEventListener("pointerdown", event => {
  if (!mobileChartSearchQuery.matches || mobileChartDialog.open || event.button !== 0) return;
  if (mobileChartTap && !mobileChartTap.ended) { mobileChartTap.cancelled = true; return; }
  mobileChartTap = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, cancelled: false };
}, true);
function trackMobileChartTap(event) {
  if (mobileChartTap && Math.hypot(event.clientX - mobileChartTap.x, event.clientY - mobileChartTap.y) > 8) mobileChartTap.cancelled = true;
}
canvas.addEventListener("pointermove", trackMobileChartTap, true);
canvas.addEventListener("pointercancel", () => { mobileChartTap = null; }, true);
canvas.addEventListener("pointerup", () => { if (mobileChartTap) mobileChartTap.ended = true; }, true);
canvas.addEventListener("click", event => {
  const tap = mobileChartTap;
  mobileChartTap = null;
  if (tap && !tap.cancelled && event.timeStamp - tap.time < CHART_TOUCH_HOLD_MS) openMobileChart();
});
canvas.addEventListener("keydown", event => {
  if (mobileChartSearchQuery.matches && !mobileChartDialog.open && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    openMobileChart();
  }
});

const savedTheme = readBrowserPreference(THEME_KEY);
if (["light", "dark", "gamify"].includes(savedTheme)) document.body.dataset.theme = savedTheme;
document.querySelectorAll("[data-theme-choice]").forEach(button => {
  const selected = button.dataset.themeChoice === document.body.dataset.theme;
  button.classList.toggle("active", selected);
  button.setAttribute("aria-pressed", String(selected));
});
updateThemeToggleLabel();
syncSoundPreference();
function toggleInterfaceSound() {
  soundEnabled = !soundEnabled;
  writeBrowserPreference(SOUND_KEY, String(soundEnabled));
  updateSoundToggle();
  if (soundEnabled) playUiSound("power");
  showToast(`Interface sounds ${soundEnabled ? "enabled" : "muted"}.`);
}
document.getElementById("soundToggle")?.addEventListener("click", toggleInterfaceSound);
document.getElementById("headerSoundToggle")?.addEventListener("click", toggleInterfaceSound);
function interfaceSoundLoadsContent(control, eventType) {
  if (eventType === "change") {
    return control.matches('#assetSelect, #puzzleTiming, #dailyDate, #iqLessonSelect, #quantStrategy, #quantLanguage, input[name="freeAssetScope"], input[name="freeInstrumentScope"]');
  }
  // Chart presentation and editing stay silent; date ranges load a new chart.
  if (control.matches('#zoomIn, #zoomOut, #resetChart, #undoDrawing, #clearDrawings, #drawingToolsToggle, [data-tool], [data-chart-type], [data-indicator]')) return false;
  if (control.matches("summary")) return !control.parentElement?.open;
  if (control.matches('[aria-expanded][aria-controls], [aria-haspopup]')) {
    return control.getAttribute("aria-expanded") !== "true";
  }
  if (control.matches('a[href]')) return !control.getAttribute("href").startsWith("#");
  if (control.matches('.nav, .suggestion, [data-timeframe], [data-choice], [data-symbol-result], [data-pack], [data-news-symbol], [data-free-random-mode], [data-settings-section], [data-learn-chapter], [data-learn-quiz-start], [data-learn-quiz-submit], [data-calendar-date], [data-plan-action="start-drill"], [data-plan-action="open-review"]')) return true;
  if (control.matches('#nextBtn, #homeLogo, #settingsShortcut, #levelButton, #roundStart, #symbolResultsBack, #dailyCalendarPrev, #dailyCalendarNext')) return true;
  const action = control.dataset.action || "";
  if (action.startsWith("account-open")) return true;
  return [
    "account-back",

    "daily-start", "daily-calendar",

    "paper-quote", "paper-refresh", "paper-open-chart", "paper-sell-all",
    "quant-run", "quant-random", "pack-quiz", "review-open", "review-preview-retry", "review-filter",
    "review-stat-toggle", "review-week-select", "review-pattern-select", "review-accuracy-mode", "review-game-apply"
  ].includes(action);
}

function handleInterfaceSound(event) {
  const selector = event.type === "change"
    ? 'select, input[type="checkbox"], input[type="radio"], input[type="date"]'
    : 'button, summary, a[href], [role="button"], [role="tab"], input[type="button"], input[type="submit"], input[type="reset"]';
  const control = event.target.closest(selector);
  if (!control || control.matches(':disabled') || control.closest('[aria-disabled="true"], [inert]')) return;
  // These controls supply their own tone or forward activation to a navigation button.
  if (control.matches("#soundToggle, #headerSoundToggle, [data-theme-choice], [data-home-mode]")) return;
  if (!interfaceSoundLoadsContent(control, event.type)) return;
  playUiSound("tap");
}

// Capture activation before loading/reveal handlers disable or replace the control.
document.addEventListener("click", handleInterfaceSound, true);
document.addEventListener("change", handleInterfaceSound, true);

let railCloseTimer = null;
let railLayoutRefreshTimer = null;

function scheduleRailLayoutRefresh() {
  if (railLayoutRefreshTimer) window.clearTimeout(railLayoutRefreshTimer);
  railLayoutRefreshTimer = window.setTimeout(() => {
    railLayoutRefreshTimer = null;
    resizeChartCanvas();
    if (rawCandles.length || (appMode === "review" && reviewChartActive && !activeReviewRecordId)) drawChart();
  }, 260);
}

function updateRailToggle() {
  if (!railCollapseToggle) return;
  const autoHide = document.body.classList.contains("rail-auto-hide");
  const revealed = document.body.classList.contains("rail-revealed");
  railCollapseToggle.setAttribute("aria-expanded", String(!autoHide || revealed));
  railCollapseToggle.setAttribute("aria-label", autoHide ? "Pin menu open" : "Enable auto-hide menu");
  railCollapseToggle.title = autoHide ? "Pin menu open" : "Enable auto-hide menu";
}

function clearRailCloseTimer() {
  if (!railCloseTimer) return;
  window.clearTimeout(railCloseTimer);
  railCloseTimer = null;
}

function revealAutoHideRail() {
  if (!desktopRailQuery.matches || !document.body.classList.contains("rail-auto-hide")) return;
  clearRailCloseTimer();
  document.body.classList.add("rail-revealed");
  updateRailToggle();
  scheduleRailLayoutRefresh();
}

function hideAutoHideRail(delay = 120) {
  if (!document.body.classList.contains("rail-auto-hide")) return;
  clearRailCloseTimer();
  railCloseTimer = window.setTimeout(() => {
    if (sideMenu?.matches(":hover") || railCollapseToggle?.matches(":hover")
      || (document.body.classList.contains("panel-staged") && sideMenu?.contains(document.activeElement))) return;
    document.body.classList.remove("rail-revealed");
    updateRailToggle();
    scheduleRailLayoutRefresh();
  }, delay);
}

function setRailAutoHide(enabled) {
  clearRailCloseTimer();
  document.body.classList.toggle("rail-auto-hide", enabled);
  document.body.classList.remove("rail-revealed");
  updateRailToggle();
  scheduleRailLayoutRefresh();
}

railCollapseToggle?.addEventListener("click", () => {
  const autoHide = document.body.classList.contains("rail-auto-hide");
  setRailAutoHide(!autoHide);
  showToast(autoHide ? "Menu pinned open." : "Menu will appear when you hover at the left edge.");
});

railCollapseToggle?.addEventListener("pointerenter", () => {
  if (document.body.classList.contains("rail-revealed")) clearRailCloseTimer();
});
railCollapseToggle?.addEventListener("pointerleave", () => hideAutoHideRail());
railCollapseToggle?.addEventListener("focus", revealAutoHideRail);
railHoverZone?.addEventListener("pointerenter", revealAutoHideRail);
sideMenu?.addEventListener("pointerenter", clearRailCloseTimer);
sideMenu?.addEventListener("pointerleave", () => hideAutoHideRail());

function setDefaultMenuExpansion() {
  sideMenu?.querySelectorAll(".nav-folder").forEach(folder => {
    folder.open = desktopRailQuery.matches;
  });
}

desktopRailQuery.addEventListener("change", event => {
  clearRailCloseTimer();
  if (!event.matches) document.body.classList.remove("rail-auto-hide", "rail-revealed");
  setDefaultMenuExpansion();
  updateRailToggle();
});

setDefaultMenuExpansion();
updateRailToggle();
const mobileNavToggle = document.getElementById("mobileNavToggle");
function updatePreviewNavigationHeight() {
  if (document.body.classList.contains("mobile-nav-open")) return;
  const height = desktopRailQuery.matches ? 0 : sideMenu?.getBoundingClientRect().height || 0;
  roundModal.style.setProperty("--preview-nav-height", `${height}px`);
}
new ResizeObserver(updatePreviewNavigationHeight).observe(sideMenu);
window.addEventListener("resize", updatePreviewNavigationHeight);
mobileNavToggle?.addEventListener("click", () => {
  const open = document.body.classList.toggle("mobile-nav-open");
  mobileNavToggle.setAttribute("aria-expanded", String(open));
  mobileNavToggle.querySelector("b").textContent = open ? "−" : "+";
});
const rankRoadViewport = document.getElementById("rankRoadViewport");
let rankRoadPointerDrag = null;
let rankRoadSuppressClick = false;

rankRoadViewport?.addEventListener("pointerdown", event => {
  if (event.isPrimary === false || event.button !== 0) return;
  stopRankRoadInertia(false);
  // Cancel an in-flight keyboard scroll before taking over direct manipulation.
  rankRoadViewport.scrollTo({ left: rankRoadViewport.scrollLeft, behavior: "instant" });
  rankRoadPointerDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    pointerType: event.pointerType,
    lastX: event.clientX,
    lastTime: performance.now(),
    startScrollLeft: rankRoadDragPosition(rankRoadViewport),
    velocity: 0,
    moved: false
  };
});

rankRoadViewport?.addEventListener("pointermove", event => {
  if (!rankRoadPointerDrag || rankRoadPointerDrag.pointerId !== event.pointerId) return;
  const distance = event.clientX - rankRoadPointerDrag.startX;
  if (!rankRoadPointerDrag.moved && rankRoadPointerDrag.pointerType === "touch" && Math.abs(event.clientY - rankRoadPointerDrag.startY) > Math.max(4, Math.abs(distance))) {
    endRankRoadPointerDrag(event, false);
    return;
  }
  if (Math.abs(distance) < 4 && !rankRoadPointerDrag.moved) return;
  if (!rankRoadPointerDrag.moved) {
    rankRoadViewport.setPointerCapture?.(event.pointerId);
    rankRoadViewport.classList.add("is-dragging");
  }
  rankRoadPointerDrag.moved = true;
  const now = performance.now();
  const elapsed = Math.max(1, now - rankRoadPointerDrag.lastTime);
  const instantaneousVelocity = (rankRoadPointerDrag.lastX - event.clientX) / elapsed;
  rankRoadPointerDrag.velocity = rankRoadPointerDrag.velocity * 0.62 + instantaneousVelocity * 0.38;
  rankRoadPointerDrag.lastX = event.clientX;
  rankRoadPointerDrag.lastTime = now;
  setRankRoadPosition(rankRoadViewport, rankRoadPointerDrag.startScrollLeft - distance, true);
  event.preventDefault();
});

function endRankRoadPointerDrag(event, shouldCoast = true) {
  if (!rankRoadPointerDrag || rankRoadPointerDrag.pointerId !== event.pointerId) return;
  rankRoadSuppressClick = rankRoadPointerDrag.moved;
  const releaseVelocity = performance.now() - rankRoadPointerDrag.lastTime > 80 ? 0 : rankRoadPointerDrag.velocity;
  const moved = rankRoadPointerDrag.moved;
  rankRoadPointerDrag = null;
  if (rankRoadViewport.hasPointerCapture?.(event.pointerId)) {
    rankRoadViewport.releasePointerCapture(event.pointerId);
  }
  rankRoadViewport.classList.remove("is-dragging");
  if (moved || rankRoadOverscroll) startRankRoadInertia(rankRoadViewport, shouldCoast ? releaseVelocity : 0);
  window.setTimeout(() => { rankRoadSuppressClick = false; }, 0);
}

rankRoadViewport?.addEventListener("pointerup", endRankRoadPointerDrag);
// A press released outside the road before drag capture must also clear it.
window.addEventListener("pointerup", endRankRoadPointerDrag);
rankRoadViewport?.addEventListener("pointercancel", event => endRankRoadPointerDrag(event, false));
rankRoadViewport?.addEventListener("lostpointercapture", event => endRankRoadPointerDrag(event, false));
rankRoadViewport?.addEventListener("wheel", event => {
  if (event.ctrlKey || rankRoadPointerDrag) return;
  event.preventDefault();
  stopRankRoadInertia(false);
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rankRoadViewport.clientWidth : 1;
  const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
  const position = rankRoadDragPosition(rankRoadViewport);
  setRankRoadPosition(rankRoadViewport, position + delta, true);
  startRankRoadInertia(rankRoadViewport, 0);
}, { passive: false });
rankRoadViewport?.addEventListener("click", event => {
  if (!rankRoadSuppressClick) return;
  event.preventDefault();
  event.stopPropagation();
}, true);

rankRoadViewport?.addEventListener("scroll", event => {
  const viewport = event.currentTarget;
  window.clearTimeout(rankRoadScrollTimer);
  rankRoadScrollTimer = window.setTimeout(() => {
    const stops = [...viewport.querySelectorAll(".rank-road-level")];
    if (!stops.length) return;
    if (viewport.scrollLeft <= 1) return updateRankRoadSelection(0);
    if (viewport.scrollLeft >= rankRoadMaxScroll(viewport) - 1) return updateRankRoadSelection(stops.length - 1);
    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    const closestIndex = stops.reduce((bestIndex, stop, index) => {
      const bestDistance = Math.abs((stops[bestIndex].offsetLeft + stops[bestIndex].offsetWidth / 2) - viewportCenter);
      const distance = Math.abs((stop.offsetLeft + stop.offsetWidth / 2) - viewportCenter);
      return distance < bestDistance ? index : bestIndex;
    }, 0);
    updateRankRoadSelection(closestIndex);
  }, 100);
});
rankRoadViewport?.addEventListener("keydown", event => {
  const actions = { ArrowLeft: -1, ArrowRight: 1, Home: -rankRoadSelectedIndex, End: levelLadder.length - rankRoadSelectedIndex };
  if (!(event.key in actions)) return;
  event.preventDefault();
  showRankRoadLevel(rankRoadSelectedIndex + actions[event.key]);
});
accountModal.addEventListener("click", event => {
  if (event.target === accountModal) { closeAccountModal(); return; }
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "account-edit-nickname") openNicknameDialog();
  if (action === "coin-claim-level" || action === "coin-claim-quest") handleCoinClaim(button);
  if (action === "account-back") closeAccountModal();
  if (action === "account-open-levels") { closeAccountModal(); openLevelsModal(); }
});
document.getElementById("nicknameForm").addEventListener("submit", saveNickname);
document.getElementById("nicknameCancel").addEventListener("click", closeNicknameDialog);
document.getElementById("nicknameInput").addEventListener("input", event => {
  event.target.removeAttribute("aria-invalid");
  document.getElementById("nicknameError").hidden = true;
  updateNicknameInput();
  requestAnimationFrame(updateNicknameInput);
});
document.getElementById("nicknameInput").addEventListener("scroll", updateNicknameInput);
document.getElementById("zoomIn").onclick = () => { zoomChartAtEvent(null, zoom + .55); showToast("Chart zoomed in.", { key: "chart-zoom" }); };
document.getElementById("zoomOut").onclick = () => { zoomChartAtEvent(null, zoom - .55); showToast("Chart zoomed out.", { key: "chart-zoom" }); };
document.getElementById("resetChart").onclick = () => {
  zoom = 1; pan = 0; priceOffset = 0; priceScale = 1; hoverIndex = null; chartTip.hidden = true; drawChart();
  showToast("Chart view reset.");
};
document.getElementById("undoDrawing").onclick = undoDrawingChange;
document.getElementById("clearDrawings").onclick = clearAllDrawings;
advancedToggle.onclick = () => {
  const toggleFocused = document.activeElement === advancedToggle;
  advancedMode = !advancedMode;
  advancedToggle.classList.toggle("active", advancedMode);
  advancedToggle.setAttribute("aria-expanded", String(advancedMode));
  advancedIntervals.hidden = !advancedMode;
  document.body.classList.toggle("advanced-chart", advancedMode);
  syncAdvancedIntervalsLayout();
  if (toggleFocused) advancedToggle.focus({ preventScroll: true });
  showToast(`${advancedIntervals.getAttribute("aria-label")} ${advancedMode ? "opened" : "hidden"}.`);
};

document.querySelectorAll("[data-timeframe]").forEach(button => {
  button.onclick = async () => {
    if (appMode === "daily" || appMode === "ranked") return;
    document.querySelectorAll("[data-timeframe]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    timeframe = button.dataset.timeframe;
    syncAdvancedIntervalsLayout(timeframe);
    if (appMode === "free") {
      await loadFreePlayChart();
      return;
    }
    zoom = 1;
    pan = 0;
    priceOffset = 0;
    priceScale = 1;
    symbolStatus.classList.remove("error");
    symbolStatus.classList.add("loading");
    symbolStatus.textContent = `Loading ${timeframe} candles for ${currentSymbol.ticker}...`;
    setLoading(true, `Fetching ${timeframe} candles for ${currentSymbol.ticker}...`);
    try {
      await loadMarketChart(currentSymbol.ticker);
    } catch (error) {
      setLoading(false);
      showSymbolError(currentSymbol.ticker, error.message);
    }
  };
});
document.querySelectorAll("[data-chart-type]").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll("[data-chart-type]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    chartType = button.dataset.chartType;
    drawChart();
  };
});
document.querySelectorAll("[data-indicator]").forEach(button => {
  button.onclick = () => {
    button.classList.toggle("active");
    if (button.dataset.indicator === "sma") showSMA = button.classList.contains("active");
    if (button.dataset.indicator === "ema") showEMA = button.classList.contains("active");
    if (button.dataset.indicator === "bb") showBollinger = button.classList.contains("active");
    if (button.dataset.indicator === "volume") showVolume = button.classList.contains("active");
    drawChart();
  };
});
document.querySelectorAll("[data-tool]").forEach(button => {
  button.onclick = () => {
    if (mobileChartSearchQuery.matches && !mobileChartDialog.open) openMobileChart(true);
    const tool = button.dataset.tool;
    const nextTool = tool === "cursor" || (activeTool === tool && (tool === "delete" || !mobileChartDialog.open)) ? null : tool;
    activeTool = nextTool;
    resetDrawingGesture();
    updateDrawingToolButtons();
    canvas.style.cursor = activeTool ? "crosshair" : "grab";
    drawChart();
  };
});
updateDrawingToolButtons();

canvas.addEventListener("pointermove", event => {
  if (event.pointerType === "touch" && moveChartTouch(event)) return;
  const point = drawingPointFromEvent(event);
  if (activeTool === "delete" && eraserGesture?.pointerId === event.pointerId) {
    if (event.pointerType === "touch") eraserGesture.points.push(point);
    else eraseDrawingStroke(point);
    chartTip.hidden = true;
    drawChart();
    return;
  }
  if (dragging && !activeTool) {
    if (chartDragKind === "price") {
      priceScale = Math.max(.1, Math.min(10, dragStartPriceScale * Math.exp((event.clientY - dragStartY) / Math.max(point.view.height, 1))));
    } else if (chartDragKind === "time") {
      zoom = Math.max(1, Math.min(8, dragStartZoom * Math.exp((event.clientX - dragStartX) / Math.max(point.view.width, 1))));
    } else {
      pan = dragStartPan - ((event.clientX - dragStartX) / Math.max(point.view.xStep, .0001));
      priceOffset = dragStartPriceOffset + ((event.clientY - dragStartY) / Math.max(point.view.height, 1)) * dragStartPriceRange;
    }
  }
  const hoveredBar = latestSeries[point.i];
  hoverIndex = hoveredBar?.future && !revealed ? null : point.i;
  if (activeTool === "brush" && dragging) {
    brushPoints.push(point);
    draftDrawing = { type: "brush", points: brushPoints };
  } else if (pendingToolStart && activeTool && activeTool !== "text") {
    draftDrawing = { type: activeTool, a: pendingToolStart, b: point };
  }
  moveTip(event);
  drawChart();
});

function applyPointDrawingTool(point) {
  if (activeTool === "text") {
    const text = prompt("Chart note");
    if (text) {
      commitDrawings(drawings.concat({ type: "text", a: point, text }));
    }
    drawChart();
  }
}

canvas.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  if (event.pointerType === "touch" && startChartTouch(event)) return;
  const point = drawingPointFromEvent(event);
  if (activeTool === "delete") {
    eraserGesture = { pointerId: event.pointerId, points: [point], changed: false, lastPoint: null };
    canvas.setPointerCapture(event.pointerId);
    if (event.pointerType !== "touch") eraseDrawingStroke(point);
    chartTip.hidden = true;
    drawChart();
    return;
  }
  if (activeTool === "text") {
    // Wait for touch release so a second finger can navigate without editing.
    if (event.pointerType !== "touch") applyPointDrawingTool(point);
    return;
  }
  if (activeTool) {
    dragging = true;
    pendingToolStart = point;
    brushPoints = activeTool === "brush" ? [point] : [];
    draftDrawing = activeTool === "brush" ? { type: "brush", points: brushPoints } : null;
    canvas.setPointerCapture(event.pointerId);
    return;
  }
  dragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartPan = pan;
  dragStartPriceOffset = priceOffset;
  dragStartPriceRange = point.view.max - point.view.min;
  dragStartZoom = zoom;
  dragStartPriceScale = priceScale;
  chartDragKind = chartInteractionRegion(event, point.view);
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = chartDragKind === "price" ? "ns-resize" : chartDragKind === "time" ? "ew-resize" : "grabbing";
});

canvas.addEventListener("pointerup", event => {
  if (event.pointerType === "touch" && endChartTouch(event)) return;
  const point = drawingPointFromEvent(event);
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (activeTool === "delete") {
    if (eraserGesture?.pointerId === event.pointerId) {
      if (event.pointerType === "touch") eraserGesture.points.forEach(eraseDrawingStroke);
      eraseDrawingStroke(point);
    }
    resetDrawingGesture();
    drawChart();
    return;
  }
  if (event.pointerType === "touch" && activeTool === "text") {
    applyPointDrawingTool(point);
    return;
  }
  if (activeTool && dragging) {
    let annotation = null;
    if (activeTool === "brush" && brushPoints.length > 1) annotation = { type: "brush", points: brushPoints.slice() };
    else if (pendingToolStart && activeTool !== "text" && activeTool !== "brush") annotation = { type: activeTool, a: pendingToolStart, b: point };
    if (annotation) {
      commitDrawings(drawings.concat(annotation));
    }
    resetDrawingGesture();
    drawChart();
    return;
  }
  dragging = false;
  canvas.style.cursor = activeTool ? "crosshair" : "grab";
});

canvas.addEventListener("pointercancel", () => {
  clearChartTouches();
  resetDrawingGesture();
  canvas.style.cursor = activeTool ? "crosshair" : "grab";
  drawChart();
});

canvas.addEventListener("pointerleave", () => {
  if (chartTouches.size) return;
  hoverIndex = null;
  chartTip.hidden = true;
  // Pointer capture keeps a drag active when the cursor leaves the canvas.
  if (!activeTool && !dragging) canvas.style.cursor = "grab";
  drawChart();
});

// TradingView-style touch navigation: drag, midpoint-anchored pinch, hold to inspect.
const chartTouches = new Map();
const CHART_TOUCH_SLOP = 8;
const CHART_TOUCH_HOLD_MS = 350;
let chartTouchGesture = null;
let chartTouchHoldTimer = null;

function cancelChartTouchHold() {
  clearTimeout(chartTouchHoldTimer);
  chartTouchHoldTimer = null;
}

function clearChartTouches() {
  cancelChartTouchHold();
  const ids = [...chartTouches.keys()];
  chartTouches.clear();
  chartTouchGesture = null;
  ids.forEach(id => {
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  });
  hoverIndex = null;
  chartTip.hidden = true;
}

function inspectChartTouch(event) {
  const point = chartPointFromEvent(event);
  hoverIndex = latestSeries[point.i]?.future && !revealed ? null : point.i;
  moveTip(event);
  drawChart();
}

function chartTouchMidpoint() {
  const [a, b] = [...chartTouches.values()];
  return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2,
    distance: Math.max(1, Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)) };
}

function chartTouchFraction(event, view) {
  const rect = canvas.getBoundingClientRect();
  return Math.max(0, Math.min(1, (event.clientX - rect.left - canvas.clientLeft - view.pad.left) / Math.max(view.width, 1)));
}

function startChartTouch(event) {
  chartTouches.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY, pointerType: "touch" });
  canvas.setPointerCapture(event.pointerId);
  cancelChartTouchHold();
  hoverIndex = null;
  chartTip.hidden = true;
  if (chartTouches.size >= 2) {
    resetDrawingGesture();
    const middle = chartTouchMidpoint();
    const { view } = chartPointFromEvent(middle);
    chartTouchGesture = { kind: "pinch", distance: middle.distance, zoom,
      y: middle.clientY, priceOffset, priceRange: view.max - view.min, height: view.height,
      anchor: view.start + chartTouchFraction(middle, view) * (view.end - view.start - (view.pointInset === 0 ? 1 : 0)) };
    drawChart();
    return true;
  }
  if (activeTool) {
    chartTouchGesture = { kind: "drawing" };
    return false;
  }
  const point = chartPointFromEvent(event);
  chartTouchGesture = { kind: "pending", x: event.clientX, y: event.clientY,
    pan, zoom, priceOffset, priceScale, view: point.view,
    region: chartInteractionRegion(event, point.view) };
  // The volume/date strip is a candle scrubber on touch; pinching handles zoom.
  if (chartTouchGesture.region === "time") {
    chartTouchGesture.kind = "inspect";
    inspectChartTouch(event);
    return true;
  }
  if (chartTouchGesture.region === "pan") {
    chartTouchHoldTimer = setTimeout(() => {
      if (chartTouches.size !== 1 || chartTouchGesture?.kind !== "pending") return;
      chartTouchGesture.kind = "inspect";
      inspectChartTouch(chartTouches.values().next().value);
    }, CHART_TOUCH_HOLD_MS);
  }
  drawChart();
  return true;
}

function moveChartTouch(event) {
  // Ignore hover events after release and contacts that started outside the chart.
  if (!chartTouches.has(event.pointerId)) return true;
  chartTouches.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY, pointerType: "touch" });
  const gesture = chartTouchGesture;
  if (!gesture || gesture.kind === "ignore") return true;
  if (gesture.kind === "drawing") return false;
  if (gesture.kind === "pinch") {
    if (chartTouches.size < 2 || !latestSeries.length) return true;
    const middle = chartTouchMidpoint();
    const { view } = chartPointFromEvent(middle);
    zoom = Math.max(1, Math.min(8, gesture.zoom * middle.distance / gesture.distance));
    const count = Math.max(24, Math.round(latestSeries.length / zoom));
    pan = Math.max(0, Math.min(Math.max(0, latestSeries.length - count),
      gesture.anchor - chartTouchFraction(middle, view) * (count - (view.pointInset === 0 ? 1 : 0))));
    priceOffset = gesture.priceOffset + (middle.clientY - gesture.y) / Math.max(gesture.height, 1) * gesture.priceRange;
  } else if (gesture.kind === "inspect") {
    inspectChartTouch(event);
    return true;
  } else {
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (gesture.kind === "pending" && Math.hypot(dx, dy) <= CHART_TOUCH_SLOP) return true;
    cancelChartTouchHold();
    gesture.kind = "pan";
    if (gesture.region === "price") {
      priceScale = Math.max(.1, Math.min(10, gesture.priceScale * Math.exp(dy / Math.max(gesture.view.height, 1))));
    } else {
      pan = gesture.pan - dx / Math.max(gesture.view.xStep, .0001);
      priceOffset = gesture.priceOffset + dy / Math.max(gesture.view.height, 1) * (gesture.view.max - gesture.view.min);
    }
  }
  drawChart();
  return true;
}

function endChartTouch(event) {
  const wasDrawing = chartTouchGesture?.kind === "drawing";
  chartTouches.delete(event.pointerId);
  cancelChartTouchHold();
  // A remaining finger after a pinch must not jump into a drag or place a drawing.
  chartTouchGesture = chartTouches.size ? { kind: "ignore" } : null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  hoverIndex = null;
  chartTip.hidden = true;
  if (wasDrawing) return false;
  dragging = false;
  drawChart();
  return true;
}

canvas.addEventListener("lostpointercapture", event => {
  if (eraserGesture?.pointerId === event.pointerId) resetDrawingGesture();
  if (!chartTouches.has(event.pointerId)) return;
  clearChartTouches();
  resetDrawingGesture();
  drawChart();
});
canvas.addEventListener("contextmenu", event => {
  if (chartTouches.size || event.pointerType === "touch") event.preventDefault();
});

function chartInteractionRegion(event, view) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left - canvas.clientLeft;
  const y = event.clientY - rect.top - canvas.clientTop;
  if (y >= view.pad.top + view.height && x >= view.pad.left && x <= view.pad.left + view.width) return "time";
  if (y >= view.pad.top && y <= view.pad.top + view.height
    && (x < view.pad.left || (chartWidth >= 520 && x > view.pad.left + view.width))) return "price";
  return "pan";
}

canvas.addEventListener("dblclick", event => {
  if (activeTool || event.button !== 0) return;
  const region = chartInteractionRegion(event, chartPointFromEvent(event).view);
  if (region === "price") { priceScale = 1; priceOffset = 0; }
  else if (region === "time") { zoom = 1; pan = 0; }
  else return;
  drawChart();
});
const CHART_PINCH_DEAD_ZONE = 12;
const CHART_PINCH_SENSITIVITY = .004;
const CHART_PINCH_IDLE_MS = 180;
const CHART_WHEEL_ZOOM_STEP = .32;
let chartPinchDelta = 0;
let lastChartPinchTime = -Infinity;
let chartNativeGestureZoom = null;

function zoomChartAtEvent(event, nextZoom) {
  nextZoom = Math.max(1, Math.min(8, nextZoom));
  if (!latestSeries.length || nextZoom === zoom) return;
  const view = event ? chartPointFromEvent(event).view : viewport(latestSeries);
  const rect = canvas.getBoundingClientRect();
  const fraction = event
    ? Math.max(0, Math.min(1, (event.clientX - rect.left - canvas.clientLeft - view.pad.left) / Math.max(view.width, 1)))
    : .5;
  const linePoints = view.pointInset === 0 ? 1 : 0;
  const anchor = view.start + fraction * (view.end - view.start - linePoints);
  zoom = nextZoom;
  const visibleCount = Math.max(24, Math.round(latestSeries.length / zoom));
  pan = Math.max(0, Math.min(Math.max(0, latestSeries.length - visibleCount), anchor - fraction * (visibleCount - linePoints)));
  drawChart();
}

canvas.addEventListener("wheel", event => {
  if (chartNativeGestureZoom !== null) {
    event.preventDefault();
    return;
  }
  // Trackpad pinch/spread gestures are exposed as Ctrl+wheel by Chromium.
  const isTrackpadPinch = event.ctrlKey && event.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
  if (!isTrackpadPinch) {
    chartPinchDelta = 0;
    lastChartPinchTime = -Infinity;
    // A horizontal two-finger swipe pans the timeline without changing zoom.
    // Some Windows touchpad drivers include a sizeable vertical delta or expose
    // horizontal scrolling as Shift+wheel, so accept both representations.
    const horizontalDelta = Math.abs(event.deltaX) > .1
      ? event.deltaX
      : event.shiftKey
        ? event.deltaY
        : 0;
    const isHorizontalSwipe = Math.abs(horizontalDelta) > .1
      && (event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY));
    if (isHorizontalSwipe && !event.ctrlKey) {
      if (!latestSeries.length) return;
      event.preventDefault();
      const { view } = chartPointFromEvent(event);
      const canvasWidth = canvas.getBoundingClientRect().width;
      const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? canvasWidth
          : 1;
      pan += (horizontalDelta * deltaScale) / Math.max(view.xStep, .0001);
      drawChart();
      return;
    }
    if (!event.deltaY) return;
    // While the cursor is over the chart, vertical wheel movement belongs to
    // chart zoom rather than the surrounding page.
    event.preventDefault();
    if (!latestSeries.length) return;
    // Pixel deltas include smooth touchpad scrolling; retain a normal mouse
    // wheel step for line/page events and a 120-pixel wheel notch.
    const movement = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
      ? Math.max(-120, Math.min(120, event.deltaY)) / 120
      : Math.sign(event.deltaY);
    zoomChartAtEvent(event, zoom - movement * CHART_WHEEL_ZOOM_STEP);
    return;
  }
  event.preventDefault();
  if (!event.deltaY) return;
  // Require deliberate movement before zooming, including after a pause or
  // direction change. Ordinary scrolling clears any accumulated pinch noise.
  if (event.timeStamp - lastChartPinchTime > CHART_PINCH_IDLE_MS
    || Math.sign(event.deltaY) !== Math.sign(chartPinchDelta)) {
    chartPinchDelta = 0;
  }
  lastChartPinchTime = event.timeStamp;
  const previousMovement = Math.max(0, Math.abs(chartPinchDelta) - CHART_PINCH_DEAD_ZONE);
  chartPinchDelta += event.deltaY;
  const movement = Math.max(0, Math.abs(chartPinchDelta) - CHART_PINCH_DEAD_ZONE) - previousMovement;
  if (!movement) return;
  zoomChartAtEvent(event, zoom - Math.sign(event.deltaY) * movement * CHART_PINCH_SENSITIVITY);
}, { passive: false });

// Safari reports touchpad pinches through native gesture events instead of
// Ctrl+wheel. Other browsers keep using the wheel handler above.
canvas.addEventListener("gesturestart", event => {
  event.preventDefault();
  if (chartTouches.size) return;
  chartNativeGestureZoom = zoom;
  chartPinchDelta = 0;
  lastChartPinchTime = -Infinity;
  resetDrawingGesture();
}, { passive: false });
canvas.addEventListener("gesturechange", event => {
  if (chartTouches.size) { event.preventDefault(); return; }
  if (chartNativeGestureZoom === null) return;
  event.preventDefault();
  if (Number.isFinite(event.scale) && event.scale > 0) zoomChartAtEvent(event, chartNativeGestureZoom * event.scale);
}, { passive: false });
canvas.addEventListener("gestureend", event => {
  if (chartNativeGestureZoom === null) return;
  event.preventDefault();
  chartNativeGestureZoom = null;
}, { passive: false });

document.querySelectorAll(".nav").forEach(button => {
  button.onclick = async () => {
    if (appMode === "ranked" || button.dataset.mode === "ranked") {
      await setMode(button.dataset.mode, { loadChart: false });
      if (appMode !== "home") showRoundModal(appMode);
      await loadModeChart(appMode);
      return;
    }
    closeSymbolResults({ focus: false, instant: true });
    chartRequestId += 1;
    searchRequestId += 1;
    document.body.classList.remove("mobile-nav-open");
    document.getElementById("mobileNavToggle")?.setAttribute("aria-expanded", "false");
    const mobileToggleMark = document.querySelector("#mobileNavToggle b");
    if (mobileToggleMark) mobileToggleMark.textContent = "+";
    document.querySelectorAll(".nav").forEach(nav => nav.classList.remove("active"));
    button.classList.add("active");
    let selectedFolder = button.closest(".nav-folder");
    while (selectedFolder) {
      selectedFolder.open = true;
      selectedFolder = selectedFolder.parentElement?.closest(".nav-folder") || null;
    }
    if (!["home", "account"].includes(button.dataset.mode)) lastProductMode = button.dataset.mode;
    appMode = button.dataset.mode;
    if (appMode === "packs") { packChartActive = false; activePackWindow = null; }
    if (appMode !== "packs") activePackWindow = null;
    if (appMode === "review") {
      resetReviewPatternHint();
      reviewChartActive = false;
      activeReviewRecordId = "";
      activeReviewRound = "";
      activeReviewAnswer = "";
    }
    if (appMode !== "paper") paperChartSymbol = "";
    updateBreadcrumb();
    document.getElementById("modeLabel").textContent = button.dataset.mode === "free" ? "FREE PLAY" : button.dataset.mode === "daily" ? "DAILY" : button.dataset.mode.toUpperCase();
    renderModeSurface();
    if (appMode === "home") dockSidePanel();
    else showRoundModal(appMode);
    await loadModeChart(appMode);
  };
});

settingsShortcut?.addEventListener("click", async () => {
  dockSidePanel();
  closeLevelsModal();
  closeAccountModal();
  closeDailyCalendar();
  await setMode("account", { loadChart: false });
  window.scrollTo({ top: 0, behavior: "smooth" });
});

modeSurface.addEventListener("pointerover", event => {
  const icon = event.target.closest(".quant-info");
  if (icon && icon !== quantHelpAnchor) showQuantHelp(icon);
});
modeSurface.addEventListener("focusin", event => {
  const icon = event.target.closest(".quant-info");
  if (icon) showQuantHelp(icon);
});
document.addEventListener("pointerout", event => {
  if (!quantHelpAnchor || quantHelpPinned || document.activeElement === quantHelpAnchor) return;
  const tooltip = document.getElementById("quantHelpTooltip");
  if (quantHelpAnchor.contains(event.target) || tooltip?.contains(event.target)) {
    if (!quantHelpAnchor.contains(event.relatedTarget) && !tooltip?.contains(event.relatedTarget)) hideQuantHelp();
  }
});
modeSurface.addEventListener("focusout", event => {
  if (event.target === quantHelpAnchor) hideQuantHelp();
});
document.addEventListener("pointerdown", event => {
  if (!event.target.closest(".quant-info, #quantHelpTooltip")) hideQuantHelp();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") hideQuantHelp();
});
window.addEventListener("resize", positionQuantHelp);
window.addEventListener("scroll", event => {
  if (!event.target.closest?.("#quantHelpTooltip")) positionQuantHelp();
}, true);

modeSurface.addEventListener("keydown", event => {
  const icon = event.target.closest(".paper-order-error-icon[data-tooltip]");
  if (!icon) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    icon.click();
  }
});
modeSurface.addEventListener("focusout", event => {
  const icon = event.target.closest(".paper-order-error-icon.is-open");
  if (icon) setPaperOrderTooltipOpen(icon, false);
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".paper-order-error-icon.is-open").forEach(icon => setPaperOrderTooltipOpen(icon, false));
});
window.addEventListener("resize", positionReviewGameMenu);
window.addEventListener("scroll", positionReviewGameMenu, true);

// Dismiss hover menus as soon as an outside touch begins, including scroll gestures.
document.addEventListener("pointerdown", event => {
  document.querySelectorAll(".paper-order-error-icon.is-open").forEach(icon => {
    if (!event.composedPath().includes(icon)) setPaperOrderTooltipOpen(icon, false);
  });
  if (event.pointerType !== "touch") return;
  const path = event.composedPath();
  const within = (...elements) => elements.some(element => element && path.includes(element));
  if (accuracyPopover && !accuracyPopover.hidden && !within(accuracyTrigger, accuracyPopover)) {
    setAccuracyMenuOpen(false);
  }
  if (streakPopover && !streakPopover.hidden && !within(streakMenu, streakPopover)) {
    streakMenuPinned = false;
    setStreakMenuOpen(false);
  }
  if (!appearancePopover.hidden && !within(appearanceMenu)) {
    appearanceMenuPinned = false;
    setAppearanceMenuOpen(false);
  }
  if (!reviewChartActive || !desktopRailQuery.matches) {
    const reviewMenu = document.getElementById("reviewGameMenu");
    const reviewTrigger = modeSurface.querySelector('[aria-controls="reviewGameMenu"]');
    // Modal backdrops retarget taps on the trigger to the dialog itself.
    // Let its click handler close the menu once instead of closing on pointerdown.
    const triggerBounds = reviewTrigger?.getBoundingClientRect();
    const touchingTrigger = triggerBounds && event.clientX >= triggerBounds.left && event.clientX <= triggerBounds.right
      && event.clientY >= triggerBounds.top && event.clientY <= triggerBounds.bottom;
    if (!within(reviewTrigger) && !touchingTrigger && reviewMenu?.open) {
      const bounds = reviewMenu.getBoundingClientRect();
      if (!within(reviewMenu) || event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) closeReviewGameMenu();
    }
  }
  if (document.body.classList.contains("rail-auto-hide") && document.body.classList.contains("rail-revealed")
    && !within(sideMenu, railCollapseToggle, railHoverZone)) {
    clearRailCloseTimer();
    document.body.classList.remove("rail-revealed");
    updateRailToggle();
    scheduleRailLayoutRefresh();
  }
}, { capture: true, passive: true });

modeSurface.addEventListener("click", async event => {
  const quantInfo = event.target.closest(".quant-info");
  if (quantInfo) {
    if (quantInfo === quantHelpAnchor && quantHelpPinned) hideQuantHelp();
    else showQuantHelp(quantInfo, true);
    return;
  }
  const errorIcon = event.target.closest(".paper-order-error-icon[data-tooltip]");
  if (errorIcon) {
    if (desktopRailQuery.matches && event.pointerType !== "touch" && event.detail !== 0) return;
    event.preventDefault();
    setPaperOrderTooltipOpen(errorIcon, !errorIcon.classList.contains("is-open"));
    return;
  }
  const randomizer = event.target.closest(".free-randomizer:not(.quant-parameters)");
  if (randomizer && !event.target.closest(".free-random-mode, [data-free-random-mode]")) {
    randomizer.querySelectorAll(".free-random-mode[open]").forEach(disclosure => {
      disclosure.open = false;
    });
    freePlaySettingsExpanded = { asset: false, instrument: false };
  }
  const scopeSummary = event.target.closest(".free-random-label");
  if (scopeSummary) {
    const randomSelected = freePlayRandomSettings.randomSelected !== false;
    const needsAssets = !freePlayRandomSettings.assetSelected;
    if (randomSelected || needsAssets) {
      event.preventDefault();
      freeRandomizerExpanded = Boolean(modeSurface.querySelector(".free-randomizer")?.open);
      freePlayRandomSettings = {
        ...freePlayRandomSettings,
        randomSelected: false,
        assetSelected: true,
        instrumentSelected: false
      };
      freePlaySettingsExpanded = { asset: true, instrument: false };
      saveFreePlayRandomSettings();
      renderModeSurface();
      modeSurface.querySelector('[data-free-settings="asset"] > summary')?.focus({ preventScroll: true });
      await loadFreePlayChart();
      return;
    }
  }
  const homeDestination = event.target.closest("[data-home-mode]");
  if (homeDestination) {
    const destinationNav = document.querySelector(`.nav[data-mode="${homeDestination.dataset.homeMode}"]`);
    destinationNav?.click();
    return;
  }
  const socialLink = event.target.closest("[data-social-placeholder]");
  if (socialLink) {
    event.preventDefault();
    const platform = socialLink.getAttribute("aria-label")?.replace(" placeholder link", "") || "Social";
    showToast(`${platform} link placeholder — add the official destination when it is ready.`);
    return;
  }
  if (event.target.closest(".review-record-select")) return;
  const reviewRecordSummary = event.target.closest('summary[data-action="review-open"]');
  if (reviewRecordSummary) {
    event.preventDefault();
    await openReviewRecord(reviewRecordSummary.dataset.reviewId, reviewRecordSummary.dataset.reviewRound);
    return;
  }
  const button = event.target.closest("button");
  if (!button) return;
  const action = button.dataset.action;
  if (button.dataset.settingsSection) {
    activeSettingsSection = button.dataset.settingsSection;
    renderAccountPage();
    document.getElementById("settingsSectionTitle")?.focus({ preventScroll: true });
    return;
  }
  if (button.dataset.settingsTopic) {
    const target = document.getElementById(`settings-${button.dataset.settingsTopic}`);
    modeSurface.querySelectorAll("[data-settings-topic]").forEach(item => item.removeAttribute("aria-current"));
    button.setAttribute("aria-current", "location");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "nearest" });
    return;
  }
  if (button.dataset.freeRandomMode === "both") {
    freeRandomizerExpanded = Boolean(document.querySelector(".free-randomizer")?.open);
    freePlayRandomSettings = {
      ...freePlayRandomSettings,
      mode: "both",
      randomSelected: freePlayRandomSettings.randomSelected === false,
      assetSelected: false,
      instrumentSelected: false,
      manualSymbol: currentSymbol.ticker
    };
    freePlaySettingsExpanded = { asset: false, instrument: false };
    saveFreePlayRandomSettings();
    renderModeSurface();
    const activeModeButton = modeSurface.querySelector(`[data-free-random-mode="${freePlayRandomSettings.mode}"]`);
    activeModeButton?.focus({ preventScroll: true });
    showToast(freePlayRandomSettings.randomSelected ? "Random practice selected." : "Assets and Instruments unlocked.");
    await loadFreePlayChart();
    return;
  }

  if (action === "account-open-review-page") {
    await setMode("review", { loadChart: false });
    return;
  }
  if (action === "account-export-data") {
    exportLocalAccountData();
    return;
  }

  if (button.dataset.learnChapter !== undefined) {
    const requestedChapter = Number(button.dataset.learnChapter);
    if (!Number.isInteger(requestedChapter) || requestedChapter < 0 || requestedChapter >= learnModules.length) return;
    activeLearnChapter = requestedChapter;
    renderLearn();
    const lesson = document.querySelector(".course-lesson");
    lesson?.focus({ preventScroll: true });
    lesson?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (action === "paper-quote" || action === "paper-refresh") {
    await submitSymbol(currentSymbol.ticker, { remember: false });
    return;
  }
  if (action === "paper-buy") {
    await executePaperOrder("buy");
    return;
  }
  if (action === "paper-sell") {
    await executePaperOrder("sell");
    return;
  }
  if (action === "paper-open-chart") {
    await openPaperChart(button.dataset.paperChart);
    return;
  }
  if (action === "paper-close-chart") {
    paperChartSymbol = "";
    document.body.classList.remove("paper-chart-open");
    renderPaperTrading();
    syncNextChartButton();
    showToast("Paper chart hidden.");
    return;
  }
  if (action === "quant-build") { openQuantView("build"); return; }
  if (action === "quant-example") {
    const id = button.dataset.quantExample;
    if (quantView === "landing" && Object.hasOwn(quantExamples, id)) openQuantView("build", "", quantExamples[id]);
    return;
  }
  if (action === "quant-ai") {
    const id = button.dataset.quantPrompt;
    if (!window.PretiumAI?.open) { showToast("Pretium AI is unavailable."); return; }
    if (quantView === "landing") openQuantView("build");
    window.PretiumAI.open(quantLearningPrompts[id] || "", button);
    return;
  }
  if (action === "quant-edit") { openQuantView("build", button.dataset.quantId); return; }
  if (action === "quant-landing") { openQuantView("landing"); return; }
  if (action === "quant-testing") { openQuantView("testing", button.dataset.quantId); return; }
  if (action === "quant-save") { await saveQuantAlgorithm(); return; }
  if (action === "quant-test-code") { testQuantDraft(); return; }
  if (action === "quant-run") {
    updateQuantConfigFromForm();
    renderQuantLab();
    showToast("Quant backtest rerun.");
    return;
  }
  if (action === "quant-apply") {
    updateQuantConfigFromForm();
    runQuantBacktest();
    applyQuantSignalsToChart();
    return;
  }
  if (action === "quant-random") {
    updateQuantConfigFromForm();
    const symbol = ["SPY", "QQQ", "TLT", "NVDA", "BTC-USD", "GC=F"][Math.floor(Math.random() * 6)];
    showToast(`Running Quant Lab on ${symbol}.`);
    await submitSymbol(symbol, { remember: true });
    renderQuantLab();
    return;
  }
  if (button.dataset.newsSymbol) {
    const symbol = button.dataset.newsSymbol;
    showToast(`Opening ${symbol} practice chart from MarketPulse News.`);
    setMode("free", { loadChart: false });
    result.innerHTML = `<strong>${symbol} from MarketPulse News</strong><p>${loadingTextHtml("Loading a practice chart tied to this brief...")}</p>`;
    const loaded = await submitSymbol(symbol, { remember: true });
    if (!loaded) {
      result.innerHTML = `<strong>${symbol} could not load</strong><p>Market data was unavailable, so Pretium Labs kept your current chart instead of silently swapping symbols.</p>`;
    }
    return;
  }
  if (button.dataset.newsSave) {
    const id = button.dataset.newsSave;
    if (savedNews.has(id)) savedNews.delete(id);
    else savedNews.add(id);
    if ((await saveSavedNews()) === false) return;
    renderNews();
    showToast(savedNews.has(id) ? "Brief saved." : "Brief removed.");
    return;
  }
  if (button.dataset.learnQuizSubmit !== undefined) {
    submitLearnQuiz(Number(button.dataset.learnQuizSubmit));
    return;
  }
  if (button.dataset.learnQuizStart !== undefined) {
    startLearnQuiz(Number(button.dataset.learnQuizStart));
    return;
  }
  if (action === "learn-reset") {
    resetLearnProgress();
    return;
  }
  if (action === "learn-scroll-next") {
    scrollToNextLearnChapter();
    return;
  }
  if (action === "learn-toggle-step") {
    const step = button.getAttribute("data-learn-step");
    if (!step) return;
    const activity = learnChapterActivity(activeLearnChapter);
    activity.steps = activity.steps.includes(step)
      ? activity.steps.filter(item => item !== step)
      : [...activity.steps, step];
    if ((await saveLearnActivity()) === false) return;
    renderLearn();
    showToast(activity.steps.includes(step) ? "Lesson step marked complete." : "Lesson step reopened.");
    return;
  }
  if (action === "learn-flashcard") {
    const termIndex = Number(button.getAttribute("data-flashcard"));
    if (!Number.isInteger(termIndex)) return;
    const activity = learnChapterActivity(activeLearnChapter);
    activity.flashcards = activity.flashcards.includes(termIndex)
      ? activity.flashcards.filter(item => item !== termIndex)
      : [...activity.flashcards, termIndex];
    if (!activity.steps.includes("terms")) activity.steps.push("terms");
    if ((await saveLearnActivity()) === false) return;
    renderLearn();
    return;
  }
  if (action === "learn-save-reflection" || action === "learn-mark-reflection") {
    const activity = learnChapterActivity(activeLearnChapter);
    activity.reflection = document.getElementById("learnReflection")?.value.trim() || "";
    if (action === "learn-mark-reflection" && activity.reflection.length < 20) {
      showToast("Write at least one sentence before marking the reflection done.");
      return;
    }
    if (action === "learn-mark-reflection" && !activity.steps.includes("reflection")) activity.steps.push("reflection");
    if ((await saveLearnActivity()) === false) return;
    renderLearn();
    showToast(action === "learn-mark-reflection" ? "Reflection saved and marked done." : "Reflection saved.");
    return;
  }
  if (button.dataset.pack) {
    loadPack(button.dataset.pack, button.dataset.packPractice);
    return;
  }
  if (action === "pack-paper-next") {
    stopEventPackPlayback();
    advanceEventPackPaper(packPaperIndex + 1, action);
    return;
  }
  if (action === "pack-paper-day") {
    stopEventPackPlayback();
    if (!isEventPackPaper() || !eventPackChartReady()) return;
    const date = eventPackPaperDate(rawCandles[packPaperIndex].time);
    advanceEventPackPaper(rawCandles.findIndex((bar, index) => index > packPaperIndex && eventPackPaperDate(bar.time) > date), action);
    return;
  }
  if (action === "pack-paper-play") {
    playEventPackPaper();
    return;
  }
  if (action === "pack-browse") {
    stopEventPackPlayback();
    chartRequestId += 1;
    packChartActive = false;
    activePackWindow = null;
    setLoading(false);
    renderModeSurface();
    modeSurface.querySelector(`#event-pack-${activePackId} > summary`)?.focus();
    return;
  }
  if (action === "paper-sell-all") {
    paperSellAllPending = true;
    renderPaperTrading();
    document.querySelector(".paper-sell-all-confirm")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (action === "paper-sell-all-cancel") {
    paperSellAllPending = false;
    renderPaperTrading();
    return;
  }
  if (action === "paper-sell-all-confirm") {
    executePaperSellAll();
    return;
  }
  if (action === "daily-start") startDaily();
  if (action === "daily-calendar") openDailyCalendar();
  if (action === "review-filter") {
    reviewRecordFilter = button.dataset.reviewFilter === "favorites" ? "favorites" : "all";
    renderReview();
    modeSurface.querySelector(`[data-review-filter="${reviewRecordFilter}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (action === "review-favorite") {
    event.preventDefault();
    const record = practiceHistory.find(item => String(item.id) === String(button.dataset.reviewId));
    if (!record) return;
    if (record.favorite === true) delete record.favorite;
    else record.favorite = true;
    delete record.bulkFavoriteAdded;
    savePracticeHistory();
    renderReview();
    const replacement = modeSurface.querySelector(`[data-action="review-favorite"][data-review-id="${CSS.escape(String(record.id))}"]`)
      || modeSurface.querySelector('[data-review-filter="favorites"]');
    replacement?.focus({ preventScroll: true });
    return;
  }
  if (action === "review-favorite-all") {
    setVisibleReviewRecordsFavorite(visibleReviewRecords().some(record => record.favorite !== true));
    renderReview();
    const replacement = modeSurface.querySelector('[data-action="review-favorite-all"]:not(:disabled)')
      || modeSurface.querySelector('[data-review-filter="favorites"]');
    replacement?.focus({ preventScroll: true });
    return;
  }
  if (action === "review-stat-toggle") {
    const statistic = button.dataset.reviewStat || "modes";
    expandedReviewStatistic = expandedReviewStatistic === statistic ? "" : statistic;
    if (expandedReviewStatistic) selectedReviewWeek = 1;
    renderReview();
    modeSurface.querySelector(`[data-review-stat="${statistic}"]`)?.focus();
    return;
  }
  if (action === "review-week-select") {
    selectedReviewWeek = Math.max(1, Number(button.dataset.reviewWeek) || 1);
    renderReview();
    modeSurface.querySelector(`[data-review-week="${selectedReviewWeek}"]`)?.focus();
    return;
  }
  if (action === "review-accuracy-mode") {
    const mode = button.dataset.reviewAccuracyMode;
    if (mode === "all") selectedReviewAccuracyModes = [];
    else if (reviewGameModeOptions.some(([value]) => value === mode && value !== "quant")) {
      selectedReviewAccuracyModes = selectedReviewAccuracyModes.includes(mode)
        ? selectedReviewAccuracyModes.filter(value => value !== mode)
        : [...selectedReviewAccuracyModes, mode];
    } else return;
    renderReview();
    modeSurface.querySelector(`[data-review-accuracy-mode="${mode}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (action === "review-pattern-select") {
    const pattern = button.dataset.reviewPattern || "";
    if (!choices.includes(pattern)) return;
    selectedReviewPattern = pattern;
    renderReview();
    modeSurface.querySelector(`[data-review-pattern="${CSS.escape(pattern)}"]`)?.focus();
    return;
  }
  if (action === "review-game-menu" || action === "review-hover-menu") {
    if (document.getElementById("reviewGameMenu")?.open) closeReviewGameMenu();
    else openReviewGameMenu();
    return;
  }
  if (action === "review-shuffle") {
    await shuffleReviewChart();
    return;
  }
  if (action === "review-game-mode") {
    const mode = button.dataset.reviewGameMode;
    toggleReviewGameMode(mode);
    return;
  }
  if (action === "review-game-reset") { toggleReviewGameMode("all"); return; }
  if (action === "review-game-apply") {
    applyReviewGameModes();
    return;
  }
  if (action === "review-preview-retry") {
    const host = button.closest(".review-chart-host");
    const record = host && findReviewTarget(host.dataset.reviewId, host.dataset.reviewRound);
    if (host && record) {
      host.dataset.reviewPreviewState = "idle";
      host.innerHTML = reviewChartPreviewSvg(record, []);
      hydrateReviewPreviewHost(host);
    }
    return;
  }
  if (action === "review-open") openReviewRecord(button.dataset.reviewId, button.dataset.reviewRound);
  if (action === "review-expand") modeSurface.querySelectorAll(".review-records details").forEach(item => { item.open = true; });
  if (action === "review-collapse") modeSurface.querySelectorAll(".review-records details").forEach(item => { item.open = false; });
  if (action === "pack-quiz") {
    const keys = Object.keys(eventPacks);
    showToast("Event pack challenge queued.");
    loadPack(keys[Math.floor(Math.random() * keys.length)]);
  }
  if (action === "pack-library") {
    document.getElementById("packLibrary")?.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Scenario library in view.");
  }

});

modeSurface.addEventListener("toggle", event => {
  const disclosure = event.target;
  if (!(disclosure instanceof HTMLDetailsElement)) return;
  if (disclosure.matches(".quant-parameters") && !disclosure.open) hideQuantHelp();
  const scope = disclosure.dataset.freeSettings;
  if (["asset", "instrument"].includes(scope)) {
    freePlaySettingsExpanded[scope] = disclosure.open;
    return;
  }
  if (!disclosure.open) {
    if (disclosure.matches(".review-disclosure")) {
      disclosure.querySelectorAll(".review-records details[open]").forEach(item => { item.open = false; });
      // Drop the SVG trees; saved trade data stays available for the next open.
      disclosure.querySelectorAll(".review-chart-host").forEach(host => {
        host.replaceChildren();
        host.dataset.reviewPreviewState = "idle";
      });
    }
    return;
  }
  // Only hydrate the listing/round being opened, never a hidden descendant.
  const host = disclosure.querySelector(':scope > .review-trade-preview .review-chart-host[data-review-preview-state="idle"]');
  if (host) hydrateReviewPreviewHost(host);
}, true);

modeSurface.addEventListener("input", event => {
  const search = event.target.closest?.(".free-instrument-search");
  if (search) {
    instrumentSearchQueries[appMode] = search.value;
    syncInstrumentSearch(search);
    return;
  }
  const field = event.target.closest?.("[data-paper-order-field]");
  if (field) clearPaperOrderFieldInvalid(field);
});

modeSurface.addEventListener("focusin", event => {
  if (isEventPackPaper() && event.target.matches("input, .paper-order-error-icon")) stopEventPackPlayback();
});

modeSurface.addEventListener("change", async event => {
  if (event.target.id === "websiteLanguage") {
    const select = event.target;
    const status = document.getElementById("websiteLanguageStatus");
    select.disabled = true;
    status.textContent = "Loading language…";
    try {
      await window.siteI18n.setLanguage(select.value);
      status.textContent = "";
    } catch {
      select.value = window.siteI18n.language;
      status.textContent = "Could not load this language. Please try again.";
    } finally {
      select.disabled = false;
    }
    return;
  }
  if (event.target.matches("[data-review-select]")) {
    if (setReviewRecordChecked(event.target.dataset.reviewSelect, event.target.checked)) syncReviewCheckedControls();
    return;
  }
  if (event.target.matches("[data-review-select-all]")) {
    setVisibleReviewRecordsChecked(event.target.checked);
    modeSurface.querySelectorAll("[data-review-select]").forEach(input => { input.checked = event.target.checked; });
    syncReviewCheckedControls();
    return;
  }
  if (event.target.id === "iqLessonSelect") {
    const index = Number(event.target.value);
    if (!learnChapterUnlocked(index)) return;
    activeLearnChapter = index;
    renderLearn();
    document.querySelector(".iq-lesson")?.focus({ preventScroll: true });
    return;
  }
  if (event.target?.name === "freeAssetScope") {
    const assetTypes = [...modeSurface.querySelectorAll('input[name="freeAssetScope"]:checked')].map(input => input.value);
    const instruments = freePlayRandomSettings.assetSelected && freePlayRandomSettings.instrumentSelected
      ? freePlayRandomSettings.instruments.filter(symbol => localSymbols.some(([ticker, , asset]) =>
        ticker === symbol && (!assetTypes.length || assetTypes.includes(asset)))) : [];
    freePlayRandomSettings = {
      ...freePlayRandomSettings,
      randomSelected: false,
      assetSelected: true,
      instrumentSelected: instruments.length > 0,
      assetTypes,
      instruments
    };
    const instrumentPicker = modeSurface.querySelector(".free-instrument-options");
    if (instrumentPicker) instrumentPicker.innerHTML = freePlayInstrumentOptionsHtml();
    const search = modeSurface.querySelector(".free-instrument-search");
    if (search?.value) syncInstrumentSearch(search);
    saveFreePlayRandomSettings();
    syncFreePlayScopeSelection();
    await loadFreePlayChart();
    return;
  }
  if (event.target?.name === "freeInstrumentScope") {
    if (!freePlayRandomSettings.assetSelected) return;
    const instruments = [...modeSurface.querySelectorAll('input[name="freeInstrumentScope"]:checked')].map(input => input.value);
    freePlayRandomSettings = {
      ...freePlayRandomSettings,
      randomSelected: false,
      instrumentSelected: instruments.length > 0,
      instruments
    };
    saveFreePlayRandomSettings();
    syncFreePlayScopeSelection();
    await loadFreePlayChart();
    return;
  }
  if (event.target?.id === "bugScreenshot") {
    updateScreenshotPreview();
  }
});

modeSurface.addEventListener("input", event => {
  if (event.target?.id === "quantCode" || event.target?.id === "quantAlgorithmName") scheduleQuantDraftSave();
});

modeSurface.addEventListener("change", event => {
  if (event.target?.id === "quantStrategy") {
    updateQuantConfigFromForm();
    quantBacktest = null;
    renderQuantLab();
    showToast("Quant strategy updated.");
    return;
  }
  if (event.target?.id === "quantLanguage") {
    const language = quantLanguages[event.target.value] ? event.target.value : "python";
    if (quantView === "build") captureQuantDraft();
    quantConfig.customLanguage = language;
    quantConfig.customCode = quantLanguageTemplate(language);
    const editor = document.getElementById("quantCode");
    if (editor) editor.value = quantLanguageTemplate(language);
    if (quantView === "build") scheduleQuantDraftSave();
    showToast(`${quantLanguages[language].label} template loaded.`);
  }
});

modeSurface.addEventListener("submit", async event => {
  if (event.target.matches("[data-event-paper-jump]")) {
    event.preventDefault();
    stopEventPackPlayback();
    if (!isEventPackPaper() || !eventPackChartReady() || !event.target.reportValidity()) return;
    const date = document.getElementById("eventPaperDate").value;
    const current = eventPackPaperDate(rawCandles[packPaperIndex].time);
    if (date <= current || date > eventPackPaperDate(rawCandles.at(-1).time)) return;
    advanceEventPackPaper(rawCandles.findIndex((bar, index) => index > packPaperIndex && eventPackPaperDate(bar.time) >= date));
    return;
  }
  if (event.target.matches("[data-paper-ticket]")) {
    event.preventDefault();
    if (!isEventPackPaper()) await submitSymbol(currentSymbol.ticker, { remember: false });
  }
});

document.addEventListener("click", async event => {
  const planButton = event.target.closest("[data-plan-action]");
  if (planButton) {
    handlePracticePlanAction(planButton.dataset.planAction);
    return;
  }
  const packButton = event.target.closest("[data-pack]");
  if (packButton && !event.composedPath().includes(modeSurface)) loadPack(packButton.dataset.pack, packButton.dataset.packPractice);
});

roundStart.onclick = dockSidePanel;
levelButton.onclick = openAccountModal;
levelClose.onclick = closeLevelsModal;
levelModal.addEventListener("click", event => {
  if (event.target === levelModal) closeLevelsModal();
});
dailyCalendarClose.onclick = closeDailyCalendar;
dailyCalendarModal.addEventListener("click", event => {
  if (event.target === dailyCalendarModal) closeDailyCalendar();
  const dateButton = event.target.closest("[data-calendar-date]");
  if (!dateButton || dateButton.disabled) return;
  selectedDailyDate = dateButton.dataset.calendarDate;
  closeDailyCalendar();
  renderModeSurface();
  loadModeChart("daily");
  showToast(`Daily Puzzle selected: ${selectedDailyDate}.`);
});
dailyCalendarPrev.onclick = async () => {
  if (dailyCalendarPrev.disabled) return;
  dailyCalendarMonth = new Date(dailyCalendarMonth.getFullYear(), dailyCalendarMonth.getMonth() - 1, 1);
  await refreshDailyStatus(dateToIso(dailyCalendarMonth.getFullYear(), dailyCalendarMonth.getMonth(), 1).slice(0, 7));
  renderDailyCalendar();
};
dailyCalendarNext.onclick = async () => {
  if (dailyCalendarNext.disabled) return;
  dailyCalendarMonth = new Date(dailyCalendarMonth.getFullYear(), dailyCalendarMonth.getMonth() + 1, 1);
  await refreshDailyStatus(dateToIso(dailyCalendarMonth.getFullYear(), dailyCalendarMonth.getMonth(), 1).slice(0, 7));
  renderDailyCalendar();
};
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && streakMenu?.classList.contains("is-open")) {
    streakMenuPinned = false;
    streakTrigger?.focus();
    setStreakMenuOpen(false);
  }
  if (event.key === "Escape" && !nicknameModal.classList.contains("hidden")) {
    closeNicknameDialog();
    return;
  }
  if (event.key === "Escape" && symbolResultsPage && !symbolResultsPage.hidden) closeSymbolResults();
  if (event.key === "Escape" && !levelModal.classList.contains("hidden")) closeLevelsModal();
  if (event.key === "Escape" && accountModal && !accountModal.classList.contains("hidden")) closeAccountModal();
  if (event.key === "Escape" && !dailyCalendarModal.classList.contains("hidden")) closeDailyCalendar();
});

modeSurface.addEventListener("change", event => {
  if (event.target.matches("[data-learn-step-check]")) {
    const step = event.target.getAttribute("data-learn-step-check");
    const activity = learnChapterActivity(activeLearnChapter);
    activity.steps = event.target.checked
      ? [...new Set([...activity.steps, step])]
      : activity.steps.filter(item => item !== step);
    saveLearnActivity();
    renderLearn();
    showToast(event.target.checked ? "Lesson step marked complete." : "Lesson step reopened.");
    return;
  }
  if (event.target.matches("[data-learn-answer]")) {
    const [chapterIndex, questionIndex] = event.target.dataset.learnAnswer.split(":").map(Number);
    learnQuizAnswers[chapterIndex] ||= {};
    learnQuizAnswers[chapterIndex][questionIndex] = Number(event.target.value);
    return;
  }
  if (event.target.id !== "dailyDate") return;
  const value = event.target.value;
  if (!isArchiveUnlocked() || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > dailyToday() || value < dailyState.firstDate) {
    event.target.value = selectedDailyDate;
    showSymbolError(value, "Select an available date from the unlocked archive.");
    return;
  }
  selectedDailyDate = value;
  renderModeSurface();
  loadModeChart("daily");
  showToast(`Daily archive moved to ${selectedDailyDate}.`);
});

// Native wheel inertia may finish after a page-up reset. Hold that restored
// position until the user next interacts with this panel.
predictionPanel?.addEventListener("scroll", () => {
  if (predictionPanelRestoreTop === null) return;
  const top = Math.min(predictionPanelRestoreTop, Math.max(0, predictionPanel.scrollHeight - predictionPanel.clientHeight));
  if (predictionPanel.scrollTop !== top) predictionPanel.scrollTo({ top, behavior: "instant" });
}, { passive: true });
["wheel", "pointerdown", "touchstart", "keydown", "focusin"].forEach(type => {
  predictionPanel?.addEventListener(type, () => { predictionPanelRestoreTop = null; }, { passive: true });
});
new ResizeObserver(updatePredictionPanelScroll).observe(document.querySelector(".topbar"));

window.addEventListener("scroll", () => {
  updateScrollProgress();
}, { passive: true });
document.addEventListener("pointerdown", event => {
  if (!event.isPrimary || event.button !== 0) return;
  if (document.body.dataset.theme !== "gamify") return;
  const ripple = document.createElement("span");
  ripple.className = "cursor-click-ripple";
  ripple.setAttribute("aria-hidden", "true");
  ripple.style.left = `${event.clientX}px`;
  ripple.style.top = `${event.clientY}px`;
  document.body.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 650);
}, { passive: true });
window.addEventListener("pointermove", event => {
  if (document.body.dataset.animationGraph === "off" || document.body.dataset.theme !== "gamify" || event.pointerType === "touch" || event.target.closest(".chart-canvas-wrap")) {
    document.body.classList.remove("market-pointer-active");
    return;
  }
  const siteCrosshair = document.getElementById("siteCrosshair");
  if (!siteCrosshair) return;
  siteCrosshair.style.setProperty("--market-cursor-x", `${event.clientX}px`);
  siteCrosshair.style.setProperty("--market-cursor-y", `${event.clientY}px`);
  document.body.classList.add("market-pointer-active");
}, { passive: true });
document.documentElement.addEventListener("pointerleave", () => {
  document.body.classList.remove("market-pointer-active");
});
window.addEventListener("blur", () => {
  document.body.classList.remove("market-pointer-active");
});
window.addEventListener("resize", () => {
  updateScrollProgress();
  fitPredictionChoiceLabels();
  resizeChartCanvas();
  if (rawCandles.length || (appMode === "ranked" && liveMarketClosed)
    || (appMode === "review" && reviewChartActive && !activeReviewRecordId)) drawChart();
});
window.addEventListener("online", updateConnectivity);
window.addEventListener("offline", updateConnectivity);
window.addEventListener("storage", event => {
  if (event.key === ANIMATION_KEY) {
    animationPreferences = loadAnimationPreferences();
    syncAnimationPreferences();
    return;
  }

});

void (async () => {
  reloadAccountScopedState();
  renderPackLibrary();
  setMode(appMode);
  updateConnectivity();
  updateThemeToggleLabel();
  updateScrollProgress();
  updateStats();
  resizeChartCanvas();
  renderPracticePlan();
  showProviderNotice();
  navigationReady = true;
  saveNavigationPage();
  {
    if (!restoreReloadSession(loadReloadSession()) && restoredNavigationPage) loadModeChart(appMode);
    else if (!restoredNavigationPage) submitSymbol("AAPL");
  }
})();

// Capture at the lifecycle boundary, including scroll/zoom changes that do not
// emit form events. No unload handler or per-frame storage work is needed.
window.addEventListener("pagehide", saveReloadSession);
window.addEventListener("pagehide", flushQuantDraftSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushQuantDraftSave();
    stopEventPackPlayback();
    saveReloadSession();
  }
});

// A decorative overlay: never replaces the cursor or receives pointer input.
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ns = "http://www.w3.org/2000/svg";
  const overlay = document.createElementNS(ns, "svg");
  overlay.classList.add("mouse-wind-trail");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("focusable", "false");
  const definitions = document.createElementNS(ns, "defs");
  const tooltipClip = document.createElementNS(ns, "clipPath");
  tooltipClip.id = "mouseWindTooltipClip";
  tooltipClip.setAttribute("clipPathUnits", "userSpaceOnUse");
  const clipShape = document.createElementNS(ns, "path");
  clipShape.setAttribute("clip-rule", "evenodd");
  tooltipClip.appendChild(clipShape);
  definitions.appendChild(tooltipClip);
  overlay.appendChild(definitions);
  const particleLayer = document.createElementNS(ns, "g");
  particleLayer.classList.add("mouse-wind-particles");
  particleLayer.setAttribute("clip-path", "url(#mouseWindTooltipClip)");
  overlay.appendChild(particleLayer);
  document.body.appendChild(overlay);

  const random = (min, max) => min + Math.random() * (max - min);
  const windLifetime = 225;
  const windLength = 120;
  // These points sit inside the artwork, so the OS cursor covers the start of
  // each line and the visible stroke emerges directly from its silhouette.
  // Glove coordinates follow its 48-unit viewBox, 32px size and (14, 2) hotspot.
  const cursorBodies = {
    // Keep all four contacts in the pointing finger, close to its hotspot.
    glove: [[21, 7], [21, 10], [21, 13], [20, 16]]
      .map(([x, y]) => [x * 2 / 3 - 14, y * 2 / 3 - 2]),
    arrow: [[1, 4], [3, 6], [5, 9], [4, 11], [2, 13], [1, 10]],
    pointer: [[0, 4], [0, 9], [3, 13], [5, 16], [-2, 14], [-2, 10]],
    text: [[0, -5], [0, -2], [0, 2], [0, 5]],
    grab: [[-3, -2], [2, -3], [5, 0], [3, 4], [-2, 4], [-5, 1]],
    crosshair: [[-4, 0], [0, 0], [0, -4], [0, 0], [4, 0], [0, 0], [0, 4], [0, 0]],
    centered: [[-2, -2], [2, -2], [2, 2], [-2, 2]]
  };
  function cursorBody(target) {
    const cursor = getComputedStyle(target).cursor;
    if (cursor === "none") return null;
    if (cursor.includes("cartoon-glove-cursor.svg")) return cursorBodies.glove;
    if (cursor === "pointer") return cursorBodies.pointer;
    if (cursor === "text" || cursor === "vertical-text") return cursorBodies.text;
    if (cursor === "grab" || cursor === "grabbing") return cursorBodies.grab;
    if (cursor === "crosshair" || cursor === "cell") return cursorBodies.crosshair;
    if (cursor.includes("resize") || cursor === "not-allowed" || cursor === "no-drop"
      || cursor === "move" || cursor.startsWith("zoom-")) return cursorBodies.centered;
    return cursorBodies.arrow;
  }
  function contact(body, phase) {
    const index = ((phase % body.length) + body.length) % body.length;
    const a = body[Math.floor(index)];
    const b = body[(Math.floor(index) + 1) % body.length];
    const mix = (1 - Math.cos((index % 1) * Math.PI)) / 2;
    return { x: a[0] + (b[0] - a[0]) * mix, y: a[1] + (b[1] - a[1]) * mix };
  }
  const strands = [0, .25, .5, .75].map((phase, index) => {
    const path = document.createElementNS(ns, "path");
    path.classList.add("mouse-wind-streak");
    path.setAttribute("stroke-linecap", "butt");
    particleLayer.appendChild(path);
    return { paths: [path], phase, width: 2.4 - index * .23, brightness: 1 - index * .1 };
  });
  let points = [];
  let particles = [];
  let previous = null;
  let travel = 0;
  let spacing = random(14, 28);
  let frame = 0;
  const enabled = () => document.body.dataset.animationTrail !== "off" && document.body.dataset.theme === "gamify" && !reducedMotion.matches;

  const fadeAt = age => {
    const remaining = Math.max(0, Math.min(1, 1 - age / windLifetime));
    return remaining * remaining * (3 - 2 * remaining);
  };

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    points = [];
    travel = 0;
    strands.forEach(({ paths }) => paths.forEach(path => path.removeAttribute("d")));
    particles.forEach(({ path }) => path.remove());
    particles = [];
  }

  function emitGlint(x, y, ux, uy, now, body) {
    if (particles.length >= 28) return;
    const path = document.createElementNS(ns, "path");
    path.classList.add("mouse-wind-glint");
    const dust = Math.random() < .6;
    if (dust) path.classList.add("mouse-wind-dust");
    path.setAttribute("stroke-width", ".55");
    path.setAttribute("opacity", "0");
    particleLayer.appendChild(path);
    const origin = contact(body, random(0, body.length));
    particles.push({ path, born: now,
      x: x + origin.x, y: y + origin.y,
      ux, uy, dust, lifetime: windLifetime,
      drift: random(15, 42), sideways: random(-30, 30),
      size: dust ? random(.65, 1.5) : random(2, 4.4),
      angle: random(-35, 35), spin: random(-35, 35), brightness: random(.65, 1)
    });
  }

  function movementPoint(x, y, time, body) {
    return { x, y, time, contacts: strands.map(strand => {
      const origin = contact(body, strand.phase * body.length);
      return { x: x + origin.x, y: y + origin.y };
    }) };
  }

  function drawWind(now) {
    // Keep one boundary sample so the oldest end recedes continuously.
    while (points.length > 1 && now - points[1].time >= windLifetime) points.shift();
    if (points.length < 2 || now - points[points.length - 1].time >= windLifetime) {
      strands.forEach(({ paths }) => paths.forEach(path => path.removeAttribute("d")));
      return false;
    }
    const trail = [{ ...points[points.length - 1], distance: 0 }];
    let distance = 0;
    for (let i = points.length - 2; i >= 0; i--) {
      const point = points[i];
      const next = points[i + 1];
      const length = Math.hypot(next.x - point.x, next.y - point.y);
      const fraction = Math.max(0, Math.min(1, (windLength - distance) / (length || 1),
        (windLifetime - (now - next.time)) / (next.time - point.time || 1)));
      if (!fraction) break;
      trail.push({ time: next.time + (point.time - next.time) * fraction, distance: distance + length * fraction,
        contacts: point.contacts.map((origin, index) => ({
          x: next.contacts[index].x + (origin.x - next.contacts[index].x) * fraction,
          y: next.contacts[index].y + (origin.y - next.contacts[index].y) * fraction
        })) });
      distance += length * fraction;
      if (fraction < 1) break;
    }
    let active = false;
    for (const [index, strand] of strands.entries()) {
      for (let i = 1; i < trail.length; i++) {
        let path = strand.paths[i - 1];
        if (!path) {
          path = document.createElementNS(ns, "path");
          path.classList.add("mouse-wind-streak");
          path.setAttribute("stroke-linecap", "butt");
          particleLayer.appendChild(path);
          strand.paths.push(path);
        }
        const a = trail[i - 1];
        const b = trail[i];
        const tailFade = fadeAt((a.distance + b.distance) / 2 / windLength * windLifetime);
        const fade = fadeAt(now - (a.time + b.time) / 2) * tailFade;
        // Fixed contacts and straight segments reproduce only the sampled motion.
        path.setAttribute("d", `M ${a.contacts[index].x} ${a.contacts[index].y} L ${b.contacts[index].x} ${b.contacts[index].y}`);
        path.setAttribute("opacity", fade * strand.brightness);
        path.setAttribute("stroke-width", strand.width * (.35 + .65 * fade));
        active = true;
      }
      for (let i = trail.length - 1; i < strand.paths.length; i++) strand.paths[i].removeAttribute("d");
    }
    return active;
  }

  function draw(now) {
    if (!enabled()) {
      clear();
      return;
    }
    frame = 0;
    // Keep the existing chart tooltip above the effect without changing any
    // chart stacking contexts, tooltip styles, or pointer interactions.
    let clip = `M 0 0 H ${window.innerWidth} V ${window.innerHeight} H 0 Z`;
    if (!chartTip.hidden) {
      const box = chartTip.getBoundingClientRect();
      if (box.width && box.height) {
        const [dx = 0, dy = 0, blur = 0, spread = 0] =
          (getComputedStyle(chartTip).boxShadow.match(/-?[\d.]+px/g) || []).map(value => parseFloat(value));
        const reach = Math.max(0, blur + spread);
        const left = box.left + Math.min(0, dx - reach);
        const top = box.top + Math.min(0, dy - reach);
        const right = box.right + Math.max(0, dx + reach);
        const bottom = box.bottom + Math.max(0, dy + reach);
        clip += ` M ${left} ${top} H ${right} V ${bottom} H ${left} Z`;
      }
    }
    clipShape.setAttribute("d", clip);
    const windActive = drawWind(now);
    particles = particles.filter(particle => {
      const age = now - particle.born;
      if (age >= particle.lifetime) {
        particle.path.remove();
        return false;
      }
      return true;
    });
    for (const particle of particles) {
      const age = now - particle.born;
      if (age < 0) continue;
      const progress = age / particle.lifetime;
      const seconds = age / 1000;
      const { path, ux, uy } = particle;
      const x = particle.x - ux * particle.drift * seconds - uy * particle.sideways * seconds;
      const y = particle.y - uy * particle.drift * seconds + ux * particle.sideways * seconds;
      const fade = Math.min(1, age / 25) * fadeAt(age);
      const size = particle.size * Math.sin(Math.PI * progress) ** .65;
      const width = size * .62;
      // Concave sides give each tiny diamond the shape of a polished glint.
      path.setAttribute("d", particle.dust
        ? `M ${-size} 0 a ${size} ${size} 0 1 0 ${size * 2} 0 a ${size} ${size} 0 1 0 ${-size * 2} 0`
        : `M 0 ${-size} Q 0 0 ${width} 0 Q 0 0 0 ${size} Q 0 0 ${-width} 0 Q 0 0 0 ${-size} Z`);
      path.setAttribute("transform", `translate(${x} ${y}) rotate(${particle.angle + particle.spin * seconds})`);
      path.setAttribute("opacity", fade * particle.brightness);
    }
    if (windActive || particles.length) frame = requestAnimationFrame(draw);
  }

  function sampleMovement(x, y, now, body) {
    if (!previous || now - previous.time > windLifetime || previous.body !== body) {
      points = [movementPoint(x, y, now, body)];
      previous = { x, y, time: now, ux: 1, uy: 0, body };
      travel = 0;
      return;
    }
    const dx = x - previous.x;
    const dy = y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    const ux = dx / distance;
    const uy = dy / distance;
    // Dense movement samples keep each strand connected, including quick sweeps.
    const steps = Math.min(64, Math.ceil(distance / 4));
    for (let i = 1; i <= steps; i++) {
      const fraction = i / steps;
      points.push(movementPoint(previous.x + dx * fraction, previous.y + dy * fraction,
        previous.time + (now - previous.time) * fraction, body));
    }
    points = points.slice(-256);
    // Distance-based emission stays consistent across mouse polling rates.
    let remaining = distance;
    for (let count = 0; travel + remaining >= spacing && count < 6; count++) {
      const step = spacing - travel;
      remaining -= step;
      const fraction = 1 - remaining / distance;
      const px = previous.x + dx * fraction;
      const py = previous.y + dy * fraction;
      emitGlint(px, py, ux, uy, now, body);
      travel = 0;
      spacing = random(14, 32);
    }
    travel = Math.min(travel + remaining, spacing - 1);
    previous = { x, y, time: now, ux, uy, body };
  }

  window.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" || !enabled()) {
      clear();
      return;
    }
    const body = cursorBody(event.target);
    if (!body) {
      clear();
      return;
    }
    const now = performance.now();
    // Coalesced hardware samples preserve turns between rendered frames. Older
    // browsers still follow the normal pointer event without prediction/lag.
    const samples = event.getCoalescedEvents?.() || [];
    for (const sample of [...samples, event]) {
      const time = sample.timeStamp <= now && now - sample.timeStamp < 1000 ? sample.timeStamp : now;
      if (previous && time < previous.time) continue;
      sampleMovement(sample.clientX, sample.clientY, time, body);
    }
    // Paint the latest head in this input task; RAF handles only aging/fading.
    drawWind(now);
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });

  window.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse" || event.button !== 0 || !enabled()) return;
    const now = performance.now();
    const body = cursorBody(event.target);
    if (!body) return;
    for (let i = 0; i < 2; i++) emitGlint(event.clientX, event.clientY, 0, -1, now, body);
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", clear);
  window.addEventListener("blur", clear);
  window.addEventListener("resize", clear);
  document.addEventListener("visibilitychange", clear);
  reducedMotion.addEventListener("change", clear);
  new MutationObserver(clear).observe(document.body, { attributes: true, attributeFilter: ["data-theme", "data-animation-trail"] });
})();

function cloudWeatherProfile(current) {
  const code = current?.weather_code;
  const known = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 97, 99];
  if (!Number.isInteger(code) || !known.includes(code)) throw new Error("Weather unavailable");
  const storm = code >= 95;
  const snow = [71, 73, 75, 77, 85, 86].includes(code);
  const rain = storm || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code);
  const fog = code === 45 || code === 48;
  const kind = storm ? "storm" : snow ? "snow" : rain ? "rain" : fog ? "fog" : code < 2 ? "clear" : code === 2 ? "partly" : "cloudy";
  const labels = { storm: "Thunderstorms", snow: "Snow", rain: "Rain", fog: "Fog", clear: "Clear skies", partly: "Partly cloudy", cloudy: "Overcast" };
  const wind = Number.isFinite(current.wind_speed_10m) ? Math.max(0, Math.min(80, current.wind_speed_10m)) : 0;
  return { kind, label: labels[kind], rain, snow, storm, fog,
    spacing: kind === "clear" ? 1.18 : kind === "partly" ? 1.08 : .96,
    shade: Math.min(.56, (storm ? .49 : rain ? .22 : kind === "cloudy" ? .08 : 0) + (current.is_day === 0 ? .07 : 0)),
    wind: 1 + wind / 100 };
}

function syncCloudWeatherControls(message) {
  cloudWeatherStatusMessage = message;
  document.querySelectorAll("[data-cloud-weather-toggle]").forEach(button => {
    button.textContent = cloudWeather.enabled ? "Turn weather off" : "Use my weather";
    button.setAttribute("aria-pressed", String(cloudWeather.enabled));
  });
  document.querySelectorAll("[data-cloud-weather-status]").forEach(status => { status.textContent = message; });
  if (!document.getElementById("appearancePopover").hidden) setAppearanceMenuOpen(true);
}

function disableCloudWeather() {
  cloudWeather.request++;
  cloudWeather.controller?.abort();
  clearTimeout(cloudWeather.timer);
  Object.assign(cloudWeather, { enabled: false, pending: false, coordinates: null, current: null, controller: null, timer: 0, updated: 0 });
  drawGamifyFutureClouds.weather = null;
  syncCloudWeatherControls("Match Gamify clouds to your local weather.");
  drawChart();
}

async function refreshCloudWeather() {
  if (!cloudWeather.enabled || !cloudWeather.coordinates || cloudWeather.pending) return;
  clearTimeout(cloudWeather.timer);
  if (document.hidden) return;
  const request = cloudWeather.request;
  const controller = new AbortController();
  cloudWeather.controller = controller;
  cloudWeather.pending = true;
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const params = new URLSearchParams({
      latitude: String(cloudWeather.coordinates.latitude), longitude: String(cloudWeather.coordinates.longitude),
      current: "weather_code,is_day,wind_speed_10m", forecast_days: "1"
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
    if (!response.ok) throw new Error("Weather unavailable");
    const payload = await response.json();
    const profile = cloudWeatherProfile(payload.current);
    if (!cloudWeather.enabled || request !== cloudWeather.request) return;
    cloudWeather.current = profile;
    cloudWeather.updated = Date.now();
    drawGamifyFutureClouds.weather = profile;
    syncCloudWeatherControls(`${profile.label} near you. Updates every 15 minutes.`);
    drawChart();
  } catch {
    if (!cloudWeather.enabled || request !== cloudWeather.request) return;
    // Never keep depicting an old storm as current after a failed update.
    cloudWeather.current = null;
    drawGamifyFutureClouds.weather = null;
    syncCloudWeatherControls("Weather unavailable. Original clouds are shown; retrying in 15 minutes.");
    drawChart();
  } finally {
    clearTimeout(timeout);
    if (request === cloudWeather.request && cloudWeather.enabled) {
      cloudWeather.pending = false;
      cloudWeather.controller = null;
      cloudWeather.updated = Date.now();
      cloudWeather.timer = setTimeout(refreshCloudWeather, 15 * 60 * 1000);
    }
  }
}

function enableCloudWeather() {
  if (cloudWeather.enabled) return disableCloudWeather();
  if (!window.isSecureContext || !navigator.geolocation) {
    syncCloudWeatherControls("Location needs HTTPS and a browser that supports location.");
    return;
  }
  cloudWeather.enabled = true;
  const request = ++cloudWeather.request;
  syncCloudWeatherControls("Allow location in your browser to use local weather.");
  navigator.geolocation.getCurrentPosition(position => {
    if (!cloudWeather.enabled || request !== cloudWeather.request) return;
    const { latitude, longitude } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      disableCloudWeather();
      syncCloudWeatherControls("Location unavailable. You can try again.");
      return;
    }
    cloudWeather.coordinates = { latitude: Math.round(latitude * 10) / 10, longitude: Math.round(longitude * 10) / 10 };
    syncCloudWeatherControls("Checking your local weather…");
    refreshCloudWeather();
  }, error => {
    if (!cloudWeather.enabled || request !== cloudWeather.request) return;
    disableCloudWeather();
    syncCloudWeatherControls(error.code === 1 ? "Location blocked. Allow location in browser settings to try again." : "Location unavailable. You can try again.");
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 });
}

document.addEventListener("click", event => {
  if (event.target.closest?.("[data-cloud-weather-toggle]")) enableCloudWeather();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && cloudWeather.enabled && Date.now() - cloudWeather.updated >= 15 * 60 * 1000) refreshCloudWeather();
});
