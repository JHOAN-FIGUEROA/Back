const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolController');

router.get('/', rolesController.obtenerRoles);
router.get('/buscar', rolesController.buscarRoles);
router.get('/:id', rolesController.obtenerDetalleRol);
router.post('/', rolesController.crearRol);
router.put('/estado/:id', rolesController.cambiarEstadoRol);
router.put('/:id', rolesController.editarRol);
router.delete('/:id', rolesController.eliminarRol);
module.exports = router;
