import mongoose from 'mongoose';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Notification from '../models/Notification.js';

// Get Tasks based on Role and Hierarchy + Visibility Scope
export const getTasks = async (req, res) => {
    try {
        const { id, role } = req.user;
        let query = {};

        // Check query params for completed/archived view
        if (req.query.archived === 'true' || req.query.completed === 'true') {
            // Completed window: show completed tasks
            query.status = 'completed';
        } else {
            // Tasks window: show active (non-completed) tasks only
            query.status = { $ne: 'completed' };
            query.isArchived = false;
        }

        if (req.query.parentTaskId) {
            query.parentTaskId = req.query.parentTaskId;
        }

        // Super Admins are not involved in task execution; they see no tasks
        if (role === 'super_admin') {
            return res.status(200).json([]);
        }

        // Exclude tasks where user has transferred out (excludedViewers array)
        // Convert id to ObjectId for proper comparison
        const userObjectId = new mongoose.Types.ObjectId(id);
        query.excludedViewers = { $nin: [userObjectId] };

        if (role === 'admin') {
            // Admin sees all tasks EXCEPT those created by Core Managers and assigned only to Core Managers
            // We'll filter these out after fetching
        } else {
            // Core Manager visibility: own tasks + tasks of users in their visibilityScope
            const user = req.user; // Fully populated user from middleware
            const visibleUserIds = [id, ...(user.visibilityScope || [])];

            query.$or = [
                { 'assignments.userId': { $in: visibleUserIds } },
                { createdBy: { $in: visibleUserIds } },
                { visibility: 'public' },
                { visibility: 'team', teamId: user.teamId },
                { visibility: 'custom', allowedViewers: id }
            ];
        }

        let tasks = await Task.find(query)
            .sort({ order: 1, updatedAt: -1 })
            .populate('assignments.userId', 'name email avatar department role')
            .populate('comments.userId', 'name email avatar')
            .populate('createdBy', 'name role')
            .populate('parentTaskId', 'title');

        // For Admin: Filter out tasks created by Core Managers and assigned only to Core Managers
        if (role === 'admin') {
            // Get all Core Manager user IDs for efficient checking
            const coreManagerIds = await User.find({ role: 'core_manager' }).select('_id').lean();
            const coreManagerIdSet = new Set(coreManagerIds.map(u => u._id.toString()));

            tasks = tasks.filter(task => {
                // Check if creator is a Core Manager
                const creator = task.createdBy;
                let isCreatedByCoreManager = false;

                if (creator) {
                    if (typeof creator === 'object' && creator.role === 'core_manager') {
                        isCreatedByCoreManager = true;
                    } else if (typeof creator === 'object' && creator._id) {
                        // Check by ID if role not populated
                        isCreatedByCoreManager = coreManagerIdSet.has(creator._id.toString());
                    } else if (typeof creator === 'string' || creator instanceof mongoose.Types.ObjectId) {
                        // If it's just an ID string/ObjectId
                        isCreatedByCoreManager = coreManagerIdSet.has(creator.toString());
                    }
                }

                // If not created by Core Manager, include it
                if (!isCreatedByCoreManager) {
                    return true;
                }

                // If created by Core Manager, check if all assignees are Core Managers
                if (!task.assignments || task.assignments.length === 0) {
                    // No assignees, exclude it (Core Manager created task with no assignees)
                    return false;
                }

                // Check if all assignees are Core Managers
                const allAssigneesAreCoreManagers = task.assignments.every(assignment => {
                    const assignee = assignment.userId;
                    if (!assignee) return false;
                    
                    if (typeof assignee === 'object' && assignee.role === 'core_manager') {
                        return true;
                    } else if (typeof assignee === 'object' && assignee._id) {
                        return coreManagerIdSet.has(assignee._id.toString());
                    } else if (typeof assignee === 'string' || assignee instanceof mongoose.Types.ObjectId) {
                        return coreManagerIdSet.has(assignee.toString());
                    }
                    return false;
                });

                // Exclude if all assignees are Core Managers
                return !allAssigneesAreCoreManagers;
            });
        }

        res.status(200).json(tasks);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

export const createTask = async (req, res) => {
    try {
        const { title, description, priority, dueDate, assignments, visibility, allowedViewers, parentTaskId } = req.body;
        const { id, role } = req.user; // Creator

        // Super Admins cannot create tasks
        if (role === 'super_admin') {
            return res.status(403).json({ message: "Super Admins cannot create tasks." });
        }

        // Core managers can assign to themselves and other Core Managers
        if (role === 'core_manager') {
            // Validate all assignees are Core Managers
            for (const assigneeId of (assignments || [])) {
                const assignee = await User.findById(assigneeId);
                if (!assignee || assignee.role !== 'core_manager') {
                    return res.status(403).json({ 
                        message: "Core Managers can only assign tasks to other Core Managers." 
                    });
                }
            }
        }

        // assignments is strict array of userIds
        // We init them with status pending, progress 0
        const formattedAssignments = (assignments || []).map(uid => ({
            userId: uid,
            status: 'pending',
            progress: 0
        }));

        const newTask = new Task({
            title,
            description,
            priority,
            dueDate,
            assignments: formattedAssignments,
            visibility: visibility || 'team',
            allowedViewers: allowedViewers || [],
            createdBy: id,
            parentTaskId: parentTaskId || null,
            teamId: req.user.teamId,
            comments: [],
        });

        await newTask.save();

        // Link subtask to parent
        if (parentTaskId) {
            await Task.findByIdAndUpdate(parentTaskId, { $push: { subtasks: newTask._id } });
        }

        // Get creator name for notification
        const creator = await User.findById(id).select('name');

        // Send notifications to all assignees
        for (const assignment of formattedAssignments) {
            if (assignment.userId.toString() !== id) {
                const notifMessage = parentTaskId 
                    ? `${creator.name} assigned you a subtask: ${title}`
                    : `${creator.name} assigned you a new task: ${title}`;
                    
                const notification = new Notification({
                    userId: assignment.userId,
                    type: 'task_assigned',
                    taskId: newTask._id,
                    message: notifMessage,
                });
                await notification.save();
            }
        }

        // Return populated task
        const populatedTask = await Task.findById(newTask._id)
            .populate('assignments.userId', 'name email avatar')
            .populate('createdBy', 'name');

        res.status(201).json(populatedTask);
    } catch (err) {
        res.status(409).json({ message: err.message });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const task = await Task.findById(id);
        
        if (!task) return res.status(404).json({ message: "Task not found" });

        const currentUser = req.user;
        const isAdmin = currentUser.role === 'admin';
        const isAssignee = task.assignments.some(a => a.userId.toString() === currentUser.id);
        const isCreator = task.createdBy.toString() === currentUser.id;

        // Permission check for editing
        if (!isAdmin && !isAssignee && !isCreator) {
            return res.status(403).json({ message: "You don't have permission to update this task." });
        }

        // Handle adding new assignees (task transfer/delegation)
        if (updates.addAssignees && Array.isArray(updates.addAssignees)) {
            const newAssigneeIds = updates.addAssignees;
            
            // Core managers can only add other Core Managers
            if (currentUser.role === 'core_manager') {
                for (const assigneeId of newAssigneeIds) {
                    const targetUser = await User.findById(assigneeId);
                    if (!targetUser || targetUser.role !== 'core_manager') {
                        return res.status(403).json({ 
                            message: "Core Managers can only add other Core Managers to tasks." 
                        });
                    }
                }
            }

            // Add new assignees
            for (const userId of newAssigneeIds) {
                const alreadyAssigned = task.assignments.some(a => a.userId.toString() === userId);
                if (!alreadyAssigned) {
                    task.assignments.push({
                        userId,
                        status: 'pending',
                        progress: 0
                    });

                    // Remove from excludedViewers if they were previously excluded
                    if (task.excludedViewers) {
                        task.excludedViewers = task.excludedViewers.filter(
                            id => id.toString() !== userId
                        );
                    }

                    // Send notification
                    const notification = new Notification({
                        userId,
                        type: 'task_assigned',
                        taskId: id,
                        message: `${currentUser.name} added you to task: ${task.title}`,
                    });
                    await notification.save();
                }
            }
            await task.save();
        }

        // Handle removing assignees (admin or creator only)
        if (updates.removeAssignees && Array.isArray(updates.removeAssignees)) {
            // Only admin or creator can remove assignees
            if (!isAdmin && !isCreator) {
                return res.status(403).json({ message: "Only admins or task creator can remove assignees." });
            }

            const removeIds = updates.removeAssignees;
            
            for (const userId of removeIds) {
                const assignmentIdx = task.assignments.findIndex(a => a.userId.toString() === userId);
                if (assignmentIdx > -1) {
                    task.assignments.splice(assignmentIdx, 1);
                }
            }

            // Ensure at least one assignee remains (or allow empty if admin)
            if (task.assignments.length === 0 && !isAdmin) {
                return res.status(400).json({ message: "Task must have at least one assignee." });
            }

            await task.save();

            // Return populated task
            const updatedPopulated = await Task.findById(id)
                .populate('assignments.userId', 'name email avatar')
                .populate('comments.userId', 'name email avatar')
                .populate('createdBy', 'name');

            return res.status(200).json(updatedPopulated);
        }

        // ADMIN: Transfer entire task to another Admin
        if (updates.transferTaskToAdmin && isAdmin) {
            const targetAdminId = updates.transferTaskToAdmin;
            
            // Verify target is an Admin
            const targetUser = await User.findById(targetAdminId);
            if (!targetUser || targetUser.role !== 'admin') {
                return res.status(400).json({ message: "Can only transfer to another Admin." });
            }

            // Update task creator to the new Admin
            task.createdBy = targetAdminId;

            // Add current admin to excludedViewers so they don't see this task anymore
            if (!task.excludedViewers) {
                task.excludedViewers = [];
            }
            if (!task.excludedViewers.some(id => id.toString() === currentUser.id)) {
                task.excludedViewers.push(currentUser.id);
            }

            // Remove target admin from excludedViewers if they were there
            task.excludedViewers = task.excludedViewers.filter(
                id => id.toString() !== targetAdminId
            );

            // Send notification to the new Admin
            const notification = new Notification({
                userId: targetAdminId,
                type: 'task_transferred',
                taskId: id,
                message: `${currentUser.name} transferred task ownership to you: ${task.title}`,
            });
            await notification.save();

            await task.save();

            const updatedPopulated = await Task.findById(id)
                .populate('assignments.userId', 'name email avatar')
                .populate('comments.userId', 'name email avatar')
                .populate('createdBy', 'name');

            return res.status(200).json(updatedPopulated);
        }

        // CORE MANAGER: Transfer own assignment to another Core Manager
        if (updates.transferAssignment && currentUser.role === 'core_manager') {
            const { fromUserId, toUserId } = updates.transferAssignment;

            // Verify the user is transferring their own assignment
            if (fromUserId !== currentUser.id) {
                return res.status(403).json({ message: "You can only transfer your own assignment." });
            }

            // Verify target is a Core Manager
            const targetUser = await User.findById(toUserId);
            if (!targetUser || targetUser.role !== 'core_manager') {
                return res.status(400).json({ message: "Can only transfer to another Core Manager." });
            }

            // Verify current user is assigned
            const assignmentIdx = task.assignments.findIndex(a => a.userId.toString() === fromUserId);
            if (assignmentIdx === -1) {
                return res.status(400).json({ message: "You are not assigned to this task." });
            }

            // Remove current user's assignment
            task.assignments.splice(assignmentIdx, 1);

            // Initialize excludedViewers if not exists
            if (!task.excludedViewers) {
                task.excludedViewers = [];
            }

            // Add current user to excludedViewers so they can't see this task anymore
            if (!task.excludedViewers.some(id => id.toString() === fromUserId)) {
                task.excludedViewers.push(fromUserId);
            }

            // Add new assignee if not already assigned
            const alreadyAssigned = task.assignments.some(a => a.userId.toString() === toUserId);
            if (!alreadyAssigned) {
                task.assignments.push({
                    userId: toUserId,
                    status: 'pending',
                    progress: 0
                });
            }

            // Remove new assignee from excludedViewers so they CAN see this task
            task.excludedViewers = task.excludedViewers.filter(
                id => id.toString() !== toUserId
            );

            // Send notification
            const notification = new Notification({
                userId: toUserId,
                type: 'task_transferred',
                taskId: id,
                message: `${currentUser.name} transferred their assignment to you: ${task.title}`,
            });
            await notification.save();

            await task.save();

            const updatedPopulated = await Task.findById(id)
                .populate('assignments.userId', 'name email avatar')
                .populate('comments.userId', 'name email avatar')
                .populate('createdBy', 'name');

            return res.status(200).json(updatedPopulated);
        }

        // ADMIN: Shift assignee (remove some, add others) - supports multiple selections
        if (updates.shiftAssignee && isAdmin) {
            let { fromUserId, toUserId, fromUserIds, toUserIds } = updates.shiftAssignee;
            
            // Support both single and multiple selections
            const removeIds = fromUserIds || (fromUserId ? [fromUserId] : []);
            const addIds = toUserIds || (toUserId ? [toUserId] : []);

            if (removeIds.length === 0 && addIds.length === 0) {
                return res.status(400).json({ message: "No users specified to shift." });
            }

            // Verify all target users are Admin or Core Manager
            for (const targetId of addIds) {
                const targetUser = await User.findById(targetId);
                if (!targetUser || (targetUser.role !== 'admin' && targetUser.role !== 'core_manager')) {
                    return res.status(400).json({ message: "Can only add Admin or Core Manager." });
                }
            }

            // Initialize excludedViewers if not exists
            if (!task.excludedViewers) {
                task.excludedViewers = [];
            }

            // Remove the old assignees
            for (const removeId of removeIds) {
                const assignmentIdx = task.assignments.findIndex(a => a.userId.toString() === removeId);
                if (assignmentIdx > -1) {
                    task.assignments.splice(assignmentIdx, 1);
                    
                    // Add to excludedViewers
                    if (!task.excludedViewers.some(id => id.toString() === removeId)) {
                        task.excludedViewers.push(removeId);
                    }

                    // Notify removed user
                    const notifRemoved = new Notification({
                        userId: removeId,
                        type: 'task_updated',
                        taskId: id,
                        message: `You have been removed from task: ${task.title}`,
                    });
                    await notifRemoved.save();
                }
            }

            // Add new assignees
            for (const addId of addIds) {
                const alreadyAssigned = task.assignments.some(a => a.userId.toString() === addId);
                if (!alreadyAssigned) {
                    task.assignments.push({
                        userId: addId,
                        status: 'pending',
                        progress: 0
                    });

                    // Remove from excludedViewers if they were there
                    task.excludedViewers = task.excludedViewers.filter(
                        id => id.toString() !== addId
                    );

                    // Notify new assignee
                    const notifNew = new Notification({
                        userId: addId,
                        type: 'task_assigned',
                        taskId: id,
                        message: `${currentUser.name} assigned you to task: ${task.title}`,
                    });
                    await notifNew.save();
                }
            }

            await task.save();

            const updatedPopulated = await Task.findById(id)
                .populate('assignments.userId', 'name email avatar')
                .populate('comments.userId', 'name email avatar')
                .populate('createdBy', 'name');

            return res.status(200).json(updatedPopulated);
        }

        // LEGACY: Handle task transfer (reassign from self to another)
        if (updates.transferTo) {
            const transferToId = updates.transferTo;
            
            // Verify user is currently assigned
            if (!isAssignee && !isAdmin) {
                return res.status(403).json({ message: "Only assignees or admins can transfer tasks." });
            }

            // Core managers can only transfer to users in same team or visibility scope
            if (currentUser.role === 'core_manager') {
                const targetUser = await User.findById(transferToId);
                if (!targetUser) {
                    return res.status(404).json({ message: "Target user not found." });
                }
                
                const allowedTransferTargets = [
                    ...(currentUser.visibilityScope || []).map(id => id.toString()),
                    ...(await User.find({ teamId: currentUser.teamId }).select('_id')).map(u => u._id.toString())
                ];
                
                if (!allowedTransferTargets.includes(transferToId)) {
                    return res.status(403).json({ 
                        message: "You can only transfer to team members or users in your visibility scope." 
                    });
                }
            }

            // Remove current user's assignment
            const assignmentIdx = task.assignments.findIndex(a => a.userId.toString() === currentUser.id);
            if (assignmentIdx > -1) {
                task.assignments.splice(assignmentIdx, 1);
            }

            // Add new assignee
            const alreadyAssigned = task.assignments.some(a => a.userId.toString() === transferToId);
            if (!alreadyAssigned) {
                task.assignments.push({
                    userId: transferToId,
                    status: 'pending',
                    progress: 0
                });
            }

            // Send notification
            const notification = new Notification({
                userId: transferToId,
                type: 'task_transferred',
                taskId: id,
                message: `${currentUser.name} transferred a task to you: ${task.title}`,
            });
            await notification.save();

            await task.save();
        }

        // Handle direct status update to completed
        if (updates.status === 'completed') {
            // Admin or Creator can mark entire task as complete
            if (isAdmin || isCreator) {
                // Mark all assignments as completed
                task.assignments.forEach(a => {
                    a.progress = 100;
                    a.status = 'completed';
                    a.completedAt = new Date();
                });
                task.progress = 100;
                task.status = 'completed';
                task.completedAt = new Date();
                
                await task.save();

                // Notify all assignees about task completion
                for (const assignment of task.assignments) {
                    if (assignment.userId.toString() !== currentUser.id) {
                        const notification = new Notification({
                            userId: assignment.userId,
                            type: 'task_completed',
                            taskId: id,
                            message: `${currentUser.name} marked task as complete: ${task.title}`,
                        });
                        await notification.save();
                    }
                }

                const updatedPopulated = await Task.findById(id)
                    .populate('assignments.userId', 'name email avatar')
                    .populate('comments.userId', 'name email avatar')
                    .populate('createdBy', 'name');

                return res.status(200).json(updatedPopulated);
            }
            
            // Assignee can mark the entire task as complete
            if (isAssignee) {
                // Mark all assignments as completed
                task.assignments.forEach(a => {
                    a.progress = 100;
                    a.status = 'completed';
                    a.completedAt = new Date();
                });
                task.progress = 100;
                task.status = 'completed';
                task.completedAt = new Date();
                
                await task.save();

                // Notify task creator and other assignees
                const notifyUsers = new Set();
                notifyUsers.add(task.createdBy.toString());
                task.assignments.forEach(a => notifyUsers.add(a.userId.toString()));
                notifyUsers.delete(currentUser.id); // Don't notify the person who completed it

                for (const userId of notifyUsers) {
                    const notification = new Notification({
                        userId,
                        type: 'task_completed',
                        taskId: id,
                        message: `${currentUser.name} marked task as complete: ${task.title}`,
                    });
                    await notification.save();
                }

                const updatedPopulated = await Task.findById(id)
                    .populate('assignments.userId', 'name email avatar')
                    .populate('comments.userId', 'name email avatar')
                    .populate('createdBy', 'name');

                return res.status(200).json(updatedPopulated);
            }
        }

        // Handle Comment Addition
        if (updates.comments && Array.isArray(updates.comments)) {
            const newComment = updates.comments[updates.comments.length - 1];
            if (newComment) {
                const commentToAdd = {
                    ...newComment,
                    userId: currentUser.id,
                    createdAt: new Date()
                };

                const updated = await Task.findByIdAndUpdate(
                    id,
                    { $push: { comments: commentToAdd } },
                    { new: true }
                ).populate('assignments.userId', 'name email avatar')
                    .populate('comments.userId', 'name email avatar')
                    .populate('createdBy', 'name');

                // Notify task creator and other assignees about new comment
                const notifyUsers = new Set();
                notifyUsers.add(task.createdBy.toString());
                task.assignments.forEach(a => notifyUsers.add(a.userId.toString()));
                notifyUsers.delete(currentUser.id); // Don't notify commenter

                for (const userId of notifyUsers) {
                    const notification = new Notification({
                        userId,
                        type: 'task_commented',
                        taskId: id,
                        message: `${currentUser.name} commented on: ${task.title}`,
                    });
                    await notification.save();
                }

                return res.status(200).json(updated);
            }
        }

        // Handle Progress Update (Assignee specific)
        if (typeof updates.progress === 'number') {
            const assignmentIndex = task.assignments.findIndex(a => a.userId.toString() === currentUser.id);

            if (assignmentIndex > -1) {
                task.assignments[assignmentIndex].progress = updates.progress;

                if (updates.progress === 100) {
                    task.assignments[assignmentIndex].status = 'completed';
                    task.assignments[assignmentIndex].completedAt = new Date();
                } else if (updates.progress > 0) {
                    task.assignments[assignmentIndex].status = 'in_progress';
                }

                // Recalculate Global Progress
                const total = task.assignments.reduce((acc, curr) => acc + curr.progress, 0);
                const avg = Math.round(total / task.assignments.length);
                task.progress = avg;

                // Recalculate Global Status
                const allCompleted = task.assignments.every(a => a.progress === 100);
                if (allCompleted) {
                    task.status = 'completed';
                    task.completedAt = new Date();
                    
                    // Notify task creator
                    if (task.createdBy.toString() !== currentUser.id) {
                        const notification = new Notification({
                            userId: task.createdBy,
                            type: 'task_completed',
                            taskId: id,
                            message: `Task completed: ${task.title}`,
                        });
                        await notification.save();
                    }
                } else if (avg > 0) {
                    task.status = 'in_progress';
                }

                await task.save();

                const updatedPopulated = await Task.findById(id)
                    .populate('assignments.userId', 'name email avatar')
                    .populate('comments.userId', 'name email avatar')
                    .populate('createdBy', 'name');

                return res.status(200).json(updatedPopulated);
            }
        }

        // Standard Update for other fields (title, description, priority, dueDate, etc.)
        // Only admin or creator can edit these
        if (updates.title || updates.description || updates.priority || updates.dueDate) {
            if (!isAdmin && !isCreator) {
                return res.status(403).json({ message: "Only admins or task creator can edit task details." });
            }
        }

        const updatedTask = await Task.findByIdAndUpdate(id, updates, { new: true })
            .populate('assignments.userId', 'name email avatar')
            .populate('comments.userId', 'name email avatar')
            .populate('createdBy', 'name');

        res.status(200).json(updatedTask);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        // Admins can delete any task, creators can delete their own tasks
        const isCreator = task.createdBy.toString() === userId;
        if (role !== 'admin' && !isCreator) {
            return res.status(403).json({ message: "Only admins or task creator can delete tasks." });
        }

        // Also delete subtasks
        if (task.subtasks && task.subtasks.length > 0) {
            await Task.deleteMany({ _id: { $in: task.subtasks } });
        }

        // Remove from parent's subtasks array if this is a subtask
        if (task.parentTaskId) {
            await Task.findByIdAndUpdate(task.parentTaskId, { $pull: { subtasks: id } });
        }

        await Task.findByIdAndDelete(id);
        res.status(200).json({ message: "Task deleted successfully." });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

// Archive old completed tasks (run via cron or manual trigger)
export const archiveOldTasks = async (req, res) => {
    try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // Auto-archive tasks completed more than 14 days ago
        const result = await Task.updateMany(
            {
                status: 'completed',
                completedAt: { $lt: fourteenDaysAgo },
                isArchived: false
            },
            {
                $set: { isArchived: true, archivedAt: new Date() }
            }
        );

        res.status(200).json({ 
            message: `Archived ${result.modifiedCount} old completed tasks.`,
            count: result.modifiedCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Restore archived task
export const restoreTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, id: userId } = req.user;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const isCreator = task.createdBy.toString() === userId;
        if (role !== 'admin' && !isCreator) {
            return res.status(403).json({ message: "Only admins or task creator can restore tasks." });
        }

        task.isArchived = false;
        task.archivedAt = null;
        task.status = 'review'; // Set to review so it can be re-evaluated
        await task.save();

        const populated = await Task.findById(id)
            .populate('assignments.userId', 'name email avatar')
            .populate('comments.userId', 'name email avatar')
            .populate('createdBy', 'name');

        res.status(200).json(populated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update task order (bulk update)
export const updateTaskOrder = async (req, res) => {
    try {
        const { taskOrders } = req.body; // Array of { taskId, order }
        
        if (!Array.isArray(taskOrders)) {
            return res.status(400).json({ message: "taskOrders must be an array" });
        }

        // Update all tasks in a single transaction
        const bulkOps = taskOrders.map(({ taskId, order }) => ({
            updateOne: {
                filter: { _id: taskId },
                update: { $set: { order: order } }
            }
        }));

        await Task.bulkWrite(bulkOps);

        res.status(200).json({ message: "Task order updated successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
