# Supabase 认证使用示例

本文档提供了在项目中使用Supabase认证的代码示例。

## 在 React 组件中使用认证

### 1. 基础用法：获取当前用户

```tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const MyComponent: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please sign in to continue</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.displayName}!</h1>
      <p>Email: {user?.email}</p>
      {user?.avatarUrl && (
        <img src={user.avatarUrl} alt="Avatar" />
      )}
    </div>
  );
};
```

### 2. 显示登录按钮

```tsx
import { GoogleLoginButton } from '../components/GoogleLoginButton';

export const LoginPage: React.FC = () => {
  return (
    <div>
      <h1>Sign In</h1>
      <GoogleLoginButton 
        variant="default"
        size="lg"
        showUserInfo={true}
      />
    </div>
  );
};
```

### 3. 手动处理登录/登出

```tsx
import { signInWithGoogle, signOut } from '../services/supabaseService';

export const ManualAuthComponent: React.FC = () => {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleLogin}>Sign In with Google</button>
      <button onClick={handleLogout}>Sign Out</button>
    </div>
  );
};
```

## 服务函数使用

### 获取当前用户

```typescript
import { getCurrentUser } from '../services/supabaseService';

async function fetchUserProfile() {
  try {
    const user = await getCurrentUser();
    if (user) {
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Display Name:', user.displayName);
      console.log('Avatar URL:', user.avatarUrl);
      console.log('Provider:', user.provider); // 'google'
    }
  } catch (error) {
    console.error('Failed to fetch user:', error);
  }
}
```

### 获取访问令牌

```typescript
import { getAccessToken } from '../services/supabaseService';

async function makeAuthenticatedRequest() {
  try {
    const token = await getAccessToken();
    
    const response = await fetch('/api/protected-route', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Request failed:', error);
  }
}
```

### 刷新会话

```typescript
import { refreshSession } from '../services/supabaseService';

async function refreshUserSession() {
  try {
    const session = await refreshSession();
    console.log('Session refreshed:', session);
  } catch (error) {
    console.error('Failed to refresh session:', error);
  }
}
```

## 在 Express 路由中使用认证

### 验证 JWT 令牌

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 中间件：验证 JWT 令牌
async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 将用户信息附加到请求对象
    req.user = data.user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Token verification failed' });
  }
}

// 受保护的路由示例
app.get('/api/user-profile', verifyToken, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    metadata: req.user.user_metadata,
  });
});
```

### 获取用户列表（仅限管理员）

```javascript
async function getAllUsers() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    return data.users;
  } catch (error) {
    console.error('Failed to fetch users:', error);
  }
}
```

## 组件属性（Props）说明

### GoogleLoginButton

```tsx
interface GoogleLoginButtonProps {
  // CSS 类名
  className?: string;
  
  // 按钮样式变体: 'default' | 'outline' | 'minimal'
  variant?: 'default' | 'outline' | 'minimal';
  
  // 按钮大小: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg';
  
  // 是否显示用户信息和头像
  showUserInfo?: boolean;
}

// 使用示例
<GoogleLoginButton 
  className="custom-class"
  variant="outline"
  size="lg"
  showUserInfo={true}
/>
```

## 常见场景

### 场景 1：条件性渲染基于认证状态

```tsx
import { useAuth } from '../contexts/AuthContext';

export const ConditionalComponent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated ? (
        <div>You are signed in</div>
      ) : (
        <div>Please sign in</div>
      )}
    </>
  );
};
```

### 场景 2：在付款时检查认证

```tsx
import { initiateCheckout } from '../services/stripeService';
import { useAuth } from '../contexts/AuthContext';

export const CheckoutComponent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      alert('Please sign in before making a purchase');
      return;
    }

    try {
      await initiateCheckout({
        productId: 'vpn-7days',
      });
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  return (
    <button onClick={handleCheckout}>
      Purchase VPN Access
    </button>
  );
};
```

### 场景 3：在导航时保存用户偏好

```tsx
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

export const PreferenceManager: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // 保存用户偏好到本地存储或数据库
      localStorage.setItem('preferred_language', 'en');
      localStorage.setItem('theme', 'dark');
    }
  }, [user]);

  return null;
};
```

## TypeScript 类型定义

```typescript
// 用户类型
export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  provider?: string;
}

// 认证上下文类型
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

## 最佳实践

### 1. 总是检查 isLoading 状态

```tsx
if (isLoading) {
  return <LoadingSpinner />;
}
```

### 2. 在组件卸载时取消订阅

AuthContext 已经处理了订阅清理，但如果你自己订阅，要记得清理：

```tsx
useEffect(() => {
  const subscription = onAuthStateChange((user) => {
    // 处理用户状态变化
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 3. 使用 try-catch 处理异常

```tsx
try {
  await signInWithGoogle();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Sign in failed:', errorMessage);
  // 显示用户友好的错误消息
}
```

### 4. 在敏感操作前验证令牌

```tsx
const token = await getAccessToken();
if (!token) {
  // 令牌已过期，重定向到登录
  navigate('/login');
}
```

## 调试

### 启用调试日志

```typescript
// 在 supabaseService.ts 中添加日志
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const subscription = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    console.log('Session:', session);
    // ... 处理逻辑
  });
  return subscription;
}
```

### 检查浏览器 Storage

在浏览器开发者工具中：
1. 打开 Application 标签
2. 检查 localStorage 中的 `supabase_access_token` 和 `supabase_refresh_token`
3. 验证令牌内容（可以在 jwt.io 上解码）

## 下一步

- 集成Supabase数据库以存储用户配置文件
- 添加社交登录提供商（GitHub, Microsoft等）
- 实现多因素认证（MFA）
- 添加角色和权限管理
