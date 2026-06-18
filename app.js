require('dotenv').config();
const express = require('express');
const typeis = require('type-is');
const connectDB = require('./config/database');
const usersRoutes = require('./routes/users');
const moodsRoutes = require('./routes/moods');
const app = express();

// Conectar a la base de datos
connectDB();

// Middleware para parsear JSON
app.use(express.json());
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



