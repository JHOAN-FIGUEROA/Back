const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const { registrarUsuario, registrarUsuarioYCliente, iniciarSesion,editarUsuario,cambiarEstadoUsuario,obtenerUsuarios,verDetalleUsuario,
    eliminarUsuario,buscarUsuarios,enviarTokenRecuperacion,restablecerContrasena,verPerfil,editarPerfil } = require('../controllers/usuarioController');
// Asegúrate de que la ruta sea correcta

router.get('/perfil', verificarToken, verPerfil);// Ruta para registrar un nuevo usuario
router.get('/', obtenerUsuarios);
router.get('/buscar', buscarUsuarios);
router.get('/:idusuario', verDetalleUsuario);
router.post('/registrar', registrarUsuario);

router.put('/perfil', verificarToken, editarPerfil);

// Ruta para registrar un usuario y su cliente asociado
router.post('/registrar-usuarioycliente', registrarUsuarioYCliente);

// Ruta para iniciar sesión
router.post('/login', iniciarSesion);

router.post('/auth/recuperar-password', enviarTokenRecuperacion);
router.post('/auth/restablecer-password', restablecerContrasena);


router.put('/:idusuario',editarUsuario );

router.patch('/estado/:idusuario', cambiarEstadoUsuario);



router.delete('/:idusuario', eliminarUsuario);



module.exports = router;
