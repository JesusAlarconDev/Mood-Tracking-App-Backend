const express = require('express');
const User = require('../models/User');

const router = express.Router();

router.post('/', async (req, res) => {
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
        res.status(201).json(user);
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

module.exports = router;
