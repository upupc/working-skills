#!/usr/bin/env node

/**
 * Aone 查询项目工作项类型 CLI
 *
 * 通过 Aone OpenAPI 查询指定项目开启的工作项类型（issueType）列表。
 *
 * 用法：
 *   node query-issue-types.mjs --akProjectId 2157409
 *
 * 环境变量：
 *   AONE_APP_NAME    - 应用名（clientKey）
 *   AONE_APP_SECRET  - 应用密钥（Base64 编码的 AES key）
 *   AONE_PROJECT_ID  - 默认项目 ID（可选，--akProjectId 未指定时使用）
 *   AONE_REGION_ID   - 租户 ID，集团用户设为 1（可选）
 */

import crypto from 'node:crypto';
import http from 'node:http';
import { parseArgs } from 'node:util';

// ── CLI 参数解析 ──────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    akProjectId: { type: 'string' },
    staffId: { type: 'string' },
    stamp: { type: 'string' },
  },
  strict: false,
});

if (!args.akProjectId && process.env.AONE_PROJECT_ID) {
  args.akProjectId = process.env.AONE_PROJECT_ID;
}
if (!args.staffId && process.env.AONE_STAFF_ID) {
  args.staffId = process.env.AONE_STAFF_ID;
}
// stamp 默认不传，脚本会依次查询所有类型

if (!args.akProjectId) {
  console.error('缺少必需参数: --akProjectId <项目ID>');
  console.error('\n用法: node query-issue-types.mjs --akProjectId <项目ID> [--staffId <工号>] [--stamp <Bug|Req|Task|Risk|Workitem>]');
  process.exit(1);
}

const appName   = process.env.AONE_APP_NAME;
const appSecret = process.env.AONE_APP_SECRET;
if (!appName || !appSecret) {
  console.error('请设置环境变量 AONE_APP_NAME 和 AONE_APP_SECRET');
  process.exit(1);
}

// ── 签名生成 ──────────────────────────────────────────────────

function generateSignature(appName, appSecret, timestamp) {
  const content = `appName=${appName};timestamp=${timestamp}`;
  const secret = Buffer.from(appSecret, 'base64');
  const iv = Buffer.alloc(0);
  const cipher = crypto.createCipheriv('aes-128-ecb', secret, iv);
  cipher.setAutoPadding(true);

  const chunks = [];
  chunks.push(cipher.update(content, 'utf8', 'base64'));
  chunks.push(cipher.final('base64'));

  return chunks.join('').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── 发送请求 ──────────────────────────────────────────────────

const regionId = process.env.AONE_REGION_ID || '1';

function fetchIssueTypes(stamp) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const signature = generateSignature(appName, appSecret, timestamp);
    const staffParam = args.staffId ? `&staffId=${args.staffId}` : '';
    const requestOptions = {
      hostname: 'aone-api.alibaba-inc.com',
      port: 80,
      path: `/issue/openapi/IssueTopService/getEnabledIssueTypes?akProjectId=${args.akProjectId}&stamp=${stamp}${staffParam}`,
      method: 'GET',
      headers: {
        'clientKey': appName,
        'timestamp': String(timestamp),
        'signature': signature,
        'Ao-Region-ld': regionId,
      },
    };

    const req = http.request(requestOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          if (data.success && data.result) {
            resolve(data.result.map((t) => ({
              id: t.id,
              name: t.name,
              stamp: t.stamp,
              description: t.description,
            })));
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

const stamps = args.stamp ? [args.stamp] : ['Req', 'Task', 'Bug', 'Risk'];

Promise.all(stamps.map(fetchIssueTypes))
  .then((results) => {
    const allTypes = results.flat();
    console.log(JSON.stringify({
      success: true,
      akProjectId: args.akProjectId,
      issueTypes: allTypes,
    }, null, 2));
  })
  .catch((err) => {
    console.error('请求失败:', err.message);
    process.exit(1);
  });
