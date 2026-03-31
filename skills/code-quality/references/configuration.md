# 配置说明

配置文件为 JSON，建议结构如下：

```json
{
  "workspace": "./tmp/repos",
  "afterDate": "2026-03-01",
  "maxInputLength": 50000,
  "roles": [
    "objective",
    "encouraging"
  ],
  "llm": {
    "baseUrl": "https://example.com/v1",
    "apiKeys": [
      "sk-xxx"
    ],
    "model": "qwen3.5-plus",
    "temperature": 0.3,
    "maxTokens": 65536,
    "timeoutMs": 360000,
    "mockEnabled": false
  },
  "odps": {
    "accessId": "xxx",
    "accessKey": "xxx",
    "project": "icbutech",
    "endpoint": "http://service-corp.odps.aliyun-inc.com/api"
  },
  "architect": {
    "endpoint": "https://pre-architect.alibaba-inc.com/api/queryRecentMostCommittedRepos"
  },
  "git": {
    "baseUrl": "https://code.alibaba-inc.com",
    "username": "git-user",
    "token": "git-token"
  },
  "repos": [
    {
      "empId": "",
      "name": "",
      "nickName": "",
      "depDesc": "",
      "account": "zhangsan",
      "repoPath": "group/project",
      "branch": "master"
    }
  ]
}
```

字段说明：
- `workspace`：本地仓库目录，不存在会自动创建，评估结果固定输出到 `<workspace>/result.json`
- `afterDate`：提交开始日期，格式为 `YYYY-MM-DD`
- `maxInputLength`：单维度送入模型的最大字符数，默认 `10000`
- `roles`：支持 `objective`、`encouraging`、`vicious`
- `llm.baseUrl`：兼容 OpenAI SDK 的基础地址，通常形如 `https://host/v1`
- `llm.apiKeys`：模型调用密钥列表，会按维度轮询
- `llm.model`：模型名称，形如 `qwen3.5-plus`
- `llm.mockEnabled`：是否启用 mock 模式，默认 `false`；为 `true` 时跳过真实模型调用，直接返回 mock 评估结果，适合本地联调或流程验证
- `odps.accessId` / `odps.accessKey`：MaxCompute 访问凭证，供 Python 查询脚本读取
- `odps.project`：执行 SQL 时使用的默认 MaxCompute 项目
- `odps.endpoint`：MaxCompute Endpoint
- `architect.endpoint`：代码库查询接口地址，默认 `https://pre-architect.alibaba-inc.com/api/queryRecentMostCommittedRepos`
- `git.baseUrl`：Git 仓库基础地址，默认 `https://code.alibaba-inc.com`，脚本会自动拼接成 `<baseUrl>/<repoPath>.git`
- `git.token`：默认 Git 凭证，同时作为代码库查询接口的 `privateToken`
- `git.username`：默认 Git 用户名，可被单仓库覆盖
- `repos[].localPath`：如果已存在本地仓库，可直接指定并跳过 clone
- `repos[].username` / `repos[].token`：单仓库专用凭证

结果文件结构与原处理器保持同类语义，但输出介质改为 JSON 文件，不再写入 ODPS。

执行 `query_odps_buc_user.py` 时，脚本会直接读取 `--sqlfile` 指定的 SQL 文件并执行，再调用代码库接口补齐 `repoPath`，最终输出如下结构的 JSON 数组。SQL 查询结果至少需要包含 `emp_id` 与 `account` 字段，其他字段会按原样读取并映射：

```json
[
  {
    "empId": "335554",
    "name": "张三",
    "nickName": "三哥",
    "depDesc": "某事业部/某团队",
    "account": "zhangsan",
    "repoPath": "group/project",
    "branch": "master"
  }
]
```

执行命令示例：

```bash
python3 scripts/query_odps_buc_user.py --config /path/to/code.json --sqlfile scripts/query_odps_buc_user.sql
```
