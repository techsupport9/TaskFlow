import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

async function main() {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Backfill username with email for any users that don't have username set
    const result = await User.updateMany(
        {
            $or: [
                { username: { $exists: false } },
                { username: null },
                { username: '' },
            ],
        },
        [
            {
                $set: {
                    username: '$email',
                },
            },
        ],
    );

    console.log(`Backfilled username for ${result.modifiedCount} users`);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

