import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'core_manager'],
        default: 'core_manager',
    },
    department: {
        type: String,
    },
    phone: {
        type: String,
    },
    bio: {
        type: String,
    },
    avatar: {
        type: String, // URL or base64
    },
    companyId: {
        type: String,
        default: 'company-1',
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
    },
    managedTeams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
    }],
    visibilityScope: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    // Admin permissions (set by Super Admin)
    permissions: {
        canAddMembers: { type: Boolean, default: true },
        canEditMembers: { type: Boolean, default: true },
        canDeleteMembers: { type: Boolean, default: true },
        canCreateTasks: { type: Boolean, default: true },
        canDeleteTasks: { type: Boolean, default: true },
    },
    // User preferences
    preferences: {
        theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
        accentColor: { type: String, default: '#6366f1' },
        compactMode: { type: Boolean, default: false },
        dateFormat: { type: String, enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], default: 'DD/MM/YYYY' },
        timeZone: { type: String, default: 'Asia/Kolkata' },
        // Notification preferences
        notifications: {
            taskAssigned: { type: Boolean, default: true },
            taskCompleted: { type: Boolean, default: true },
            taskComments: { type: Boolean, default: true },
            dueDateReminders: { type: Boolean, default: true },
            emailNotifications: { type: Boolean, default: true },
            weeklyDigest: { type: Boolean, default: false },
        },
        // Admin-specific settings
        autoDeleteDays: { type: Number, default: 7 },
        defaultPriority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    },
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
