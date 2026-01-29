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
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

router.get('/', verifyToken, getUsers);
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, validate(schemas.users.updateProfile), updateProfile);
router.post('/change-password', verifyToken, validate(schemas.users.changePassword), changePassword);
router.get('/preferences', verifyToken, getPreferences);
router.patch('/preferences', verifyToken, validate(schemas.users.updatePreferences), updatePreferences);
router.post('/', verifyToken, validate(schemas.users.createMember), createMember);
router.patch('/visibility-scope', verifyToken, validate(schemas.users.updateVisibilityScope), updateVisibilityScope);
router.patch('/:id/permissions', verifyToken, validate(schemas.users.idParam, 'params'), validate(schemas.users.updateAdminPermissions), updateAdminPermissions);
router.delete('/:id', verifyToken, validate(schemas.users.idParam, 'params'), deleteUser);

export default router;
