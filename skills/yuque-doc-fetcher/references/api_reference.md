# 语雀 MCP API 参考文档

## 服务信息

- **服务地址**: `https://mcp.alibaba-inc.com/yuque_mcp/mcp`
- **协议类型**: Streamable HTTP MCP
- **授权方式**: Header 中的 `PRIVATE-TOKEN`

## 工具: fetchExternalContentByUrl

### 功能说明

通过文档链接获取文档内容，支持以下平台：

| 平台 | 支持的域名 |
|------|-----------|
| 语雀 | `aliyuque.antfin.com`, `yuque.antfin-inc.com`, `yuque.antfin.com`, `yuque.alibaba-inc.com` |
| 钉钉文档 | `alidocs.dingtalk.com` |

### 请求参数

```json
{
    "url": "https://aliyuque.antfin.com/pengshiyi.psy/icbucart/gdvua0u06t0zhdyo"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | 文档链接地址 |

### 响应格式

```json
{
    "success": true,
    "code": "SUCCESS",
    "message": "获取文档内容成功",
    "url": "https://aliyuque.antfin.com/pengshiyi.psy/icbucart/gdvua0u06t0zhdyo",
    "content": "这是文档的 Markdown 内容",
    "meta": {
        "title": "国内仓发-购物车",
        "docType": "yuque",
        "knowledgeBaseId": "pengshiyi.psy/icbucart"
    },
    "authUrl": "NULL"
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 是否成功 |
| code | string | 响应码 |
| message | string | 响应消息 |
| url | string | 请求的文档链接 |
| content | string | 文档的 Markdown 内容 |
| meta.title | string | 文档标题 |
| meta.docType | string | 文档类型（yuque/dingtalk） |
| meta.knowledgeBaseId | string | 知识库 ID |
| authUrl | string | 授权 URL（未授权时返回） |

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| `SUCCESS` | 成功获取文档内容 |
| `USER_NO_PERMISSION` | 用户无权限访问钉钉文档 |
| `NO_AUTH` | 知识库未完成授权 |
| `INVALID_URL` | URL 格式不合法 |
| `ERROR` | 系统错误 |

## 授权说明

1. 访问 [MCP 平台](https://mcp.alibaba-inc.com/) 获取 `PRIVATE-TOKEN`
2. 对于需要授权的知识库，会返回 `authUrl`，需要访问该链接完成授权
3. Token 需要配置在 `scripts/config.ts` 文件中
