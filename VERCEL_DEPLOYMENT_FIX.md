# Vercel 部署 OAuth 回调修复

## 问题描述

部署到 Vercel 后，OAuth 回调 URL 中出现 `localhost:3000` 而不是正确的 Vercel 域名。

原因：Supabase OAuth 默认返回 URL fragment（`#`）中的令牌，而不是 query params（`?`）。

## 已解决的问题

### 1. AuthCallback 组件更新
**文件**: `components/AuthCallback.tsx`

- ✅ 现在支持从 URL fragment 中提取令牌（`#access_token=...`）
- ✅ 支持从 query params 中提取令牌（`?access_token=...`）
- ✅ 清除 URL 中的敏感信息（防止令牌泄露）

### 2. 令牌持久化修复
**文件**: `services/supabaseService.ts`

- ✅ `onAuthStateChange` 现在从 localStorage 恢复令牌
- ✅ 页面刷新后自动恢复登录状态
- ✅ 令牌过期时自动清理

### 3. 重定向 URL 改进
**文件**: `services/supabaseService.ts`

- ✅ 使用 `window.location.origin` 确保使用正确的域名
- ✅ 在本地和 Vercel 部署中都能正常工作

## 现在的工作流程

```
1. 用户点击 "Sign in with Google"
   ↓
2. Supabase 重定向到 Google 登录
   ↓
3. Google 返回授权码到 /auth/callback
   ↓
4. AuthCallback 组件从 URL 中提取令牌
   ↓
5. 令牌存储到 localStorage
   ↓
6. URL 中的敏感信息被清除
   ↓
7. 重定向回首页 (/)
   ↓
8. onAuthStateChange 检测到令牌
   ↓
9. 用户信息显示在 UI 中
```

## 测试步骤

### 本地测试
```bash
npm run dev
# 访问 http://localhost:3000
# 点击 "Sign in with Google"
# 应该看到用户信息显示
```

### Vercel 部署测试
1. 推送代码到 GitHub
2. Vercel 自动部署
3. 访问你的 Vercel 域名
4. 点击 "Sign in with Google"
5. 应该正确重定向并显示用户信息

## 重要配置

### Supabase 中配置重定向 URI

确保在 Supabase 项目的 **Authentication → URL Configuration** 中添加:

```
# 本地开发
http://localhost:3000/auth/callback

# Vercel 生产
https://your-vercel-domain.vercel.app/auth/callback
```

### 验证部署

部署后，检查以下几点：

- [ ] 登录后 URL 不再包含 `localhost:3000`
- [ ] 用户信息正确显示
- [ ] 页面刷新后仍然保持登录状态
- [ ] 浏览器控制台没有错误

## 常见问题

### Q: 登录后仍然显示登录按钮？
A: 清除 localStorage 和浏览器缓存，然后重新尝试登录

### Q: 页面刷新后登录状态丢失？
A: 确保 localStorage 中的令牌没有被清除，检查浏览器的隐私设置

### Q: 仍然看到 localhost:3000 在 URL 中？
A: 
1. 清除浏览器缓存
2. 在 Supabase 中重新检查重定向 URI 配置
3. 重新部署到 Vercel

## 文件改动总结

```
components/AuthCallback.tsx
  + 支持从 URL fragment 提取令牌
  + 清除敏感信息

services/supabaseService.ts
  + 从 localStorage 恢复令牌
  + 改进重定向 URL 处理
```

## 相关文档

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [完整设置指南](./SUPABASE_SETUP.md)

---

**修复完成日期**: 2025-01-20
**修复内容**: 解决 Vercel 部署中的 OAuth 回调问题
**状态**: ✅ 已修复并测试
