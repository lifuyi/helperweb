/**
 * Supabase 认证 API 集成示例
 * 这个文件展示如何在 Express 中使用 Supabase 认证保护 API 路由
 */

import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 管理员客户端
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

/**
 * 中间件：验证 JWT Bearer 令牌
 * 
 * 用法：
 * app.get('/api/protected', verifyToken, (req, res) => {
 *   // req.user 包含经过验证的用户信息
 * });
 */
export async function verifyToken(req, res, next) {
  try {
    // 从 Authorization 头中提取 Bearer 令牌
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid Authorization header',
        message: 'Expected: Authorization: Bearer <token>'
      });
    }

    const token = authHeader.slice(7); // 移除 'Bearer ' 前缀

    // 使用 Supabase 验证令牌
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        details: error?.message
      });
    }

    // 将用户信息附加到请求对象供后续使用
    req.user = {
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata,
      provider: data.user.app_metadata?.provider,
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ 
      error: 'Token verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * 中间件：验证用户是否是特定的 Google 用户
 * 用于确保只有特定提供商的用户可以访问某些路由
 */
export async function requireGoogleAuth(req, res, next) {
  if (!req.user || req.user.provider !== 'google') {
    return res.status(403).json({ 
      error: 'This route requires Google authentication',
      message: 'Please sign in with Google'
    });
  }
  next();
}

/**
 * 示例：获取当前用户的个人资料
 * 
 * 路由：GET /api/user/profile
 * 需要认证：是
 */
export function getUserProfile(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      provider: req.user.provider,
      metadata: req.user.metadata,
      createdAt: new Date().toISOString(),
    }
  });
}

/**
 * 示例：更新用户个人资料
 * 
 * 路由：PUT /api/user/profile
 * 需要认证：是
 * Body: { displayName?: string, avatar?: string }
 */
export async function updateUserProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { displayName, avatar } = req.body;

    // 使用 service role 密钥更新用户元数据
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      {
        user_metadata: {
          display_name: displayName,
          avatar_url: avatar,
        },
      }
    );

    if (error) {
      return res.status(400).json({ 
        error: 'Failed to update profile',
        details: error.message 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: data.user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * 示例：删除用户账户
 * 
 * 路由：DELETE /api/user/account
 * 需要认证：是
 * 警告：此操作不可逆！
 */
export async function deleteUserAccount(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // 确认用户意愿（可选的双重确认）
    const { confirmDelete } = req.body;
    if (confirmDelete !== true) {
      return res.status(400).json({ 
        error: 'Account deletion not confirmed',
        message: 'Send { confirmDelete: true } to confirm'
      });
    }

    // 使用 service role 密钥删除用户
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);

    if (error) {
      return res.status(400).json({ 
        error: 'Failed to delete account',
        details: error.message 
      });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      error: 'Failed to delete account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * 示例：列出所有用户（仅管理员）
 * 
 * 路由：GET /api/admin/users
 * 需要认证：是（仅限管理员用户）
 */
export async function listAllUsers(req, res) {
  try {
    // 检查用户是否是管理员
    // 你可以在 user_metadata 或 app_metadata 中添加 is_admin 标志
    if (req.user?.metadata?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Only admins can access this endpoint'
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return res.status(400).json({ 
        error: 'Failed to list users',
        details: error.message 
      });
    }

    res.json({
      success: true,
      total: data.users.length,
      users: data.users.map(user => ({
        id: user.id,
        email: user.email,
        provider: user.app_metadata?.provider,
        createdAt: user.created_at,
      }))
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ 
      error: 'Failed to list users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * 示例：生成可重用的邀请链接
 * 
 * 路由：POST /api/admin/invite
 * 需要认证：是（仅限管理员用户）
 * Body: { email: string }
 */
export async function generateInviteLink(req, res) {
  try {
    if (req.user?.metadata?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Only admins can generate invites'
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Missing email',
        message: 'Please provide an email address'
      });
    }

    // 生成邀请链接
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${req.headers.origin || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (error) {
      return res.status(400).json({ 
        error: 'Failed to generate invite',
        details: error.message 
      });
    }

    res.json({
      success: true,
      email: email,
      link: data.properties?.action_link,
      expiresIn: '24 hours',
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ 
      error: 'Failed to generate invite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * 示例：记录用户活动
 * 这可以用于审计日志
 */
export async function logUserActivity(userId, action, details = {}) {
  try {
    // 这里可以将日志保存到数据库
    console.log(`[${new Date().toISOString()}] User ${userId} performed: ${action}`, details);
    
    // 可选：保存到 Supabase 数据库
    // await supabaseAdmin.from('activity_logs').insert({
    //   user_id: userId,
    //   action: action,
    //   details: details,
    //   created_at: new Date().toISOString(),
    // });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * 在 server.js 中的使用示例：
 * 
 * import { 
 *   verifyToken, 
 *   requireGoogleAuth,
 *   getUserProfile,
 *   updateUserProfile,
 *   deleteUserAccount,
 *   listAllUsers,
 *   generateInviteLink,
 * } from './api/auth-examples.js';
 * 
 * // 受保护的路由
 * app.get('/api/user/profile', verifyToken, getUserProfile);
 * app.put('/api/user/profile', verifyToken, updateUserProfile);
 * app.delete('/api/user/account', verifyToken, deleteUserAccount);
 * 
 * // 仅限 Google 用户
 * app.get('/api/google-only', verifyToken, requireGoogleAuth, (req, res) => {
 *   res.json({ message: 'Welcome Google user!' });
 * });
 * 
 * // 管理员路由
 * app.get('/api/admin/users', verifyToken, listAllUsers);
 * app.post('/api/admin/invite', verifyToken, generateInviteLink);
 */
