import { Router } from 'express';
import { listCourses, getCourse, createCourse, updateCourse, transitionCourse } from '../controllers/courses.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, requireCourseOwnerOrAdmin } from '../middleware/rbac.middleware';
import { prisma } from '../prismaClient';