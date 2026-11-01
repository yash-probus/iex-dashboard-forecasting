import prisma from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { hashPassword } from '../../utils/password';
import { Role } from '@prisma/client';
import crypto from 'crypto';

export class UsersService {
  static async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        hiddenModules: true,
        readOnlyModules: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }
  static async getAuditLogs() {
    return prisma.userAuditLog.findMany({
      orderBy: { timestamp: 'desc' }
    });
  }

  static async createUser(data: any, performedBy: string) {
    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          { email: data.email }
        ]
      }
    });

    if (existingUser) {
      throw new AppError('Username or email already exists', 400);
    }

    const dummyPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(data.password || dummyPassword);

    const newUser = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        role: data.role as Role,
        hiddenModules: Array.isArray(data.hiddenModules) ? data.hiddenModules : [],
        readOnlyModules: Array.isArray(data.readOnlyModules) ? data.readOnlyModules : []
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        hiddenModules: true,
        readOnlyModules: true,
        createdAt: true,
      }
    });
    const changes = {
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      hiddenModules: newUser.hiddenModules,
      readOnlyModules: newUser.readOnlyModules
    };

    await prisma.userAuditLog.create({
      data: {
        action: 'CREATE',
        targetUserId: newUser.id,
        targetUser: newUser.username,
        performedBy,
        changes
      }
    });

    return newUser;
  }

  static async updateUser(id: string, data: any, performedBy: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updateData: any = {};
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.role) {
      updateData.role = data.role as Role;
    }

    if (Array.isArray(data.hiddenModules)) {
      updateData.hiddenModules = data.hiddenModules;
    }

    if (Array.isArray(data.readOnlyModules)) {
      updateData.readOnlyModules = data.readOnlyModules;
    }

    if (data.password) updateData.passwordHash = await hashPassword(data.password);
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        hiddenModules: true,
        readOnlyModules: true,
        createdAt: true,
      }
    });

    const changes: any = {};
    if (data.username && data.username !== user.username) changes.username = { old: user.username, new: data.username };
    if (data.email && data.email !== user.email) changes.email = { old: user.email, new: data.email };
    if (data.role && data.role !== user.role) changes.role = { old: user.role, new: data.role };
    if (data.hiddenModules && JSON.stringify(data.hiddenModules) !== JSON.stringify(user.hiddenModules)) changes.hiddenModules = { old: user.hiddenModules, new: data.hiddenModules };
    if (data.readOnlyModules && JSON.stringify(data.readOnlyModules) !== JSON.stringify(user.readOnlyModules)) changes.readOnlyModules = { old: user.readOnlyModules, new: data.readOnlyModules };
    if (data.password) changes.password = { old: '***', new: '***' };

    if (Object.keys(changes).length > 0) {
      await prisma.userAuditLog.create({
        data: {
          action: 'UPDATE',
          targetUserId: updatedUser.id,
          targetUser: updatedUser.username,
          performedBy,
          changes
        }
      });
    }

    return updatedUser;
  }

  static async deleteUser(id: string, performedBy: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    await prisma.user.delete({ where: { id } });

    await prisma.userAuditLog.create({
      data: {
        action: 'DELETE',
        targetUserId: id,
        targetUser: user.username,
        performedBy,
        changes: { deleted: true }
      }
    });

    return { message: 'User deleted successfully' };
  }
}
