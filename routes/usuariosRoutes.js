const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const usuarioController = require('../controllers/usuarioController');
// Asegúrate de que la ruta sea correcta

// Rutas de autenticación y perfil
router.get('/perfil', verificarToken, usuarioController.verPerfil);
router.put('/perfil', verificarToken, usuarioController.editarPerfil);

// Rutas de usuarios
router.get('/', usuarioController.obtenerUsuarios);
router.get('/buscar', usuarioController.buscarUsuarios);
router.get('/:idusuario', usuarioController.verDetalleUsuario);
router.post('/registrar', usuarioController.registrarUsuario);

// Ruta para registrar un usuario y su cliente asociado
router.post('/registrar-usuarioycliente', usuarioController.registrarUsuarioYCliente);

// Ruta para iniciar sesión
router.post('/login', usuarioController.iniciarSesion);

router.put('/:idusuario', usuarioController.editarUsuario);

router.patch('/estado/:idusuario', usuarioController.cambiarEstadoUsuario);

router.delete('/:idusuario', usuarioController.eliminarUsuario);

// Rutas de recuperación de contraseña
router.post('/auth/recuperar-password', usuarioController.enviarTokenRecuperacion);
router.post('/auth/restablecer-password', usuarioController.restablecerContrasena);

module.exports = router;
