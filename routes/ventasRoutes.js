const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const ventasController = require('../controllers/ventasController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de ventas requieren el permiso 'Ventas'
router.use(verificarPermiso('Ventas'));

// Rutas de ventas
router.get('/', ventasController.obtenerVentas);
router.get('/buscar', ventasController.buscarVentas);
router.get('/:id', ventasController.obtenerVenta);
router.post('/', ventasController.crearVenta);
router.put('/:id', ventasController.editarVenta);
router.delete('/:id', ventasController.eliminarVenta);

module.exports = router; 