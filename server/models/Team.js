import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: String,
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    companyId: {
        type: String,
        default: 'company-1',
    }
}, { timestamps: true });

export default mongoose.model('Team', TeamSchema);
