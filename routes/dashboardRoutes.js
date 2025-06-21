const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

// Todas las rutas del dashboard requieren autenticación
router.use(verificarToken);

// Y también requieren el permiso específico de 'Dashboard'
router.use(verificarPermiso('Dashboard'));

// Ruta para obtener todas las estadísticas del dashboard
// GET /api/dashboard/
router.get('/', dashboardController.obtenerEstadisticas);

module.exports = router; 