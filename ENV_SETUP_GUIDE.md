# .env 文件配置指南

本指南将帮助你获取并填入所有必需的环境变量。

## 🎯 快速导航

- [Supabase 变量](#supabase-变量获取)
- [Stripe 变量](#stripe-变量获取)
- [Gemini 变量](#gemini-变量获取)
- [验证配置](#验证配置)

---

## 📝 Supabase 变量获取

### 1️⃣ 创建 Supabase 项目（如果还没有）

1. 访问 https://app.supabase.com
2. 点击 **New Project** 或使用现有项目
3. 等待项目初始化完成

### 2️⃣ 获取 `VITE_SUPABASE_URL`

1. 进入你的 Supabase 项目
2. 点击左侧 **Settings** → **API**
3. 在 **Project Details** 部分找到 **Project URL**
4. 复制 URL（格式：`https://xxx.supabase.co`）
5. 粘贴到 `.env` 文件中的 `VITE_SUPABASE_URL`

**示例：**
```
VITE_SUPABASE_URL=https://abc123def456.supabase.co
```

### 3️⃣ 获取 `VITE_SUPABASE_ANON_KEY`

1. 同样在 **Settings → API** 页面
2. 在 **Project API keys** 部分找到 **anon public**
3. 点击复制按钮（或直接选中复制）
4. 粘贴到 `.env` 文件中的 `VITE_SUPABASE_ANON_KEY`

**注意：** 这个密钥是公开的，可以暴露在前端代码中

**示例：**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyM2RlZjQ1NiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc0MDAwMDAwLCJleHAiOjE5OTk5OTk5OTl9.xxx
```

### 4️⃣ 获取 `SUPABASE_SERVICE_ROLE_KEY`

1. 同样在 **Settings → API** 页面
2. 在 **Project API keys** 部分找到 **service_role secret**
3. 点击复制按钮
4. 粘贴到 `.env` 文件中的 `SUPABASE_SERVICE_ROLE_KEY`

**⚠️ 重要安全警告：**
- 这个密钥是**保密的**，绝不要暴露在前端代码中
- 不要提交到 Git（`.gitignore` 已包含 `.env`）
- 仅在服务器端代码（`server.js`）中使用

**示例：**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyM2RlZjQ1NiIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NzQwMDAwMDAsImV4cCI6MTk5OTk5OTk5OX0.yyy
```

---

## 💳 Stripe 变量获取

### 1️⃣ 访问 Stripe 仪表板

访问 https://dashboard.stripe.com/apikeys

### 2️⃣ 获取 `VITE_STRIPE_PUBLISHABLE_KEY`

1. 在 API Keys 页面
2. 在 **Publishable key** 部分找到你的密钥
3. 复制 Publishable Key（通常以 `pk_` 开头，然后是 `test_` 或 `live_`）
4. 粘贴到 `.env` 文件

**注意：** 这个密钥是公开的，可以暴露在前端代码中

**示例：**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghijklmnopqrstuvwxyz
```

### 3️⃣ 获取 `STRIPE_SECRET_KEY`

1. 同样在 API Keys 页面
2. 在 **Secret key** 部分找到你的密钥
3. 复制 Secret Key（通常以 `sk_` 开头）
4. 粘贴到 `.env` 文件

**⚠️ 重要安全警告：**
- 这个密钥是**保密的**
- 仅用于服务器端代码
- 不要暴露在前端

**示例：**
```
STRIPE_SECRET_KEY=sk_test_xxx_your_actual_key_here
```

### 4️⃣ 获取 `STRIPE_WEBHOOK_SECRET`

1. 在 Stripe 仪表板中进入 **Developers → Webhooks**
2. 找到你用于接收事件的 Webhook 端点
3. 点击该端点查看详情
4. 在 **Signing secret** 部分，点击 **Reveal** 显示密钥
5. 复制并粘贴到 `.env` 文件

**示例：**
```
STRIPE_WEBHOOK_SECRET=whsec_xxx_your_actual_key_here
```

---

## 🤖 Gemini 变量获取

### 1️⃣ 访问 Google AI Studio

访问 https://aistudio.google.com/app/apikey

### 2️⃣ 创建或获取 API 密钥

1. 点击 **Create API key** 或选择现有密钥
2. 复制生成的 API 密钥
3. 粘贴到 `.env` 文件中的 `GEMINI_API_KEY`

**示例：**
```
GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvwxyz
```

---

## ✅ 验证配置

### 检查清单

完成以下步骤验证你的 `.env` 文件：

- [ ] `VITE_SUPABASE_URL` 已填入（格式：https://xxx.supabase.co）
- [ ] `VITE_SUPABASE_ANON_KEY` 已填入（以 `eyJ` 开头的长字符串）
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 已填入（以 `eyJ` 开头的长字符串）
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` 已填入（以 `pk_` 开头）
- [ ] `STRIPE_SECRET_KEY` 已填入（以 `sk_` 开头）
- [ ] `STRIPE_WEBHOOK_SECRET` 已填入（以 `whsec_` 开头）
- [ ] `GEMINI_API_KEY` 已填入（以 `AIza` 开头）

### 本地测试

```bash
# 1. 确保 .env 文件在项目根目录
ls -la .env

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 检查浏览器控制台是否有错误
# 访问 http://localhost:3000
```

---

## 📋 .env 文件模板

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_key_here

# Gemini
GEMINI_API_KEY=your_gemini_key_here
```

---

## 🔒 安全最佳实践

### ✅ 该做的事

- ✅ 在 `.env` 文件中填入凭证（仅本地）
- ✅ 将 `.env` 添加到 `.gitignore`（已默认包含）
- ✅ 在 Vercel/部署平台使用环境变量功能
- ✅ 定期轮换密钥
- ✅ 使用不同的开发和生产密钥

### ❌ 不该做的事

- ❌ 不要在代码中硬编码密钥
- ❌ 不要在 Git 中提交 `.env` 文件
- ❌ 不要在客户端暴露 `service_role_key`
- ❌ 不要与他人分享 `.env` 文件
- ❌ 不要在版本控制中保存敏感信息

---

## 🚀 部署到 Vercel

### 步骤 1：准备环境变量

收集以下信息：
- Supabase 凭证（3 个）
- Stripe 凭证（3 个）
- Gemini API 密钥（1 个）

### 步骤 2：在 Vercel 中配置

1. 进入你的 Vercel 项目
2. 点击 **Settings → Environment Variables**
3. 添加以下变量：

```
VITE_SUPABASE_URL = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_...
STRIPE_SECRET_KEY = sk_test_...
STRIPE_WEBHOOK_SECRET = whsec_...
GEMINI_API_KEY = AIza...
```

4. 点击 **Save**

### 步骤 3：重新部署

1. 进入 **Deployments**
2. 点击最新部署的三个点 **...**
3. 选择 **Redeploy**

---

## 🆘 故障排查

### 问题：应用启动失败，提示 "Supabase not configured"

**解决方案：**
- 检查 `.env` 文件是否存在
- 确认所有必需的变量已填入
- 验证 `VITE_SUPABASE_URL` 格式正确
- 重启开发服务器：`npm run dev`

### 问题：Stripe 支付不工作

**解决方案：**
- 验证 `STRIPE_SECRET_KEY` 已填入
- 确认使用的是 test keys（用于开发）或 live keys（用于生产）
- 检查 Webhook 配置

### 问题：Google 登录失败

**解决方案：**
- 验证 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
- 检查 Supabase 中是否启用了 Google OAuth
- 确认 Google 凭证已正确配置

---

## 📞 需要帮助？

- 查看 Supabase 文档：https://supabase.com/docs
- 查看 Stripe 文档：https://stripe.com/docs
- 查看 Gemini 文档：https://ai.google.dev
- 查看项目文档：查看 `SUPABASE_SETUP.md`

---

**现在你已准备好开始开发了！** 🎉

运行 `npm run dev` 启动你的应用。
