#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
执行指定的 MaxCompute SQL，并将结果输出为 JSON。

用法：
python query_odps_buc_user.py --config /path/to/code.json --sqlfile /path/to/query.sql
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from odps import ODPS, options

DEFAULT_REPO_API = "https://pre-architect.alibaba-inc.com/api/queryRecentMostCommittedRepos"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="执行 MaxCompute SQL 并输出查询结果",
        allow_abbrev=False,
    )
    parser.add_argument("--config", required=True, help="JSON 配置文件路径")
    parser.add_argument("--sqlfile", required=True, help="SQL 文件路径")
    return parser.parse_args()


def load_config(config_path: str) -> dict[str, Any]:
    path = Path(config_path).expanduser().resolve()
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_repos_to_config(config_path: str, config: dict[str, Any], results: list[dict[str, Any]]) -> None:
    path = Path(config_path).expanduser().resolve()
    config["repos"] = [
        {
            "empId": result.get("empId") or "",
            "name": result.get("name") or "",
            "nickName": result.get("nickName") or "",
            "depDesc": result.get("depDesc") or "",
            "account": result.get("account") or "",
            "repoPath": result.get("repoPath") or "",
            "branch": result.get("branch") or "master",
        }
        for result in results
    ]
    with path.open("w", encoding="utf-8") as file:
        json.dump(config, file, ensure_ascii=False, indent=2)
        file.write("\n")


def load_sql(sqlfile_path: str) -> str:
    path = Path(sqlfile_path).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"SQL 文件不存在: {path}")
    return path.read_text(encoding="utf-8").strip()


def get_odps_client(config: dict[str, Any]) -> ODPS:
    odps_config = config.get("odps") or {}
    access_id = odps_config.get("accessId")
    access_key = odps_config.get("accessKey")
    project = odps_config.get("project")
    endpoint = odps_config.get("endpoint")

    missing_fields = [
        field_name
        for field_name, field_value in (
            ("odps.accessId", access_id),
            ("odps.accessKey", access_key),
            ("odps.project", project),
            ("odps.endpoint", endpoint),
        )
        if not field_value
    ]
    if missing_fields:
        raise ValueError(f"缺少配置项: {', '.join(missing_fields)}")

    return ODPS(access_id, access_key, project=project, endpoint=endpoint)


def get_repo_api_config(config: dict[str, Any]) -> tuple[str, str]:
    architect_config = config.get("architect") or {}
    git_config = config.get("git") or {}
    endpoint = architect_config.get("endpoint") or DEFAULT_REPO_API
    private_token = git_config.get("token")
    if not private_token:
        raise ValueError("缺少配置项: git.token")
    return endpoint, private_token


def normalize_value(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat(sep=" ")
        except TypeError:
            return value.isoformat()
    return value


def query_records(odps_client: ODPS, sql: str) -> list[dict[str, Any]]:
    options.tunnel.use_instance_tunnel = True
    instance = odps_client.execute_sql(sql)
    print(f"Instance ID: {instance.id}")
    print(f"LogView: {instance.get_logview_address()}")

    results: list[dict[str, Any]] = []
    with instance.open_reader(tunnel=True, limit=False) as reader:
        column_names = [column.name for column in reader.schema.columns]
        for record in reader:
            row = {
                column_name: normalize_value(record[column_name])
                for column_name in column_names
            }
            results.append(row)
    return results


def fetch_recent_repo(
    endpoint: str,
    private_token: str,
    emp_id: str | None,
    login_name: str | None,
) -> dict[str, Any]:
    payload = json.dumps(
        {
            "empId": emp_id or "",
            "loginName": login_name or "",
            "privateToken": private_token,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
    except urllib.error.URLError as error:
        raise RuntimeError(f"调用仓库查询接口失败: {error}") from error

    try:
        response_json = json.loads(body)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"仓库查询接口返回了非法 JSON: {body}") from error

    if not response_json.get("success"):
        raise RuntimeError(
            "仓库查询接口返回失败: "
            f"code={response_json.get('code')}, message={response_json.get('message')}"
        )

    data = response_json.get("data")
    if isinstance(data, dict):
        return data
    return {}


def build_output_records(
    odps_records: list[dict[str, Any]],
    repo_api_endpoint: str,
    private_token: str,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for record in odps_records:
        emp_id = record.get("emp_id")
        account = record.get("account")
        repo_info = fetch_recent_repo(repo_api_endpoint, private_token, emp_id, account)
        results.append(
            {
                "empId": emp_id or "",
                "name": record.get("last_name") or "",
                "nickName": record.get("nick_name_cn") or "",
                "depDesc": record.get("dep_desc") or "",
                "account": account or "",
                "repoPath": repo_info.get("repoPath") or "",
                "branch": "master",
            }
        )
    return results


def main() -> int:
    args = parse_args()
    config = load_config(args.config)
    sql = load_sql(args.sqlfile)
    odps_client = get_odps_client(config)
    repo_api_endpoint, private_token = get_repo_api_config(config)
    odps_records = query_records(odps_client, sql)
    results = build_output_records(odps_records, repo_api_endpoint, private_token)
    save_repos_to_config(args.config, config, results)
    print(f"结果已保存到{args.config}文件的repos字段，总共{len(results)}条记录")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # pylint: disable=broad-except
        print(f"执行失败: {error}", file=sys.stderr)
        raise SystemExit(1) from error
