const jwt = require('jsonwebtoken');
const { usuarios, roles_permisos, permisos } = require('../models');
const ResponseHandler = require('../utils/responseHandler');

const verificarToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return ResponseHandler.unauthorized(res, 'Acceso no autorizado.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    
    // Buscar el usuario en la base de datos
    const usuario = await usuarios.findByPk(decoded.id);
    if (!usuario) {
      return ResponseHandler.unauthorized(res, 'Acceso no autorizado.');
    }

    // Verificar si el usuario está activo
    if (!usuario.estado) {
      return ResponseHandler.error(res, 'Cuenta inactiva', 'Tu cuenta está inactiva. Por favor, contacta al administrador', 403);
    }

    // Agregar información del usuario a la request
    req.usuario = {
      id: usuario.idusuario,
      rol: usuario.rol_idrol
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return ResponseHandler.unauthorized(res, 'Acceso no autorizado.');
    }
    console.error('Error en middleware de autenticación:', error);
    return ResponseHandler.error(res, 'Error interno', 'Error al verificar la autenticación');
  }
};

// Middleware para verificar permisos específicos
const verificarPermiso = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario) {
        return ResponseHandler.unauthorized(res, 'Usuario no autenticado');
      }

      // Buscar el permiso requerido
      const permiso = await permisos.findOne({
        where: { nombre: permisoRequerido }
      });

      if (!permiso) {
        return ResponseHandler.error(res, 'Error de configuración', 'El permiso requerido no existe en el sistema');
      }

      // Verificar si el rol del usuario tiene el permiso
      const tienePermiso = await roles_permisos.findOne({
        where: {
          rol_idrol: req.usuario.rol,
          permisos_idpermisos: permiso.idpermisos
        }
      });

      if (!tienePermiso) {
        return ResponseHandler.error(res, 'Acceso denegado', 'No tienes permiso para realizar esta acción', 403);
      }

      next();
    } catch (error) {
      console.error('Error al verificar permisos:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al verificar los permisos');
    }
  };
};

module.exports = {
  verificarToken,
  verificarPermiso
};
