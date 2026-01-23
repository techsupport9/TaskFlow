import express from 'express';
import { getTasks, createTask, updateTask, deleteTask, archiveOldTasks, restoreTask, updateTaskOrder } from '../controllers/tasks.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Read
router.get('/', verifyToken, getTasks);

// Create
router.post('/', verifyToken, createTask);

// Update
router.patch('/:id', verifyToken, updateTask);

// Update task order (bulk)
router.patch('/order/update', verifyToken, updateTaskOrder);

// Restore archived task
router.patch('/:id/restore', verifyToken, restoreTask);

// Archive old tasks (admin only, can be called via cron)
router.post('/archive-old', verifyToken, archiveOldTasks);

// Delete
router.delete('/:id', verifyToken, deleteTask);

export default router;
