---
name: itick-nodejs
description: 使用 Node.js 调用 iTick 的 REST 与 WebSocket 行情接口（股票/外汇/指数/加密），支持 tick、kline、depth、base 查询和实时订阅。
metadata:
  {
    "openclaw": {
      "emoji": "📈",
      "homepage": "https://itick.org",
      "requires": { "bins": ["node"], "env": ["ITICK_TOKEN"] },
      "primaryEnv": "ITICK_TOKEN",
      "install": [
        {
          "id": "npm",
          "kind": "npm",
          "packages": ["ws"],
          "label": "Install websocket dependency"
        }
      ]
    }
  }
---

# iTick Node.js Skill

基于 iTick 文档封装的最小可用 Node.js skill。

- REST 基地址：`https://api.itick.org`
- WebSocket：
  - 股票 `wss://api.itick.org/sws`
  - 外汇 `wss://api.itick.org/fws`
  - 指数 `wss://api.itick.org/iws`
  - 加密 `wss://api.itick.org/cws`

## 安装

在当前 skill 目录执行：

```bash
npm install
```

## 鉴权

推荐设置环境变量：

```bash
export ITICK_TOKEN="你的_api_key"
```

也支持在 JSON 参数里直接传 `token`。

## REST 查询

脚本：`scripts/itick_rest.js`

支持参数：

- `asset`: `stock|forex|indices|crypto`
- `endpoint`: `tick|kline|depth|base`
- `region`: 市场代码（必填）
- `code`: 标的代码（必填）
- `kType`: K 线周期（仅 `kline` 必填）
- `token`: 可选（不传则读取 `ITICK_TOKEN`）

示例：

```bash
# 实时报价
node scripts/itick_rest.js '{"asset":"stock","endpoint":"tick","region":"HK","code":"700.HK"}'

# K线
node scripts/itick_rest.js '{"asset":"stock","endpoint":"kline","region":"HK","code":"700.HK","kType":"1"}'

# 盘口
node scripts/itick_rest.js '{"asset":"crypto","endpoint":"depth","region":"ALL","code":"BA_BTC_USDT"}'

# 标的基础信息
node scripts/itick_rest.js '{"asset":"forex","endpoint":"base","region":"US","code":"EUR_USD"}'
```

## WebSocket 订阅

脚本：`scripts/itick_ws.js`

支持参数：

- `socket`: `sws|fws|iws|cws`
- `symbols`: 订阅代码，支持逗号分隔多个
- `types`: 订阅类型，默认 `quote`，例如 `depth,quote`
- `timeoutSec`: 自动关闭秒数（默认 20）
- `token`: 可选（不传则读取 `ITICK_TOKEN`）

示例：

```bash
# 股票实时 quote
node scripts/itick_ws.js '{"socket":"sws","symbols":"700.HK","types":"quote","timeoutSec":30}'

# 加密 depth + quote
node scripts/itick_ws.js '{"socket":"cws","symbols":"BA_BTC_USDT","types":"depth,quote","timeoutSec":30}'
```

## 备注

- 如果返回 `code != 0`，通常是参数、权限或配额问题。
- Free 套餐有频率和订阅上限，批量请求请控制节奏。
