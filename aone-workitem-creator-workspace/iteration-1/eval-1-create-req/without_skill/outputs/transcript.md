# Transcript: Creating Aone Work Item (Without Skill)

## Task Understanding

The user wants to create a **requirement (need)** in Alibaba's internal project management system **Aone**, with the following details:

| Field | Value |
|-------|-------|
| Project ID (akProjectId) | 460616 |
| Title (subject) | 优化首页加载速度 |
| Creator (author) | 264746 |
| Assignee (assignedTo) | 264746 |
| Issue Type ID (issueTypeId) | 82 |
| Description | 首页加载时间超过3秒，需要优化到1秒内 |
| Work Item Type (stamp) | Req (inferred from "需求") |

## Approach

### Step 1: Identify the API

Aone provides an OpenAPI at `aone-api.alibaba-inc.com`. The endpoint for creating work items is:

```
POST http://aone-api.alibaba-inc.com/issue/openapi/IssueTopService/createV2
```

### Step 2: Authentication

Aone uses AES-128-ECB signature-based authentication. The process:

1. Construct a plaintext string: `appName=<clientKey>;timestamp=<unix_ms>`
2. Encrypt it with AES-128-ECB using the app secret (Base64-decoded as the key)
3. Encode the ciphertext as URL-safe Base64
4. Pass `clientKey`, `timestamp`, and `signature` as HTTP headers

This requires two environment variables:
- `AONE_APP_NAME` -- the application name / client key
- `AONE_APP_SECRET` -- the Base64-encoded AES-128 secret

### Step 3: Construct the Request

The API accepts `application/x-www-form-urlencoded` POST body. Required headers also include `Ao-Region-ld` (typically `1` for corporate users).

### Step 4: The Command I Would Execute

Without the skill file, I would need to write or find a script to handle the AES-128-ECB signing. Assuming I had the necessary credentials set up, I would write something like this Node.js one-liner or script:

```bash
node -e "
import crypto from 'node:crypto';
import http from 'node:http';

const appName = process.env.AONE_APP_NAME;
const appSecret = process.env.AONE_APP_SECRET;
const timestamp = Date.now();

// Generate AES-128-ECB signature
const content = 'appName=' + appName + ';timestamp=' + timestamp;
const secret = Buffer.from(appSecret, 'base64');
const cipher = crypto.createCipheriv('aes-128-ecb', secret, Buffer.alloc(0));
cipher.setAutoPadding(true);
const sig = (cipher.update(content, 'utf8', 'base64') + cipher.final('base64'))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const params = new URLSearchParams({
  stamp: 'Req',
  akProjectId: '460616',
  subject: '优化首页加载速度',
  author: '264746',
  assignedTo: '264746',
  issueTypeId: '82',
  description: '首页加载时间超过3秒，需要优化到1秒内'
});

const body = params.toString();
const req = http.request({
  hostname: 'aone-api.alibaba-inc.com',
  port: 80,
  path: '/issue/openapi/IssueTopService/createV2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'clientKey': appName,
    'timestamp': String(timestamp),
    'signature': sig,
    'Ao-Region-ld': '1',
    'Content-Length': Buffer.byteLength(body),
  },
}, (res) => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => console.log(Buffer.concat(chunks).toString()));
});
req.write(body);
req.end();
"
```

## Assumptions

1. **Environment variables are set**: `AONE_APP_NAME` and `AONE_APP_SECRET` must be configured. Without these, the API call cannot be authenticated. If the user hasn't set them, I would prompt them to obtain credentials from the Aone Open Platform.

2. **API endpoint and auth scheme**: I'm relying on general knowledge of Aone's OpenAPI. The endpoint is `http://aone-api.alibaba-inc.com/issue/openapi/IssueTopService/createV2` using AES-128-ECB signature auth. Without a skill file or documentation at hand, I would need to research or confirm these details -- there is a risk of getting the exact endpoint path, header names, or signing algorithm wrong.

3. **stamp = Req**: The user said "需求" (requirement), which maps to the `Req` stamp value. This is a reasonable inference.

4. **Region ID**: Defaulted to `1` (standard for Alibaba Group internal users).

5. **issueTypeId**: The user explicitly provided `82`, so no inference needed.

6. **No verification of project permissions**: I assume the user's credentials have permission to create work items in project 460616.

## Key Challenges Without a Skill File

1. **Authentication complexity**: The AES-128-ECB signing mechanism is non-trivial. Without a reference implementation, getting the exact signing format right (plaintext format, Base64 encoding, URL-safe conversion) would require trial and error or documentation lookup.

2. **API contract uncertainty**: Header names like `Ao-Region-ld` (note: lowercase 'L' vs 'I' ambiguity), exact parameter names, and request format would need to be verified against documentation.

3. **No reusable tooling**: Each time a work item needs to be created, the full signing and HTTP logic must be reproduced or a script must be written from scratch.

4. **Error handling**: Without a structured script, parsing and handling API error responses would be ad-hoc.

## Summary

The task is straightforward in intent but the implementation requires knowledge of Aone's proprietary authentication mechanism (AES-128-ECB signing) and API contract. Without a skill file providing a ready-made CLI script, I would need to write ~40 lines of Node.js code to handle authentication and make the API call, with assumptions about the exact API contract that could be incorrect without documentation verification.
