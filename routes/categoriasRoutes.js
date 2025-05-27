const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const categoriasController = require('../controllers/categoriasController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de categorías requieren el permiso 'Categorías'
router.use(verificarPermiso('Categorías'));

// Rutas de categorías
router.get('/', categoriasController.obtenerCategorias);
router.get('/buscar', categoriasController.buscarCategorias);
router.get('/:id', categoriasController.obtenerCategoria);
router.post('/', categoriasController.crearCategoria);
router.put('/:id', categoriasController.editarCategoria);
router.delete('/:id', categoriasController.eliminarCategoria);

module.exports = router; 