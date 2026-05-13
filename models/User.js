const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'El email es obligatorio'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un email válido']
    },
    password: {
        type: String,
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    name: {
        type: String,
        trim: true,
        maxlength: [50, 'El nombre no puede exceder 50 caracteres']
    },
    profilePicture: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            return ret;
        }
    }
});

// Middleware para encriptar contraseña antes de guardar (async sin next: compatible Mongoose 8+)
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Método para obtener estadísticas básicas del usuario
userSchema.methods.getStats = async function() {
    const Mood = mongoose.model('Mood');
    const stats = await Mood.aggregate([
        { $match: { user: this._id } },
        {
            $group: {
                _id: null,
                totalEntries: { $sum: 1 },
                lastEntry: { $max: '$createdAt' }
            }
        }
    ]);
    
    return stats[0] || {
        totalEntries: 0,
        lastEntry: null
    };
};

module.exports = mongoose.model('User', userSchema);
