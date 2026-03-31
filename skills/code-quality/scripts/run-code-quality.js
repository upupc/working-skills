#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { simpleGit } from "simple-git";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillRoot = path.resolve(__dirname, "..");

const CODE_SUFFIXES = new Set([
  ".java",
  ".kt",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".dart",
  ".cs",
  ".rs",
  ".php",
  ".rb",
  ".swift",
  ".m",
  ".lua"
]);

const DIMENSIONS = [
  { key: "commit_log", desc: "commit log", weight: 2, promptFile: "commit_log.md" },
  { key: "comment", desc: "注释", weight: 1, promptFile: "comment.md" },
  { key: "log", desc: "日志", weight: 1, promptFile: "log.md" },
  { key: "unit_test", desc: "单元测试", weight: 2, promptFile: "unit_test.md" },
  { key: "complexity", desc: "复杂度", weight: 3, promptFile: "complexity.md" },
  { key: "scalability", desc: "扩展性", weight: 3, promptFile: "scalability.md" },
  { key: "exception_handling", desc: "异常处理", weight: 2, promptFile: "exception_handling.md" },
  { key: "refactoring", desc: "重构", weight: 3, promptFile: "refactoring.md" },
  { key: "business_code_contribution", desc: "业务代码贡献", weight: 1, promptFile: "business_code_contribution.md" },
  { key: "new_syntax_features", desc: "新语法新特性", weight: 1, promptFile: "new_syntax_features.md" }
];

const CHARACTERS = {
  objective: {
    key: "objective",
    desc: "客观型",
    promptFile: "character.objective.md"
  },
  encouraging: {
    key: "encouraging",
    desc: "鼓励型",
    promptFile: "character.encouraging.md"
  },
  vicious: {
    key: "vicious",
    desc: "恶毒型",
    promptFile: "character.vicious.md"
  }
};

function printHelp() {
  console.log(`代码质量评估脚本

用法:
  node scripts/run-code-quality.js --config <配置文件路径>

参数:
  --config, -c   JSON 配置文件路径
  --help, -h     显示帮助
`);
}

function parseArgs(argv) {
  const args = { help: false, config: null };
  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--help" || item === "-h") {
      args.help = true;
      continue;
    }
    if (item === "--config" || item === "-c") {
      args.config = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
  }
  return args;
}

function roundToTwo(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function flattenResultGroups(results) {
  return results.flatMap((item) => Array.isArray(item) ? item : [item]);
}

function calculateEmployeeAverageScore(results) {
  const flatResults = flattenResultGroups(results).filter((item) => item && item.account && typeof item.totalScore === "number");
  if (!flatResults.length) {
    return null;
  }

  const employeeScores = new Map();
  for (const item of flatResults) {
    if (!employeeScores.has(item.account)) {
      employeeScores.set(item.account, []);
    }
    employeeScores.get(item.account).push(item.totalScore);
  }

  const averages = Array.from(employeeScores.values(), (scores) => roundToTwo(scores.reduce((sum, score) => sum + score, 0) / scores.length));
  return averages.length ? roundToTwo(averages.reduce((sum, score) => sum + score, 0) / averages.length) : null;
}

function createMd5(content) {
  return createHash("md5").update(content).digest("hex");
}

function firstLine(content) {
  return content.split(/\r?\n/, 1)[0] ?? "";
}

function isCodeFromCommitDiff(content) {
  const line = firstLine(content);
  return Array.from(CODE_SUFFIXES).some((suffix) => line.endsWith(suffix));
}

function encodeCredential(value) {
  return encodeURIComponent(value).replace(/%40/g, "@");
}

function injectCredentials(repoUrl, username, token) {
  if (!username || !token || !repoUrl.startsWith("http")) {
    return repoUrl;
  }
  const target = new URL(repoUrl);
  target.username = encodeCredential(username);
  target.password = encodeCredential(token);
  return target.toString();
}

function buildAuthorCandidates(repoConfig) {
  const segments = [repoConfig.account, repoConfig.email]
    .filter(Boolean)
    .map((item) => String(item).trim())
    .filter(Boolean);
  return [...new Set(segments)];
}

function buildRepoUrl(repoConfig, globalConfig) {
  if (!repoConfig.repoPath) {
    throw new Error("缺少 repos[].repoPath 配置");
  }
  const baseUrl = (globalConfig.git.baseUrl ?? "https://code.alibaba-inc.com").replace(/\/+$/, "");
  return `${baseUrl}/${repoConfig.repoPath}.git`;
}

function normalizeConfig(rawConfig, configFile) {
  if (!rawConfig?.llm?.baseUrl) {
    throw new Error("缺少 llm.baseUrl 配置");
  }
  if (!Array.isArray(rawConfig?.llm?.apiKeys) || rawConfig.llm.apiKeys.length === 0) {
    throw new Error("缺少 llm.apiKeys 配置");
  }
  if (!Array.isArray(rawConfig?.repos) || rawConfig.repos.length === 0) {
    throw new Error("缺少 repos 配置");
  }

  const configDir = path.dirname(configFile);
  const workspace = path.resolve(configDir, rawConfig.workspace ?? "./tmp/repos");
  const roles = Array.isArray(rawConfig.roles) && rawConfig.roles.length > 0
    ? rawConfig.roles
    : ["objective"];

  return {
    workspace,
    afterDate: rawConfig.afterDate ?? null,
    maxInputLength: rawConfig.maxInputLength ?? 10000,
    roles: roles.map((role) => {
      if (!CHARACTERS[role]) {
        throw new Error(`不支持的角色: ${role}`);
      }
      return CHARACTERS[role];
    }),
    git: rawConfig.git ?? {},
    llm: {
      baseUrl: rawConfig.llm.baseUrl,
      apiKeys: rawConfig.llm.apiKeys,
      model: rawConfig.llm.model,
      temperature: rawConfig.llm.temperature ?? 0.3,
      maxTokens: rawConfig.llm.maxTokens ?? 4000,
      timeoutMs: rawConfig.llm.timeoutMs ?? 360000,
      mockEnabled: rawConfig.llm.mockEnabled ?? false
    },
    repos: rawConfig.repos
  };
}

function buildMockDimensionResult(payload) {
  const systemPrompts = payload.messages
    .filter((message) => message.role === "system")
    .map((message) => String(message.content ?? ""));
  const dimensionPrompt = systemPrompts[0] ?? "";
  const dimension = DIMENSIONS.find((item) => dimensionPrompt.includes(item.desc) || dimensionPrompt.includes(item.key));
  const score = dimension?.weight != null ? Math.min(5, Math.max(2, dimension.weight + 2)) : 4;

  return JSON.stringify({
    score,
    comment: `mock 数据：${dimension?.desc ?? "维度"}评估结果正常，可用于联调验证。`
  });
}

function buildMockOverallComment() {
  return "mock 数据：整体表现稳定，已跳过真实模型调用，当前结果仅用于联调验证。";
}

async function loadPrompt(fileName) {
  const promptPath = path.join(skillRoot, "references", "prompts", fileName);
  return readFile(promptPath, "utf8");
}

async function loadPrompts() {
  const userPrompt = await loadPrompt("user_prompt.md");
  const overallComment = await loadPrompt("overall_comment.md");
  const dimensionPrompts = {};
  for (const dimension of DIMENSIONS) {
    dimensionPrompts[dimension.key] = await loadPrompt(dimension.promptFile);
  }
  const characterPrompts = {};
  for (const character of Object.values(CHARACTERS)) {
    characterPrompts[character.key] = await loadPrompt(character.promptFile);
  }
  return { userPrompt, overallComment, dimensionPrompts, characterPrompts };
}

function createOpenAIClient(llmConfig, apiKey) {
  return new OpenAI({
    apiKey,
    baseURL: llmConfig.baseUrl,
    timeout: llmConfig.timeoutMs
  });
}

async function ensureDir(targetDir) {
  await mkdir(targetDir, { recursive: true });
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function prepareRepository(repoConfig, globalConfig) {
  const repoName = repoConfig.repoPath
    ? repoConfig.repoPath.replace(/[\\/]/g, "__")
    : `repo_${createMd5(repoConfig.localPath ?? JSON.stringify(repoConfig)).slice(0, 8)}`;
  const targetPath = repoConfig.localPath
    ? path.resolve(repoConfig.localPath)
    : path.join(globalConfig.workspace, repoName);
  const git = simpleGit();

  if (repoConfig.localPath) {
    if (!(await pathExists(targetPath))) {
      throw new Error(`本地仓库不存在: ${targetPath}`);
    }
  } else {
    await ensureDir(globalConfig.workspace);
    const username = repoConfig.username ?? globalConfig.git.username;
    const token = repoConfig.token ?? globalConfig.git.token;
    const remoteUrl = injectCredentials(buildRepoUrl(repoConfig, globalConfig), username, token);

    if (!(await pathExists(targetPath))) {
      await git.clone(remoteUrl, targetPath, ["--branch", repoConfig.branch ?? "master", "--single-branch"]);
    }
  }

  const repoGit = simpleGit(targetPath);
  await repoGit.fetch();
  await repoGit.checkout(repoConfig.branch ?? "master");
  try {
    await repoGit.pull("origin", repoConfig.branch ?? "master");
  } catch (error) {
    if (!(await repoGit.checkIsRepo())) {
      throw error;
    }
  }
  return { repoGit, targetPath };
}

function parseLogOutput(content) {
  const records = content
    .split("\u001e")
    .map((item) => item.trim())
    .filter(Boolean);
  return records.map((item) => {
    const [hash, authorName, authorEmail, date, subject] = item.split("\u001f");
    return { hash, authorName, authorEmail, date, subject };
  });
}

function formatCommitLogBlock(commitMeta) {
  return [
    `commit ${commitMeta.hash}`,
    `Author: ${commitMeta.authorName} <${commitMeta.authorEmail}>`,
    `Date:   ${commitMeta.date}`,
    "",
    `    ${commitMeta.subject}`
  ].join("\n");
}

function formatCommitDiffsBlock(commitMeta, diffs) {
  if(diffs.length===0){
    return "";
  }
  return [
    `commit ${commitMeta.hash}`,
    `Author: ${commitMeta.authorName} <${commitMeta.authorEmail}>`,
    `Date:   ${commitMeta.date}`,
    "",
    `    ${commitMeta.subject}`,
      "",
    `${diffs.join("\n")}`
  ].join("\n");
}

async function collectDiffs(repoGit, hash) {
  const rawPatch = await repoGit.raw(["show", "--format=", "--no-renames", "--unified=3", hash]);
  return rawPatch
    .split(/^diff --git /m)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const lines = section.split(/\r?\n/);
      const header = lines[0]?.startsWith("a/")
        ? `diff --git ${lines[0]}`
        : `diff --git ${section.split(/\r?\n/, 1)[0]}`;
      return `${header}\n${lines.slice(1).join("\n")}`.trim();
    });
}

async function collectCommitSummary(repoContext, repoConfig, globalConfig) {
  const { repoGit } = repoContext;
  const baseArgs = [
    "log",
    repoConfig.branch ?? "master",
    "--no-merges",
    "--no-patch",
    "--date=format:%a %b %e %H:%M:%S %Y %z",
    "--pretty=format:%H%x1f%an%x1f%ae%x1f%ad%x1f%s%x1e"
  ];
  if (globalConfig.afterDate) {
    baseArgs.push(`--since=${globalConfig.afterDate}`);
  }
  let rawLog = "";
  const authorCandidates = buildAuthorCandidates(repoConfig);
  if (authorCandidates.length === 0) {
    rawLog = await repoGit.raw(baseArgs);
  } else {
    for (const authorCandidate of authorCandidates) {
      rawLog = await repoGit.raw([...baseArgs, `--author=${authorCandidate}`]);
      if (rawLog.trim()) {
        break;
      }
    }
  }
  const commitMetas = parseLogOutput(rawLog);
  const codeCommitList = [];
  let commitContentLength = 0;


  for (const commitMeta of commitMetas) {
    const diffs = await collectDiffs(repoGit, commitMeta.hash);
    const codeCommit = {
      hash: commitMeta.hash,
      commitLog: commitMeta.subject,
      diffContent:''
    };
    codeCommitList.push(codeCommit);

    const diffArray = [];
    for (const diff of diffs) {
      if (!isCodeFromCommitDiff(diff)) {
        continue;
      }
      commitContentLength += diff.length;
      diffArray.push(diff);

      if(commitContentLength>globalConfig.maxInputLength){
        break;
      }
    }
    codeCommit.diffContent = formatCommitDiffsBlock(commitMeta, diffArray);
  }
  const commitContent = codeCommitList
    .map((item) => item.diffContent)
    .filter(Boolean)
    .join("\n");
  const commitLog = commitMetas
    .map((item) => formatCommitLogBlock(item))
    .join("\n");

  return {
    empId: repoConfig.empId ?? null,
    name: repoConfig.name ?? null,
    depDesc: repoConfig.depDesc ?? null,
    author: repoConfig.account ?? commitMetas[0]?.authorName ?? repoConfig.repoPath,
    repoPath: repoConfig.repoPath ?? repoContext.targetPath,
    branch: repoConfig.branch ?? "master",
    codeCommitList,
    commitLog,
    commitContent,
    commitContentMd5: createMd5(commitContent)
  };
}

function buildDimensionContent(summary, dimension, maxInputLength) {
  return dimension.key === "commit_log"
    ? summary.commitLog
    : summary.commitContent;
}

async function callChatCompletion(llmConfig, apiKey, payload) {
  if (llmConfig.mockEnabled) {
    const isDimensionRequest = payload.response_format?.type === "json_object";
    return isDimensionRequest ? buildMockDimensionResult(payload) : buildMockOverallComment();
  }

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const client = createOpenAIClient(llmConfig, apiKey);
      const response = await client.chat.completions.create(payload);
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("LLM 返回内容为空");
      }
      return content;
    } catch (error) {
      lastError = error;
      const message = String(error?.message ?? error ?? "").toLowerCase();
      const isRetryable = message.includes("timeout")
        || message.includes("timed out")
        || message.includes("connection")
        || message.includes("socket hang up")
        || message.includes("econnreset")
        || message.includes("429")
        || message.includes("rate limit")
        || message.includes("502")
        || message.includes("503")
        || message.includes("504");
      if (!isRetryable || attempt >= maxAttempts) {
        break;
      }
      const waitMs = attempt * 2000;
      console.warn(`LLM 调用失败，第 ${attempt} 次重试后继续，${waitMs}ms 后再次尝试: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

function extractJsonContent(content) {
  const text = content.trim();
  if (text.startsWith("{")) {
    return text;
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

async function evaluateDimension(summary, dimension, character, prompts, globalConfig) {
  const inputContent = buildDimensionContent(summary, dimension, globalConfig.maxInputLength);
  if (!inputContent) {
    return {
      key: dimension.key,
      desc: dimension.desc,
      weight: dimension.weight,
      score: 0,
      comment: "No result"
    };
  }

  const apiKeyIndex = DIMENSIONS.findIndex((item) => item.key === dimension.key) % globalConfig.llm.apiKeys.length;
  const apiKey = globalConfig.llm.apiKeys[apiKeyIndex];
  const payload = {
    model: globalConfig.llm.model,
    temperature: globalConfig.llm.temperature,
    max_tokens: globalConfig.llm.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompts.dimensionPrompts[dimension.key] },
      { role: "system", content: prompts.characterPrompts[character.key] },
      { role: "user", content: prompts.userPrompt.replace("%s", inputContent) }
    ]
  };

  console.log(`[${character.desc}]正在评估 ${summary.author} ${dimension.desc}...`);
  const startedAt = Date.now();
  const rawContent = await callChatCompletion(globalConfig.llm, apiKey, payload);
  console.log(`[${character.desc}]完成评估 ${summary.author} ${dimension.desc}... ${roundToTwo((Date.now() - startedAt) / 1000)}s`);
  const parsed = JSON.parse(extractJsonContent(rawContent));
  const score = parsed.score == null || Number(parsed.score) < 2 ? 2 : Number(parsed.score);
  return {
    key: dimension.key,
    desc: dimension.desc,
    weight: dimension.weight,
    score,
    comment: parsed.comment ?? ""
  };
}

function calculateTotalScore(results) {
  const totalWeight = results.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }
  const totalScore = results.reduce((sum, item) => sum + item.score * item.weight, 0);
  return roundToTwo(totalScore / totalWeight);
}

async function buildOverallComment(summary, dimensionResults, character, prompts, globalConfig) {
  const taskEvaluation = {
    task: "对evalResult字段的内容进行汇总和总结，不要超过300字, 不能进行具体分数评估。",
    evalResult: dimensionResults.map((item) => ({
      type: item.desc,
      score: item.score,
      weight: item.weight,
      comment: item.comment
    }))
  };
  const payload = {
    model: globalConfig.llm.model,
    temperature: globalConfig.llm.temperature,
    max_tokens: globalConfig.llm.maxTokens,
    messages: [
      { role: "system", content: prompts.overallComment },
      { role: "system", content: prompts.characterPrompts[character.key] },
      { role: "user", content: JSON.stringify(taskEvaluation) }
    ]
  };
  return callChatCompletion(globalConfig.llm, globalConfig.llm.apiKeys[0], payload);
}

function mapDimensionResult(result) {
  return {
    score: result.score,
    comment: result.comment,
    weight: result.weight,
    desc: result.desc
  };
}

async function evaluateRepository(summary, repoConfig, character, prompts, globalConfig) {
  const startAt = Date.now();
  const settledDimensionResults = await Promise.allSettled(
    DIMENSIONS.map((dimension) => evaluateDimension(summary, dimension, character, prompts, globalConfig))
  );
  const dimensionResults = settledDimensionResults.map((item, index) => {
    const dimension = DIMENSIONS[index];
    if (item.status === "fulfilled") {
      return item.value;
    }
    console.error(`[${character.desc}]评估维度失败 ${summary.author} ${dimension.desc}:`, item.reason);
    return {
      key: dimension.key,
      desc: dimension.desc,
      weight: dimension.weight,
      score: 0,
      comment: `评估失败: ${String(item.reason?.message ?? item.reason)}`
    };
  });
  const totalScore = calculateTotalScore(dimensionResults);

  console.log(`[${character.desc}]正在整体评估 ${summary.author}...`);
  let overallComment = "";
  try {
    overallComment = (await buildOverallComment(summary, dimensionResults, character, prompts, globalConfig)).trim();
  } catch (error) {
    console.error(`[${character.desc}]整体评估失败 ${summary.author}:`, error);
    overallComment = `整体评估生成失败: ${String(error?.message ?? error)}`;
  }
  const consumeTime = roundToTwo((Date.now() - startAt) / 1000);
  console.log(`[${character.desc}]完成整体评估 ${summary.author}...${consumeTime}s`);


  return {
    empId: repoConfig.empId ?? null,
    name: repoConfig.name??null,
    nickName: repoConfig.nickName??null,
    depDesc: repoConfig.depDesc??null,
    account: repoConfig.account ?? summary.author,
    email: repoConfig.email ?? null,
    repoPath: summary.repoPath,
    branch: summary.branch,
    commitLog: summary.commitLog,
    character: character.key,
    characterDesc: character.desc,
    commitContentLength: summary.commitContent.length,
    commitContentMd5: summary.commitContentMd5,
    consumeTime: consumeTime,
    modelName: globalConfig.llm.model,
    totalScore: totalScore,
    overallComment: overallComment,
    dimensions: Object.fromEntries(dimensionResults.map((item) => [item.key, mapDimensionResult(item)]))
  };
}

function createErrorResult(repoConfig, error, extra = {}) {
  return {
    empId: repoConfig.empId ?? null,
    name: repoConfig.name??null,
    nickName: repoConfig.nickName??null,
    depDesc: repoConfig.depDesc??null,
    account: repoConfig.account ?? null,
    email: repoConfig.email ?? null,
    repoPath: repoConfig.repoPath ?? repoConfig.localPath ?? null,
    branch: repoConfig.branch ?? "master",
    commitLog: extra.commitLog ?? null,
    character: extra.character ?? null,
    characterDesc: extra.characterDesc ?? null,
    totalScore: 0,
    overallComment: String(error?.message ?? error),
    dimensions: extra.dimensions ?? {},
    errorStage: extra.errorStage ?? "unknown"
  };
}

async function writeUserEvaluationArtifacts(repoConfig, summary, userResults, workspace) {
  const output = path.join(workspace,"output");
  const userCommitFile = path.join(output, `${repoConfig.account}.commit.json`);
  const userResultFile = path.join(output, `${repoConfig.account}.result.json`);
  const userResultStr = JSON.stringify(userResults, null, 2);
  await writeFile(userCommitFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(userResultFile, `${userResultStr}\n`, "utf8");

  const resultHtmlTemplatePath = path.join(skillRoot, "assets", "user-result.html");
  const resultHtmlOutputPath = path.join(output, `${repoConfig.account}.result.html`);
  const outputFileContent = {
    generatedAt: new Date().toISOString(),
    resultCount: userResults.length,
    averageScore: roundToTwo(userResults.reduce((sum, item) => sum + item.totalScore, 0) / userResults.length),
    userResults
  };
  const outputFileContentStr = JSON.stringify(outputFileContent, null, 2);
  const resultHtmlTemplate = await readFile(resultHtmlTemplatePath, "utf8");
  const resultHtmlContent = resultHtmlTemplate.replace(
    "const RAW_DATA = {};",
    `const RAW_DATA = ${outputFileContentStr.trim()};`
  );
  await writeFile(resultHtmlOutputPath, resultHtmlContent, "utf8");

  console.log(`${repoConfig.account} 评估完成，结果已写入: ${userResultFile}`);
  console.log(`${repoConfig.account} 评估报告已写入: ${resultHtmlOutputPath}`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.config) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const configFile = path.resolve(process.cwd(), args.config);
  const rawConfig = JSON.parse(await readFile(configFile, "utf8"));
  const config = normalizeConfig(rawConfig, configFile);
  const prompts = await loadPrompts();
  const results = [];

  const output  = path.resolve(config.workspace,"output");
  await ensureDir(output);
  const resultFile = path.join(output, "result.json");


  for (const repoConfig of config.repos) {
    let summary = null;
    let evaluated = null;
    let userResults = [];
    try {
      const repoContext = await prepareRepository(repoConfig, config);
      summary = await collectCommitSummary(repoContext, repoConfig, config);
      if (!summary.codeCommitList.length) {
        evaluated = createErrorResult(repoConfig, new Error("No code commits found"), {
          errorStage: "git-log"
        });
        userResults.push(evaluated);
        continue;
      }
      for (const character of config.roles) {
        console.log(`[${character.desc}]开始全面评估 ${summary.author}...`);
        const startedAt = Date.now();
        try {
          evaluated = await evaluateRepository(summary, repoConfig, character, prompts, config);
          console.log(`[${character.desc}]完成全面评估 ${summary.author}...${roundToTwo((Date.now() - startedAt) / 1000)}s`);
          userResults.push(evaluated);
        } catch (error) {
          evaluated = createErrorResult(repoConfig, error, {
            character: character.key,
            characterDesc: character.desc,
            errorStage: "llm-evaluation"
          });
          userResults.push(evaluated);
          console.error(`LLM evaluation failed. User:${repoConfig.account} repo:${repoConfig.repoPath} role:${character.key}`, error);
        }
      }
    } catch (error) {
      evaluated = createErrorResult(repoConfig, error, {
        errorStage: "repository-prepare"
      });
      userResults.push(evaluated);
      console.error(`Repository prepare failed. User:${repoConfig.account} repo:${repoConfig.repoPath}`, error);
    } finally {
      results.push(userResults);
      await writeUserEvaluationArtifacts(repoConfig, summary, userResults, config.workspace);
    }
  }

  const averageScore = calculateEmployeeAverageScore(results);
  const resultStr = JSON.stringify({
    generatedAt: new Date().toISOString(),
    resultCount: results.length,
    averageScore,
    results
  }, null, 2).trim();

  await writeFile(
      resultFile,
    `${resultStr}\n`,
    "utf8"
  );

  console.log(`评估完成，整体评估原始结果已写入: ${resultFile}`);

  const resultReportTemplatePath = path.join(skillRoot, "assets", "result.report.html");
  const resultReportOutputPath = path.join(output, "result.report.html");
  const resultReportTemplate = await readFile(resultReportTemplatePath, "utf8");
  const resultReportContent = resultReportTemplate.replace("const RAW_DATA = __RESULT_JSON_PLACEHOLDER__;", `const RAW_DATA = ${resultStr};`);
  await writeFile(resultReportOutputPath, resultReportContent, "utf8");

  console.log(`评估完成，整体评估报告已写入: ${resultReportOutputPath}`);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
