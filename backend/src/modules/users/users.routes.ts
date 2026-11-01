import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, getAuditLogs } from './users.controller';
import { validateCreateUser, validateUpdateUser } from './users.validation';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';
import { superAdminMiddleware } from '../../middleware/super-admin.middleware';

const router = Router();

// Protect all routes with auth AND super-admin middleware
router.use(authMiddleware);
router.use(superAdminMiddleware);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints (Super Admin only)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', asyncHandler(getUsers));

/**
 * @swagger
 * /api/users/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs list
 */
router.get('/audit-logs', asyncHandler(getAuditLogs));

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, role]
 *             properties:
 *               email: { type: string }
 *               name: { type: string }
 *               role: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Created user
 */
router.post('/', validateCreateUser, asyncHandler(createUser));

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               role: { type: string }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Updated user
 */
router.put('/:id', validateUpdateUser, asyncHandler(updateUser));

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', asyncHandler(deleteUser));

export default router;
