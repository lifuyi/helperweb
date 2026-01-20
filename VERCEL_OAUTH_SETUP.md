# Vercel 部署 OAuth 配置指南

解决 Vercel 部署中 OAuth 回调仍然指向 localhost 的问题。

## 🔑 关键步骤

### 第一步：在 Supabase 中配置重定向 URI

1. 打开 https://app.supabase.com
2. 选择你的项目
3. 进入 **Authentication → URL Configuration**
4. 在 **Redirect URLs** 部分添加：

```
# 本地开发
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback

# Vercel 生产环境
https://your-vercel-domain.vercel.app/auth/callback

# 自定义域名（如果有）
https://your-custom-domain.com/auth/callback
```

5. 点击 **Save**

### 第二步：验证 Google OAuth 配置

1. 进入 **Authentication → Providers**
2. 点击 **Google**
3. 确认已启用（toggle 打开）
4. 检查 **Client ID** 和 **Client Secret** 正确
5. 点击 **Save**

### 第三步：代码已自动处理

文件 `services/supabaseService.ts` 已更新以使用 `window.location.origin`，这会自动：
- ✅ 在本地使用 `http://localhost:3000`
- ✅ 在 Vercel 使用你的实际域名
- ✅ 在其他部署使用相应的域名

## 🧪 测试

### 本地测试
```bash
npm run dev
# 访问 http://localhost:3000
# 点击 "Sign in with Google"
# 应该重定向到你的本地 URL
```

### Vercel 部署测试
1. 部署到 Vercel
2. 访问你的 Vercel 域名
3. 点击 "Sign in with Google"
4. 应该重定向到 Vercel 域名，而不是 localhost

## 📋 Vercel 环境变量

确保在 Vercel 项目中配置了这些环境变量：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**步骤**:
1. 进入 Vercel 项目 → **Settings**
2. 找到 **Environment Variables**
3. 添加上面的变量
4. 重新部署

## 🔍 常见问题

### Q: 仍然看到 localhost 在回调 URL 中
A: 
1. 清除浏览器缓存和 localStorage
2. 检查 Supabase 中是否添加了正确的重定向 URI
3. 确保 Vercel 环境变量正确配置
4. 重新部署到 Vercel

### Q: Google OAuth 返回错误
A:
1. 检查 Google Cloud Console 中的 OAuth 2.0 客户端配置
2. 确认 **Authorized redirect URIs** 包含你的 Supabase 回调 URL
3. 在 Google Cloud 中更新 Client ID 和 Secret
4. 在 Supabase 中更新 Google 提供商凭证

### Q: 部署后登录不工作
A:
1. 检查 Vercel 日志查看错误
2. 验证环境变量已正确设置
3. 检查浏览器控制台中的错误信息
4. 确保 Supabase 重定向 URI 包含你的 Vercel 域名

## 📝 URL 配置示例

假设你的 Vercel 域名是 `https://myapp.vercel.app`：

### Supabase 重定向 URI
```
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback
https://myapp.vercel.app/auth/callback
```

### Google Cloud Console
**Authorized redirect URIs** 应包含：
```
https://your-project.supabase.co/auth/v1/callback
```

### 代码中（自动处理）
```typescript
// services/supabaseService.ts 中自动使用
window.location.origin + '/auth/callback'
// 本地：http://localhost:3000/auth/callback
// Vercel：https://myapp.vercel.app/auth/callback
```

## ✅ 验证清单

部署到 Vercel 前：

- [ ] Supabase 重定向 URI 已添加 Vercel 域名
- [ ] Google OAuth 凭证正确配置
- [ ] 环境变量已在 Vercel 中设置
- [ ] 本地测试成功
- [ ] 代码已推送到 GitHub

部署后：

- [ ] 访问 Vercel 域名
- [ ] Google 登录重定向到 Vercel 域名（不是 localhost）
- [ ] 用户信息已保存到 Supabase
- [ ] 没有错误在浏览器控制台

## 🚀 部署流程

```
1. 更新代码 ✓（已完成）
   ↓
2. 推送到 GitHub
   ↓
3. Vercel 自动部署
   ↓
4. 验证环境变量
   ↓
5. 测试 Google 登录
   ↓
6. 验证回调 URL 正确
```

---

**重要**：确保 Supabase 中的重定向 URI 与你的实际部署域名匹配！

