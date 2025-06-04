const express = require('express');
const app = express();
const sequelize = require('./config/database');
require('dotenv').config();
const cors = require('cors');

// Configuración de CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://backend-wi7t.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
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
const clientesRoutes = require('./routes/clientesRoutes');
const categoriaRoutes = require('./routes/categoriasRoutes');


app.use('/api/rol', rolesRoutes);// Ajusta la ruta
app.use('/api/usuarios', usuariosRoutes); // Acceso: /api/usuarios/registrar
app.use('/api/clientes', clientesRoutes);
app.use('/api/categoria',categoriaRoutes)


const proveedorRoutes = require('./routes/proveedorRoutes');
app.use('/api/proveedores', proveedorRoutes);

// Ruta base informativa
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Bienvenido a la API de Postware',
    version: '1.0.0', // Ejemplo
    status: 'Operacional' // Ejemplo
  });
});

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
