---
name: site-summarize
version: 0.13.0
description: 爬取网站页面、批量抓取正文并保存为本地 Markdown，识别并处理 YouTube、Bilibili、TikTok、Vimeo、Twitter/X 等视频链接的字幕或转录文本，最后输出中文总结。适用于抓取整个网站或文档站、离线整理网页资料、处理网页中的视频内容、批量网页总结，或明确提到 tavily-crawl、scrapling-official、video-download、站点汇总等场景。
---

# Site Summarize

始终用中文输出过程说明、总结和交付物。

## 先检查依赖技能

本技能依赖以下外部技能：

- `tavily-crawl`
- `scrapling-official`
- `video-download`

先检查这些技能是否在当前可用技能列表中；如果缺失，按下面命令安装后再继续，不要跳过：

```bash
npx skills add tavily-ai/skills
npx clawhub@latest install scrapling-official
npx clawhub@latest install video-download
```

安装完成后，读取对应技能的 `SKILL.md`，复用它们定义的命令习惯与能力边界，不要自行发明替代方案。

## 产物目录

默认在当前工作目录下创建：

```text
<site-name>/
  crawl/
    links.json
    urls.txt
  markdown/
    *.md
  subtitles/
    *.txt
    *.md
  summary/
    summary.md
```

如果用户指定了输出目录，按用户要求调整，但仍要保留这四类产物：

- 链接清单
- 网页 Markdown
- 字幕原文与字幕 Markdown
- 最终总结

## 执行流程

### 1. 爬取站点链接

优先使用 `tavily-crawl`，不要手写爬虫替代。

最小流程：

1. 确认起始 URL、路径范围、深度限制、是否允许外链。
2. 创建目录：`<site-name>/crawl`、`<site-name>/markdown`、`<site-name>/subtitles`、`<site-name>/summary`。
3. 使用 `tvly crawl` 获取结构化结果，保存到 `<site-name>/crawl/links.json`。
4. 从结果中提取 URL，去重后写入 `<site-name>/crawl/urls.txt`。

推荐命令：

```bash
mkdir -p <site-name>/crawl <site-name>/markdown <site-name>/subtitles <site-name>/summary
tvly crawl "https://example.com" --max-depth 2 --limit 200 --json --output <site-name>/crawl/links.json
```

执行原则：

- 默认限制抓取范围，避免无界爬取。
- 站点较大时先小范围试跑，再扩大 `--limit` 和 `--max-depth`。
- 用户给出筛选条件时，优先使用 `--select-paths`、`--exclude-paths`、`--select-domains`、`--exclude-domains`。
- 从链接结果中额外识别视频站点 URL，尤其是 YouTube、Bilibili、TikTok、Vimeo、Twitter/X Video。

### 2. 链接分流

将 `<site-name>/crawl/urls.txt` 中的链接分为两类：

- 普通网页链接：进入网页抓取流程
- 视频链接：进入字幕流程

识别为视频链接时，优先交给 `video-download`，不要用网页正文抓取代替字幕内容。

### 3. 批量抓取普通网页正文

普通网页优先使用当前技能目录下的脚本：

```bash
python3 <skillBaseDir>/scripts/fetch_urls_to_markdown.py \
  --input <site-name>/crawl/urls.txt \
  --output-dir <site-name>/markdown
```

这个脚本会按顺序尝试：

1. `scrapling extract fetch`
2. `scrapling extract stealthy-fetch`

脚本会为每个页面保存独立 Markdown，并生成抓取报告。

执行要求：

- 先排除已识别的视频链接，再抓取普通网页。
- 用户明确指定 CSS 选择器、等待条件、Cloudflare 处理或代理参数时，优先通过脚本参数或 `scrapling-official` 的命令约定处理。
- 如果某个页面生成的 Markdown 明显为空或只有导航杂项，升级抓取模式后重试。

### 4. 处理视频链接并生成完整字幕 Markdown

对视频链接，使用 `video-download` 技能自带脚本，优先尝试下载字幕；没有字幕时再回退到下载并转录。

优先命令：

```bash
python <video-download-skillBaseDir>/scripts/video_parser.py '{"urls":["https://www.youtube.com/watch?v=VIDEO_ID"],"output":"./<site-name>/subtitles","download_subtitle":true,"onlysubtitle":true,"overwrite_subtitle":false}'
```

如果未得到字幕文件，再执行转录：

```bash
python <video-download-skillBaseDir>/scripts/video_parser.py '{"urls":["https://www.youtube.com/watch?v=VIDEO_ID"],"output":"./<site-name>/subtitles","transcribe":true,"subtitle_format":"txt"}'
```

整理字幕 Markdown 时至少包含：

- 视频标题
- 原始链接
- 字幕来源说明：平台字幕或本地转录
- 完整字幕正文

约束：

- 字幕原文不得删减，不得用概括替代。
- 原始字幕若为 `.txt`、`.srt`、`.vtt` 等格式，要保留原文件，再额外生成一份 Markdown。
- 可以在字幕全文后附加补充说明或总结，但不能替代字幕原文。

### 5. 阅读全部材料并输出总结

系统阅读 `<site-name>/markdown/` 与 `<site-name>/subtitles/` 下的全部 Markdown，再输出中文总结，不要只抽样少量文件。

总结文档模板规则：

- 如果用户明确提供了总结模板路径、模板内容或模板格式要求，优先按用户指定模板生成最终总结文档。
- 如果用户没有指定模板，必须使用 `{baseDir}/assets/summary-template.md` 作为最终总结文档的模板。
- 使用默认模板时，应先完整阅读模板结构与字段要求，再结合实际抓取结果填充内容；不要忽略模板中的章节，仅在确无内容时明确写“未发现相关信息”。
- 不要中英混杂，尽量使用中文描述。

默认总结至少覆盖：
- 网站主题或产品范围
- 信息架构
- 主要功能、概念、模块或章节
- 重复出现的重点观点
- 限制、约束、注意事项或最佳实践
- 视频中出现的重要结论、步骤、术语或演示信息

默认将总结写入 `<site-name>/summary/summary.md`。

回复用户时同时说明：

- 抓取到的链接数
- 成功落地的 Markdown 数
- 成功生成的字幕 Markdown 数
- 失败页面数
- 失败视频数
- 总结文件位置

## 失败处理

- 缺少 `tavily-crawl` 技能时，先执行 `npx skills add tavily-ai/skills`。
- 缺少 `scrapling-official` 技能时，先执行 `clawhub install scrapling-official`。
- 缺少 `video-download` 技能时，先执行 `clawhub install video-download`。
- `tvly` 命令不可用时，按 `tavily-crawl` 技能说明先安装并登录，不要直接改用其他方案跳过。
- `scrapling` 命令不可用时，按 `scrapling-official` 技能说明安装后再继续。
- 视频依赖缺失时，按 `video-download` 技能说明补齐 `yt-dlp`、`faster-whisper`、`ffmpeg` 等依赖。
- 单页抓取失败时，保留失败记录，继续处理其他页面。
- 字幕下载失败时，必须自动回退到“下载视频并转录”。
- 转录成功后，必须同时保留字幕原文文件和 Markdown 文件。

## 交付标准

完成任务时，至少交付：

1. 本地链接清单
2. 本地网页 Markdown 集
3. 视频字幕原文文件和对应 Markdown
4. 中文总结文档
5. 简短执行摘要，说明范围、数量、失败情况和总结位置
