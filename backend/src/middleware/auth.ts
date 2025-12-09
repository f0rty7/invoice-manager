import { Context, Next } from 'hono';
import { verifyToken, JwtPayload } from '../utils/jwt';

export interface AuthContext {
  user: JwtPayload;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized - No token provided' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    c.set('user', decoded);
    await next();
  } catch (error) {
    return c.json({ success: false, error: 'Unauthorized - Invalid token' }, 401);
  }
}

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get('user') as JwtPayload;
  
  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
}

