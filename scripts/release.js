#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读取 package.json
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const tag = `v${version}`;

console.log(`🚀 准备发布版本: ${version}`);
console.log(`📦 创建 tag: ${tag}\n`);

try {
  // 检查 tag 是否已存在
  try {
    execSync(`git tag -l ${tag}`, { stdio: 'pipe' });
    const existingTag = execSync(`git tag -l ${tag}`, { encoding: 'utf8' }).trim();
    if (existingTag === tag) {
      console.log(`❌ Tag ${tag} 已存在！`);
      console.log(`💡 如果这是新版本，请先更新 package.json 中的 version 字段`);
      process.exit(1);
    }
  } catch (e) {
    // Tag 不存在，继续
  }

  // 检查是否有未提交的更改
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('⚠️  检测到未提交的更改：');
      console.log(status);
      console.log('💡 建议先提交更改再发布');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('是否继续？(y/N): ', (answer) => {
        readline.close();
        if (answer.toLowerCase() !== 'y') {
          console.log('❌ 已取消');
          process.exit(1);
        }
        createAndPushTag();
      });
    } else {
      createAndPushTag();
    }
  } catch (e) {
    console.log('⚠️  无法检查 git 状态，继续执行...');
    createAndPushTag();
  }
} catch (error) {
  console.error('❌ 错误:', error.message);
  process.exit(1);
}

function createAndPushTag() {
  try {
    // 创建 tag
    console.log(`📝 创建 tag ${tag}...`);
    execSync(`git tag -a ${tag} -m "Release version ${version}"`, { stdio: 'inherit' });
    
    // 推送 tag
    console.log(`📤 推送 tag 到远程仓库...`);
    execSync(`git push origin ${tag}`, { stdio: 'inherit' });
    
    console.log('\n✅ 成功！');
    console.log(`🎉 Tag ${tag} 已创建并推送`);
    console.log(`🤖 GitHub Actions 将自动开始构建和发布`);
    console.log(`📊 查看构建进度: https://github.com/xcy960815/mac-desktop-chatgpt/actions`);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

