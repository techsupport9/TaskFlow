import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
    title: {
        type: String,
        default: 'Untitled Note',
    },
    content: {
        type: String,
        default: '',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isPinned: {
        type: Boolean,
        default: false,
    },
    color: {
        type: String,
        default: '#ffffff', // Default white background
    },
}, { timestamps: true });

// Index for efficient querying
NoteSchema.index({ userId: 1, updatedAt: -1 });
NoteSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

export default mongoose.model('Note', NoteSchema);
