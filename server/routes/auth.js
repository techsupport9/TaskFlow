import express from 'express';
import { login, register } from '../controllers/auth.js';
import { validate, schemas } from '../middleware/validate.js';

const router = express.Router();

router.post('/login', validate(schemas.auth.login), login);
router.post('/register', validate(schemas.auth.register), register);

export default router;
