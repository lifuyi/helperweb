# 数据库设置完整指南

本指南将帮助你在 Supabase 中设置数据库表和实现用户信息与访问令牌系统。

## 📋 目录

1. [数据库架构](#数据库架构)
2. [Supabase 设置步骤](#supabase-设置步骤)
3. [运行 SQL 脚本](#运行-sql-脚本)
4. [工作流程](#工作流程)
5. [代码集成](#代码集成)
6. [测试](#测试)
7. [常见问题](#常见问题)

---

## 📊 数据库架构

### 4 个主要表

| 表名 | 用途 | 主要字段 |
|------|------|---------|
| `users` | 存储用户信息 | id, email, username, avatar_url, google_id |
| `access_tokens` | 存储访问令牌 | id, user_id, token, product_id, expires_at |
| `user_profiles` | 用户统计数据 | id, user_id, purchase_count, total_spent |
| `purchases` | 购买记录 | id, user_id, product_id, amount, stripe_session_id |

### 关系图

```
users (1) ──── (N) access_tokens
  │
  ├──── (1) user_profiles
  └──── (N) purchases
```

---

## 🚀 Supabase 设置步骤

### 步骤 1: 登录 Supabase

1. 打开 https://app.supabase.com
2. 登录你的账户
3. 选择你的项目

### 步骤 2: 打开 SQL 编辑器

1. 左侧菜单 → **SQL Editor**
2. 点击 **New Query**
3. 复制下面的 SQL 脚本

### 步骤 3: 执行 SQL 脚本

查看文件：`supabase/migrations/create_tables.sql`

完整的 SQL 脚本包括：
- ✅ 创建 users 表
- ✅ 创建 access_tokens 表
- ✅ 创建 user_profiles 表
- ✅ 创建 purchases 表
- ✅ 设置 RLS (行级安全) 策略
- ✅ 创建视图

---

## 📝 运行 SQL 脚本

### 方式 1: 在 Supabase SQL 编辑器中运行（推荐）

1. 打开 https://app.supabase.com
2. 选择项目 → **SQL Editor**
3. 点击 **New Query**
4. 复制文件 `supabase/migrations/create_tables.sql` 的全部内容
5. 粘贴到编辑器
6. 点击 **Run** 执行
7. 检查 **Databases** 标签验证表已创建

### 方式 2: 使用 Supabase CLI（如果已安装）

```bash
# 登录 Supabase
supabase login

# 推送迁移
supabase db push
```

### 验证表已创建

在 Supabase 中：
1. 左侧菜单 → **Databases**
2. 应该看到以下表：
   - ✅ users
   - ✅ access_tokens
   - ✅ user_profiles
   - ✅ purchases

---

## 🔄 工作流程

### 用户登录流程

```
1. 用户点击 "Sign in with Google"
   ↓
2. Google 验证身份
   ↓
3. Supabase 创建认证用户
   ↓
4. AuthContext 调用 saveOrUpdateUser()
   ↓
5. 用户信息保存到 users 表
   ↓
6. 自动创建 user_profiles 记录
```

### 支付流程

```
1. 用户购买产品
   ↓
2. Stripe 处理支付
   ↓
3. Webhook 触发 handlePaymentSuccess()
   ↓
4. 保存 purchases 记录
   ↓
5. 生成 access_token
   ↓
6. 生成访问 URL
   ↓
7. 发送邮件给用户
```

### 用户访问流程

```
1. 用户收到邮件中的访问 URL
   ↓
2. 用户点击链接：/access?token=xxxxx
   ↓
3. AccessPage 组件加载
   ↓
4. 验证令牌有效性
   ↓
5. 显示用户信息和下载链接
```

---

## 💻 代码集成

### 已实现的功能

#### 1. 自动保存用户信息

```typescript
// 文件: contexts/AuthContext.tsx
// 在用户登录时自动调用 saveOrUpdateUser()
await saveOrUpdateUser(
  authUser.id,
  authUser.email,
  authUser.displayName,
  authUser.avatarUrl
);
```

#### 2. 用户服务

```typescript
// 文件: services/userService.ts
// 主要函数：
- saveOrUpdateUser() - 保存/更新用户
- getUser() - 获取用户信息
- createAccessToken() - 创建访问令牌
- verifyAccessToken() - 验证令牌
- getUserByToken() - 通过令牌获取用户
```

#### 3. 支付服务

```typescript
// 文件: services/paymentService.ts
// 主要函数：
- handlePaymentSuccess() - 处理支付成功
- savePurchase() - 保存购买记录
- generateEmailContent() - 生成邮件内容
```

#### 4. 访问页面

```typescript
// 文件: components/AccessPage.tsx
// 显示用户信息和下载链接
// 路由: /access?token=xxxxx
```

---

## 🧪 测试

### 测试本地开发环境

#### 1. 验证用户保存

```bash
npm run dev
# 打开应用并用 Google 登录
# 打开 Supabase → Databases → users
# 应该看到新用户记录
```

#### 2. 验证访问令牌

```typescript
// 在浏览器控制台中运行
import { createAccessToken, generateAccessUrl } from './services/userService';

// 生成测试令牌
const token = await createAccessToken('user-id', 'vpn-7days', 30);
console.log('Token:', token);

// 生成访问 URL
const url = generateAccessUrl(token.token);
console.log('Access URL:', url);
```

#### 3. 测试访问页面

```bash
# 访问生成的 URL
http://localhost:3000/access?token=<token-value>

# 应该看到：
# - 用户头像和名称
# - 购买的产品信息
# - 下载按钮
```

---

## 🔧 生产环境配置

### 邮件发送设置

需要配置邮件服务发送访问链接给用户：

#### 选项 1: 使用 SendGrid

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: user.email,
  from: 'noreply@yourapp.com',
  subject: emailContent.subject,
  html: emailContent.html,
};

await sgMail.send(msg);
```

#### 选项 2: 使用 Resend

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourapp.com',
  to: user.email,
  subject: emailContent.subject,
  html: emailContent.html,
});
```

---

## 📚 API 集成示例

### 在 Stripe Webhook 中使用

```typescript
// 文件: server.js 或 api/payment/notify/stripe/index.ts

import { handlePaymentSuccess } from '../services/paymentService';

app.post('/api/payment/notify/stripe', async (req, res) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // 获取用户 ID 和产品 ID
      const userId = session.metadata.user_id;
      const productId = session.metadata.product_id;
      const amount = session.amount_total / 100;
      
      // 处理支付成功
      const { purchase, accessToken, accessUrl } = await handlePaymentSuccess(
        userId,
        productId,
        amount,
        session.currency,
        session.id
      );
      
      // 发送邮件
      const user = await getUser(userId);
      const emailContent = generateEmailContent(user, productId, accessUrl);
      await sendEmail(user.email, emailContent);
      
      res.json({ received: true });
    } catch (error) {
      console.error('Payment handling error:', error);
      res.status(400).json({ error: 'Payment processing failed' });
    }
  }
});
```

---

## ❓ 常见问题

### Q: 如何修改访问令牌的过期时间？

A: 编辑 `services/paymentService.ts` 中的 `getExpiryDaysForProduct()` 函数：

```typescript
function getExpiryDaysForProduct(productId: string): number {
  const expiryMap: Record<string, number> = {
    'vpn-3days': 3,    // 修改这里
    'vpn-7days': 7,
    'vpn-14days': 14,
    'vpn-30days': 30,
    'payment-guide': 365,
  };
  return expiryMap[productId] || 30;
}
```

### Q: 如何修改下载链接？

A: 编辑 `components/AccessPage.tsx` 中的 `generateDownloadUrl()` 函数：

```typescript
const generateDownloadUrl = (productId: string): string => {
  const downloadLinks: Record<string, string> = {
    'payment-guide': 'https://your-drive-link.com/payment-guide.pdf',
    'vpn-7days': 'https://your-storage.com/vpn-config.zip',
    // 添加你的下载链接
  };
  return downloadLinks[productId] || '';
};
```

### Q: 如何查看所有用户和他们的购买记录？

A: 在 Supabase 中运行这个 SQL 查询：

```sql
SELECT 
  u.id,
  u.email,
  u.username,
  COUNT(DISTINCT p.id) as purchase_count,
  SUM(p.amount) as total_spent,
  MAX(p.created_at) as latest_purchase
FROM users u
LEFT JOIN purchases p ON u.id = p.user_id
GROUP BY u.id, u.email, u.username
ORDER BY latest_purchase DESC;
```

### Q: 令牌过期后能延期吗？

A: 可以，在 `access_tokens` 表中编辑 `expires_at` 字段，或创建一个延期功能：

```typescript
export async function extendTokenExpiry(tokenId: string, additionalDays: number) {
  const { data: token } = await supabase
    .from('access_tokens')
    .select('expires_at')
    .eq('id', tokenId)
    .single();

  const newExpiryDate = new Date(token.expires_at);
  newExpiryDate.setDate(newExpiryDate.getDate() + additionalDays);

  return await supabase
    .from('access_tokens')
    .update({ expires_at: newExpiryDate.toISOString() })
    .eq('id', tokenId);
}
```

---

## 📞 后续步骤

1. ✅ 创建 Supabase 表（本指南）
2. ⏳ 集成邮件服务
3. ⏳ 在 Stripe Webhook 中调用 `handlePaymentSuccess()`
4. ⏳ 自定义下载链接
5. ⏳ 测试完整流程
6. ⏳ 部署到生产环境

---

**创建日期**: 2025-01-20
**状态**: ✅ 就绪
**下一步**: 在 Supabase 中运行 SQL 脚本

