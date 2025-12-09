import { Context, Next } from 'hono';
import { ZodError } from 'zod';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);

    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        400
      );
    }

    if (error instanceof Error) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500
      );
    }

    return c.json(
      {
        success: false,
        error: 'Internal server error',
      },
      500
    );
  }
}

