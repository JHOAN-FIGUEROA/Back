const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const clientesController = require('../controllers/clientesController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de clientes requieren el permiso 'Clientes'
router.use(verificarPermiso('Clientes'));

// Rutas de clientes
router.get('/', clientesController.obtenerClientes);
router.get('/buscar', clientesController.buscarClientes);
router.get('/:id', clientesController.obtenerCliente);
router.post('/', clientesController.crearCliente);
router.put('/:id', clientesController.editarCliente);
router.delete('/:id', clientesController.eliminarCliente);

module.exports = router; 