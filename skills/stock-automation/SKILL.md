---
name: stock-automation
description: 股票自动化监控和交易系统的核心技能，包含价格监控、新闻扫描、财报跟踪、信号生成等功能
metadata:
  openclaw:
    requires:
      bins: ["node", "npx"]
      env: ["FINNHUB_API_KEY", "MASSIVE_API_KEY"]
    primaryEnv: "FINNHUB_API_KEY"
---

# OpenClaw Stock Automation Skill

用 OpenClaw 构建自动化股票监控和交易系统。

## 功能模块

### 1. 价格监控 (Price Monitor)
实时监控股票价格，设置预警通知。

### 2. 股票筛选 (Stock Screener)
按条件筛选潜力股，生成候选清单。

### 3. 新闻扫描 (News Scanner)
监控股票相关新闻，AI 分析情绪。

### 4. 财报跟踪 (Earnings Tracker)
跟踪财报日期，财报后自动分析。

### 5. 交易信号 (Trading Signals)
基于技术和基本面生成买卖信号。

### 6. 回测系统 (Backtest)
历史数据回测策略，优化参数。

## CLI 使用

```bash
# 价格监控
node scripts/monitor.js --symbol PATH --alert 12.00

# 股票筛选
node scripts/screener.js --sector Technology --minGrowth 0.20

# 新闻扫描
node scripts/news.js --symbol TSLA --hours 24

# 财报跟踪
node scripts/earnings.js --symbol NVDA

# 信号生成
node scripts/signals.js --portfolio

# 回测
node scripts/backtest.js --strategy rsi-macd --symbol PATH
```

## Cron 配置示例

```json
{
  "name": "stock-price-monitor",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "payload": { "kind": "systemEvent", "text": "检查股票价格预警" },
  "sessionTarget": "main"
}
```

## 配置

在 `memory/stock-alerts.md` 中配置监控列表和预警价格。

## 通知

支持钉钉、微信、Telegram 等渠道推送预警。
