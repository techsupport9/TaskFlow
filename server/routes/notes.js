import express from 'express';
import { getNotes, getNote, createNote, updateNote, deleteNote, deleteNotes } from '../controllers/notes.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get all notes for the current user
router.get('/', verifyToken, getNotes);

// Get a single note
router.get('/:id', verifyToken, getNote);

// Create a new note
router.post('/', verifyToken, createNote);

// Update a note
router.patch('/:id', verifyToken, updateNote);

// Delete a single note
router.delete('/:id', verifyToken, deleteNote);

// Delete multiple notes
router.post('/delete-multiple', verifyToken, deleteNotes);

export default router;
