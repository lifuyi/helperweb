# Supabase Google 登录集成指南

本文档说明如何在ChinaConnect项目中配置Supabase Google OAuth登录。

## 前置要求

- Supabase 账户（免费注册：https://app.supabase.com）
- Google OAuth 凭证（从Google Cloud Console获取）

## 第一步：创建 Supabase 项目

1. 访问 https://app.supabase.com
2. 点击"New Project"
3. 填写项目名称、数据库密码等信息
4. 选择服务器区域
5. 点击"Create new project"并等待初始化完成

## 第二步：获取 Supabase 凭证

1. 项目创建完成后，进入项目仪表板
2. 在左侧菜单找到"Settings" → "API"
3. 复制以下信息：
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** 密钥 → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** 密钥 → `SUPABASE_SERVICE_ROLE_KEY`

## 第三步：配置 Google OAuth

### 3.1 获取 Google OAuth 凭证

1. 访问 https://console.cloud.google.com
2. 创建新项目或选择现有项目
3. 启用 Google+ API：
   - 在搜索栏中搜索"Google+ API"
   - 点击结果并启用
4. 创建 OAuth 2.0 凭证：
   - 进入"Credentials"部分
   - 点击"Create Credentials" → "OAuth 2.0 Client ID"
   - 选择应用类型为"Web application"
   - 在"Authorized redirect URIs"中添加：
     ```
     https://<your-supabase-project>.supabase.co/auth/v1/callback
     ```
     替换 `<your-supabase-project>` 为你的Supabase项目名
   - 点击"Create"
5. 复制生成的：
   - **Client ID**
   - **Client Secret**

### 3.2 在 Supabase 中配置 Google OAuth

1. 进入 Supabase 项目仪表板
2. 左侧菜单 → "Authentication" → "Providers"
3. 找到"Google"提供商
4. 点击启用（启用开关）
5. 粘贴从Google Cloud Console获取的：
   - **Client ID**
   - **Client Secret**
6. 点击"Save"

## 第四步：更新环境变量

1. 复制 `.env.example` 为 `.env`（如果还没有）
2. 填写以下环境变量：

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

3. 保存文件

## 第五步：安装依赖并启动

```bash
npm install
npm run dev
```

## 第六步：测试 Google 登录

1. 访问应用主页
2. 点击导航栏中的"Sign in with Google"按钮
3. 你会被重定向到Google登录页面
4. 使用你的Google账户登录
5. 授予应用访问权限
6. 你应该会被重定向回应用，并显示登录状态

## 工作流程说明

### 客户端认证流程

1. **用户点击 "Sign in with Google" 按钮**
   - 触发 `signInWithGoogle()` 函数（在 `services/supabaseService.ts` 中）

2. **Supabase 重定向到 Google 登录**
   - 用户在Google登录页面进行身份验证
   - 用户授予应用权限

3. **Google 重定向回服务器**
   - 重定向到 `http://localhost:3000/auth/callback?code=xxx`
   - 服务器通过 `exchangeCodeForSession()` 方法使用授权码交换会话

4. **服务器返回令牌给客户端**
   - 在URL中包含 `access_token` 和 `refresh_token`
   - 重定向到 `/auth/callback` 前端路由

5. **客户端存储令牌**
   - `AuthCallback` 组件接收令牌
   - 将令牌存储到 `localStorage`
   - 重定向回首页

6. **认证状态更新**
   - `AuthContext` 监听认证状态变化
   - 更新应用中的用户信息

### 服务器端认证流程

项目使用服务器端认证（Server-Side Auth）方式，这是Supabase推荐的安全方式：

- **安全性更高**：授权码在服务器端交换，Client Secret不会暴露给客户端
- **适合生产环境**：更适合需要后端API的应用
- **令牌管理**：服务器可以更好地管理会话生命周期

## 重要文件说明

### 前端相关文件

- `services/supabaseService.ts` - Supabase 客户端认证服务
- `contexts/AuthContext.tsx` - React 认证上下文，管理全局认证状态
- `components/GoogleLoginButton.tsx` - Google 登录按钮组件
- `components/AuthCallback.tsx` - OAuth 回调处理组件
- `components/Navbar.tsx` - 导航栏，集成登录按钮

### 后端相关文件

- `server.js` - Express 服务器，包含 `/auth/callback` 路由

## 故障排查

### 问题：重定向URI不匹配

**解决方案**：
- 确保在Google Cloud Console中配置的重定向URI与Supabase中的一致
- 格式应为：`https://<supabase-project>.supabase.co/auth/v1/callback`

### 问题：登录后无法获取用户信息

**解决方案**：
- 检查浏览器控制台是否有错误
- 确认Supabase配置正确
- 检查 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确

### 问题：访问令牌过期

**解决方案**：
- 系统会自动刷新令牌
- 如需手动刷新，可调用 `refreshSession()` 函数

## 安全建议

1. **不要在客户端代码中存储敏感信息**
   - 使用 `VITE_` 前缀的环境变量只会暴露公开的anon key

2. **使用 httpOnly Cookie 存储令牌**（生产环境）
   - 当前实现使用 `localStorage`，这在开发中可以接受
   - 生产环境建议使用httpOnly Cookie以防止XSS攻击

3. **定期轮换客户端密钥**
   - 在Google Cloud Console中定期更新Client Secret

4. **启用CORS保护**
   - Supabase默认启用CORS，确保只允许你的域名

## 更多资源

- [Supabase 社交登录文档](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase 服务器端认证](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Google OAuth 文档](https://developers.google.com/identity/protocols/oauth2)
