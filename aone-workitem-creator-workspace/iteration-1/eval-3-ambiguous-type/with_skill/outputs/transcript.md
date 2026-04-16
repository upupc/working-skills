# Transcript: Ambiguous Workitem Type

## User Request

"帮我在 aone 项目 460616 记录一下这个事情：'和前端团队对齐接口规范'，我工号 264746，issueTypeId 82"

## Extracted Parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| akProjectId | 460616 | User provided |
| subject | 和前端团队对齐接口规范 | User provided |
| author | 264746 | User provided |
| assignedTo | 264746 | Inferred (same as author, user said "我工号") |
| issueTypeId | 82 | User provided |
| stamp | **UNKNOWN** | Cannot determine from input |

## Reasoning: Can we determine the stamp (workitem type)?

The skill defines four valid stamp values and their trigger keywords:

- **Req**: "需求", "功能", "feature", "requirement"
- **Task**: "任务", "task", "todo"
- **Bug**: "缺陷", "bug", "问题", "修复", "fix"
- **Risk**: "风险", "risk"

The user's phrasing is "记录一下这个事情" (record this thing). This is a generic, neutral expression that does not match any of the four categories. The subject "和前端团队对齐接口规范" (align API specs with the frontend team) could plausibly be a Task (a to-do item) or a Req (a requirement to standardize interfaces), but neither keyword is explicitly present.

The skill explicitly states: **"如果无法从用户输入中判断类型，必须询问用户明确工作项类型，不要猜测。"**

Therefore, I **cannot** determine the stamp and **must not** guess.

## Decision

**Do NOT execute the command.** Ask the user for clarification first.

## Response to User

我已经收集到以下信息：

- **项目 ID**: 460616
- **标题**: 和前端团队对齐接口规范
- **创建者/指派人**: 264746
- **issueTypeId**: 82

但还需要确认一个必填信息：**工作项类型（stamp）**。请问这个事项属于以下哪种类型？

- **Req**（需求）-- 新功能、产品需求
- **Task**（任务）-- 待办事项、执行任务
- **Bug**（缺陷）-- 缺陷修复、问题报告
- **Risk**（风险）-- 风险记录

确认后我会立即帮你创建。
