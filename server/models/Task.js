import mongoose from 'mongoose';

const TaskCommentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: String,
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium',
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'delayed'],
        default: 'pending',
    },
    dueDate: {
        type: Date,
        required: true,
    },
    // REPLACED: assignedTo (Single) -> assignments (Array)
    assignments: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending'
        },
        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        completedAt: {
            type: Date
        }
    }],
    // NEW: Visibility Scope
    visibility: {
        type: String,
        enum: ['public', 'team', 'private', 'custom'],
        default: 'team'
    },
    allowedViewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Users who transferred out and should no longer see this task
    excludedViewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    assignedToName: String, // Kept for legacy compatibility or cache logic
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    companyId: {
        type: String,
        default: 'company-1',
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
    },
    // progress: Removed top-level progress
    comments: [TaskCommentSchema],
    parentTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null,
    },
    subtasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    isArchived: {
        type: Boolean,
        default: false,
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    order: {
        type: Number,
        default: 0,
    },
    completedAt: Date,
    archivedAt: Date,
}, { timestamps: true });

// Index for efficient querying by status and assignee (new assignments array)
TaskSchema.index({ 'assignments.userId': 1, status: 1 });
TaskSchema.index({ teamId: 1 });

export default mongoose.model('Task', TaskSchema);
