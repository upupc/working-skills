#!/usr/bin/env bash
set -euo pipefail

# PostToolUseFailure hook: 工具执行失败时记录错误，并 block 让 Claude 检索历史方案
# 仅在工具执行失败时触发，无需手动判断错误

# 读取 stdin JSON
input=$(cat)

# 提取字段
tool_name=$(echo "$input" | jq -r '.tool_name // "unknown"')
error_msg=$(echo "$input" | jq -r '.error // "unknown error"')
session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
cwd=$(echo "$input" | jq -r '.cwd // empty')
is_interrupt=$(echo "$input" | jq -r '.is_interrupt // false')

# 用户中断不记录
if [[ "$is_interrupt" == "true" ]]; then
    exit 0
fi

# 确定项目根目录
if [[ -n "$cwd" ]]; then
    project_root="$(cd "$cwd" && git rev-parse --show-toplevel 2>/dev/null || echo "$cwd")"
else
    project_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

learning_dir="${project_root}/docs/learning"
error_log="${learning_dir}/.errors-${session_id}.jsonl"

# 确保 learning 目录存在
mkdir -p "$learning_dir"

timestamp=$(date +%Y-%m-%dT%H:%M:%S)

# 截取命令和错误信息
command=$(echo "$input" | jq -r '.tool_input.command // .tool_input.file_path // empty' | head -c 500)
truncated_error=$(echo "$error_msg" | head -c 500)

# 追加错误记录（JSONL 格式）
jq -n --arg ts "$timestamp" --arg tool "$tool_name" --arg cmd "$command" --arg err "$truncated_error" \
    '{timestamp: $ts, tool: $tool, command: $cmd, error: $err}' >> "$error_log"

echo "[self-improving-light] Error captured: tool=${tool_name}" >&2

# 输出 block decision，让 Claude 检索历史方案
jq -n --arg reason "[self-improving-light] Tool '${tool_name}' failed. Error: ${truncated_error}. Please search ${learning_dir}/*.md for historical solutions to this error before debugging from scratch." \
    '{"decision": "block", "reason": $reason}'
