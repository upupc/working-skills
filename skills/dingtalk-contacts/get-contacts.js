#!/usr/bin/env node

/**
 * 钉钉通讯录获取工具
 * 使用钉钉开放平台 API 获取企业通讯录
 */

const https = require('https');

// 配置 - 请替换为你的钉钉应用凭证
const CONFIG = {
  appKey: process.env.DINGTALK_APP_KEY || '',
  appSecret: process.env.DINGTALK_APP_SECRET || '',
};

/**
 * 获取访问令牌
 */
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const url = `https://api.dingtalk.com/v1.0/oauth2/accessToken?appKey=${CONFIG.appKey}&appSecret=${CONFIG.appSecret}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.errcode === 0) {
            resolve(result.accessToken);
          } else {
            reject(new Error(`获取 Token 失败：${result.errmsg}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 获取部门列表
 */
async function getDepartments(token) {
  return new Promise((resolve, reject) => {
    const url = 'https://api.dingtalk.com/v1.0/contact/departments';
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'x-acs-dingtalk-access-token': token,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * 获取部门用户列表
 */
async function getUsersInDept(token, deptId, cursor = '') {
  return new Promise((resolve, reject) => {
    const url = `https://api.dingtalk.com/v1.0/contact/users?deptIds=[${deptId}]&cursor=${cursor}&size=100`;
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'x-acs-dingtalk-access-token': token,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * 主函数
 */
async function main() {
  if (!CONFIG.appKey || !CONFIG.appSecret) {
    console.error('❌ 请配置钉钉应用凭证');
    console.error('使用方法:');
    console.error('  export DINGTALK_APP_KEY=your_app_key');
    console.error('  export DINGTALK_APP_SECRET=your_app_secret');
    console.error('  node get-dingtalk-contacts.js');
    process.exit(1);
  }

  try {
    console.log('🔑 正在获取访问令牌...');
    const token = await getAccessToken();
    console.log('✅ 令牌获取成功');

    console.log('📂 正在获取部门列表...');
    const depts = await getDepartments(token);
    console.log(`✅ 找到 ${depts.length} 个部门`);

    console.log('👥 正在获取用户列表...');
    const allUsers = [];
    
    for (const dept of depts) {
      console.log(`  部门：${dept.name} (ID: ${dept.id})`);
      let cursor = '';
      do {
        const result = await getUsersInDept(token, dept.id, cursor);
        if (result.users && result.users.length > 0) {
          allUsers.push(...result.users);
          console.log(`    获取 ${result.users.length} 人`);
        }
        cursor = result.nextCursor || '';
      } while (cursor);
    }

    console.log('\n📋 通讯录汇总:');
    console.log('=' .repeat(80));
    console.log(`总人数：${allUsers.length}`);
    console.log('=' .repeat(80));
    
    // 输出表格
    console.log('用户 ID\t\t\t姓名\t部门\t职位\t手机');
    console.log('-'.repeat(80));
    
    for (const user of allUsers) {
      const id = user.unionId || user.userId || 'N/A';
      const name = user.name || 'N/A';
      const dept = user.deptNames ? user.deptNames.join(', ') : 'N/A';
      const title = user.title || 'N/A';
      const mobile = user.mobile || 'N/A';
      console.log(`${id}\t${name}\t${dept}\t${title}\t${mobile}`);
    }

    // 保存为 JSON
    const fs = require('fs');
    const outputPath = '/home/liuyuan/workspace/openclaw-home/workspace/memory/dingtalk-contacts.json';
    fs.writeFileSync(outputPath, JSON.stringify(allUsers, null, 2));
    console.log(`\n✅ 通讯录已保存到：${outputPath}`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
