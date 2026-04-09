# auth 领域说明

当用户目标是认证、登录状态、退出登录时，进入这个领域。

## 进入条件

- 登录 Normandy CLI
- 刷新现有认证
- 查询当前是否已登录
- 登出或清理本地认证信息

## 选命令规则

- 登录或刷新令牌：`normandy auth login`
- 查询状态：`normandy auth status`
- 登出：`normandy auth logout`

## 常见提醒

- 如果后续是 AI 或程序继续消费结果，优先提示 `--output json`
- 如果用户只是问“业务命令怎么写”，不要把主体答案写成 `auth`，最多补一句“如未登录，先执行 `normandy auth login`”

## 进一步确认

- 需要最新参数或输出选项时，运行 `normandy auth --help` 或对应子命令 `--help`
