const express = require('express');
const mongoose = require('mongoose');
const Mood = require('../models/Mood');
const User = require('../models/User');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const body = req.body;
        if (body == null || typeof body !== 'object') {
            return res.status(400).json({
                message:
                    'Cuerpo de la petición vacío o no JSON. En Postman: Body → raw → JSON y envía un objeto con user, todaysMood, feelings.'
            });
        }

        const { user: userId, todaysMood, feelings, aboutYourDay, sleepHours, createdAt } = body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        const userExists = await User.exists({ _id: userId });
        if (!userExists) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const moodData = {
            user: userId,
            todaysMood,
            feelings,
            aboutYourDay,
            sleepHours
        };
        if (createdAt) {
            moodData.createdAt = new Date(createdAt);
        }

        const mood = await Mood.create(moodData);
        res.status(201).json(mood);
    } catch (err) {
        if (err.code === 'DUPLICATE_ENTRY') {
            return res.status(409).json({ message: err.message });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ message: messages.join(' ') });
        }
        console.error('POST /api/moods:', err.message, err);
        res.status(500).json({
            message: 'Error al guardar el estado de ánimo',
            ...(process.env.NODE_ENV !== 'production' && { detail: err.message })
        });
    }
});


router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        const userExists = await User.exists({ _id: userId });
        if (!userExists) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const moods = await Mood.find({ user: userId }).sort({ createdAt: -1 });
        res.status(200).json(moods);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener los estados de ánimo' });
    }
})

module.exports = router;
