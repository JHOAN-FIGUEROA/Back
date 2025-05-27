const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const rolController = require('../controllers/rolController');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Todas las rutas de roles requieren el permiso 'Roles'
router.use(verificarPermiso('Roles'));

// Rutas de roles
router.get('/', rolController.obtenerRoles);
router.get('/r', rolController.obtenerRolesActivosParaSelector);
router.get('/buscar', rolController.buscarRoles);
router.get('/:id', rolController.obtenerDetalleRol);
router.post('/', rolController.crearRol);
router.put('/estado/:id', rolController.cambiarEstadoRol);
router.put('/:id', rolController.editarRol);
router.delete('/:id', rolController.eliminarRol);

module.exports = router;
