---
name: aone-workitem-creator
description: 创建 Aone 工作项并创建应用变更（CR）的固定两步工作流，以及发布 CR 到流水线的完整流程。触发词包括"创建需求"、"新建工作项"、"创建任务"、"提Bug"、"创建aone"、"create issue"、"提需求"、"录入缺陷"、"查询工作项"、"查看需求"、"获取工作项详情"、"创建变更"、"创建CR"、"应用变更"、"发布变更"、"aone发布"、"发布CR"、"CR发布"、"提交发布"、"部署变更"、"上线"、"发布上线"等。即使用户只是提到想在 Aone 中记录、跟踪、查看某件事，创建应用变更/CR，或发布已有的 CR，也应考虑使用此技能。
---

# Aone 工作项管理

本技能提供三个核心工作流和辅助操作，按需读取对应参考文档执行。

## 前提条件

### 工作项创建

环境变量 `AONE_APP_NAME`、`AONE_APP_SECRET`、`AONE_STAFF_ID`、`AONE_PROJECT_ID` 须在 `~/.zshrc` 中配置。

若未配置，提示：
> 请先在 ~/.zshrc 中配置环境变量，配置后执行 `source ~/.zshrc`。申请见：https://aliyuque.antfin.com/aone/platform/pw9geb

### 变更创建与发布

- 已安装 `aone-kit` CLI（`aone-kit --version` 验证）
- 已登录 Aone（`aone-kit login` 进行认证）

## 工作流路由

根据用户意图匹配对应工作流，读取参考文档后执行：

| 用户意图 | 工作流 | 参考文档 |
|----------|--------|----------|
| 创建需求/任务/Bug/工作项 | 创建工作项 → 创建 CR | [创建工作项](references/create-workitem.md) → [创建变更](references/create-cr.md) |
| 创建变更/CR（已有工作项 ID） | 仅创建 CR | [创建变更](references/create-cr.md) |
| aone发布/发布CR/上线/部署变更 | 发布 CR 到流水线 | [发布 CR](references/publish-cr.md) |
| 查询/评审/关闭等辅助操作 | 独立执行 | [辅助操作](references/auxiliary-ops.md) |

## 工作流概述

### 1. 创建工作项 + 创建变更（两步工作流）

**Step 1** — 从用户输入推断 stamp、subject、issueTypeId，调用脚本创建工作项，获取 `issueId`。
详见 [references/create-workitem.md](references/create-workitem.md)

**Step 2** — 用 `issueId` 创建 CR，推断分支名和变更描述，创建后切换到 CR 分支。
详见 [references/create-cr.md](references/create-cr.md)

**完整示例**：用户说"帮我创建一个需求，优化首页加载速度，应用是 coding-tui-app"

```bash
# Step 1: 创建工作项
node <skill-path>/scripts/create-workitem.mjs \
  --akProjectId 2157409 --subject "优化首页加载速度" \
  --stamp Req --author 079827 --assignedTo 079827 --issueTypeId 556
# 返回 issueId: 81257356

# Step 2: 创建变更
aone-kit call-tool 'aone-mix::create_change_request' '{
  "devObjectName": "coding-tui-app",
  "description": "优化首页加载速度",
  "branchName": "feature/optimize-homepage-loading",
  "branchType": "NewBranch",
  "requestIds": [81257356]
}'

# Step 3: 切换分支
git fetch origin <返回的branchName> && git checkout <返回的branchName>
```

### 2. 发布 CR 工作流

获取 CR 详情 → 提交待发布 → 查询流水线 → 提交到流水线 → 返回发布 URL。
详见 [references/publish-cr.md](references/publish-cr.md)

### 3. 辅助操作

查询工作项、查询 CR、提交评审、关闭 CR、绑定工作项等独立操作。
详见 [references/auxiliary-ops.md](references/auxiliary-ops.md)
