const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const proveedoresController = require('../controllers/proveedoresController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de proveedores requieren el permiso 'Proveedores'
router.use(verificarPermiso('Proveedores'));

// Rutas de proveedores
router.get('/', proveedoresController.obtenerProveedores);
router.get('/buscar', proveedoresController.buscarProveedores);
router.get('/:id', proveedoresController.obtenerProveedor);
router.post('/', proveedoresController.crearProveedor);
router.put('/:id', proveedoresController.editarProveedor);
router.delete('/:id', proveedoresController.eliminarProveedor);

module.exports = router; 