import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

// Create a new team member
export const createMember = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;
        const { id, role: creatorRole, teamId } = req.user;

        // Super Admin: can only create Admins
        if (creatorRole === 'super_admin' && role !== 'admin') {
            return res.status(403).json({ message: "Super Admins can only create Admins." });
        }

        // Admin: can only create Core Managers
        if (creatorRole === 'admin' && role !== 'core_manager') {
            return res.status(403).json({ message: "Admins can only create Core Team Managers." });
        }

        // Admin: check if they have permission to add members
        if (creatorRole === 'admin') {
            const adminUser = await User.findById(id);
            if (adminUser.permissions && !adminUser.permissions.canAddMembers) {
                return res.status(403).json({ message: "You don't have permission to add members." });
            }
        }

        // Core managers cannot create users
        if (creatorRole === 'core_manager') {
            return res.status(403).json({ message: "Core team members cannot create users." });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists." });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: passwordHash,
            role: role || (creatorRole === 'super_admin' ? 'admin' : 'core_manager'),
            department: department || 'General',
            // If created by an admin, default new core managers into admin's team (if any)
            teamId: creatorRole === 'admin' ? teamId : null,
            // Default permissions for new admins
            permissions: role === 'admin' ? {
                canAddMembers: true,
                canEditMembers: true,
                canDeleteMembers: true,
                canCreateTasks: true,
                canDeleteTasks: true,
                canChangePassword: req.body.canChangePassword || false,
            } : undefined,
        });

        await newUser.save();

        const savedUser = await User.findById(newUser._id).select('-password');
        res.status(201).json(savedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: requesterId, role: requesterRole } = req.user;

        // Only super_admin or admin can delete users
        if (requesterRole !== 'super_admin' && requesterRole !== 'admin') {
            return res.status(403).json({ message: "Access denied." });
        }

        // Admin: check if they have permission to delete members
        if (requesterRole === 'admin') {
            const adminUser = await User.findById(requesterId);
            if (adminUser.permissions && !adminUser.permissions.canDeleteMembers) {
                return res.status(403).json({ message: "You don't have permission to delete members." });
            }
        }

        await User.findByIdAndDelete(id);
        res.status(200).json({ message: "User deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update admin permissions (Super Admin only)
export const updateAdminPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;
        const { role: requesterRole } = req.user;

        // Only Super Admin can update permissions
        if (requesterRole !== 'super_admin') {
            return res.status(403).json({ message: "Only Super Admin can update permissions." });
        }

        // Check if target user is an admin
        const targetUser = await User.findById(id);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found." });
        }
        if (targetUser.role !== 'admin') {
            return res.status(400).json({ message: "Can only set permissions for Admins." });
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { permissions },
            { new: true }
        ).select('-password');

        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update user's visibility scope (who they can see tasks from)
export const updateVisibilityScope = async (req, res) => {
    try {
        const { visibilityScope } = req.body;
        const { id: userId, role } = req.user;

        // Super admins don't need visibility scope
        if (role === 'super_admin') {
            return res.status(400).json({ message: "Super admins don't have task visibility." });
        }

        // Update the user's visibility scope
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { visibilityScope: visibilityScope || [] },
            { new: true }
        ).select('-password');

        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get current user profile
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('visibilityScope', 'name email department');
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update user profile
export const updateProfile = async (req, res) => {
    try {
        const { name, department, phone, bio, avatar } = req.body;
        const userId = req.user.id;

        const updateData = {};
        if (name) updateData.name = name;
        if (department !== undefined) updateData.department = department;
        if (phone !== undefined) updateData.phone = phone;
        if (bio !== undefined) updateData.bio = bio;
        if (avatar !== undefined) updateData.avatar = avatar;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password');

        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Change password (self or by admin with permission)
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, targetUserId } = req.body;
        const { id: requesterId, role: requesterRole } = req.user;
        
        // Determine target user
        const targetId = targetUserId || requesterId;
        const isChangingOwnPassword = targetId === requesterId;

        // Get requester user to check permissions
        const requester = await User.findById(requesterId);
        if (!requester) {
            return res.status(404).json({ message: "Requester not found." });
        }

        // Get target user with password
        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found." });
        }

        // Permission checks
        if (!isChangingOwnPassword) {
            // Changing someone else's password
            // Only Super Admin or Admin with canChangePassword permission
            if (requesterRole === 'super_admin') {
                // Super Admin can change any password - no current password needed
            } else if (requesterRole === 'admin' && requester.permissions?.canChangePassword) {
                // Admin with permission can change passwords - no current password needed
            } else {
                return res.status(403).json({ message: "You don't have permission to change passwords." });
            }
        } else {
            // Changing own password - verify current password
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password is required." });
            }
            const isMatch = await bcrypt.compare(currentPassword, targetUser.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Current password is incorrect." });
            }
        }

        if (!newPassword) {
            return res.status(400).json({ message: "New password is required." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await User.findByIdAndUpdate(targetId, { password: passwordHash });

        res.status(200).json({ message: "Password changed successfully." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update user preferences
export const updatePreferences = async (req, res) => {
    try {
        const { preferences } = req.body;
        const userId = req.user.id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { preferences },
            { new: true }
        ).select('-password');

        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get user preferences
export const getPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('preferences');
        res.status(200).json(user?.preferences || {});
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};