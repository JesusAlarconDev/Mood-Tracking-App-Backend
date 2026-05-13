require('dotenv').config();
const express = require('express');
const typeis = require('type-is');
const connectDB = require('./config/database');
const usersRoutes = require('./routes/users');
const moodsRoutes = require('./routes/moods');
const app = express();

// Conectar a la base de datos
connectDB();

// JSON: en producción solo si Content-Type es JSON (correcto). En dev, tolerar body sin header (Postman mal puesto).
function jsonBodyType(req) {
    if (typeis(req, 'json') || typeis(req, '+json')) return true;
    if (process.env.NODE_ENV !== 'production') {
        if (!String(req.headers['content-type'] || '').trim() && typeis.hasBody(req)) return true;
    }
    return false;
}

app.use(express.json({ type: jsonBodyType }));
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello world!');
});

app.use('/api/users', usersRoutes);
app.use('/api/moods', moodsRoutes);

app.listen(PORT, ( ) => {
    console.log(`Nuestra Aplicacion esta funcionando en el puerto ${PORT}`);
});



