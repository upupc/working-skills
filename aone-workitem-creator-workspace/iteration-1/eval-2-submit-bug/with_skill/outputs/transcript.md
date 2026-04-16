# Aone Workitem Creator - Eval 2: Submit Bug

## User Request

> "在 aone 项目 460616 提一个 bug，标题'支付接口返回500错误'，我工号 264746，指派给 333444，issueTypeId 82，优先级设为高"

## Reasoning: stamp Inference

The user said "提一个 bug". According to the skill's stamp inference rules:

> 提到"缺陷"、"bug"、"问题"、"修复"、"fix" -> `Bug`

The word "bug" directly matches the `Bug` stamp. No ambiguity -- stamp is **Bug**.

## Reasoning: priorityId Determination

The user said "优先级设为高" (priority set to High). According to the skill's optional parameters table:

| priorityId | Level |
|------------|-------|
| 94 | Urgent |
| **95** | **High** |
| 96 | Medium |
| 97 | Low |

"高" (High) maps to **priorityId 95**.

## Parameter Extraction

| Parameter | Value | Source |
|-----------|-------|--------|
| akProjectId | 460616 | User provided: "项目 460616" |
| subject | 支付接口返回500错误 | User provided: "标题'支付接口返回500错误'" |
| stamp | Bug | Inferred from "提一个 bug" |
| author | 264746 | User provided: "我工号 264746" |
| assignedTo | 333444 | User provided: "指派给 333444" |
| issueTypeId | 82 | User provided: "issueTypeId 82" |
| priorityId | 95 | User provided "优先级设为高", mapped High -> 95 |

All required parameters are present. No need to ask the user for additional information.

## Full Command

```bash
node /Users/liuyuan/workspace/working-skills/skills/aone-workitem-creator/scripts/create-issue.mjs \
  --akProjectId 460616 \
  --subject "支付接口返回500错误" \
  --stamp Bug \
  --author 264746 \
  --assignedTo 333444 \
  --issueTypeId 82 \
  --priorityId 95
```

## Notes

- The skill path is resolved to the actual installation location: `/Users/liuyuan/workspace/working-skills/skills/aone-workitem-creator/`
- Environment variables `AONE_APP_NAME` and `AONE_APP_SECRET` must be set for the API call to succeed.
- Command was NOT executed per eval instructions (API call would fail in test).
