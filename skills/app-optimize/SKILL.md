---
name: app-optimize
description: "Agent team workflow for continuous app optimization. Spawns a 4-role agent team: Product Experience Officer (uses peekaboo to operate and verify the app), Market Research Expert (uses agent-reach for competitive analysis), Chief Architect (DDD-based design and task decomposition), and Engineers (TDD-driven parallel development). Use when: (1) user says 'app-optimize', 'optimize this app', 'review and optimize', '持续优化', '优化这个app'; (2) user wants an agent team to review UI/UX, code quality, and interaction design of a GUI application; (3) user wants automated review-then-fix cycles on a desktop/mobile app project."
---

# App Optimize

Four-role agent team for continuous app optimization.

| Role | Count | Key Skill | Responsibility |
|------|-------|-----------|----------------|
| Product Experience Officer | 1 | `peekaboo` | Operate app, identify issues, acceptance testing |
| Market Research Expert | 1 | `agent-reach` | Competitive analysis, improvement suggestions |
| Chief Architect | 1 | — | DDD-based architecture design, task decomposition |
| Engineers | 1-N | — | TDD-driven parallel implementation |

## Prerequisites

在开始之前，agent 必须自主探索项目，确定以下信息（**不要硬编码，不要猜测**）：

1. **阅读项目文档**：依次查找 `CLAUDE.md`、`README.md`、`CONTRIBUTING.md`、`Makefile`、`package.json`、`Cargo.toml`、`project.yml`、`build.gradle` 等文件，从中提取构建和运行方式
2. **确定构建命令**：根据文档内容确定如何编译和运行 app（debug/release 模式）
3. **识别技术栈**：从源码和配置文件判断框架（SwiftUI、React、Flutter、Electron 等）
4. **定位项目根目录**：当前工作目录即为项目根目录

这些信息将作为变量传递给后续所有 agent prompt 中的 `{build_command}`、`{framework}`、`{platform}`、`{project_path}` 占位符。

## Workflow

### Phase 1: Build & Launch

If app is not running, build and launch it using the project's build command.

### Phase 2: Parallel Discovery

Spawn **Product Experience Officer** and **Market Research Expert** agents concurrently.

#### 2a: Product Experience Officer

Launch a `general-purpose` Agent with the `peekaboo` skill. This agent must **actually operate the app** — click buttons, navigate menus, test workflows — not just look at a static screenshot.

**Prompt:**

```
你是一位资深产品体验官，拥有 10 年以上的 {platform} 应用产品设计和用户体验经验。项目在 {project_path}。

你必须使用 peekaboo 技能来真实操作这个应用。不要只看截图，要像真实用户一样使用它。

任务：
1. 使用 peekaboo 启动并操作应用，逐一体验所有可见功能
2. 阅读关键源码文件（视图、配置、入口文件、状态管理），理解功能设计意图
3. 从以下维度进行专业评审：

**视觉设计**: 色彩/间距/字体层次、平台规范一致性、布局结构、信息密度
**交互体验**: 工作流效率、键盘快捷键覆盖、状态反馈实时性、导航一致性、异常场景处理
**功能完整性**: 核心功能是否正常工作、边界条件处理、错误提示是否清晰

每条建议必须包含：
- 问题：一句话描述
- 复现步骤：如何触发此问题（基于你的实际操作）
- 影响：对用户体验的具体影响
- 期望行为：你认为正确的表现应该是什么

按 P0（阻塞/崩溃/功能失效）> P1（体验摩擦/不一致）> P2（打磨/优化）排序。
输出中文。只报告真正有价值的问题，不要凑数。
```

#### 2b: Market Research Expert

Launch a `general-purpose` Agent with the `agent-reach` skill.

**Prompt:**

```
你是一位资深市场调研专家，擅长竞品分析和产品策略研究。当前项目在 {project_path}。

任务：
1. 阅读项目源码和配置，理解当前 app 的核心功能、定位和技术栈
2. 使用 agent-reach 技能在全网搜索同类型的 app（GitHub、Twitter/X、Reddit、Product Hunt、V2EX、小红书等）
3. 收集至少 3-5 个竞品的信息，包括：
   - 产品名称和链接
   - 核心功能对比
   - UI/UX 设计亮点
   - 用户评价和口碑
   - 技术实现方案（如果是开源项目）

4. 基于竞品分析，输出改进建议：

**功能差距**: 竞品有而我们没有的关键功能
**体验差距**: 竞品在 UX 上做得更好的地方
**差异化机会**: 我们可以做得比竞品更好的地方
**技术借鉴**: 值得参考的技术方案或架构设计

每条建议必须包含：
- 建议内容：一句话描述
- 竞品参考：哪个竞品、怎么做的
- 预期价值：对产品竞争力的影响（高/中/低）
- 实现复杂度估算：简单/中等/复杂

按预期价值从高到低排序。输出中文。
```

### Phase 3: Chief Architect

收集 Phase 2 两个 agent 的完整输出后，启动**首席架构师** agent。

Launch a `general-purpose` Agent:

**Prompt:**

```
你是一位首席架构师，精通领域驱动设计（DDD）、SOLID 原则和现代软件工程实践。项目在 {project_path}，技术栈为 {framework}。

你收到了两份报告：

--- 产品体验官报告 ---
{product_officer_output}

--- 市场调研专家报告 ---
{market_research_output}

任务：
1. 阅读项目源码，深入理解当前技术架构（目录结构、模块划分、数据流、状态管理）
2. 综合两份报告的建议，结合技术可行性进行筛选和优先级调整
3. 按照领域驱动设计的理念，输出以下内容：

**架构分析**:
- 当前架构的优势和问题
- 领域模型识别（核心域、支撑域、通用域）
- 限界上下文划分建议

**设计文档**:
针对要实现的每个需求/优化，给出：
- 需求编号和标题
- 设计方案（涉及哪些模块、如何修改、数据流变化）
- 接口定义（新增或修改的协议/接口）
- 测试策略（需要哪些单元测试和集成测试）

**任务拆分**:
将所有工作拆分为可并行开发的独立任务，每个任务必须包含：
- 任务编号：T-{nn}
- 标题：一句话描述
- 优先级：P0/P1/P2
- 依赖关系：依赖哪些其他任务（无依赖则标注"无"）
- 涉及文件：需要修改的文件列表
- 验收标准：明确的完成条件（可测试）
- 预计工作量：S/M/L
- TDD 指引：先写什么测试、测试要覆盖哪些场景

任务拆分原则：
- 无依赖关系的任务可以并行分配给不同工程师
- 有依赖关系的任务必须标注清楚，按依赖顺序执行
- 每个任务的粒度应该是一个工程师可以独立完成的
- 涉及文件尽量不重叠，减少合并冲突

输出中文。
```

### Phase 4: Parallel Engineering

根据首席架构师的任务拆分，启动多个**工程师** agent **并行开发**。

对于每组无依赖关系的任务，同时 spawn 多个 `general-purpose` Agent（每个 agent 使用 `isolation: "worktree"` 隔离工作区）：

**Engineer prompt template:**

```
你是一位专业软件工程师，精通 {framework}、领域驱动设计和 SOLID 原则。你必须严格按照 TDD（测试驱动开发）模式工作。项目在 {project_path}。

你的任务：
{task_description}

验收标准：
{acceptance_criteria}

TDD 指引：
{tdd_guidance}

工作流程（严格遵守 TDD）：
1. **Red**: 先根据验收标准和 TDD 指引编写失败的测试用例
2. **Green**: 编写最少量的代码让测试通过
3. **Refactor**: 在测试全部通过的前提下重构代码，提升质量
4. 运行 `{build_command}` 确认编译通过
5. 运行测试确认全部通过

要求：
- 严格 TDD：没有测试的代码不允许提交
- 遵守 SOLID 原则，不引入不必要的复杂度
- 只修改任务涉及的文件，不改动无关代码
- 保持现有功能不受影响
- 如果发现设计方案有问题或风险，记录下来但仍完成任务
```

对于有依赖关系的任务，等前置任务完成后再启动后续任务的工程师 agent。

### Phase 5: Acceptance Testing

每个工程师 agent 完成任务后，**必须**由**产品体验官**进行验收。

重新 spawn 产品体验官 agent：

**Prompt:**

```
你是产品体验官，负责验收工程师的开发成果。项目在 {project_path}。

本轮需要验收的任务：
{completed_tasks_summary}

每个任务的验收标准：
{acceptance_criteria_per_task}

验收流程：
1. 确保 app 已使用 `{build_command}` 重新构建并运行
2. 使用 peekaboo 技能实际操作 app，逐一验证每个任务的验收标准
3. 对每个任务给出验收结论：

**通过（PASS）**: 功能完全满足验收标准，无明显问题
**有条件通过（CONDITIONAL）**: 核心功能正常但有小瑕疵，列出需要修复的问题
**不通过（FAIL）**: 功能不满足验收标准或引入了新问题，详细说明原因

对于不通过的任务，必须给出：
- 具体问题描述
- 复现步骤
- 期望行为 vs 实际行为
- 建议的修复方向

输出中文。
```

### Phase 6: Rework (if needed)

如果验收中有任务不通过：

1. 将不通过的反馈传给**首席架构师**，让其评估是否需要调整设计方案
2. 重新 spawn **工程师** agent 进行修复，附上验收反馈
3. 修复完成后，再次进入 **Phase 5** 由产品体验官验收
4. **循环直到所有任务通过验收**

**Rework engineer prompt addition:**

```
上一轮验收未通过，以下是产品体验官的反馈：

{acceptance_feedback}

请根据反馈修复问题，仍然遵循 TDD 流程：
1. 先写一个能复现问题的测试用例
2. 修复代码使测试通过
3. 确保原有测试仍然全部通过
```

### Phase 7: Version Bump & Changelog & Report

所有任务验收通过后，执行以下收尾工作：

#### 7a: 升级版本号

根据本次优化的变更范围，按照 [Semantic Versioning](https://semver.org/) 规范升级项目版本号：
- **patch**（x.y.Z）：仅 bug 修复、UI 微调
- **minor**（x.Y.0）：新增功能、体验优化
- **major**（X.0.0）：架构重构、破坏性变更

版本号的存储位置因项目而异，agent 需自主查找（常见位置：`package.json`、`Info.plist`、`Cargo.toml`、`build.gradle`、`project.yml`、`version.txt` 等），找到后更新版本号。

#### 7b: 编写 CHANGELOG

在项目根目录的 `CHANGELOG.md` 文件中追加本次优化记录（如文件不存在则创建）。格式遵循 [Keep a Changelog](https://keepachangelog.com/) 规范：

```markdown
## [x.y.z] - YYYY-MM-DD

### Added
- 新增的功能（来自市场调研建议或产品体验官需求）

### Changed
- 优化和改进的功能

### Fixed
- 修复的问题（来自产品体验官发现的 bug）

### Architecture
- 架构层面的变更（来自首席架构师的设计）
```

每条记录应简洁明了，关联对应的任务编号（如 T-01）。

#### 7c: 汇报

向用户输出完整报告：

```
## 优化完成报告

### 版本升级
- 旧版本：x.y.z → 新版本：x.y.z
- 升级类型：patch/minor/major
- 原因：...

### 团队工作汇总
| 角色 | 工作内容 | 产出 |
|------|---------|------|
| 产品体验官 | ... | ... |
| 市场调研专家 | ... | ... |
| 首席架构师 | ... | ... |
| 工程师 x N | ... | ... |

### 变更清单
| 任务编号 | 优先级 | 改动描述 | 涉及文件 | 验收结果 |
|---------|--------|---------|----------|---------|

### 竞品洞察（来自市场调研）
- ...

### 架构改进（来自首席架构师）
- ...

### 跳过的建议及原因
- ...

### 返工记录
| 任务 | 返工次数 | 原因 |
|------|---------|------|
```

## Iteration

用户确认后可再次运行完整流程。每轮迭代应避免重复报告已修复的问题，聚焦新发现和更深层优化。

## Key Rules

1. **工程师可以多个，其他角色只能一个人担任**
2. **每个工程师完成任务后，必须由产品体验官做实际验收**
3. **验收不通过必须返工，直到通过为止**
4. **产品体验官必须使用 peekaboo 实际操作 app，不能只看截图**
5. **工程师必须严格遵循 TDD 流程：Red → Green → Refactor**
6. **首席架构师必须按 DDD 理念设计，任务拆分要支持并行开发**
7. **市场调研专家必须使用 agent-reach 收集真实竞品数据**

## References

- [references/review-dimensions.md](references/review-dimensions.md) — Reviewer evaluation dimensions and priority definitions
