const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const productosController = require('../controllers/productoController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de productos requieren el permiso 'Productos'
router.use(verificarPermiso('Productos'));

// Rutas de productos
router.get('/', productosController.getProductos);
router.get('/buscar', productosController.getProductos); // Puedes usar la misma función para búsqueda
router.get('/:id', productosController.getProductoById);
router.post('/', productosController.createProducto);
router.put('/:id', productosController.updateProducto);
router.delete('/:id', productosController.deleteProducto);

module.exports = router;
