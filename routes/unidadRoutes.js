const express = require('express');
const router = express.Router();
const unidadController = require('../controllers/unidadController');
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get('/', verificarPermiso('Productos'), unidadController.getUnidades);
router.get('/todas', verificarPermiso('Productos'), unidadController.getUnidadess);
router.post('/', verificarPermiso('Productos'), unidadController.createUnidad);
router.put('/:id', verificarPermiso('Productos'), unidadController.updateUnidad);
router.delete('/:id', verificarPermiso('Productos'), unidadController.deleteUnidad);

module.exports = router;
