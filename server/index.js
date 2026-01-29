import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

// Route Imports
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js';
import noteRoutes from './routes/notes.js';

// Model Imports for Cron Jobs
import Note from './models/Note.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.disable('x-powered-by');

// Basic request hardening
app.use(
    mongoSanitize({
        replaceWith: '_',
    }),
);

// Rate limit (esp. important for /auth)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS: allow configured origins only
const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // allow non-browser clients / same-origin calls (no Origin header)
            if (!origin) return callback(null, true);
            if (allowedOrigins.length === 0) return callback(null, true); // fallback for local dev
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }),
);

app.use(helmet());
app.use(morgan('common'));

// Database Connection
if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI environment variable is not set');
    process.exit(1);
}
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Routes
app.get('/', (req, res) => {
    res.send('Task Manager API is running');
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notes', noteRoutes);

// Error handler (e.g., CORS rejection)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err?.message === 'Not allowed by CORS') {
        return res.status(403).json({ message: 'CORS blocked' });
    }
    return res.status(500).json({ message: 'Internal server error' });
});



// Auto-archive Cron Job (Runs every day at midnight)
cron.schedule('0 0 * * *', async () => {
    console.log('Running auto-archive job...');
    try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // Logic will be moved to a controller
        // const result = await Task.updateMany(
        //   { status: 'completed', completedAt: { $lt: fourteenDaysAgo }, isArchived: false },
        //   { $set: { isArchived: true, archivedAt: new Date() } }
        // );
        // console.log(`Archived ${result.modifiedCount} tasks.`);
    } catch (error) {
        console.error('Auto-archive job failed:', error);
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
