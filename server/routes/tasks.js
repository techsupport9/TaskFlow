import express from 'express';
import { getTasks, createTask, updateTask, deleteTask, archiveOldTasks, restoreTask, updateTaskOrder } from '../controllers/tasks.js';
import { verifyToken } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

// Read
router.get('/', verifyToken, getTasks);

// Create
router.post('/', verifyToken, validate(schemas.tasks.create), createTask);

// Update
router.patch('/:id', verifyToken, validate(schemas.tasks.idParam, 'params'), updateTask);

// Update task order (bulk)
router.patch('/order/update', verifyToken, validate(schemas.tasks.updateOrder), updateTaskOrder);

// Restore archived task
router.patch('/:id/restore', verifyToken, validate(schemas.tasks.idParam, 'params'), restoreTask);

// Archive old tasks (admin only, can be called via cron)
router.post('/archive-old', verifyToken, archiveOldTasks);

// Delete
router.delete('/:id', verifyToken, validate(schemas.tasks.idParam, 'params'), deleteTask);

export default router;
