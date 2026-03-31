#!/usr/bin/env bash
set -euo pipefail

# Stop hook: 会话结束时，提醒 agent 总结本次会话的错误与解决方案到 docs/learning/

SKIP_MARKER="__SKIP_IMPROVING__"

# 读取 stdin JSON 获取 session_id 和 transcript_path
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
transcript_path=$(echo "$input" | jq -r '.transcript_path // ""')

# 检查最近一次 assistant 输出是否包含 SKIP_MARKER
# 如果包含，说明上一轮已经判断过不需要总结，直接退出
if [[ -n "$transcript_path" ]] && [[ -f "$transcript_path" ]]; then
    if grep -q '"role":"assistant"' "$transcript_path"; then
        set +e
        last_output=$(grep '"role":"assistant"' "$transcript_path" | tail -n 20 | jq -rs '
            map(.message.content[]? | select(.type == "text") | .text) | last // ""
        ' 2>/dev/null)
        set -e
        if [[ "$last_output" == *"$SKIP_MARKER"* ]]; then
            exit 0
        fi
    fi
fi

project_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
learning_dir="${project_root}/docs/learning"
error_log="${learning_dir}/.errors-${session_id}.jsonl"
today=$(date +%Y-%m-%d)
today_doc="${learning_dir}/${today}.md"

# 情况 1: 当前会话有错误记录，要求总结
if [[ -f "$error_log" ]] && [[ -s "$error_log" ]]; then
    error_count=$(wc -l < "$error_log" | tr -d ' ')
    now=$(date +"%Y-%m-%d %H:%M:%S")
    jq -n --arg reason "[self-improving-light] Session ended. ${error_count} error(s) captured in session ${session_id}. Errors log: ${error_log}. Please summarize errors and solutions to: ${today_doc}. After summarizing, delete the error log: ${error_log}. IMPORTANT: Each learning entry title MUST include the current timestamp: ${now} (format: yyyy-MM-dd HH:mm:ss)." \
        '{"decision": "block", "reason": $reason}'
    exit 0
fi

# 情况 2: 没有错误日志，让 agent 判断本轮对话是否涉及修复问题
# 无论是否总结经验，最终都必须输出 SKIP_MARKER 以终止 hook 循环
now=$(date +"%Y-%m-%d %H:%M:%S")
jq -n --arg reason "[self-improving-light] Session ended. No error log found for this session. Review the conversation: if this session involved debugging, fixing bugs, resolving build errors, or troubleshooting issues, summarize the errors and solutions to: ${today_doc}. If NOT about fixing problems, skip summarizing. IMPORTANT: Each learning entry title MUST include the current timestamp: ${now} (format: yyyy-MM-dd HH:mm:ss). You MUST end your response with exactly \"${SKIP_MARKER}\" regardless of whether you summarized or not." \
    '{"decision": "block", "reason": $reason}'
