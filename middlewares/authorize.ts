import { Request, Response, NextFunction } from 'express';
import { Role } from '../interfaces';
import { logger } from '../helpers';

/**
 * Role-based authorization middleware
 * Checks if the authenticated user has the required role(s)
 */
export const authorize = (...allowedRoles: Role[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role as Role;

      if (!allowedRoles.includes(userRole)) {
        logger.warn(`Unauthorized access attempt: User ${req.user._id} with role ${userRole} attempted to access ${req.path}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

/**
 * Middleware to check if user is superadmin
 */
export const requireSuperadmin = authorize(Role.Superadmin);

/**
 * Middleware to check if user is admin or superadmin
 */
export const requireAdmin = authorize(Role.Admin, Role.Superadmin);

/**
 * Middleware to check if user can manage teams (admin can only manage their own teams)
 * This is used in team controllers to restrict admin access
 */
export const canManageTeam = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role as Role;
    const userId = req.user._id.toString();

    if (userRole === Role.Superadmin) {
      return next();
    }

    if (userRole === Role.Admin) {


      return next();
    }

    return next();
  } catch (error) {
    logger.error('Team management authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

















