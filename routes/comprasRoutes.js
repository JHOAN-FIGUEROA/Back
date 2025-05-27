const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const comprasController = require('../controllers/comprasController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de compras requieren el permiso 'Compras'
router.use(verificarPermiso('Compras'));

// Rutas de compras
router.get('/', comprasController.obtenerCompras);
router.get('/buscar', comprasController.buscarCompras);
router.get('/:id', comprasController.obtenerCompra);
router.post('/', comprasController.crearCompra);
router.put('/:id', comprasController.editarCompra);
router.delete('/:id', comprasController.eliminarCompra);

module.exports = router; 