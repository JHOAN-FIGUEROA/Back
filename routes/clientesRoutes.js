const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');

// Rutas públicas
router.post('/registro', clientesController.crearCliente);

// Rutas que requieren autenticación
router.use(verificarToken);

// Rutas que requieren permiso de Clientes
router.get('/', verificarPermiso('Clientes'), clientesController.obtenerClientes);
router.get('/buscar', verificarPermiso('Clientes'), clientesController.buscarClientes);
router.get('/:id', verificarPermiso('Clientes'), clientesController.obtenerCliente);
router.put('/:id', verificarPermiso('Clientes'), clientesController.actualizarCliente);
router.delete('/:id', verificarPermiso('Clientes'), clientesController.eliminarCliente);
router.patch('/:id/estado', verificarPermiso('Clientes'), clientesController.cambiarEstadoCliente);
router.get('/todos', verificarPermiso('Clientes'), clientesController.obtenerTodosClientesActivos);

// Rutas de perfil para cliente móvil (solo requieren autenticación)
router.get('/perfil/:documentocliente', clientesController.obtenerPerfilCliente);
router.put('/perfil/:documentocliente', clientesController.actualizarPerfilCliente);
router.put('/perfil/:documentocliente/password', clientesController.actualizarPasswordCliente);

module.exports = router; 