const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');

// Obtener todos los proveedores
router.get('/', proveedorController.obtenerProveedores);

// Obtener todos los proveedores sin paginación
router.get('/todos', proveedorController.obtenerTodosProveedores);

router.get('/buscar', proveedorController.buscarProveedores);

// Obtener un proveedor por su NIT
router.get('/:nit', proveedorController.verDetalleProveedor);

// Crear un nuevo proveedor
router.post('/', proveedorController.crearProveedor);

// Editar un proveedor por su NIT
router.put('/:nit', proveedorController.editarProveedor);
router.put('/estado/:nit', proveedorController.cambiarEstadoProveedor);

// Eliminar un proveedor por su NIT
router.delete('/:nit', proveedorController.eliminarProveedor);

module.exports = router;
