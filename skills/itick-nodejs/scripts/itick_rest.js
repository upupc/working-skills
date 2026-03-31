#!/usr/bin/env node

/**
 * Usage:
 *   ITICK_TOKEN=xxx node scripts/itick_rest.js '{"asset":"stock","endpoint":"tick","region":"HK","code":"700.HK"}'
 *   ITICK_TOKEN=xxx node scripts/itick_rest.js '{"asset":"stock","endpoint":"kline","region":"HK","code":"700.HK","kType":"1"}'
 */

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

const allowedAssets = new Set(['stock', 'forex', 'indices', 'crypto']);
const allowedEndpoints = new Set(['tick', 'kline', 'depth', 'base']);

const asset = String(params.asset || 'stock').toLowerCase();
const endpoint = String(params.endpoint || 'tick').toLowerCase();

if (!allowedAssets.has(asset)) {
  console.error(`Invalid asset: ${asset}. Allowed: ${[...allowedAssets].join(', ')}`);
  process.exit(1);
}
if (!allowedEndpoints.has(endpoint)) {
  console.error(`Invalid endpoint: ${endpoint}. Allowed: ${[...allowedEndpoints].join(', ')}`);
  process.exit(1);
}

const region = params.region;
const code = params.code;
const kType = params.kType;

if (!region || !code) {
  console.error('Missing required fields: region and code');
  process.exit(1);
}
if (endpoint === 'kline' && !kType) {
  console.error('kline endpoint requires kType');
  process.exit(1);
}

const qs = new URLSearchParams({
  region: String(region),
  code: String(code),
});
if (endpoint === 'kline') qs.set('kType', String(kType));

const url = `https://api.itick.org/${asset}/${endpoint}?${qs.toString()}`;

const resp = await fetch(url, {
  method: 'GET',
  headers: {
    accept: 'application/json',
    token,
  },
});

const bodyText = await resp.text();
let body;
try {
  body = JSON.parse(bodyText);
} catch {
  body = { raw: bodyText };
}

console.log(JSON.stringify({
  ok: resp.ok,
  status: resp.status,
  url,
  response: body,
}, null, 2));

if (!resp.ok) process.exit(2);
