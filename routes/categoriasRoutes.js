const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriaController');
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Middleware para rutas protegidas
router.use(verificarToken);

// Rutas protegidas por permiso del módulo Categorías
router.get('/todas', verificarPermiso('Categorías'), categoriasController.obtenerTodasCategorias);
router.get('/', verificarPermiso('Categorías'), categoriasController.obtenerCategorias);
router.get('/:id', verificarPermiso('Categorías'), categoriasController.obtenerCategoria);

router.post(
  '/',
  verificarPermiso('Categorías'),
  upload.single('imagen'),
  categoriasController.crearCategoria
);

router.put(
  '/:id',
  verificarPermiso('Categorías'),
  upload.single('imagen'),
  categoriasController.editarCategoria
);

router.patch(
  '/estado/:id',
  verificarPermiso('Categorías'),
  categoriasController.cambiarEstadoCategoria
);

router.delete('/:id', verificarPermiso('Categorías'), categoriasController.eliminarCategoria);

// Obtener productos de una categoría específica
router.get('/:id/productos', categoriasController.obtenerProductosPorCategoria);

module.exports = router;
