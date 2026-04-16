# 辅助操作

以下操作可独立使用，不属于固定工作流。

## 查询工作项

```bash
node <skill-path>/scripts/query-workitem.mjs --id <工作项ID>
```

## 查询项目工作项类型

```bash
node <skill-path>/scripts/query-issue-types.mjs [--akProjectId <项目ID>] [--stamp <Req|Task|Bug|Risk>]
```

## 追加关联工作项（已有 CR）

```bash
aone-kit call-tool 'aone-mix::bind_workitem_to_changerequest' '{
  "crId": <变更ID>,
  "reqIdList": [<工作项ID1>, <工作项ID2>]
}'
```

## 查看 CR 详情

```bash
aone-kit call-tool 'aone-mix::get_change_request_detail' '{"crId": <变更ID>}'
```

## 查询 CR 列表

```bash
aone-kit call-tool 'aone-mix::list_change_requests' '{"appNameList": ["<应用名>"]}'
```

## 通过分支查询 CR

```bash
aone-kit call-tool 'aone-mix::get_change_request_by_branch' '{
  "branchUrl": "git@gitlab.alibaba-inc.com:group/project.git branch_name"
}'
```

## 提交 CR（置为待发布）

```bash
aone-kit call-tool 'aone-mix::submit_cr_to_pre_intg' '{"crId": <变更ID>}'
```

## 提交代码评审

```bash
aone-kit call-tool 'aone-mix::submit_code_review' '{"crId": <变更ID>, "reviewerIds": "<评审人工号,逗号分隔>"}'
```

## 关闭 CR

```bash
aone-kit call-tool 'aone-mix::close_change_request' '{"crId": <变更ID>}'
```

## 提交 CR 到流水线

```bash
aone-kit call-tool 'aone-mix::create_mix_flow_inst' '{
  "objectName": "<应用名>",
  "pipelineId": <流水线ID>,
  "crIds": "<变更ID列表,逗号分隔>"
}'
```

## 查询应用绑定的流水线

```bash
aone-kit call-tool 'aone-mix::list_dev_object_pipelines' '{"devObjectName": "<应用名>"}'
```

## 错误处理

| 错误信息 | 解决方案 |
|----------|----------|
| `缺少必需参数: --xxx` | 询问用户补充对应参数 |
| `请设置环境变量` | 提示用户配置 AONE_APP_NAME 和 AONE_APP_SECRET |
| `HTTP 401/403` | 检查应用凭证是否正确，是否有对应项目的权限 |
| `创建失败` | 查看返回的 details 字段了解具体原因 |
