# 执行前校验与错误恢复

只有在用户明确要执行命令，或需要本机真实查询结果时，才读这个文档。只返回模板时不需要。

## 执行前校验

- 检查 `uv` 命令是否可用；如果当前会话或任务链里已经确认可用，就不要重复检查；不可用需要安装。
- 先检查 `normandy` 是否可用；如果当前会话或任务链里已经确认可用，就不要重复检查。
- 如果 `normandy` 不可用，优先建议或执行安装：
  ```bash
  uv tool install --index-url http://artlab.alibaba-inc.com/1/pypi/simple normandy-cli
  ```
- 如果要执行 `normandy log list --source sls`（SLS 日志查询），还需要检查 `aliyunlog` 是否可用（Pod 模式不需要）。如果不可用，安装：
  ```bash
  uv tool install aliyun-log-cli
  ```
  或：
  ```bash
  pip install -U aliyun-log-cli
  ```
- 对非 `auth` 命令，检查登录状态；如果当前会话或任务链里已经确认登录有效，或刚成功执行过需要鉴权的 `normandy` 命令，就不要重复检查。
- 如果登录失效、返回 `AUTH_FAILED`、`Not authenticated` 或等价信号，先执行 `normandy auth login`，再继续主命令。

## 执行后错误恢复

只有在执行型请求中，主命令已经真实运行且失败时，才进入这里。

- 如果报错里明确出现 `reason: Please upgrade CLI to v... and retry`，并且同时给出了可执行的 `action`，优先执行这个 `action` 做升级。
- 升级成功后，只重试原命令一次。
- 当前会话或任务链里，针对同一条主命令最多自动做一次"升级并重试"，避免死循环。
- 如果 `action` 缺失、不像升级动作、升级失败，或重试后仍失败，就直接把错误返回给用户，不继续自动重试。
