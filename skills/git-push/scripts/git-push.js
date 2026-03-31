#!/usr/bin/env node

/**
 * Git Push Skill
 * 
 * 自动提交并推送代码到远程仓库
 * 
 * Usage:
 *   node scripts/git-push.js                    # 自动提交并推送
 *   node scripts/git-push.js "feat: add feature" # 指定提交信息
 *   node scripts/git-push.js --dry-run          # 预览模式
 */

const { execSync } = require('child_process');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe', ...options });
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

// 1. 获取远程仓库域名
function getRemoteDomain() {
  try {
    const remote = exec('git remote -v').trim();
    const match = remote.match(/git@([^:]+):|https?:\/\/([^/]+)\//);
    if (match) {
      return match[1] || match[2];
    }
  } catch (e) {
    log('⚠️  未找到远程仓库配置', 'yellow');
  }
  return null;
}

// 2. 从 SSH config 配置 Git 用户信息
function configureGitUser(remoteDomain) {
  const sshConfigPath = path.join(process.env.HOME || '', '.ssh', 'config');
  
  try {
    const sshConfig = exec(`cat ${sshConfigPath}`, { allowFailure: true });
    if (!sshConfig) return false;

    // 匹配远程仓库域名的 Host 配置
    const hostMatch = sshConfig.match(new RegExp(`Host\\s+${remoteDomain}`, 'i'));
    if (!hostMatch) return false;

    // 提取用户信息（如果有注释说明）
    const userMatch = sshConfig.match(/#.*?(\S+@\S+)/);
    if (userMatch) {
      const email = userMatch[1];
      const name = email.split('@')[0];
      
      exec(`git config user.name "${name}"`, { allowFailure: true });
      exec(`git config user.email "${email}"`, { allowFailure: true });
      
      log(`👤 使用 SSH config 中的用户信息：${name} <${email}>`, 'green');
      return true;
    }
  } catch (e) {
    // SSH config 不存在或读取失败，使用系统配置
  }
  
  return false;
}

// 3. 获取 Git 状态
function getGitStatus() {
  try {
    const status = exec('git status --porcelain');
    return status.trim().split('\n').filter(line => line.trim());
  } catch (e) {
    return [];
  }
}

// 4. 生成提交信息
function generateCommitMessage(changes, customMessage) {
  if (customMessage) {
    return customMessage;
  }

  // 分析变更类型
  const changeTypes = {
    feat: 0,
    fix: 0,
    docs: 0,
    style: 0,
    refactor: 0,
    chore: 0,
    test: 0
  };

  changes.forEach(change => {
    const file = change.substring(3).trim();
    
    if (file.includes('.md') || file.includes('README')) changeTypes.docs++;
    else if (file.includes('.test.') || file.includes('test/')) changeTypes.test++;
    else if (file.includes('.json') || file.includes('.yml')) changeTypes.chore++;
    else if (file.endsWith('.js') || file.endsWith('.ts')) changeTypes.feat++;
    else changeTypes.chore++;
  });

  // 确定主要类型
  const mainType = Object.entries(changeTypes)
    .sort((a, b) => b[1] - a[1])[0][0];

  // 生成描述
  const descriptions = {
    feat: 'add new features',
    fix: 'fix bugs',
    docs: 'update documentation',
    style: 'format code',
    refactor: 'refactor code',
    chore: 'update configurations',
    test: 'add tests'
  };

  const count = changes.length;
  return `${mainType}: ${descriptions[mainType]} (${count} files)`;
}

// 5. 执行提交
function commit(message) {
  try {
    exec('git add -A');
    const result = exec(`git commit -m "${message}"`);
    const match = result.match(/\[([^\]]+)\s+([a-f0-9]+)/);
    if (match) {
      return { branch: match[1], hash: match[2] };
    }
  } catch (e) {
    const output = e.stdout || e.stderr || '';
    if (output.includes('nothing to commit')) {
      log('ℹ️  工作区干净，无需提交', 'yellow');
      return null;
    }
    throw e;
  }
  return null;
}

// 6. 推送到远程
function push() {
  try {
    const branch = exec('git branch --show-current').trim();
    log(`🚀 推送到 origin/${branch}...`, 'cyan');
    exec(`git push origin ${branch}`);
    log(`✅ 推送成功`, 'green');
    return true;
  } catch (e) {
    log(`❌ 推送失败：${e.message}`, 'red');
    return false;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noPush = args.includes('--no-push');
  const customMessage = args.find(arg => !arg.startsWith('-'));

  log('📦 Git Push Skill', 'cyan');
  log('=' .repeat(40), 'cyan');

  // 获取远程域名
  const remoteDomain = getRemoteDomain();
  if (remoteDomain) {
    log(`🌐 远程仓库：${remoteDomain}`, 'blue');
  }

  // 配置用户信息
  configureGitUser(remoteDomain);

  // 获取变更
  const changes = getGitStatus();
  
  if (changes.length === 0) {
    log('✨ 工作区干净，无需提交', 'green');
    process.exit(0);
  }

  log(`📝 检测到 ${changes.length} 个文件变更:`, 'blue');
  changes.slice(0, 5).forEach(change => {
    log(`   ${change}`, 'gray');
  });
  if (changes.length > 5) {
    log(`   ... 还有 ${changes.length - 5} 个文件`, 'gray');
  }

  // 生成提交信息
  const message = generateCommitMessage(changes, customMessage);
  log(`\n✏️  提交信息：${message}`, 'blue');

  if (dryRun) {
    log('\n📝 预览模式，未实际提交', 'yellow');
    process.exit(0);
  }

  // 执行提交
  log('\n📦 创建提交...', 'cyan');
  const commitResult = commit(message);
  
  if (!commitResult) {
    process.exit(0);
  }

  log(`✅ 提交成功：${commitResult.hash}`, 'green');

  // 推送
  if (!noPush) {
    push();
  } else {
    log('ℹ️  跳过推送（--no-push）', 'yellow');
  }

  log('\n✨ 完成！', 'green');
}

main().catch(error => {
  log(`❌ 错误：${error.message}`, 'red');
  process.exit(1);
});
