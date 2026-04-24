---
name: git-push
description: 提交并推送代码到远程仓库。由 LLM 直接读取 git 变更内容，生成语义化的 commit log（subject + body），然后执行 git add/commit/push。不使用脚本生成 commit message。
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

由 LLM 读取 git 变更内容，自己写 commit log，然后提交并推送。

**核心原则：不用脚本生成 commit message。** commit message 必须由 LLM 基于实际的代码/文本改动内容来总结。

## 功能

- ✅ LLM 通过 `git diff` 等命令直接读取变更内容
- ✅ 基于实际改动写出语义化 commit log（subject + body）
- ✅ 配置远程仓库 Git 用户信息（可选）
- ✅ 提交并推送到远程

## 工作流程

每一次调用 `/git-push` 都严格按下列顺序执行。**不要省略或并行改动以下步骤。**

### 1. 读取 git 状态

```bash
git status --short
git log -5 --oneline
```

- `git status --short` 看一眼都有哪些文件要动、是新增还是修改。
- `git log -5 --oneline` 读最近几条提交，学仓库的 commit message 风格（中文/英文、是否用 type(scope) 前缀、语气等），后续生成的 commit 要贴合该风格。

### 2. 读取变更内容

```bash
git diff HEAD -- <file1> <file2> ...
```

- 优先使用 `git diff HEAD`，可以同时看到 staged 和 unstaged 的改动。
- 只读**要提交的文件**，二进制/超大文件（lock 文件、dist、build artifact、node_modules）跳过。
- 文件太多时分批次读。每批读完都要消化内容，**不要只看文件名就下结论**。
- 对于 `A` 新增文件，读完整文件内容（Read 工具）而不是 diff。

### 3. 总结变更，写 commit log

基于实际读到的代码/文本内容，用一句话 subject + 多行 body 描述改了什么。

#### Subject（第一行）

- 格式与最近 5 条 commit 的风格保持一致（例如 `feat(Scope): …`、`fix: …`、`docs(plan): …`、`chore: …`）。
- 控制在 72 字符以内，不以句号结尾。
- 描述**这次提交做了什么**，不要写"多个文件变更""更新配置"这类空话。

#### Body（空行后的多行描述）

- 总结每个文件改动的**语义内容**：
  - 新增/修改/删除了哪些函数、类、方法、类型、常量。
  - markdown/文档里新增或修改了哪些章节/要点。
  - 配置文件里加了哪些 key、改了哪些值。
  - 修复的 bug 是什么、重构的动机是什么。
- 不要写"+N/-M 行"这类机械统计。
- 不要逐行复述 diff；提炼**改了什么、为什么改**。
- 每条 bullet 以动词开头（add / update / remove / fix / refactor / rename / move）。
- 中英文保持与仓库历史一致。

#### 示例

好的 commit log：
```
feat(Config): Agents 内置 Codex 并按 ID 补齐老用户配置

- AgentsConfig.builtinConfigs 新增 codex 条目，command=codex，logSource=.stdout
- 新增 ensureBuiltinConfigs()，按 ID 合并缺失内置配置并回退 defaultAgentId
- AppConfig.init(from:) 在解码 agents 后调用 ensureBuiltinConfigs，覆盖老配置
- AgentConfigTests 新增 5 个用例覆盖内置列表、补齐、用户覆盖、defaultAgentId 回退
```

劣的 commit log（脚本风格，禁止）：
```
docs: update 4 files (+46/-0 symbols)

Changes:
- A docs/learning/2026-04-24.md (+41/-0)
- M Sources/CodingTUI/Config.swift (+29/-0)
- ...
```

### 4. 执行提交

多行 message 必须通过 HEREDOC 传给 `git commit`，避免 shell 引号问题：

```bash
git add -A
git commit -m "$(cat <<'EOF'
<subject>

<body 的第一条>
<body 的第二条>
...
EOF
)"
```

如果有 pre-commit hook 失败：先根据 hook 报错修正问题，**创建一条新提交**，不要用 `--amend`。

### 5. 推送到远程

```bash
git push origin $(git branch --show-current)
```

如果远程分支不存在，用 `-u`：

```bash
git push -u origin $(git branch --show-current)
```

## 拆分提交的判断

如果 staged 变更跨了**无关**的范围（例如同时包含 feature code + 无关的 docs/learning 日志），**先询问用户**是否拆成多条 commit。

参考判断：
- 同一 feature 的代码 + 对应测试 + 计划 → 可以合并为一条。
- 代码改动 + 不相关的学习笔记/文档 → 建议拆分。
- 重构 + 新功能混合 → 建议拆分。

不要擅自拆分或合并用户的变更——只在提议方案后获得用户确认再动手。

## 用户传入 message 时

如果用户显式给了 commit message（例如调用 `/git-push "feat: X"`）：
- 用户给的是单行 subject：按本流程补 body。
- 用户给的是完整 subject+body（含空行）：**原样使用**，不要改写。

## 失败处理

| 问题 | 处理 |
|------|------|
| 没有远程仓库 | 提示用户配置 `git remote add origin <url>` |
| 推送被拒（non-fast-forward） | 提示 `git pull --rebase` 后再推，不要 force push |
| Pre-commit hook 失败 | 修复根因后**创建新提交**，不要 `--amend`、不要 `--no-verify` |
| SSH Key 未配置 | 提示 `ssh-keygen` 并添加公钥到 Git 服务 |
| `nothing to commit` | 告知用户工作区干净，退出 |

## 注意事项

1. **永远不要**基于文件名或行数生成 commit message——必须先 `git diff` 读内容。
2. **永远不要**在未获用户确认的情况下 force push、amend 已推送的 commit、跳过 hook。
3. **永远不要**把 `.env`、`credentials.json` 等疑似秘密文件纳入提交；遇到时警告用户。
4. commit message 的语言（中文/英文）跟随 `git log` 历史。

## 依赖

- Git >= 2.0
- 本 skill 不依赖 Node.js 或其他运行时，全部由 LLM 直接用 Git CLI 完成。
