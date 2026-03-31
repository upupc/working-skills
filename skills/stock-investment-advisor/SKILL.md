---
name: stock-investment-advisor
description: Analyze stock market conditions and generate actionable investment plans for US stocks and major sectors using available market-data skills (finnhub, massive-api, itick-nodejs). Use when the user asks for market outlook, portfolio allocation, entry/exit plans, watchlists, stock screening, or "how should we invest now" style guidance.
---

# Stock Investment Advisor

Provide structured investment guidance with explicit risk controls.

## Workflow

1. Define investor constraints first.
   - Confirm risk level (conservative/balanced/aggressive), time horizon, and cash position.
   - If missing, infer a neutral baseline and label assumptions clearly.

2. Build market regime snapshot.
   - Pull broad market and sector signals (trend, volatility, risk-on/off cues).
   - Include at least one momentum view and one valuation/profitability view.

3. Generate candidate list.
   - Prioritize liquid US names with clear catalysts.
   - Cover at least 2 sectors unless user requests a single theme.

4. Score opportunities.
   - Fundamental quality: growth, margin, ROE/FCF quality.
   - Technical state: trend, RSI/MACD, support/resistance.
   - Positioning risk: crowdedness, event risk, earnings window.

5. Produce execution plan.
   - Entry zone (staggered buys), stop-loss logic, target zones.
   - Position sizing and max drawdown guardrails.
   - Rebalance trigger and invalidation conditions.

6. State uncertainty and safety limits.
   - Separate data facts from judgment.
   - Never promise returns.

## Output Format

Use this structure:

1. **Market Regime (Now)**
2. **High-Conviction Ideas (Top 3-8)**
3. **Portfolio Construction**
4. **Trade Plan (entries / stops / targets)**
5. **Risks & What Would Change My Mind**
6. **7-Day Monitoring Checklist**

## Quality Bar

- Include concrete tickers and price levels when data is available.
- Include at least one downside scenario.
- Keep recommendations executable (no vague "watch this" only).
- If API/data fails, provide a fallback plan and mark confidence lower.
