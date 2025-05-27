const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const productosController = require('../controllers/productosController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de productos requieren el permiso 'Productos'
router.use(verificarPermiso('Productos'));

// Rutas de productos
router.get('/', productosController.obtenerProductos);
router.get('/buscar', productosController.buscarProductos);
router.get('/:id', productosController.obtenerProducto);
router.post('/', productosController.crearProducto);
router.put('/:id', productosController.editarProducto);
router.delete('/:id', productosController.eliminarProducto);

module.exports = router; 