const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const productosController = require('../controllers/productoController');
const upload = require('../middlewares/multer');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de productos requieren el permiso 'Productos'
router.use(verificarPermiso('Productos'));

// Rutas de productos
router.get('/', productosController.getProductos);
router.get('/buscar', productosController.buscarProductoPorCodigo);
router.get('/:id', productosController.getProductoById);
router.post('/', upload.single('imagen'), productosController.createProducto);
router.put('/:id', upload.single('imagen'), productosController.updateProducto);
router.patch('/:id/estado', productosController.cambiarEstadoProducto);
router.delete('/:id', productosController.deleteProducto);

module.exports = router;
