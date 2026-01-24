import Note from '../models/Note.js';

// Get all notes for the current user
export const getNotes = async (req, res) => {
    try {
        const { id } = req.user;
        const notes = await Note.find({ userId: id })
            .sort({ isPinned: -1, updatedAt: -1 })
            .select('-__v');
        
        res.status(200).json(notes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a single note by ID
export const getNote = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await Note.findById(id);
        
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Check if note belongs to the user
        if (note.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(note);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new note
export const createNote = async (req, res) => {
    try {
        const { id } = req.user;
        const { title, content, color } = req.body;

        const newNote = new Note({
            title: title || 'Untitled Note',
            content: content || '',
            userId: id,
            color: color || '#ffffff',
        });

        await newNote.save();
        res.status(201).json(newNote);
    } catch (err) {
        res.status(409).json({ message: err.message });
    }
};

// Update a note
export const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const note = await Note.findById(id);
        
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Check if note belongs to the user
        if (note.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updatedNote = await Note.findByIdAndUpdate(id, updates, { new: true });
        res.status(200).json(updatedNote);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

// Delete a note
export const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;

        const note = await Note.findById(id);
        
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Check if note belongs to the user
        if (note.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Note.findByIdAndDelete(id);
        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete multiple notes
export const deleteNotes = async (req, res) => {
    try {
        const { noteIds } = req.body;
        const { id } = req.user;

        if (!Array.isArray(noteIds) || noteIds.length === 0) {
            return res.status(400).json({ message: 'noteIds must be a non-empty array' });
        }

        // Verify all notes belong to the user before deleting
        const notes = await Note.find({ _id: { $in: noteIds } });
        const unauthorizedNotes = notes.filter(note => note.userId.toString() !== id);

        if (unauthorizedNotes.length > 0) {
            return res.status(403).json({ message: 'Access denied for some notes' });
        }

        await Note.deleteMany({ _id: { $in: noteIds } });
        res.status(200).json({ message: 'Notes deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
