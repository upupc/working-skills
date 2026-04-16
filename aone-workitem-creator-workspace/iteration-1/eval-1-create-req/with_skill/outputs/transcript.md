# Aone Workitem Creator - Eval 1: Create Requirement

## User Request

> 帮我在 aone 项目 460616 创建一个需求，标题是'优化首页加载速度'，我的工号是 264746，指派给我自己，issueTypeId 用 82，描述写'首页加载时间超过3秒，需要优化到1秒内'

## Stamp Inference Reasoning

The user explicitly said "创建一个需求" (create a requirement). According to the skill's stamp inference rules:

- 提到"需求"、"功能"、"feature"、"requirement" -> `Req`

The word "需求" directly matches the `Req` stamp. No ambiguity here -- stamp is confidently set to **`Req`**.

## Parameter Extraction

### Required Parameters (all provided by user)

| Parameter | Value | Source |
|-----------|-------|--------|
| akProjectId | `460616` | User stated "项目 460616" |
| subject | `优化首页加载速度` | User stated "标题是'优化首页加载速度'" |
| stamp | `Req` | Inferred from "创建一个需求" |
| author | `264746` | User stated "我的工号是 264746" |
| assignedTo | `264746` | User stated "指派给我自己", same as author |
| issueTypeId | `82` | User stated "issueTypeId 用 82" |

### Optional Parameters (provided by user)

| Parameter | Value | Source |
|-----------|-------|--------|
| description | `首页加载时间超过3秒，需要优化到1秒内` | User stated "描述写'...'" |

## Questions for User

None. All required parameters are provided, and the stamp can be unambiguously inferred. No clarification needed.

## Full Command

```bash
node /Users/liuyuan/workspace/working-skills/skills/aone-workitem-creator/scripts/create-issue.mjs \
  --akProjectId 460616 \
  --subject "优化首页加载速度" \
  --stamp Req \
  --author 264746 \
  --assignedTo 264746 \
  --issueTypeId 82 \
  --description "首页加载时间超过3秒，需要优化到1秒内"
```

## Expected Output (on success)

```json
{
  "success": true,
  "issueId": <generated-id>,
  "message": "工作项创建成功，ID: <generated-id>"
}
```
