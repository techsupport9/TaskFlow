import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Team from '../models/Team.js';

export const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            department,
            teamId, // Optional, for members joining a team
        } = req.body;

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: passwordHash,
            role,
            department,
            teamId,
        });

        const savedUser = await newUser.save();

        // If manager, create a Team for them automatically
        if (role === 'manager') {
            const newTeam = new Team({
                name: `${name}'s Team`,
                managerId: savedUser._id,
                companyId: savedUser.companyId,
                members: [savedUser._id],
            });
            const savedTeam = await newTeam.save();

            savedUser.managedTeams = [savedTeam._id];
            savedUser.teamId = savedTeam._id;
            await savedUser.save();
        }
        // If joining a team, add to team members
        else if (teamId) {
            await Team.findByIdAndUpdate(teamId, { $push: { members: savedUser._id } });
        }

        res.status(201).json(savedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ msg: 'User does not exist. ' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials. ' });

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'JWT_SECRET is not configured' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
        delete user.password;

        res.status(200).json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
