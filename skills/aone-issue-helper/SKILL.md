---
name: aone-issue-helper
description: 操作 Aone 需求（Issue）。当用户需要对 Aone 系统中的需求进行操作时使用此技能，包括：(1) 添加评论到需求，(2) 查看需求的评论列表，(3) 获取需求内容并保存到指定目录。触发词包括"评论需求"、"给需求添加备注"、"查看需求评论"、"获取需求内容"、"保存需求"等。
---

# Aone 需求操作器

## 重要前提

**必须确认用户已提供需求 ID（Issue ID）**，这是一个数字，如 `70764328`。

若未提供，询问：
> 请提供您要操作的 Aone 需求 ID（数字格式，如 70764328）。

## 命令

### 添加评论

```bash
node scripts/dist/comment-issue.mjs add --issue-id <需求ID> --content "<评论内容>"
```

### 获取评论

```bash
node scripts/dist/comment-issue.mjs get --issue-id <需求ID>
```

### 保存需求内容

将需求的标题和描述保存为 Markdown 文件。

```bash
node scripts/dist/comment-issue.mjs save --issue-id <需求ID> --dir <保存目录>
```

**参数说明**：
- `--issue-id`：需求 ID（必需）
- `--dir`：保存目录路径（必需）

**输出文件**：
- 文件名：以需求标题（subject）命名，如 `需求标题.md`
- 内容：包含需求 ID 和需求描述（description）

## 示例

### 添加评论

用户："帮我给需求 70764328 添加评论：已完成代码评审"

```bash
node scripts/dist/comment-issue.mjs add --issue-id 70764328 --content "已完成代码评审"
```

### 获取评论

用户："查看需求 70764328 的评论"

```bash
node scripts/dist/comment-issue.mjs get --issue-id 70764328
```

### 保存需求内容

用户："把需求 70764328 的内容保存到 ./prd 目录"

```bash
node scripts/dist/comment-issue.mjs save --issue-id 70764328 --dir ./prd
```

## 错误处理

| 错误信息 | 解决方案 |
|----------|----------|
| `缺少必需参数: --issue-id` | 询问用户提供需求 ID |
| `缺少必需参数: --content` | 询问用户提供评论内容 |
| `缺少必需参数: --dir` | 询问用户提供保存目录 |
| `HTTP 401/403` | 检查凭证或权限 |
| `请求超时` | 稍后重试 |
