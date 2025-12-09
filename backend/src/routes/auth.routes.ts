import { Hono } from 'hono';
import { authService } from '../services/auth.service';
import { z } from 'zod';

const authRouter = new Hono();

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email().optional(),
});

authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const data = registerSchema.parse(body);
    
    const result = await authService.register(data);
    
    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      400
    );
  }
});

authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const data = loginSchema.parse(body);
    
    const result = await authService.login(data);
    
    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      },
      401
    );
  }
});

export { authRouter };

