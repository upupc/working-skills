---
name: code-quality
version: 0.4.0
description: 当需要先查询员工与最近提交最多的代码库，再基于 Git 提交记录做代码质量评估、输出 JSON 结果时使用。适用于要求用户提供配置文件、准备 SQL 文件、执行 query_odps_buc_user.py，再继续执行 run-code-quality.js 的场景。
metadata: {"openclaw":{"requires":{"anyBins":["node","python3"]}}}
---

# 代码质量评估

## 环境准备

首次使用前，先安装以下依赖：

```bash
npm install -g openai
npm install -g simple-git
pip install pyodps[full]
```

如果未安装上述依赖，不要直接执行脚本，先明确提示用户完成安装。

## 按下面流程执行，不要跳步：

1. 先提醒用户安装运行依赖：

```bash
npm install -g openai
npm install -g simple-git
pip install pyodps[full]
```

2. 再要求用户提供 `config` 文件路径。
3. 如果用户还没有配置文件，明确提示至少需要这些 JSON 字段：
   - `workspace` 默认值 `./tmp/repos`
   - `afterDate` 默认值 `2025-10-01`
   - `maxInputLength` 默认值 `50000`
   - `roles` 默认值 `["objective","encouraging","vicious"]`
   - `llm.baseUrl` 默认值 `https://dashscope.aliyuncs.com/compatible-mode/v1`
   - `llm.apiKeys` 必须为数组
   - `llm.model` 默认值 `qwen3.5-plus`
   - `odps.accessId`
   - `odps.accessKey`
   - `odps.project`
   - `odps.endpoint` 默认值 `http://service-corp.odps.aliyun-inc.com/api`
   - `git.token`
   - `git.username`
   - 可选：`architect.endpoint`，默认 `https://pre-architect.alibaba-inc.com/api/queryRecentMostCommittedRepos` 用来查询员工最近活跃的仓库
4. 再要求用户提供查询 SQL 文件路径；如果用户还没有 SQL 文件，提示其参考 `{skillBaseDir}/assets/example_user.sql` 准备一份可直接执行的 SQL。SQL 查询结果必须返回以下字段：`emp_id`、`full_emp_id`、`last_name`、`nick_name_cn`、`dep_desc`、`account`、`email`、`gmt_create`。
5. 运行员工与仓库查询脚本：

```bash
python3 {skillBaseDir}/scripts/query_odps_buc_user.py --config <配置文件路径> --sqlfile {skillBaseDir}/scripts/query_odps_buc_user.sql
```
脚本执行完后会将结果写入配置文件的`repos` 字段。

6. 执行代码质量评估脚本：

```bash
node {skillBaseDir}/scripts/run-code-quality.js --config <配置文件路径>
```

7. 报告执行结果

## 补充约束

- `query_odps_buc_user.py` 调用仓库接口时，`privateToken` 直接使用 `git.token`
- `query_odps_buc_user.py` 运行时必须显式传入 `--sqlfile`
- SQL 文件内容必须可直接执行，字段要求参考 `{skillBaseDir}/assets/example_user.sql`
- SQL 查询结果必须返回以下字段：`emp_id`、`full_emp_id`、`last_name`、`nick_name_cn`、`dep_desc`、`account`、`email`、`gmt_create`
- 提交评估的配置字段说明见 `{skillBaseDir}/references/configuration.md`
- Prompt 模板位于 `{skillBaseDir}/references/prompts`，通常不要修改
