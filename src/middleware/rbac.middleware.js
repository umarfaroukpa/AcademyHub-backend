import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';


export const requireRole = (...allowed) => {
return (req, res, next) => {
const user = req.user;
if (!user) return res.sendStatus(401);
if (!allowed.includes(user.role)) return res.sendStatus(403);
next();
};
};


// object-level: check owner role for courses
export const requireCourseOwnerOrAdmin = (getCourseOwnerId) => {
return async (req, res, next    ) => {
const user = req.user;
if (!user) return res.sendStatus(401);
if (user.role === 'ADMIN') return next();
const ownerId = await getCourseOwnerId(req);
if (ownerId && ownerId === user.userId) return next();
return res.sendStatus(403);
};
};