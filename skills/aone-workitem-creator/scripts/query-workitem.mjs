#!/usr/bin/env node

/**
 * Aone 查询工作项 CLI
 *
 * 通过 Aone OpenAPI getById 接口查询工作项详情。
 *
 * 用法：
 *   node query-workitem.mjs --id 12345678
 *
 * 环境变量：
 *   AONE_APP_NAME   - 应用名（clientKey）
 *   AONE_APP_SECRET - 应用密钥（Base64 编码的 AES key）
 *   AONE_REGION_ID  - 租户 ID，集团用户设为 1（可选）
 */

import crypto from 'node:crypto';
import http from 'node:http';
import { parseArgs } from 'node:util';

// ── CLI 参数解析 ──────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    id: { type: 'string' },
  },
  strict: false,
});

if (!args.id) {
  console.error('缺少必需参数: --id <工作项ID>');
  console.error('\n用法: node query-workitem.mjs --id <工作项ID>');
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

const timestamp = Date.now();
const signature = generateSignature(appName, appSecret, timestamp);
const regionId = process.env.AONE_REGION_ID || '1';

const requestOptions = {
  hostname: 'aone-api.alibaba-inc.com',
  port: 80,
  path: `/issue/openapi/IssueTopService/getById?id=${args.id}`,
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
    const responseBody = Buffer.concat(chunks).toString();
    try {
      const data = JSON.parse(responseBody);
      if (data.success && data.result) {
        const item = data.result;
        console.log(JSON.stringify({
          success: true,
          id: item.id,
          subject: item.subject,
          description: item.description,
          stamp: item.stamp,
          status: item.statusStage,
          priority: item.priority,
          seriousLevel: item.seriousLevel,
          assignedTo: item.assignedTo,
          assignedToStaffId: item.assignedToStaffId,
          verifier: item.verifier,
          author: item.author,
          akProjectId: item.akProjectId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          cfsList: item.cfsList,
        }, null, 2));
      } else {
        console.error(JSON.stringify({
          success: false,
          message: data.message || '查询失败',
          details: data.messages || [],
        }, null, 2));
        process.exit(1);
      }
    } catch {
      console.error('响应解析失败:', responseBody);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('请求失败:', err.message);
  process.exit(1);
});

req.end();
