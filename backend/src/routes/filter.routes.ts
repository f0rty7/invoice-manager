import { Hono } from 'hono';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { database } from '../db/connection';
import type { JwtPayload } from '../utils/jwt';
import type { SavedFilter, InvoiceFilters } from '@pdf-invoice/shared';
import { ObjectId } from 'mongodb';

const filterRouter = new Hono<{ Variables: AuthContext }>();

// Get all saved filters for the current user
filterRouter.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    
    const filters = await database.savedFilters
      .find({ user_id: user.userId })
      .sort({ is_default: -1, name: 1 })
      .toArray();

    return c.json({
      success: true,
      data: filters
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch saved filters'
    }, 500);
  }
});

// Get default filter for the current user
filterRouter.get('/default', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    
    const defaultFilter = await database.savedFilters.findOne({
      user_id: user.userId,
      is_default: true
    });

    return c.json({
      success: true,
      data: defaultFilter
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch default filter'
    }, 500);
  }
});

// Create a new saved filter
filterRouter.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const body = await c.req.json();
    
    const { name, filters, is_default } = body as {
      name: string;
      filters: InvoiceFilters;
      is_default?: boolean;
    };

    if (!name || !filters) {
      return c.json({
        success: false,
        error: 'Name and filters are required'
      }, 400);
    }

    const now = new Date();
    const savedFilter: Omit<SavedFilter, '_id'> = {
      user_id: user.userId,
      name,
      filters,
      is_default: is_default || false,
      created_at: now,
      updated_at: now
    };

    // If setting as default, unset other defaults
    if (is_default) {
      await database.savedFilters.updateMany(
        { user_id: user.userId, is_default: true },
        { $set: { is_default: false } }
      );
    }

    const result = await database.savedFilters.insertOne(savedFilter as SavedFilter);

    return c.json({
      success: true,
      data: { ...savedFilter, _id: result.insertedId.toString() }
    }, 201);
  } catch (error: any) {
    if (error.code === 11000) {
      return c.json({
        success: false,
        error: 'A filter with this name already exists'
      }, 409);
    }
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create saved filter'
    }, 500);
  }
});

// Update a saved filter
filterRouter.put('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { name, filters, is_default } = body as {
      name?: string;
      filters?: InvoiceFilters;
      is_default?: boolean;
    };

    const updateData: any = { updated_at: new Date() };
    if (name !== undefined) updateData.name = name;
    if (filters !== undefined) updateData.filters = filters;
    if (is_default !== undefined) updateData.is_default = is_default;

    // If setting as default, unset other defaults
    if (is_default) {
      await database.savedFilters.updateMany(
        { user_id: user.userId, is_default: true, _id: { $ne: new ObjectId(id) } } as any,
        { $set: { is_default: false } }
      );
    }

    const result = await database.savedFilters.findOneAndUpdate(
      { _id: new ObjectId(id), user_id: user.userId } as any,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Filter not found or unauthorized'
      }, 404);
    }

    return c.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return c.json({
        success: false,
        error: 'A filter with this name already exists'
      }, 409);
    }
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update saved filter'
    }, 500);
  }
});

// Delete a saved filter
filterRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const id = c.req.param('id');

    const result = await database.savedFilters.deleteOne({
      _id: new ObjectId(id),
      user_id: user.userId
    } as any);

    if (result.deletedCount === 0) {
      return c.json({
        success: false,
        error: 'Filter not found or unauthorized'
      }, 404);
    }

    return c.json({
      success: true,
      message: 'Filter deleted successfully'
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete saved filter'
    }, 500);
  }
});

// Set a filter as default
filterRouter.post('/:id/default', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JwtPayload;
    const id = c.req.param('id');

    // Unset other defaults
    await database.savedFilters.updateMany(
      { user_id: user.userId, is_default: true },
      { $set: { is_default: false } }
    );

    // Set this one as default
    const result = await database.savedFilters.findOneAndUpdate(
      { _id: new ObjectId(id), user_id: user.userId } as any,
      { $set: { is_default: true, updated_at: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Filter not found or unauthorized'
      }, 404);
    }

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set default filter'
    }, 500);
  }
});

export { filterRouter };
