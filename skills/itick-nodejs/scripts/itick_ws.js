#!/usr/bin/env node

/**
 * Usage:
 *   ITICK_TOKEN=xxx node scripts/itick_ws.js '{"socket":"sws","symbols":"700.HK","types":"quote"}'
 *   ITICK_TOKEN=xxx node scripts/itick_ws.js '{"socket":"cws","symbols":"BA_BTC_USDT","types":"depth,quote"}'
 */

import WebSocket from 'ws';

const input = process.argv[2];
if (!input) {
  console.error('Missing JSON input.');
  process.exit(1);
}

let params;
try {
  params = JSON.parse(input);
} catch (e) {
  console.error('Invalid JSON input:', e.message);
  process.exit(1);
}

const token = params.token || process.env.ITICK_TOKEN;
if (!token) {
  console.error('Missing token. Pass {"token":"..."} or set ITICK_TOKEN env.');
  process.exit(1);
}

const socket = String(params.socket || 'sws').toLowerCase();
const allowedSockets = new Set(['sws', 'fws', 'iws', 'cws']);
if (!allowedSockets.has(socket)) {
  console.error(`Invalid socket: ${socket}. Allowed: ${[...allowedSockets].join(', ')}`);
  process.exit(1);
}

const symbols = String(params.symbols || '').trim();
if (!symbols) {
  console.error('Missing symbols, e.g. "700.HK" or "AM.LPL,AM.MSFT"');
  process.exit(1);
}

const types = String(params.types || 'quote');
const timeoutSec = Number(params.timeoutSec ?? 20);

const ws = new WebSocket(`wss://api.itick.org/${socket}`);

const authMessage = {
  ac: 'auth',
  params: token,
};

const subscribeMessage = {
  ac: 'subscribe',
  params: symbols,
  types,
};

const timer = setTimeout(() => {
  console.error(`Timeout reached (${timeoutSec}s), closing socket.`);
  ws.close();
}, timeoutSec * 1000);

ws.on('open', () => {
  ws.send(JSON.stringify(authMessage));
  ws.send(JSON.stringify(subscribeMessage));
  console.error('Connected, auth sent, subscription sent.');
});

ws.on('message', (message) => {
  const txt = message.toString();
  try {
    console.log(JSON.stringify(JSON.parse(txt), null, 2));
  } catch {
    console.log(txt);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  clearTimeout(timer);
  console.error(`WebSocket closed: code=${code}, reason=${reason.toString()}`);
});
