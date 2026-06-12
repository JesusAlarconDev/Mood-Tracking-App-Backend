const express = require('express');
const Mood = require('../models/Mood');
const authenticateToken = require('../middlewares/auth');

const router = express.Router();

// POST /api/moods -> Crea un mood para el usuario autenticado (id del JWT)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const body = req.body;
        if (body == null || typeof body !== 'object') {
            return res.status(400).json({
                message:
                    'Cuerpo de la petición vacío o no JSON. En Postman: Body → raw → JSON con todaysMood, feelings, etc.'
            });
        }

        const userId = req.user.id;

        if (body.user != null && String(body.user) !== String(userId)) {
            return res.status(403).json({
                message: 'No puedes crear moods para otro usuario'
            });
        }

        const { todaysMood, feelings, aboutYourDay, sleepHours, createdAt } = body;

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

/**
 * GET /api/moods?limit=<n>
 * Últimos moods del usuario autenticado (id del JWT). No se acepta ?user= de otro id.
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.query.user != null && String(req.query.user) !== String(userId)) {
            return res.status(403).json({
                message: 'No puedes consultar los moods de otro usuario'
            });
        }

        const DEFAULT_LIMIT = 15;
        const MAX_LIMIT = 30;
        let limit = DEFAULT_LIMIT;
        if (req.query.limit !== undefined && req.query.limit !== '') {
            const parsed = parseInt(String(req.query.limit), 10);
            if (Number.isNaN(parsed) || parsed < 1) {
                return res.status(400).json({
                    message: `limit debe ser un entero entre 1 y ${MAX_LIMIT}`
                });
            }
            limit = Math.min(parsed, MAX_LIMIT);
        }

        const moods = await Mood.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.status(200).json({
            count: moods.length,
            limit,
            moods
        });
    } catch (err) {
        console.error('GET /api/moods:', err.message, err);
        res.status(500).json({ message: 'Error al obtener los estados de ánimo' });
    }
});

module.exports = router;
