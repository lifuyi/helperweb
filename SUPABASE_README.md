# 🔐 Supabase Google 登录集成

欢迎！本项目已集成 **Supabase Google OAuth 登录**功能。此文档将帮助你快速上手。

## 📚 文档导航

根据你的需求选择合适的文档：

### 🚀 快速开始（推荐首先阅读）
👉 **[SUPABASE_QUICKSTART.md](./SUPABASE_QUICKSTART.md)** - 5分钟快速集成指南
- 最小化配置步骤
- 快速验证安装
- 常见问题解答

### 🔧 详细设置指南
👉 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - 完整配置步骤
- 创建 Supabase 项目
- 获取凭证
- 配置 Google OAuth
- 故障排查
- 安全建议

### 💻 代码使用示例
👉 **[SUPABASE_USAGE.md](./SUPABASE_USAGE.md)** - React 和 Express 示例
- React 组件示例
- 服务函数调用
- Express 路由保护
- TypeScript 类型
- 最佳实践

### 🏗️ 系统架构和总结
👉 **[SUPABASE_INTEGRATION_SUMMARY.md](./SUPABASE_INTEGRATION_SUMMARY.md)** - 技术细节
- 新增文件清单
- 系统架构图
- 认证流程说明
- 安全特性
- 部署建议

### ✅ 实现检查清单
👉 **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** - 验证和自定义
- 已实现功能列表
- 部署前检查
- 自定义建议
- 故障排查表

### 💡 API 实现示例
👉 **[api/auth-examples.js](./api/auth-examples.js)** - 可复用的 API 代码
- JWT 验证中间件
- 用户管理函数
- 管理员操作示例

## 🎯 首次使用流程

```
1. 阅读本文件了解概况
   ↓
2. 按照 SUPABASE_QUICKSTART.md 快速配置
   ↓
3. 在 npm run dev 中测试
   ↓
4. 查看 SUPABASE_USAGE.md 学习如何使用
   ↓
5. 参考 IMPLEMENTATION_CHECKLIST.md 进行自定义
```

## 🌟 核心功能

### ✨ 已实现的功能

- ✅ **Google OAuth 登录** - 用户可通过 Google 账户登录
- ✅ **服务器端认证** - 安全的授权码交换流程
- ✅ **会话管理** - 自动令牌刷新和过期处理
- ✅ **用户信息** - 显示用户名、邮箱和头像
- ✅ **认证状态管理** - 全局 React Context
- ✅ **API 保护** - 后端路由 JWT 验证示例
- ✅ **响应式设计** - 桌面和移动端支持

### 🏗️ 核心组件

| 文件 | 功能 | 用途 |
|------|------|------|
| `services/supabaseService.ts` | Supabase 客户端 | 处理所有认证逻辑 |
| `contexts/AuthContext.tsx` | 认证上下文 | 全局状态管理 |
| `components/GoogleLoginButton.tsx` | 登录按钮 | UI 组件 |
| `components/AuthCallback.tsx` | OAuth 回调 | 处理重定向 |
| `server.js` | 后端服务 | OAuth 回调端点 |

## ⚡ 快速命令

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 生产构建
npm run build

# 启动服务器
npm run server
```

## 🔑 环境变量

需要在 `.env` 文件中配置：

```env
# Supabase（必需）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 其他配置（可选）
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
GEMINI_API_KEY=your_key
```

参考 `.env.example` 获取完整列表。

## 🚀 5 分钟快速开始

### 1. 创建 Supabase 项目

访问 https://app.supabase.com 创建免费账户和项目。

### 2. 获取凭证

在项目 **Settings → API** 中获取：
- Project URL
- Anon Key
- Service Role Key

### 3. 配置 Google OAuth

在 Google Cloud Console 创建 OAuth 2.0 应用，获取 Client ID 和 Secret。

在 Supabase **Authentication → Providers** 中启用 Google，输入凭证。

### 4. 设置环境变量

创建 `.env` 文件：
```bash
cp .env.example .env
# 编辑 .env 并填入凭证
```

### 5. 启动应用

```bash
npm install
npm run dev
```

访问 http://localhost:3000 测试 Google 登录！

## 📖 学习路径

### 初级（了解基础）
1. 阅读本文件
2. 查看 SUPABASE_QUICKSTART.md
3. 在应用中测试登录

### 中级（开始使用）
1. 阅读 SUPABASE_SETUP.md 完整配置
2. 学习 SUPABASE_USAGE.md 中的示例
3. 在自己的组件中集成 useAuth Hook

### 高级（自定义和扩展）
1. 查看 SUPABASE_INTEGRATION_SUMMARY.md 理解架构
2. 研究 api/auth-examples.js 实现 API 保护
3. 按照 IMPLEMENTATION_CHECKLIST.md 进行自定义

## 🔍 常见任务

### 在组件中获取用户信息

```tsx
import { useAuth } from '../contexts/AuthContext';

export const MyComponent = () => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }
  
  return <div>Welcome {user?.displayName}!</div>;
};
```

### 保护 API 路由

```javascript
import { verifyToken } from './api/auth-examples.js';

app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ user: req.user });
});
```

### 自定义登录按钮

```tsx
<GoogleLoginButton 
  variant="outline"
  size="lg"
  showUserInfo={true}
  className="custom-class"
/>
```

## 🧪 测试清单

- [ ] 应用启动无错误
- [ ] 导航栏显示登录按钮
- [ ] 点击按钮重定向到 Google
- [ ] Google 登录成功
- [ ] 返回应用后显示用户信息
- [ ] 登出功能正常
- [ ] 页面刷新后状态保持

## 🆘 遇到问题？

### 常见错误和解决方案

**"Supabase not configured"**
- ✅ 检查 .env 文件是否存在
- ✅ 确认环境变量正确
- ✅ 重启开发服务器

**登录无响应**
- ✅ 检查浏览器控制台错误
- ✅ 验证 Supabase 凭证
- ✅ 检查网络连接

**重定向 URI 不匹配**
- ✅ 在 Google Console 检查配置
- ✅ 确保 URI 格式正确
- ✅ 在 Supabase 中验证设置

更多问题请参考 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 中的故障排查部分。

## 📞 文档速查

| 需求 | 文档 | 原因 |
|------|------|------|
| 快速配置 | QUICKSTART | 最小化步骤 |
| 完整配置 | SETUP | 详细说明 |
| 代码示例 | USAGE | 学习如何使用 |
| 架构理解 | SUMMARY | 系统设计 |
| 部署检查 | CHECKLIST | 上线前验证 |
| API 实现 | auth-examples.js | 代码参考 |

## 🎓 相关资源

- 📘 [Supabase 官方文档](https://supabase.com/docs)
- 📘 [Google OAuth 文档](https://developers.google.com/identity/protocols/oauth2)
- 📘 [React Context 指南](https://react.dev/reference/react/useContext)
- 📘 [JWT 令牌](https://jwt.io)

## 🔒 安全建议

✅ **已实现**
- 服务器端认证
- JWT 验证
- CORS 保护
- 会话隔离

💡 **建议改进**
- 使用 httpOnly Cookie
- 实现 MFA
- 添加审计日志
- 定期轮换密钥

## 🎉 现在就开始吧！

```bash
# 1. 复制环境配置
cp .env.example .env

# 2. 编辑 .env 文件，填入凭证

# 3. 安装依赖
npm install

# 4. 启动应用
npm run dev

# 5. 打开浏览器
# 访问 http://localhost:3000
# 点击 "Sign in with Google" 测试！
```

## 📋 项目结构

```
project/
├── services/
│   └── supabaseService.ts       ← 认证服务
├── contexts/
│   └── AuthContext.tsx          ← 状态管理
├── components/
│   ├── GoogleLoginButton.tsx    ← 登录按钮
│   ├── AuthCallback.tsx         ← OAuth 回调
│   └── Navbar.tsx               ← 导航栏（已集成）
├── api/
│   └── auth-examples.js         ← API 示例
├── server.js                     ← 后端（已更新）
├── .env.example                  ← 环境变量模板
├── SUPABASE_QUICKSTART.md        ← 快速开始
├── SUPABASE_SETUP.md             ← 完整设置
├── SUPABASE_USAGE.md             ← 使用示例
├── SUPABASE_INTEGRATION_SUMMARY.md ← 总结
└── IMPLEMENTATION_CHECKLIST.md   ← 检查清单
```

## ✨ 下一步

1. ✅ 按照 SUPABASE_QUICKSTART.md 完成基本配置
2. 📖 阅读 SUPABASE_USAGE.md 学习更多用法
3. 🔧 参考 IMPLEMENTATION_CHECKLIST.md 进行自定义
4. 🚀 准备好时参考部署建议上线

---

**版本**: 1.0.0
**更新日期**: 2025-01-20
**维护者**: Rovo Dev
**状态**: 🟢 生产就绪

有任何问题或建议，请参考相关文档或查看浏览器控制台的错误信息。

祝你使用愉快！🎉
