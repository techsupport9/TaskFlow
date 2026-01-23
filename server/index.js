import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';

// Route Imports
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js'; // Will need to create this

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
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

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);



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
