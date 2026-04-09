# host 领域说明

当用户明确在问机器、主机、节点、主机 SN、hostname，或要对主机做登录操作时，进入这个领域。

## 选命令规则

- 查单台主机详情：`host get`
- 查主机列表：`host list`
- 登录主机：`host login`
- 浏览容器内文件/目录：`host path`

## 什么时候优先 `host`

- 用户说"某个 app-group 下有哪些机器"
- 用户给的是 SN、hostname、IP
- 用户想登录某台主机
- 用户想看容器里某个目录下有哪些文件

## 什么时候不要优先 `host`

- 用户只是在看应用概况，用 `app`
- 用户只是看应用分组详情，用 `app-group`
- 用户只是想搜某个资源实例，不一定是主机，用 `resource`

## 容器文件浏览 `host path`

浏览 ASI 容器内指定目录的文件和子目录列表：

- `normandy host path --server <ip|sn|hostname> [--path /home/admin] [--container main]`

参数说明：
- `--server` 必填：服务器标识，可传 IP、SN 或 hostname
- `--path`：容器内目录路径，默认 `/home/admin`
- `--container`：容器名，默认 `main`
- `--layer`：目录深度，默认 `2`

### 什么时候用 `host path`

- 用户说"看看容器里有哪些文件"、"列出目录"、"查看日志目录结构"
- 用户想确认某个路径下有什么文件再决定查看具体日志

### `host path` vs `log list --source pod`

- `host path` 列出目录内容（文件名和类型），不读文件内容
- `log list --source pod` 读取具体日志文件的内容（tail 尾部 N 行）
- 典型流程：先用 `host path` 找到日志文件路径，再用 `log list --source pod` 读内容

## 诊断命令 `host diagnose`

`host diagnose` 是一个子命令组，包含 `list` 和 `get` 两个子命令。

### `host diagnose list` — 查诊断事件列表

查询目标主机或 Pod 的异常诊断事件，支持两种 scope：

- **HOST scope**（默认）：`normandy host diagnose list --host <ip|sn|hostname>`
  - `--host` 必填，可传 IP、SN 或 hostname
  - `--type host|pod` 可选，强制指定 node 或 pod 诊断；省略时自动推断
  - `--pod-name` 在 HOST scope 下不可用
- **GPU scope**：`normandy host diagnose list --scope GPU --pod-name <pod-name>` 或 `--host <ip|sn|hostname>`
  - 必须且只能传 `--pod-name` 或 `--host` 其中一个
  - 优先用 `--pod-name` 直接定位工作负载；`--host` 会推断 podName/nodeSn
  - `--type` 在 GPU scope 下不可用

通用参数：
- `--start-time` / `--end-time`：毫秒时间戳，省略默认最近 24 小时
- `--page` / `--limit`：分页，默认第 1 页、每页 20 条
- `--output json`：JSON 输出
- `--verbose`：详细日志

### `host diagnose get` — 查单条诊断详情

查看一条 HOST 或 GPU 诊断的详细结果：

- `normandy host diagnose get --diagnose-id <id> --type HOST`
- `normandy host diagnose get --diagnose-id <id> --type GPU [--dimension top-kernel,critical-path]`

参数说明：
- `--diagnose-id` 必填：值来自 `host diagnose list` 返回结果中的 taskId（HOST 类型）或 profileId（GPU 类型）。用户没有 diagnose-id 时，应先引导用 `list` 查询获取
- `--type HOST|GPU` 必填
- `--dimension`：GPU 专用，支持 `default`、`top-kernel`、`critical-path`，可逗号分隔多选；`default` 始终包含
- HOST 类型的 dimension 固定为 `default`

### 什么时候用 `host diagnose`

- 用户说"查机器异常"、"诊断事件"、"机器告警"、"GPU 诊断"、"pod 诊断"
- 用户给了 diagnose-id 或 taskId/profileId 要看详情
- 用户提到 "AWP profiling"、"GPU profiling"

### 什么时候不用 `host diagnose`

- 只查机器基本信息，用 `host get`
- 只查机器列表，用 `host list`
- 只登录机器，用 `host login`

## 进一步确认

- 需要最新参数时，运行 `normandy host --help` 或对应子命令 `--help`
