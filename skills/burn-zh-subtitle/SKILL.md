---
name: burn-zh-subtitle
description: >
  下载视频、转录字幕、使用 LLM 翻译为中文、烧录中文字幕到 MP4 视频。
  整合 video-download 技能进行视频下载与语音转录，再通过 LLM 将英文字幕翻译为中文，
  最后用 ffmpeg 将中文字幕硬编码烧录到视频中。
  触发场景：用户需要下载外语视频并添加中文硬字幕，或说"烧录字幕"、"嵌入中文字幕"等。
---

# Burn Chinese Subtitle

下载视频、转录字幕、LLM 翻译为中文、烧录中文字幕到 MP4。

## 工作流

### 第 1 步：使用 video-download 技能下载视频并转录

调用 `video-download` 技能，使用 SRT 格式生成字幕：

```bash
python /Users/liuyuan/workspace/openclaw-home/workspace/skills/video-download/scripts/video_parser.py '{"urls":["<VIDEO_URL>"],"output":"./downloads","subtitle_format":"srt","cookiefile":"<COOKIE_FILE>"}'
```

参数说明：
- `subtitle_format` 必须为 `"srt"`，后续烧录需要 SRT 格式
- `cookiefile` 按需传入 cookie 文件路径
- 默认使用 Faster Whisper `small` 模型转录

### 第 2 步：使用 LLM 翻译字幕为中文

1. 读取第 1 步生成的 `.srt` 字幕文件
2. 解析 SRT 格式，提取每条字幕的序号、时间轴、原文
3. 将原文**分批**发送给 LLM 进行翻译（每批约 30-50 条字幕，避免上下文过长）
4. LLM 翻译提示词要求：
   - 翻译为自然流畅的简体中文
   - 保持与原文一一对应，不合并、不拆分字幕条目
   - 保留专有名词的中文通用译法
   - 返回格式：每行一条翻译，与输入顺序严格对应
5. 将翻译结果写回 SRT 格式，保持原始时间轴不变
6. 保存为 `<视频名>.zh.srt` 文件，放在与原视频相同的目录下

### 第 3 步：使用 ffmpeg 烧录中文字幕到视频

使用 ffmpeg 将 `.zh.srt` 字幕硬编码（hardsub）到视频中：

```bash
ffmpeg -i "<原视频.mp4>" -vf "subtitles='<视频名>.zh.srt':force_style='FontName=PingFang SC,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=30'" -c:a copy "<输出视频>.mp4"
```

参数说明：
- `subtitles` 滤镜使用 libass 渲染 SRT 字幕
- `FontName=PingFang SC`：macOS 系统自带的中文字体（若为 Linux 可改为 `Noto Sans CJK SC`）
- `FontSize=22`：字号适中，可按需调整
- `PrimaryColour=&H00FFFFFF`：白色字体
- `OutlineColour=&H00000000`：黑色描边，提高可读性
- `Outline=2, Shadow=1`：描边和阴影增强
- `MarginV=30`：底部留白
- `-c:a copy`：音频直接复制，不重新编码

输出文件命名为 `<原视频名>_zh.mp4`，放在与原视频相同的目录下。

**注意**：SRT 文件路径中如有特殊字符（空格、引号、冒号等），需要用 `\\` 转义或用单引号包裹。ffmpeg subtitles 滤镜中路径的冒号 `:` 需转义为 `\\:`，单引号 `'` 需转义为 `\\'`。

## 默认参数

| 参数 | 默认值                                                                              |
|------|----------------------------------------------------------------------------------|
| 视频 URL | 必须输入                                                                             |
| Cookie 文件 | `/Users/liuyuan/workspace/openclaw-home/data/cookie/www.youtube.com_cookies.txt` |
| 输出目录 | `./downloads`                                                                    |
| Whisper 模型 | `small`                                                                          |
| 字幕格式 | `srt`                                                                            |
| 字体 | `PingFang SC`（macOS）                                                             |

## 完整执行示例

```bash
# 第 1 步：下载视频并转录 SRT 字幕
python /Users/liuyuan/workspace/openclaw-home/workspace/skills/video-download/scripts/video_parser.py \
  '{"urls":["https://www.youtube.com/watch?v=ym-hJL2H1MU"],"output":"./downloads","subtitle_format":"srt","cookiefile":"/Users/liuyuan/workspace/openclaw-home/data/cookie/www.youtube.com_cookies.txt"}'

# 第 2 步：LLM 翻译字幕（由 Claude 在对话中完成）

# 第 3 步：烧录字幕
ffmpeg -i "./downloads/<视频标题>/<视频标题>.mp4" \
  -vf "subtitles='./downloads/<视频标题>/<视频标题>.zh.srt':force_style='FontName=PingFang SC,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=30'" \
  -c:a copy "./downloads/<视频标题>/<视频标题>_zh.mp4"
```
