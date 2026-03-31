# Review Dimensions

Each dimension: 2-3 most critical issues only. Skip if no real problem found.

## Visual Design

| Aspect | What to check |
|--------|--------------|
| Layout structure | Overlay vs structural layout — content must not be obscured by floating elements (status bars, toolbars) |
| Platform HIG | Native patterns: Settings window style, toolbar placement, menu bar integration, standard controls |
| Information density | Redundant data across views (e.g. sidebar and header showing same info), wasted vertical/horizontal space |
| Semantic colors | Hardcoded colors vs system colors — must adapt to light/dark mode |
| Typography | Font hierarchy (title/body/caption), consistent sizing, monospace for code |

## Interaction & UX

| Aspect | What to check |
|--------|--------------|
| Keyboard shortcuts | Core operations (create/close/switch/navigate) must have shortcuts. Check if declared shortcuts are actually bound |
| Workflow efficiency | Frequent operations should require minimal clicks. Modal dialogs blocking main window unnecessarily |
| State feedback | Timers/durations frozen (computed properties without refresh), missing loading/error states |
| Code duplication in UI | Same UI logic (e.g. file picker dialog) duplicated in multiple views |

## Code Quality

| Aspect | What to check |
|--------|--------------|
| Render performance | Expensive computed properties in view body, missing caching for derived state |
| Save strategy | Config saving on every keystroke vs debounce/onDisappear |
| State management | @Published driving unnecessary re-renders, state in wrong layer (view vs manager) |
| Framework idioms | Using workarounds when native APIs exist (e.g. custom settings window vs Settings scene) |

## Priority Classification

- **P0**: Blocks functionality, violates platform guidelines, causes incorrect behavior, content obscured
- **P1**: Noticeable UX friction, code maintainability, performance under normal usage
- **P2**: Polish, minor inconsistency, future-proofing

## Output Format

```
### P0-{V|I|C}{n}: {一句话标题}

**问题：** {描述}
**影响：** {用户或代码层面的具体影响}
**修改方案：**
- 文件：`path/to/file.swift`
- 改法：{具体怎么改，包含关键代码片段或伪代码}
```
