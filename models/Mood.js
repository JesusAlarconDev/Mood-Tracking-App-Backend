const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El ID del usuario es obligatorio']
    },
    todaysMood: {
        type: String,
        required: [true, 'El estado de ánimo es obligatorio'],
        enum: [
            'Very Happy', 'Happy', 'Neutral', 'Sad', 'Very Sad'
        ]
    },
    feelings: {
        type: [String],
        required: [true, 'Debe especificar al menos un sentimiento'],
        validate: {
            validator: function(value) {
                return Array.isArray(value) && value.length >= 1 && value.length <= 3;
            },
            message: 'Debe especificar entre 1 y 3 sentimientos'
        },
    },
    aboutYourDay: {
        type: String,
        trim: true,
        maxlength: [150, 'La descripción no puede exceder 150 caracteres']
    },
    sleepHours: [{
        type: String,
        enum: [
            '0-2', '3-4', '5-6', '7-8', '9+'
        ]
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices para búsquedas eficientes
moodSchema.index({ user: 1, createdAt: -1 });
moodSchema.index({ user: 1, todaysMood: -1 });
moodSchema.index({ todaysMood: 1 });
moodSchema.index({ createdAt: -1 });

// Virtual para fecha formateada
moodSchema.virtual('dateFormatted').get(function() {
    return this.createdAt.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Virtual para hora formateada
moodSchema.virtual('timeFormatted').get(function() {
    return this.createdAt.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Método estático para obtener estadísticas de un usuario
moodSchema.statics.getUserStats = async function(userId, startDate, endDate) {
    const matchStage = { user: mongoose.Types.ObjectId(userId) };
    
    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalEntries: { $sum: 1 },
                moodDistribution: { $push: '$todaysMood' },
                feelingsCount: { $sum: { $size: '$feelings' } },
                dateRange: {
                    $push: '$createdAt'
                }
            }
        },
        {
            $project: {
                totalEntries: 1,
                moodDistribution: {
                    $reduce: {
                        input: '$moodDistribution',
                        initialValue: {},
                        in: {
                            $mergeObjects: [
                                '$$value',
                                {
                                    $arrayToObject: [
                                        [{ k: '$$this', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] } }]
                                    ]
                                }
                            ]
                        }
                    }
                },
                avgFeelingsPerEntry: { $divide: ['$feelingsCount', '$totalEntries'] },
                firstEntry: { $min: '$dateRange' },
                lastEntry: { $max: '$dateRange' }
            }
        }
    ]);

    return stats[0] || null;
};

// Método estático para obtener tendencias semanales
moodSchema.statics.getWeeklyTrends = async function(userId, weeks = 4) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));

    return await this.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    week: { $week: '$createdAt' }
                },
                entriesCount: { $sum: 1 },
                moodTypes: { $push: '$todaysMood' },
                startDate: { $min: '$createdAt' },
                endDate: { $max: '$createdAt' }
            }
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);
};

// Middleware para validar que no haya entradas duplicadas en el mismo día
moodSchema.pre('save', async function() {
    if (!this.isNew) return;

    // En pre('save') createdAt puede aún no tener el default; no usar this.createdAt sin comprobar
    const day = this.createdAt != null ? new Date(this.createdAt) : new Date();
    if (this.createdAt == null) {
        this.createdAt = day;
    }

    const existingEntry = await this.constructor.findOne({
        user: this.user,
        createdAt: {
            $gte: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
            $lt: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
        }
    });

    if (existingEntry) {
        const error = new Error('Ya existe un registro de estado de ánimo para este día');
        error.code = 'DUPLICATE_ENTRY';
        throw error;
    }
});

module.exports = mongoose.model('Mood', moodSchema);
