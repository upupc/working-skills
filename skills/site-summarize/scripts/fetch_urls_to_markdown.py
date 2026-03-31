#!/usr/bin/env python3
"""
使用 scrapling CLI 批量抓取 URL，并将页面正文保存为 Markdown。
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="批量抓取 URL 并保存为 Markdown")
    parser.add_argument("--input", required=True, help="输入文件，支持 .txt 或 .json")
    parser.add_argument("--output-dir", required=True, help="Markdown 输出目录")
    parser.add_argument(
        "--report-file",
        help="抓取报告输出文件，默认写入 <output-dir>/fetch-report.json",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="get 模式超时时间（秒），默认 30",
    )
    parser.add_argument(
        "--browser-timeout",
        type=int,
        default=30000,
        help="fetch/stealthy-fetch 模式超时时间（毫秒），默认 30000",
    )
    parser.add_argument(
        "--wait",
        type=int,
        default=1500,
        help="浏览器模式额外等待时间（毫秒），默认 1500",
    )
    parser.add_argument(
        "--css-selector",
        help="可选，抓取指定 CSS 选择器",
    )
    parser.add_argument(
        "--wait-selector",
        help="可选，浏览器模式等待指定 CSS 选择器出现",
    )
    return parser.parse_args()


def ensure_scrapling() -> str:
    scrapling_bin = shutil.which("scrapling")
    if not scrapling_bin:
        raise SystemExit("未找到 scrapling，请先按 scrapling-official 技能说明安装。")
    return scrapling_bin


def load_urls(input_path: Path) -> list[str]:
    if not input_path.exists():
        raise SystemExit(f"输入文件不存在: {input_path}")

    if input_path.suffix.lower() == ".json":
        payload = json.loads(input_path.read_text(encoding="utf-8"))
        urls = sorted(set(extract_urls(payload)))
    else:
        urls = sorted(
            {
                line.strip()
                for line in input_path.read_text(encoding="utf-8").splitlines()
                if line.strip() and not line.strip().startswith("#")
            }
        )

    if not urls:
        raise SystemExit("未解析到任何 URL。")
    return urls


def extract_urls(value: object) -> Iterable[str]:
    if isinstance(value, dict):
        for key, item in value.items():
            if key.lower() in {"url", "source_url", "sourceurl", "href", "link"}:
                if isinstance(item, str) and item.startswith(("http://", "https://")):
                    yield item
            yield from extract_urls(item)
        return

    if isinstance(value, list):
        for item in value:
            yield from extract_urls(item)


def slugify_url(url: str, index: int) -> str:
    parsed = urlparse(url)
    host = parsed.netloc or "unknown-host"
    path = parsed.path.strip("/") or "index"
    slug = f"{host}-{path}"
    slug = slug.replace("/", "-")
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", slug).strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    if parsed.query:
        query_slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", parsed.query).strip("-")
        if query_slug:
            slug = f"{slug}-{query_slug}"
    if not slug:
        slug = f"page-{index:04d}"
    return slug[:180]


def build_commands(
    scrapling_bin: str,
    url: str,
    output_path: Path,
    args: argparse.Namespace,
) -> list[list[str]]:
    base_selector_args: list[str] = []
    if args.css_selector:
        base_selector_args.extend(["--css-selector", args.css_selector])

    browser_args: list[str] = [
        "--timeout",
        str(args.browser_timeout),
        "--wait",
        str(args.wait),
    ]
    if args.wait_selector:
        browser_args.extend(["--wait-selector", args.wait_selector])

    return [
        [
            scrapling_bin,
            "extract",
            "get",
            url,
            str(output_path),
            "--timeout",
            str(args.timeout),
            *base_selector_args,
        ],
        [
            scrapling_bin,
            "extract",
            "fetch",
            url,
            str(output_path),
            *browser_args,
            *base_selector_args,
        ],
        [
            scrapling_bin,
            "extract",
            "stealthy-fetch",
            url,
            str(output_path),
            *browser_args,
            *base_selector_args,
        ],
    ]


def file_has_content(path: Path) -> bool:
    return path.exists() and path.stat().st_size > 80


def run_command(command: list[str]) -> tuple[int, str]:
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )
    message = (completed.stdout or completed.stderr or "").strip()
    return completed.returncode, message


def fetch_one(
    scrapling_bin: str,
    url: str,
    index: int,
    output_dir: Path,
    args: argparse.Namespace,
) -> dict[str, object]:
    output_path = output_dir / f"{index:04d}-{slugify_url(url, index)}.md"
    attempts = []

    for mode, command in zip(
        ["get", "fetch", "stealthy-fetch"],
        build_commands(scrapling_bin, url, output_path, args),
        strict=True,
    ):
        return_code, message = run_command(command)
        success = return_code == 0 and file_has_content(output_path)
        attempts.append(
            {
                "mode": mode,
                "return_code": return_code,
                "message": message[:1000],
                "success": success,
            }
        )
        if success:
            return {
                "url": url,
                "output_file": str(output_path),
                "status": "success",
                "mode": mode,
                "attempts": attempts,
            }

        if output_path.exists():
            output_path.unlink()
        time.sleep(0.2)

    return {
        "url": url,
        "output_file": str(output_path),
        "status": "failed",
        "mode": None,
        "attempts": attempts,
    }


def write_report(report_file: Path, results: list[dict[str, object]]) -> None:
    summary = {
        "total": len(results),
        "success": sum(1 for item in results if item["status"] == "success"),
        "failed": sum(1 for item in results if item["status"] == "failed"),
        "results": results,
    }
    report_file.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()
    scrapling_bin = ensure_scrapling()

    input_path = Path(args.input).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    report_file = (
        Path(args.report_file).expanduser().resolve()
        if args.report_file
        else output_dir / "fetch-report.json"
    )

    urls = load_urls(input_path)
    results = []
    for index, url in enumerate(urls, start=1):
        print(f"[{index}/{len(urls)}] 抓取 {url}", file=sys.stderr)
        results.append(fetch_one(scrapling_bin, url, index, output_dir, args))

    write_report(report_file, results)
    failed = sum(1 for item in results if item["status"] == "failed")
    print(
        f"完成。总数={len(results)} 成功={len(results) - failed} 失败={failed} 报告={report_file}",
        file=sys.stderr,
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
