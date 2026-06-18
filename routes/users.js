const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateToken = require('../middlewares/auth');
const uploadCloud = require('../config/cloudinary');

const router = express.Router();

// POST /api/users -> Register
router.post('/register', async (req, res) => {
    try {
        const body = req.body;
        if (body == null || typeof body !== 'object') {
            return res.status(400).json({
                message:
                    'Cuerpo de la petición vacío o no JSON. En Postman: Body → raw → JSON.'
            });
        }

        const { email, password, name, profilePicture } = body;
        const user = await User.create({ email, password, name, profilePicture });
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
        
        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture
            }
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'El email ya está registrado' });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ message: messages.join(' ') });
        }
        console.error('POST /api/users:', err.message, err);
        res.status(500).json({
            message: 'Error al crear el usuario',
            ...(process.env.NODE_ENV !== 'production' && { detail: err.message })
        });
    }
});

// POST /api/users/login -> Login
router.post('/login', async (req, res) => {
    try {
        const body = req.body;
        if (body == null || typeof body !== 'object') {
            return res.status(400).json({
                message: 'Cuerpo de la petición vacío o no JSON. En Postman: Body → raw → JSON.'
            });
        }

        const { email, password } = body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
        }

        const user = await User.findOne({ email: String(email).toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        res.status(200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture
            }
        });
    } catch (err) {
        console.error('POST /api/users/login:', err.message, err);
        res.status(500).json({ message: 'Error al iniciar sesión' });
    }
});

// PUT /api/users -> Update user
router.put('/', authenticateToken, uploadCloud.single('profilePicture'), async (req, res) => {
    try {
        const userId = req.user.id;
        const body = req.body;
        
        if (body == null || typeof body !== 'object') {
            return res.status(400).json({
                message: 'Cuerpo de la petición vacío o no JSON. En Postman: Body → raw → JSON.'
            });
        }

        const { name, email } = body;

        if ((name !== undefined && !name.trim()) || (email !== undefined && !email.trim())) {
            return res.status(400).json({ message: 'Los campos no pueden estar vacíos' });
        }
        
        if (!name && !email) {
            return res.status(400).json({ message: 'Se requiere al menos un campo para actualizar (name o email)' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return res.status(400).json({ message: 'El correo electrónico ya está en uso' });
            }
            user.email = email.toLowerCase();
        }

        if (name) user.name = name.trim();

        if (req.file) {
            user.profilePicture = req.file.path;
        }

        await user.save();

        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture
            }
        });

    } catch (err) {
        console.error('PUT /api/users:', err.message, err);
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
});

module.exports = router;