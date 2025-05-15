const express = require('express');
const app = express();
const sequelize = require('./config/database');
require('dotenv').config();
const cors = require('cors');
app.use(cors());


app.use(express.json());


const usuariosRoutes = require('./routes/usuariosRoutes');
const rolesRoutes = require('./routes/rolRoutes');  
app.use('/api/rol', rolesRoutes);// Ajusta la ruta
app.use('/api/usuarios', usuariosRoutes); // Acceso: /api/usuarios/registrar



const proveedorRoutes = require('./routes/proveedorRoutes');
app.use('/api/proveedores', proveedorRoutes);




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
