import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
    try {
        const { id } = req.user;
        const notifications = await Notification.find({ userId: id })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 notifications
        res.status(200).json(notifications);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

export const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
        res.status(200).json(notification);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

export const markAllRead = async (req, res) => {
    try {
        const { id } = req.user;
        await Notification.updateMany(
            { userId: id, read: false },
            { read: true }
        );
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
