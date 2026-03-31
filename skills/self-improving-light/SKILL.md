---
name: self-improving-light
description: >
  Lightweight self-improvement via project-level docs/learning/ directory.
  On tool errors, searches historical solutions before debugging from scratch.
  On session end, summarizes errors and lessons learned into dated markdown files.
  Use when tools fail, builds break, tests error, or user says “总结经验”, “学习总结”, “summarize learnings”.
metadata:
  author: liuyuan
  version: “1.1”
---

# Self-Improving Light

通过项目级 `<project>/docs/learning/` 目录沉淀经验，遇到错误时自动检索历史解决方案。

## 核心行为

### 1. 激活本技能

当用户明确要求激活或安装本技能时，执行以下操作：
- 当工具执行时，判断 CLAUDE.md 是否有 “## self-improving-light Learning Log” 相关的内容，如果没有则补充进去
- 检查 `~/.claude/settings.json` 是否有配置本技能要求的 hooks，没有则进行配置

### 2. 错误发生时：先查历史方案

当工具执行失败时，`PostToolUseFailure` hook 自动触发，记录错误并检索历史方案：

- Hook 自动记录错误到 `<project>/docs/learning/.errors-<session_id>.jsonl`
- Hook 自动在 `<project>/docs/learning/*.md` 中检索匹配的历史方案
- 如果找到匹配，通过 `additionalContext` 将历史方案反馈给 Claude，优先复用
- 如果未找到匹配，正常排查，解决后记录到 `<project>/docs/learning/`

### 3. 会话结束时：沉淀经验

将本次会话中的错误、踩坑、经验写入 `<project>/docs/learning/YYYY-MM-DD.md`（同一天追加）。
每条记录的标题需要带上当前的时间
每条记录格式：

```markdown
## 问题标题 YYYY-MM-DD HH:mm:ss

**文件**: 相关文件路径
**现象**: 错误信息/崩溃日志摘要
**原因**: 根因分析
**修复**: 具体解决方案（含代码片段）
**教训**: 可复用的经验总结
```

### 4. 错误日志

`PostToolUseFailure` hook 自动记录错误到 `<project>/docs/learning/.errors-<session_id>.jsonl`，`Stop` hook 提醒汇总。汇总完成后清理：

```bash
rm <project>/docs/learning/.errors-<session_id>.jsonl
```

## Hooks 配置

在 `~/.claude/settings.json` 的 hooks 中添加：

```json
{
  “hooks”: {
    “PostToolUseFailure”: [
      {
        “matcher”: “”,
        “hooks”: [
          {
            “type”: “command”,
            “command”: “bash ~/.agents/skills/self-improving-light/hooks/post-tool-error.sh”
          }
        ]
      }
    ],
    “Stop”: [
      {
        “matcher”: “”,
        “hooks”: [
          {
            “type”: “command”,
            “command”: “bash ~/.agents/skills/self-improving-light/hooks/session-end.sh”
          }
        ]
      }
    ]
  }
}
```

> **说明**：`PostToolUseFailure` 事件仅在工具执行失败时触发，无需 matcher 过滤特定工具。
> Hook 接收的输入包含 `tool_name`、`tool_input`、`error`、`is_interrupt` 等字段，
> 并可通过 `additionalContext` 将历史方案反馈给 Claude。
> 详见 [Hooks 文档](https://code.claude.com/docs/en/hooks.md#posttoolusefailure-input)。

## 与 CLAUDE.md 配合

在项目 CLAUDE.md 中添加以下内容以激活行为：

```markdown
## self-improving-light Learning Log

每轮对话结束时，必须在 `<project>/docs/learning/` 目录下总结本次会话中犯的错误、踩的坑、或值得沉淀的经验。
文件命名格式：`YYYY-MM-DD.md`（同一天追加内容）。内容应包含：问题描述、原因分析、正确做法。

遇到执行错误时，应先检索 `<project>/docs/learning/` 目录下的历史文档，查看是否已有相关的解决方案，避免重复踩坑。
```
