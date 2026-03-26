import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Verify JWT token and attach user to request.
 */
export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('user_id, gym_id, email, role, full_name, phone, profile_photo, is_active')
      .eq('user_id', decoded.userId)
      .single();

    if (error || !user) {
      throw ApiError.unauthorized('User not found');
    }

    if (!user.is_active) {
      throw ApiError.forbidden('Account is deactivated');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
    } else if (err.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid token'));
    } else if (err.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Token expired'));
    } else {
      next(err);
    }
  }
};

/**
 * Role-based authorization middleware.
 */
export const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Role '${req.user.role}' is not authorized for this action`));
    }
    next();
  };
};

/**
 * Ensure the user belongs to the gym specified in the route.
 */
export const ensureGymAccess = (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  if (req.user.role === 'super_admin') {
    return next();
  }
  const gymId = req.params?.gymId || req.body?.gym_id || req.query?.gym_id;
  if (gymId && gymId !== req.user.gym_id) {
    return next(ApiError.forbidden('You do not have access to this gym'));
  }
  req.gymId = req.user.gym_id;
  next();
};

/**
 * Compose multiple middleware into one that runs them sequentially.
 * This is needed because Express 5 router.use(fn1, fn2) does NOT
 * await async fn1 before calling fn2.
 */
export function composeMw(...middlewares) {
  return async (req, res, next) => {
    let idx = 0;
    const run = (err) => {
      if (err) return next(err);
      if (idx >= middlewares.length) return next();
      const mw = middlewares[idx++];
      try {
        const result = mw(req, res, run);
        // If the middleware returns a promise, catch errors
        if (result && typeof result.catch === 'function') {
          result.catch(run);
        }
      } catch (e) {
        run(e);
      }
    };
    run();
  };
}

/**
 * Pre-built middleware combos for convenience
 */
export const gymAuth = (...roles) =>
  composeMw(authenticate, authorize(...roles), ensureGymAccess);

export const superAdminAuth = composeMw(authenticate, authorize('super_admin'));
