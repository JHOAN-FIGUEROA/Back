const express = require('express');
const router = express.Router();
const { verificarToken, verificarPermiso } = require('../middlewares/authMiddleware');
const usuarioController = require('../controllers/usuarioController');
// Asegúrate de que la ruta sea correcta

// Rutas públicas (no requieren autenticación)
router.post('/login', usuarioController.iniciarSesion);
router.post('/login/cliente', usuarioController.iniciarSesionCliente);
// router.post('/registrar', usuarioController.registrarUsuario); // Esta ruta se moverá a las protegidas
router.post('/registrar-usuarioycliente', usuarioController.registrarUsuarioYCliente);
router.post('/auth/recuperar-password', usuarioController.enviarTokenRecuperacion);
router.post('/auth/restablecer-password', usuarioController.restablecerContrasena);

// Rutas que requieren autenticación
router.use(verificarToken);

// Rutas que requieren permiso de Usuarios (sin prefijo /admin)
router.post('/registrar', verificarPermiso('Usuarios'), usuarioController.registrarUsuario);
router.get('/', verificarPermiso('Usuarios'), usuarioController.obtenerUsuarios);
router.get('/buscar', verificarPermiso('Usuarios'), usuarioController.buscarUsuarios);
router.get('/:idusuario', verificarPermiso('Usuarios'), usuarioController.verDetalleUsuario);
router.put('/:idusuario', verificarPermiso('Usuarios'), usuarioController.editarUsuario);
router.patch('/estado/:idusuario', verificarPermiso('Usuarios'), usuarioController.cambiarEstadoUsuario);
router.delete('/:idusuario', verificarPermiso('Usuarios'), usuarioController.eliminarUsuario);

// Rutas que requieren autenticación pero no permiso específico
router.get('/perfil', usuarioController.verPerfil);
router.put('/perfil', usuarioController.editarPerfil);

module.exports = router;
