#!/usr/bin/env node

/**
 * 股票价格监控脚本
 * 
 * 功能：
 * - 实时监控股票价格
 * - 触发预警时发送钉钉通知
 * - 记录价格历史
 * 
 * 使用示例：
 * node scripts/monitor.js --check
 * node scripts/monitor.js --symbol PATH --price 12.00
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 监控的股票列表
  watchlist: [
    { symbol: 'PATH', name: 'UiPath', targetPrice: 12.00, currentPrice: 11.34 },
    { symbol: 'CRSP', name: 'CRISPR Therapeutics', targetPrice: 60.00, currentPrice: 55.00 },
    { symbol: 'IONQ', name: 'IonQ', targetPrice: 25.00, currentPrice: 22.00 },
    { symbol: 'PLTR', name: 'Palantir', targetPrice: 80.00, currentPrice: 75.00 },
    { symbol: 'TSLA', name: 'Tesla', targetPrice: 450.00, currentPrice: 417.00 },
    { symbol: 'NVDA', name: 'NVIDIA', targetPrice: 150.00, currentPrice: 142.00 },
    { symbol: 'NEE', name: 'NextEra Energy', targetPrice: 85.00, currentPrice: 82.00 },
    { symbol: 'FLNC', name: 'Fluence Energy', targetPrice: 30.00, currentPrice: 28.00 },
  ],
  
  // 预警配置
  alerts: {
    priceBreakout: true,      // 价格突破
    priceDrop: true,          // 价格跌破
    percentChange: 5,         // 单日涨跌幅超过 5%
  },
  
  // 文件路径
  paths: {
    alertsConfig: path.join(process.env.HOME, 'workspace/openclaw-home/workspace/memory/stock-alerts.md'),
    priceHistory: path.join(process.env.HOME, 'workspace/openclaw-home/workspace/tmp/stock-cache/price-history.json'),
    logFile: path.join(process.env.HOME, 'workspace/openclaw-home/workspace/tmp/stock-cache/monitor.log'),
  }
};

// 确保目录存在
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 日志记录
function log(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(logLine.trim());
  
  ensureDir(CONFIG.paths.logFile);
  fs.appendFileSync(CONFIG.paths.logFile, logLine);
}

// 获取股票价格（模拟，实际使用 Finnhub API）
async function getStockPrice(symbol) {
  // TODO: 集成 Finnhub API
  // const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`);
  // return response.json();
  
  // 模拟数据（用于测试）
  const mockPrices = {
    'PATH': 11.34,
    'CRSP': 55.00,
    'IONQ': 22.00,
    'PLTR': 75.00,
    'TSLA': 417.00,
    'NVDA': 142.00,
    'NEE': 82.00,
    'FLNC': 28.00,
  };
  
  return mockPrices[symbol] || null;
}

// 检查预警条件
function checkAlerts(symbol, name, currentPrice, targetPrice) {
  const alerts = [];
  
  // 突破预警
  if (currentPrice >= targetPrice) {
    alerts.push({
      type: '🚀 突破',
      message: `${name} (${symbol}) 突破目标价 $${targetPrice}，当前价 $${currentPrice.toFixed(2)}`,
      level: 'high'
    });
  }
  
  // 跌破预警（目标价的 90%）
  const dropPrice = targetPrice * 0.9;
  if (currentPrice <= dropPrice) {
    alerts.push({
      type: '📉 跌破',
      message: `${name} (${symbol}) 跌破支撑位 $${dropPrice.toFixed(2)}，当前价 $${currentPrice.toFixed(2)}`,
      level: 'medium'
    });
  }
  
  return alerts;
}

// 发送钉钉通知
function sendDingTalkAlert(alert) {
  // TODO: 集成钉钉通知
  // 可以使用 OpenClaw 的 message 工具
  log(`📱 [钉钉通知] ${alert.type}: ${alert.message}`);
}

// 记录价格历史
function recordPrice(symbol, price) {
  ensureDir(CONFIG.paths.priceHistory);
  
  let history = {};
  if (fs.existsSync(CONFIG.paths.priceHistory)) {
    history = JSON.parse(fs.readFileSync(CONFIG.paths.priceHistory, 'utf8'));
  }
  
  const timestamp = new Date().toISOString();
  if (!history[symbol]) {
    history[symbol] = [];
  }
  
  history[symbol].push({ timestamp, price });
  
  // 保留最近 1000 条记录
  if (history[symbol].length > 1000) {
    history[symbol] = history[symbol].slice(-1000);
  }
  
  fs.writeFileSync(CONFIG.paths.priceHistory, JSON.stringify(history, null, 2));
}

// 主监控函数
async function runMonitor() {
  log('🔍 开始股票价格监控...');
  
  const allAlerts = [];
  
  for (const stock of CONFIG.watchlist) {
    try {
      const currentPrice = await getStockPrice(stock.symbol);
      
      if (!currentPrice) {
        log(`⚠️ 无法获取 ${stock.symbol} 价格`);
        continue;
      }
      
      // 记录价格
      recordPrice(stock.symbol, currentPrice);
      
      // 检查预警
      const alerts = checkAlerts(stock.symbol, stock.name, currentPrice, stock.targetPrice);
      
      if (alerts.length > 0) {
        allAlerts.push(...alerts);
        
        // 发送通知
        for (const alert of alerts) {
          sendDingTalkAlert(alert);
        }
      }
      
      log(`✅ ${stock.symbol}: $${currentPrice.toFixed(2)} (目标：$${stock.targetPrice})`);
      
    } catch (error) {
      log(`❌ ${stock.symbol} 检查失败：${error.message}`);
    }
  }
  
  log(`📊 监控完成，发现 ${allAlerts.length} 个预警`);
  
  return {
    timestamp: new Date().toISOString(),
    stocksChecked: CONFIG.watchlist.length,
    alertsFound: allAlerts.length,
    alerts: allAlerts
  };
}

// CLI 参数处理
const args = process.argv.slice(2);

if (args.includes('--check') || args.length === 0) {
  // 运行监控检查
  runMonitor().then(result => {
    console.log('\n监控结果:', JSON.stringify(result, null, 2));
  });
} else if (args.includes('--symbol')) {
  const symbolIndex = args.indexOf('--symbol');
  const symbol = args[symbolIndex + 1];
  
  getStockPrice(symbol).then(price => {
    console.log(`${symbol}: $${price}`);
  });
} else if (args.includes('--help')) {
  console.log(`
股票价格监控脚本

用法:
  node monitor.js --check          # 检查所有监控股票
  node monitor.js --symbol PATH    # 查询单只股票价格
  node monitor.js --help           # 显示帮助

配置:
  编辑此脚本中的 CONFIG.watchlist 添加/修改监控股票
  `);
}

module.exports = { runMonitor, getStockPrice, checkAlerts };
