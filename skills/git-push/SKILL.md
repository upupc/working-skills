---
name: git-push
description: 提交并推送代码到远程仓库。自动获取远程仓库地址，配置 Git 用户信息，创建提交并推送到远程。
homepage: https://github.com/upupc/openclaw-workspace
metadata:
  {
    "openclaw": {
      "emoji": "🚀",
      "requires": { "bins": ["git"] }
    }
  }
---

# Git Push Skill

自动提交并推送代码到远程仓库。

## 功能

- ✅ 自动获取远程仓库地址
- ✅ 从 SSH config 匹配 Git 用户信息
- ✅ 智能生成提交信息
- ✅ 单命令完成提交 + 推送

## 使用方法

### 基础用法

```bash
node {baseDir}/scripts/git-push.js
```

### 指定提交信息

```bash
node {baseDir}/scripts/git-push.js "feat: add new feature"
```

### 预览模式（不实际提交）

```bash
node {baseDir}/scripts/git-push.js --dry-run
```

## 工作流程

### 1. 获取远程仓库域名

```bash
git remote -v
```

提取仓库域名用于后续 SSH config 匹配。

### 2. 配置 Git 用户信息（可选）

检查 `~/.ssh/config` 文件：
- 如果存在且匹配远程仓库域名
- 提取用户信息并设置为 Git 提交用户名
- 如果未匹配，跳过此步骤

### 3. 创建提交

- 将所有变更添加到暂存区
- 根据变更内容生成简洁准确的提交信息
- 创建单个提交

### 4. 推送到远程

将当前分支推送到远程仓库。

## 脚本参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `message` | 提交信息（可选） | 自动生成 |
| `--dry-run` | 预览模式，不实际提交 | false |
| `--no-push` | 只提交不推送 | false |

## 示例

### 示例 1：自动提交并推送

```bash
node skills/git-push/scripts/git-push.js
```

输出：
```
📦 检测到 3 个文件变更
✏️  生成提交信息：feat: update API configurations
✅ 提交成功：abc1234
🚀 推送到 origin/main 成功
```

### 示例 2：指定提交信息

```bash
node skills/git-push/scripts/git-push.js "fix: resolve merge conflict"
```

### 示例 3：预览模式

```bash
node skills/git-push/scripts/git-push.js --dry-run
```

输出：
```
📦 检测到以下变更：
 M skills/finnhub/config.json
 M skills/massive-api/config.json

✏️  建议提交信息：feat: update API configurations
📝 预览模式，未实际提交
```

## 提交信息规范

自动生成的提交信息遵循以下格式：

```
<type>: <description>

[optional body]

[optional footer]
```

**Type 类型：**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `chore`: 构建/工具
- `test`: 测试相关

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `GIT_AUTHOR_NAME` | Git 作者名 | SSH config 或系统配置 |
| `GIT_AUTHOR_EMAIL` | Git 作者邮箱 | SSH config 或系统配置 |

## 注意事项

1. **确保 Git 已安装** - 需要 `git` 命令可用
2. **远程仓库配置** - 需要已配置 `origin` 远程
3. **SSH Key 配置** - 推送需要配置 SSH Key 或 Git 凭证
4. **工作区干净** - 提交前确保没有未解决的冲突

## 故障排除

### 问题 1：没有远程仓库

```
fatal: No remote configured to list refs from.
```

**解决：** 配置远程仓库
```bash
git remote add origin <your-repo-url>
```

### 问题 2：推送被拒绝

```
! [rejected] main -> main (fetch first)
```

**解决：** 先拉取远程变更
```bash
git pull --rebase
```

### 问题 3：SSH Key 未配置

```
git@github.com: Permission denied (publickey).
```

**解决：** 配置 SSH Key
```bash
ssh-keygen -t ed25519 -C "your@email.com"
# 然后将 ~/.ssh/id_ed25519.pub 添加到 GitHub
```

## 相关文件

- `scripts/git-push.js` - 主脚本
- `scripts/git-status.js` - 状态检查（可选）
- `scripts/generate-commit-message.js` - 提交信息生成（可选）

## 依赖

- Node.js >= 18
- Git >= 2.0

## 许可证

MIT
