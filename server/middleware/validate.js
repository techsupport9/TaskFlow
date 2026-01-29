import { z } from 'zod';

/**
 * Validates req.{body|query|params} using a Zod schema.
 * On success: overwrites the target with parsed (typed) data.
 * On failure: responds 400 with a concise error payload.
 */
export function validate(schema, target = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            const issues = result.error.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
            }));
            return res.status(400).json({ message: 'Validation failed', issues });
        }
        req[target] = result.data;
        return next();
    };
}

// Shared helpers
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const schemas = {
    auth: {
        login: z.object({
            email: z.string().email(),
            password: z.string().min(1),
        }),
        register: z.object({
            name: z.string().min(1).max(100),
            email: z.string().email(),
            password: z.string().min(8).max(200),
            // role is accepted but intentionally ignored server-side (bootstrap logic)
            role: z.string().optional(),
            department: z.string().max(100).optional(),
        }),
    },
    tasks: {
        idParam: z.object({ id: objectId }),
        create: z.object({
            title: z.string().min(1).max(200),
            description: z.string().max(5000).optional(),
            priority: z.enum(['high', 'medium', 'low']).optional(),
            dueDate: z.coerce.date(),
            assignments: z.array(objectId).optional(),
            visibility: z.enum(['public', 'team', 'private', 'custom']).optional(),
            allowedViewers: z.array(objectId).optional(),
            parentTaskId: objectId.nullable().optional(),
        }),
        updateOrder: z.object({
            taskOrders: z.array(
                z.object({
                    taskId: objectId,
                    order: z.number().int().min(0).max(1000000),
                }),
            ),
        }),
    },
    users: {
        idParam: z.object({ id: objectId }),
        createMember: z.object({
            name: z.string().min(1).max(100),
            email: z.string().email(),
            password: z.string().min(8).max(200),
            role: z.enum(['admin', 'core_manager']).optional(),
            department: z.string().max(100).optional(),
            canChangePassword: z.boolean().optional(),
        }),
        updateVisibilityScope: z.object({
            visibilityScope: z.array(objectId).optional(),
        }),
        updateAdminPermissions: z.object({
            permissions: z
                .object({
                    canAddMembers: z.boolean().optional(),
                    canEditMembers: z.boolean().optional(),
                    canDeleteMembers: z.boolean().optional(),
                    canCreateTasks: z.boolean().optional(),
                    canDeleteTasks: z.boolean().optional(),
                    canChangePassword: z.boolean().optional(),
                })
                .strict(),
        }),
        changePassword: z.object({
            currentPassword: z.string().optional(),
            newPassword: z.string().min(8).max(200),
            targetUserId: objectId.optional(),
        }),
        updateProfile: z
            .object({
                name: z.string().min(1).max(100).optional(),
                department: z.string().max(100).optional(),
                phone: z.string().max(50).optional(),
                bio: z.string().max(2000).optional(),
                avatar: z.string().max(5000).optional(),
            })
            .strict(),
        updatePreferences: z
            .object({
                preferences: z.record(z.unknown()),
            })
            .strict(),
    },
};

