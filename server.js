const express = require('express');
const app = express();
const sequelize = require('./config/database');
require('dotenv').config();
const cors = require('cors');

// Configuración de CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json());

// Middleware para manejar errores de formato JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Error de formato',
      detalles: 'El JSON enviado no es válido'
    });
  }
  next();
});

// Middleware para manejar errores no capturados
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);

  // Errores de Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      detalles: err.errors.map(e => e.message)
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Error de duplicación',
      detalles: 'Ya existe un registro con estos datos'
    });
  }

  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      error: 'Error de conexión',
      detalles: 'No se pudo conectar con la base de datos'
    });
  }

  // Error por defecto
  res.status(500).json({
    error: 'Error interno del servidor',
    detalles: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error inesperado'
  });
});

// Rutas
const usuariosRoutes = require('./routes/usuariosRoutes');
const rolesRoutes = require('./routes/rolRoutes');  
app.use('/api/rol', rolesRoutes);// Ajusta la ruta
app.use('/api/usuarios', usuariosRoutes); // Acceso: /api/usuarios/registrar

const proveedorRoutes = require('./routes/proveedorRoutes');
app.use('/api/proveedores', proveedorRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    detalles: 'La ruta solicitada no existe'
  });
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Conectado a la base de datos PostgreSQL');
  })
  .catch(err => {
    console.error('❌ Error al conectar a la base de datos:', err);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
