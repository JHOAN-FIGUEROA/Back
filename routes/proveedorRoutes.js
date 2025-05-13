const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');

// Obtener todos los proveedores
router.get('/', proveedorController.obtenerProveedores);

// Obtener un proveedor por su NIT
router.get('/:nit', proveedorController.obtenerProveedorPorNit);

// Crear un nuevo proveedor
router.post('/', proveedorController.crearProveedor);

// Editar un proveedor por su NIT
router.put('/:nit', proveedorController.editarProveedor);

// Eliminar un proveedor por su NIT
router.delete('/:nit', proveedorController.eliminarProveedor);

module.exports = router;
