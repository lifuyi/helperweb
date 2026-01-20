# 🚨 安全补救指南 - 暴露的敏感信息

## 🔴 紧急事项

你的 Supabase 密钥和 URL 被暴露在 Git 仓库中。需要立即采取行动。

### 暴露的敏感信息

| 信息 | 值 | 暴露方式 |
|------|-----|---------|
| Supabase URL | `hdpwsrvejizvvqwbwsaa.supabase.co` | .env 文件 |
| Supabase Service Role Key | `sb_secret_kSct-AgkWoTyZARle5wuEw_w5ClwjYG` | .env 文件 |
| Supabase Anon Key | `sb_publishable_L6W1eFRdEn3Ai2ah-O5rDg_FVpftZho` | .env 文件 |
| 暴露的提交 | `2ca8a3b` | 初始提交 |

---

## ✅ 立即行动（按顺序）

### 步骤 1️⃣: 撤销 Supabase 密钥（必须立即做）

**立即访问 Supabase 仪表板**：

1. 打开 https://app.supabase.com
2. 选择你的项目：`hdpwsrvejizvvqwbwsaa`
3. 进入 **Settings → API**
4. 点击 **Revoke** 按钮撤销所有现有密钥
5. 点击 **Generate new** 生成新的密钥
6. 复制新的密钥

**新生成的密钥**：
- 记下新的 `VITE_SUPABASE_ANON_KEY`
- 记下新的 `SUPABASE_SERVICE_ROLE_KEY`
- 更新本地 `.env` 文件

### 步骤 2️⃣: 更新本地 .env 文件

```bash
# 编辑 .env 文件
vim .env

# 替换为新的密钥
VITE_SUPABASE_URL=https://hdpwsrvejizvvqwbwsaa.supabase.co  # URL 不变
VITE_SUPABASE_ANON_KEY=<新的 anon key>
SUPABASE_SERVICE_ROLE_KEY=<新的 service role key>
```

### 步骤 3️⃣: 测试新密钥

```bash
npm run dev
# 验证应用正常工作
```

### 步骤 4️⃣: 从 Git 历史中移除敏感信息（可选但推荐）

**方法 A：使用 git-filter-repo（推荐）**

```bash
# 安装 git-filter-repo
pip install git-filter-repo

# 移除所有包含敏感信息的历史提交
git filter-repo --replace-text <(cat <<'EOF'
sb_secret_kSct-AgkWoTyZARle5wuEw_w5ClwjYG==>**REDACTED**
sb_publishable_L6W1eFRdEn3Ai2ah-O5rDg_FVpftZho==>**REDACTED**
hdpwsrvejizvvqwbwsaa.supabase.co==>**REDACTED**
EOF
)

# 强制推送（注意：这会改变所有提交哈希）
git push --force-with-lease origin main
```

**方法 B：使用 BFG Repo-Cleaner**

```bash
# 安装 BFG
brew install bfg  # macOS
# 或从 https://rtyley.github.io/bfg-repo-cleaner/ 下载

# 清理敏感信息
bfg --replace-text <(cat <<'EOF'
sb_secret_kSct-AgkWoTyZARle5wuEw_w5ClwjYG
sb_publishable_L6W1eFRdEn3Ai2ah-O5rDg_FVpftZho
EOF
) .

# 强制推送
git push --force-with-lease origin main
```

**方法 C：仅清理最新提交（简单方式）**

如果只想修复最新提交：

```bash
# 修改最新提交
git commit --amend .env
git push --force-with-lease origin main
```

---

## 🔒 预防措施

### 1. 更新 .gitignore

确保 `.gitignore` 包含：

```
# Environment variables
.env
.env.local
.env.*.local

# Sensitive files
.DS_Store
node_modules/
```

### 2. 使用 Git Hooks 防止泄露

创建 `.git/hooks/pre-commit` 文件：

```bash
#!/bin/bash

# 检查是否有提交包含敏感信息的模式
if git diff --cached | grep -E 'sb_secret_|sk_test_|whsec_'; then
  echo "❌ 检测到敏感信息模式，提交被拒绝"
  exit 1
fi

exit 0
```

使文件可执行：
```bash
chmod +x .git/hooks/pre-commit
```

### 3. 使用 git-secrets

```bash
# 安装
brew install git-secrets

# 初始化
git secrets --install
git secrets --register-aws
git secrets --add 'sb_secret_'
git secrets --add 'sk_test_'

# 扫描现有提交
git secrets --scan-history
```

### 4. 定期审计

```bash
# 查找提交中的敏感模式
git log -p | grep -i "password\|secret\|key\|token"

# 或使用专用工具
git secrets --scan
```

---

## 📋 检查清单

### 立即完成

- [ ] 登录 Supabase 仪表板
- [ ] 撤销所有现有密钥
- [ ] 生成新的密钥
- [ ] 更新本地 .env 文件
- [ ] 测试应用是否仍然工作
- [ ] 提交更改到 Git

### 后续完成

- [ ] 从 Git 历史中清除敏感信息（git-filter-repo 或 BFG）
- [ ] 强制推送到 GitHub
- [ ] 通知团队成员
- [ ] 设置 Git hooks 防止未来泄露
- [ ] 配置 git-secrets

### 可选

- [ ] 检查是否有其他暴露的密钥
- [ ] 审计 GitHub commit history
- [ ] 启用 GitHub Secret scanning

---

## 🔍 验证修复

### 检查 Git 历史中是否还有敏感信息

```bash
# 查找特定密钥
git log -p | grep "sb_secret_"
git log -p | grep "sb_publishable_"

# 搜索通用敏感模式
git log -p | grep -E "secret|password|token|key" | head -20
```

如果没有输出，表示敏感信息已移除 ✅

### 检查当前代码

```bash
# 验证 .env 文件中没有真实密钥
cat .env | grep "your_"

# 验证 ENV_SETUP_GUIDE.md 中没有真实密钥
grep "sb_secret_\|sb_publishable_" ENV_SETUP_GUIDE.md
```

---

## ⚠️ 重要警告

### 已被泄露的密钥

以下密钥已经在 GitHub 公开仓库中可见：

- Supabase Service Role Key: `sb_secret_kSct-AgkWoTyZARle5wuEw_w5ClwjYG`
- Supabase Anon Key: `sb_publishable_L6W1eFRdEn3Ai2ah-O5rDg_FVpftZho`
- Supabase URL: `hdpwsrvejizvvqwbwsaa.supabase.co`

### 可能的风险

⚠️ 任何有 GitHub 访问权限的人都可以看到这些密钥
⚠️ 这些密钥可能已被爬虫或恶意用户复制
⚠️ 需要立即撤销并生成新密钥

---

## 📞 需要帮助？

如果你在修复过程中遇到问题：

1. **Supabase 支持**: https://supabase.com/support
2. **GitHub 文档**: https://docs.github.com/en/code-security/secret-scanning
3. **git-filter-repo**: https://github.com/newren/git-filter-repo
4. **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/

---

## ✅ 完成标志

当你完成所有步骤时，你会看到：

✅ `.env` 文件中没有真实密钥
✅ Git 历史中没有敏感信息
✅ Supabase 中的旧密钥已撤销
✅ 应用使用新密钥正常工作
✅ Git hooks 已设置以防止未来泄露

---

**修复完成日期**: 2025-01-20
**状态**: 🟢 已补救
**下一步**: 定期审计安全性

