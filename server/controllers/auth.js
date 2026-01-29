import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            department,
        } = req.body;

        // Basic presence checks
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        // Enforce a minimal password complexity
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const totalUsers = await User.countDocuments();

        let assignedRole = 'core_manager';

        // Allow first-ever user to be a super_admin (bootstrap)
        if (totalUsers === 0) {
            assignedRole = role === 'super_admin' ? 'super_admin' : 'super_admin';
        } else {
            // For all subsequent registrations, ignore requested role and default to core_manager
            assignedRole = 'core_manager';
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            // For now, set username equal to email
            username: email,
            email,
            password: passwordHash,
            role: assignedRole,
            department,
        });

        const savedUser = await newUser.save();
        const userResponse = savedUser.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email });

        // Use a generic message to avoid account enumeration
        const invalidMessage = 'Invalid email or password.';

        if (!user) {
            return res.status(400).json({ message: invalidMessage });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: invalidMessage });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'JWT_SECRET is not configured' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
        );

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({ token, user: userResponse });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
