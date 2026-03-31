---
name: yuque-doc-fetcher
description: 通过 MCP 协议从语雀或钉钉文档库获取文档内容并保存到本地。当用户需要拉取语雀文档、钉钉文档，或者需要将远程文档保存到本地时，应使用此技能。支持的域名包括 aliyuque.antfin.com、yuque.antfin-inc.com、yuque.antfin.com、yuque.alibaba-inc.com 和 alidocs.dingtalk.com。
---

# Yuque Doc Fetcher

## Overview

此技能提供从语雀和钉钉文档库获取文档内容的能力，通过 MCP (Model Context Protocol) 协议连接远程文档服务，支持将文档内容以 Markdown 格式保存到本地指定目录, 默认目录为.claude/docs/yuque-docs，并自动下载文档中的图片。

## 使用方式

```bash
node scripts/dist/fetch-doc.mjs --url "<文档链接>" --output <输出目录> [--filename <文件名>] [--no-images]
```

### 示例

```bash
# 基本用法（文件名使用文档标题，自动下载图片）
node scripts/dist/fetch-doc.mjs --url "https://aliyuque.antfin.com/xxx/yyy/zzz" --output ./docs

# 指定文件名
node scripts/dist/fetch-doc.mjs --url "https://aliyuque.antfin.com/xxx/yyy/zzz" --output ./docs --filename "my-doc"

# 禁用图片下载
node scripts/dist/fetch-doc.mjs --url "https://aliyuque.antfin.com/xxx/yyy/zzz" --output ./docs --no-images
```

## 命令行参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--url` | 是 | 文档链接（支持语雀和钉钉文档） |
| `--output` | 是 | 输出目录路径 |
| `--filename` | 否 | 输出文件名（不含扩展名），默认使用文档标题 |
| `--no-images` | 否 | 禁用图片下载（默认启用图片下载） |

## 图片下载功能

默认情况下，脚本会自动下载文档中的所有图片，并将 Markdown 中的远程图片链接替换为本地相对路径。

### 输出目录结构

```
<output>/
├── <文档标题>.md                    # Markdown 文档（图片链接已替换为本地路径）
└── images/
    └── <文档标题>/                  # 图片目录
        ├── image_0_abc123.png
        ├── image_1_def456.jpeg
        └── ...
```

### 支持的图片格式

- Markdown 格式: `![alt](url)` 或 `![](url)`
- HTML 格式: `<img src="url" ...>`

### 图片下载特性

- 并发下载（默认 5 个并发）
- 自动重试（最多 3 次）
- 30 秒超时保护
- 自动处理重定向

## 支持的文档平台

| 平台 | 支持的域名 |
|------|-----------|
| 语雀 | `aliyuque.antfin.com`, `yuque.antfin-inc.com`, `yuque.antfin.com`, `yuque.alibaba-inc.com` |
| 钉钉文档 | `alidocs.dingtalk.com` |

## 错误处理

| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| `NO_AUTH` | 知识库未授权 | 访问返回的 `authUrl` 完成授权 |
| `USER_NO_PERMISSION` | 无访问权限 | 确认文档访问权限或联系文档所有者 |
| `INVALID_URL` | URL 格式错误 | 检查 URL 是否正确 |

## 资源文件

- `scripts/dist/fetch-doc.mjs` - 可执行脚本
- `references/api_reference.md` - API 详细参考文档
