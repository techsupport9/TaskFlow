import express from 'express';
import { 
    getUsers, 
    createMember, 
    deleteUser, 
    updateVisibilityScope, 
    getProfile,
    updateProfile,
    changePassword,
    updatePreferences,
    getPreferences,
    updateAdminPermissions 
} from '../controllers/users.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, getUsers);
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);
router.get('/preferences', verifyToken, getPreferences);
router.patch('/preferences', verifyToken, updatePreferences);
router.post('/', verifyToken, createMember);
router.patch('/visibility-scope', verifyToken, updateVisibilityScope);
router.patch('/:id/permissions', verifyToken, updateAdminPermissions);
router.delete('/:id', verifyToken, deleteUser);

export default router;
