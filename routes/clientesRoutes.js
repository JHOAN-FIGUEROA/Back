const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const clientesController = require('../controllers/clientesController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de clientes
router.get('/', verificarPermiso('Clientes'), clientesController.obtenerClientes);
router.get('/todos', verificarPermiso('Clientes'), clientesController.obtenerTodosClientes);
router.get('/buscar', verificarPermiso('Clientes'), clientesController.buscarClientes);

router.get('/:id', verificarPermiso('Clientes'), clientesController.obtenerCliente);
router.post('/', verificarPermiso('Clientes'), clientesController.crearCliente);
router.put('/:id', verificarPermiso('Clientes'), clientesController.actualizarCliente);
router.delete('/:id', verificarPermiso('Clientes'), clientesController.eliminarCliente);
router.patch('/estado/:id', verificarPermiso('Clientes'), clientesController.cambiarEstadoCliente);

module.exports = router; 