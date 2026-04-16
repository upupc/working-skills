# 发布 CR 工作流

当用户提到"aone发布"、"发布CR"、"CR发布"、"提交发布"、"部署变更"、"上线"、"发布上线"等关键词时，执行此流程。此流程独立于创建工作流，可单独使用。

## 触发条件

用户提供以下信息之一即可触发：
- **CR ID**（如 `发布变更 33887523`）
- **应用名**（如 `发布 coding-tui-app`，将查询最新待发布 CR）

## 流程步骤

### Step 1：获取 CR 详情

如果用户提供了 CR ID，先查询 CR 详情确认状态和应用名：

```bash
aone-kit call-tool 'aone-mix::get_change_request_detail' '{"crId": <CR_ID>}'
```

如果用户只提供了应用名，查询该应用的 CR 列表找到待发布的 CR：

```bash
aone-kit call-tool 'aone-mix::list_change_requests' '{"appNameList": ["<应用名>"]}'
```

从返回结果中确认：
- `appName`：应用名称（后续步骤需要）
- `status`：当前状态

### Step 2：提交 CR 到待发布状态

如果 CR 状态不是 `PREINTG`（待发布），先提交到待发布：

```bash
aone-kit call-tool 'aone-mix::submit_cr_to_pre_intg' '{"crId": <CR_ID>}'
```

如果已经是 `PREINTG` 状态，跳过此步。

### Step 3：查询应用绑定的流水线

```bash
aone-kit call-tool 'aone-mix::list_dev_object_pipelines' '{"devObjectName": "<appName>"}'
```

返回流水线列表，从中选择合适的流水线（通常只有一条）。

### Step 4：提交 CR 到流水线执行发布

```bash
aone-kit call-tool 'aone-mix::create_mix_flow_inst' '{
  "objectName": "<appName>",
  "pipelineId": <pipelineId>,
  "crIds": "<CR_ID>"
}'
```

### Step 5：返回结果

将流水线详情 URL 返回给用户，格式：

> CR <CR_ID> 已成功提交到发布流水线，可以在这里查看进度：
> <detailUrl>

## 完整示例

用户："aone发布 33887523"

```bash
# 1. 查询 CR 详情
aone-kit call-tool 'aone-mix::get_change_request_detail' '{"crId": 33887523}'
# 返回：appName=coding-tui-app, status=PREINTG

# 2. 已是待发布状态，跳过

# 3. 查询流水线
aone-kit call-tool 'aone-mix::list_dev_object_pipelines' '{"devObjectName": "coding-tui-app"}'
# 返回：pipelineId=10021978, name="代码合并写基线"

# 4. 提交到流水线
aone-kit call-tool 'aone-mix::create_mix_flow_inst' '{
  "objectName": "coding-tui-app",
  "pipelineId": 10021978,
  "crIds": "33887523"
}'
# 返回：detailUrl=https://cd.aone.alibaba-inc.com/ec/app/320245/mix/publish?flowId=10036230
```

## 多个 CR 批量发布

如果用户提供多个 CR ID，用逗号分隔传入 `crIds`：

```bash
aone-kit call-tool 'aone-mix::create_mix_flow_inst' '{
  "objectName": "<appName>",
  "pipelineId": <pipelineId>,
  "crIds": "<CR_ID1>,<CR_ID2>"
}'
```
