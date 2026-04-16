# Step 2：创建应用变更（CR），关联工作项

使用 Step 1 获取的工作项 ID，通过 `aone-kit` 创建变更并自动关联。

## 需要确认的信息

| 信息 | 来源 |
|------|------|
| devObjectName（应用名） | **必须由用户提供**（Step 1 中已确认） |
| description（变更描述） | 复用 Step 1 的 subject 或从用户需求中推断 |
| branchName（分支名） | 根据用户需求自行推断（见分支名推断规则） |
| requestIds | 填入 Step 1 返回的 `issueId` |

## branchName 推断规则

根据用户的需求描述自动推断分支名，规则如下：
- 格式：`feature/<简短英文描述>`（功能）、`fix/<简短英文描述>`（修复）、`refactor/<简短英文描述>`（重构）
- 从 subject 中提取核心关键词，转换为小写英文短横线连接
- 示例：
  - subject "优化首页加载速度" → `feature/optimize-homepage-loading`
  - subject "支付接口偶现500错误排查" → `fix/payment-api-500-error`
  - subject "重构配置管理" → `refactor/config-management`

## description 推断规则

变更描述从用户的需求中提炼，格式：`<动作>：<具体内容>`，控制在 50 字以内。
- 示例：
  - "增强环境变量注入：解析完整login shell环境变量到Agent Terminal"
  - "修复支付超时：增加重试机制和降级策略"

## 执行命令

```bash
aone-kit call-tool 'aone-mix::create_change_request' '{
  "devObjectName": "<应用名>",
  "description": "<变更描述>",
  "branchName": "<推断的分支名>",
  "branchType": "NewBranch",
  "requestIds": [<Step1返回的issueId>]
}'
```

## 完整参数说明

| 参数 | 说明 | 是否必填 |
|------|------|----------|
| `devObjectName` | Aone 应用名、二方包或 PyPI 包名 | 必填 |
| `description` | 变更描述/标题 | 必填 |
| `branchName` | 分支名称（字母或数字开头，最大 1024 字符） | 必填 |
| `branchType` | `NewBranch`（新建，默认）或 `OldBranch`（使用已有分支） | 可选 |
| `requestIds` | 关联的工作项 ID 列表（**填入 Step 1 的 issueId**） | 必填 |
| `deleteBranchAfterPub` | 发布后是否删除分支，默认 `true` | 可选 |
| `devEmpIds` | 开发人员工号列表，如 `["077777","88888"]` | 可选 |
| `testerEmpIds` | 测试人员工号列表，如 `["077777","88888"]` | 可选 |

## 返回值

```json
{
  "crId": 33887523,
  "crDetailUrl": "https://cd.aone.alibaba-inc.com/...",
  "branchName": "feature/20260416_29017651_feature/optimize-homepage-loading_1",
  "branchPortalUrl": "..."
}
```

## 创建后切换到 CR 分支

```bash
git fetch origin <返回的branchName> && git checkout <返回的branchName>
```
