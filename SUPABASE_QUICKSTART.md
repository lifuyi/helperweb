# Supabase Google 登录 - 快速开始指南

只需 5 分钟快速集成 Supabase Google 登录！

## 🚀 快速步骤

### 1️⃣ 安装依赖（已完成）

```bash
npm install
```

依赖项已添加到 `package.json` 中：
- `@supabase/supabase-js`: Supabase JavaScript SDK

### 2️⃣ 创建 Supabase 项目

访问 https://app.supabase.com 并创建新项目

### 3️⃣ 获取凭证

在 Supabase 项目的 **Settings → API** 中复制：
- Project URL
- Anon public key
- Service role key

### 4️⃣ 配置 Google OAuth

#### 4a. 创建 Google 凭证

1. 访问 https://console.cloud.google.com
2. 创建新项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 Client ID (Web application)
5. 添加授权重定向 URI：
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   ```

#### 4b. 在 Supabase 中配置

1. 进入 Supabase 项目
2. 点击 **Authentication → Providers**
3. 启用 Google
4. 粘贴 Google Client ID 和 Client Secret
5. 保存

### 5️⃣ 设置环境变量

创建或编辑 `.env` 文件：

```bash
# 从 Supabase 获取
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 其他配置（如果需要）
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
GEMINI_API_KEY=your_gemini_key
```

### 6️⃣ 启动应用

```bash
npm run dev
```

访问 http://localhost:3000 并测试 Google 登录！

## ✅ 验证安装

在浏览器中检查：

1. ✨ 导航栏中出现 "Sign in with Google" 按钮
2. 🖱️ 点击按钮，重定向到 Google 登录
3. 📱 使用 Google 账户登录
4. ✅ 授予权限后回到应用
5. 👤 看到用户信息和 "Sign out" 按钮

## 🎯 已集成的文件

### 前端（客户端）
- ✅ `services/supabaseService.ts` - Supabase 认证服务
- ✅ `contexts/AuthContext.tsx` - 认证状态管理
- ✅ `components/GoogleLoginButton.tsx` - 登录按钮
- ✅ `components/AuthCallback.tsx` - OAuth 回调处理
- ✅ `components/Navbar.tsx` - 集成登录按钮

### 后端（服务器）
- ✅ `server.js` - 添加了 `/auth/callback` 路由

### 配置
- ✅ `package.json` - 添加了 @supabase/supabase-js
- ✅ `.env.example` - 添加了 Supabase 环境变量
- ✅ `vite.config.ts` - 配置了环境变量加载

## 📚 文档

详细文档请参考：
- **设置指南**: `SUPABASE_SETUP.md` - 详细的配置步骤
- **使用示例**: `SUPABASE_USAGE.md` - 代码示例和最佳实践
- **API 集成**: `api/auth-examples.js` - 后端 API 保护示例

## 🔄 认证流程

```
用户点击 "Sign in with Google"
           ↓
浏览器重定向到 Google 登录页
           ↓
用户授予权限
           ↓
Google 重定向到 /auth/callback?code=xxx
           ↓
服务器交换授权码获取会话
           ↓
服务器返回令牌给客户端
           ↓
客户端存储令牌
           ↓
应用显示用户信息
```

## 🛠️ 常见任务

### 添加到受保护的页面

```tsx
import { useAuth } from '../contexts/AuthContext';

export const ProtectedPage = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }

  return <div>Welcome {user?.displayName}!</div>;
};
```

### 检查用户状态

```tsx
const { user, isLoading, isAuthenticated } = useAuth();

if (isLoading) return <div>Loading...</div>;
if (isAuthenticated) return <div>Logged in as {user?.email}</div>;
return <div>Not logged in</div>;
```

### 手动登录

```tsx
import { signInWithGoogle } from '../services/supabaseService';

const handleLogin = async () => {
  try {
    await signInWithGoogle();
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 保护 API 路由

```javascript
// 在 server.js 中
import { verifyToken } from './api/auth-examples.js';

app.get('/api/protected', verifyToken, (req, res) => {
  res.json({
    message: `Hello ${req.user.email}!`,
    userId: req.user.id,
  });
});
```

## ⚠️ 常见问题

### Q: 登录后没有重定向回应用
A: 检查 Supabase 项目设置中的重定向 URI 是否正确

### Q: "Supabase not configured" 错误
A: 确保 `.env` 文件中的环境变量正确

### Q: 令牌过期了怎么办
A: 系统会自动刷新，或调用 `refreshSession()`

### Q: 如何添加其他 OAuth 提供商
A: 在 Supabase Authentication → Providers 中启用即可

## 🔒 安全建议

1. ❌ 不要提交 `.env` 文件到 git
2. ❌ 不要在代码中硬编码密钥
3. ✅ 使用环境变量
4. ✅ 定期轮换 Client Secret
5. ✅ 在生产环境使用 HTTPS

## 📦 下一步

- [ ] 在 Supabase 中创建用户配置文件表
- [ ] 添加用户头像上传功能
- [ ] 集成支付功能时检查认证
- [ ] 添加社交分享功能
- [ ] 实现多因素认证 (MFA)

## 🆘 需要帮助？

- 📖 查看详细文档: `SUPABASE_SETUP.md`
- 💻 查看代码示例: `SUPABASE_USAGE.md`
- 🔗 官方文档: https://supabase.com/docs
- 💬 GitHub Issues: 在项目中提问

## ✨ 现在就试试吧！

```bash
npm run dev
```

然后在浏览器中访问 http://localhost:3000

祝你使用愉快！🎉
