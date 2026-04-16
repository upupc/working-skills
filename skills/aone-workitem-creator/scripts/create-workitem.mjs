#!/usr/bin/env node

/**
 * Aone 创建工作项 CLI
 *
 * 通过 Aone OpenAPI createV2 接口创建工作项。
 * 认证方式：AES-128-ECB 签名，通过 HTTP Header 传递 clientKey / timestamp / signature。
 *
 * 用法：
 *   node create-issue.mjs \
 *     --akProjectId 460616 \
 *     --subject "需求标题" \
 *     --author 123456 \
 *     --assignedTo 123456 \
 *     --verifier 123456 \
 *     --issueTypeId 82 \
 *     [--description "描述"] \
 *     [--priorityId 96] \
 *     [--seriousLevelId 89] \
 *     [--moduleIds 1,2] \
 *     [--watcherUsers 111,222] \
 *     [--parentId 12138] \
 *     [--cfList '{"61":"value"}']
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
    akProjectId:     { type: 'string' },
    subject:         { type: 'string' },
    stamp:           { type: 'string' },
    description:     { type: 'string' },
    author:          { type: 'string' },
    assignedTo:      { type: 'string' },
    verifier:        { type: 'string' },
    issueTypeId:     { type: 'string' },
    priorityId:      { type: 'string' },
    seriousLevelId:  { type: 'string' },
    moduleIds:       { type: 'string' },
    watcherUsers:    { type: 'string' },
    parentId:        { type: 'string' },
    parentSource:    { type: 'string' },
    cfList:          { type: 'string' },
    relatedAkProjectIds: { type: 'string' },
    akVersionIds:    { type: 'string' },
  },
  strict: false,
});

// ── 默认值：从环境变量读取工号 ─────────────────────────────────

if (!args.author && process.env.AONE_STAFF_ID)         args.author = process.env.AONE_STAFF_ID;
if (!args.assignedTo && process.env.AONE_STAFF_ID)    args.assignedTo = process.env.AONE_STAFF_ID;
if (!args.akProjectId && process.env.AONE_PROJECT_ID)  args.akProjectId = process.env.AONE_PROJECT_ID;
if (!args.issueTypeId)                                  args.issueTypeId = '556';

// ── 必填校验 ──────────────────────────────────────────────────

const required = ['akProjectId', 'subject', 'stamp', 'author', 'assignedTo', 'issueTypeId'];
const missing = required.filter((k) => !args[k]);
if (missing.length > 0) {
  console.error(`缺少必需参数: ${missing.map((k) => `--${k}`).join(', ')}`);
  console.error(`\n用法: node create-issue.mjs --akProjectId <id> --subject <标题> --author <工号> --assignedTo <工号> --issueTypeId <类型id> [其他参数]`);
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

  // URL-safe Base64
  return chunks.join('').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── 构建请求体 ────────────────────────────────────────────────

const timestamp = Date.now();
const signature = generateSignature(appName, appSecret, timestamp);

// stamp 校验
const validStamps = ['Req', 'Task', 'Bug', 'Risk'];
if (!validStamps.includes(args.stamp)) {
  console.error(`stamp 值无效: "${args.stamp}"，有效值为: ${validStamps.join(', ')}`);
  process.exit(1);
}

const params = new URLSearchParams();
params.append('stamp', args.stamp);

// 必填字段
params.append('akProjectId', args.akProjectId);
params.append('subject', args.subject);
params.append('author', args.author);
params.append('assignedTo', args.assignedTo);
params.append('issueTypeId', args.issueTypeId);

// 可选字段
if (args.verifier)        params.append('verifier', args.verifier);
if (args.description)     params.append('description', args.description);
if (args.priorityId)      params.append('priorityId', args.priorityId);
if (args.seriousLevelId)  params.append('seriousLevelId', args.seriousLevelId);
if (args.moduleIds)       params.append('moduleIds', `[${args.moduleIds}]`);
if (args.watcherUsers)    params.append('watcherUsers', JSON.stringify(args.watcherUsers.split(',')));
if (args.parentId) {
  params.append('parentId', args.parentId);
  params.append('parentSource', args.parentSource || 'Aone');
}
// 默认自定义字段（cfList）
// 合并用户传入的 cfList 与默认值，用户传入的优先
const today = new Date();
const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
const fmt = (d) => d.toISOString().slice(0, 10); // yyyy-MM-dd

const staffId = process.env.AONE_STAFF_ID || args.author;
const defaultCfs = {
  79: fmt(today),          // 计划开始日期
  80: fmt(in30Days),       // 计划截止日期
  123: '主需求',            // 需求类型
  101912: staffId,         // 技术PM
  138876: fmt(in30Days),   // 计划提测日期
  140485: fmt(in30Days),   // 计划上线日期
  142905: 'ICBU-ICBU技术部', // 需求业务线
};

let cfObj = { ...defaultCfs };
if (args.cfList) {
  try {
    const userCfs = JSON.parse(args.cfList);
    cfObj = { ...cfObj, ...userCfs };
  } catch {
    // 用户传入的格式可能是 {61:"value"} 风格，直接使用
    cfObj = args.cfList;
  }
}
if (typeof cfObj === 'object') {
  // 转换为 Aone API 期望的格式：{79:"2026-04-15",80:"2026-05-15",...}
  const cfStr = '{' + Object.entries(cfObj).map(([k, v]) => `${k}:"${v}"`).join(',') + '}';
  params.append('cfList', cfStr);
} else {
  params.append('cfList', cfObj);
}

if (args.relatedAkProjectIds) params.append('relatedAkProjectIds', `[${args.relatedAkProjectIds}]`);
if (args.akVersionIds)        params.append('akVersionIds', `[${args.akVersionIds}]`);

const body = params.toString();

// ── 发送请求 ──────────────────────────────────────────────────

const regionId = process.env.AONE_REGION_ID || '1';

const requestOptions = {
  hostname: 'aone-api.alibaba-inc.com',
  port: 80,
  path: '/issue/openapi/IssueTopService/createV2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'clientKey': appName,
    'timestamp': String(timestamp),
    'signature': signature,
    'Ao-Region-ld': regionId,
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = http.request(requestOptions, (res) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const responseBody = Buffer.concat(chunks).toString();
    try {
      const data = JSON.parse(responseBody);
      if (data.success) {
        console.log(JSON.stringify({
          success: true,
          issueId: data.result,
          message: `工作项创建成功，ID: ${data.result}`,
        }, null, 2));
      } else {
        console.error(JSON.stringify({
          success: false,
          message: data.message || '创建失败',
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

req.write(body);
req.end();
