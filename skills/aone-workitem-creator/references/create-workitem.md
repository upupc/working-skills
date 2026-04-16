# Step 1：创建工作项，获取工作项 ID

## 需要确认的信息

从用户输入中推断以下信息，无法推断则**询问用户**：

| 信息 | 来源 |
|------|------|
| **应用名称**（Aone 应用名） | **必须由用户提供**，用于 Step 2 创建变更 |
| subject（标题，≤50字） | 从用户输入推断或用户直接给出 |
| stamp（工作项类型） | 从用户输入推断（见推断规则） |
| akProjectId | 默认取 `AONE_PROJECT_ID`，用户可指定 |
| author / assignedTo | 默认取 `AONE_STAFF_ID`，用户可指定 |
| issueTypeId | 根据内容推断（见推断规则），默认 556 |

## stamp 推断规则

- 提到"需求"、"功能"、"feature"、"requirement" → `Req`
- 提到"任务"、"task"、"todo" → `Task`
- 提到"缺陷"、"bug"、"问题"、"修复"、"fix" → `Bug`
- 提到"风险"、"risk" → `Risk`
- 无法判断时 → **必须询问用户**

## subject 推断

从用户描述中提炼简洁标题，不超过 50 字：
- "帮我记一下，首页加载太慢了" → `"优化首页加载速度"`
- "支付的时候偶尔会报500" → `"支付接口偶现500错误排查"`

## issueTypeId 推断规则

| ID | stamp | 名称 | 推断条件 |
|----|-------|------|----------|
| 556 | Req | AIDC技改需求 | 提到"技术改进"、"重构"、"优化"（**默认值**） |
| 9 | Req | 产品类需求 | 提到"产品"、"功能"、"交互" |
| 555 | Req | AIDC产品需求 | AIDC 产品侧 |
| 554 | Req | AIDC业务需求 | 提到"业务" |
| 636 | Req | AIDC数据需求 | 提到"数据" |
| 12 | Req | 用户反馈 | 提到"用户反馈" |
| 15 | Req | 技术类需求 | 技术改进、性能优化 |
| 27 | Task | 任务 | Task 类默认 |
| 36 | Bug | 功能缺陷 | Bug 类默认 |
| 38 | Bug | 线上问题 | 提到"线上"、"生产环境" |
| 41 | Bug | 性能瓶颈 | 提到"性能"、"慢"、"超时" |
| 40 | Bug | 需求问题 | 提到"需求理解"、"不符合预期" |
| 22 | Risk | 风险 | Risk 类默认 |

## description 生成

从用户口语化表达中提取关键信息，整理为结构化描述：

```
## 背景
<为什么要做这件事>

## 目标
<期望达成的结果>

## 方案
<如果用户提到了实现思路；没有则省略>

## 验收标准
<可验证的完成条件>
```

信息太少时只写一行概述，不强行填充。

## 执行命令

```bash
node <skill-path>/scripts/create-workitem.mjs \
  --akProjectId <项目ID> \
  --subject "<标题>" \
  --stamp <Req|Task|Bug|Risk> \
  --author <创建者工号> \
  --assignedTo <指派人工号> \
  --issueTypeId <类型ID> \
  [--description "<描述>"] \
  [--priorityId <优先级ID>] \
  [--verifier <验证者工号>] \
  [--watcherUsers <工号1,工号2>]
```

将 `<skill-path>` 替换为此技能的实际安装路径。

## 可选参数

| 参数 | 说明 |
|------|------|
| verifier | 验证者工号 |
| priorityId | 优先级（94=Urgent, 95=High, 96=Medium, 97=Low） |
| seriousLevelId | 严重程度（87=Blocker, 88=Major, 89=Normal, 90=Trivial） |
| moduleIds | 模块 ID 列表，逗号分隔 |
| watcherUsers | 抄送人工号列表，逗号分隔 |
| parentId | 父工作项 ID |
| cfList | 自定义字段，JSON 格式如 `{"61":"value"}` |

## 返回值

```json
{
  "success": true,
  "issueId": 12345678,
  "message": "工作项创建成功，ID: 12345678"
}
```

**记住返回的 `issueId`，下一步创建变更时需要用到。**
