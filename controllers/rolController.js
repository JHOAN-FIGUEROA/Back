const { rol, roles_permisos, permisos } = require('../models'); // Asegúrate de tener la ruta correcta para tus modelos
const { Op } = require('sequelize');
const { usuarios: Usuario, cliente: Cliente } = require('../models');
const ResponseHandler = require('../utils/responseHandler');

const rolController = {
  // Obtener roles con paginación
  async obtenerRoles(req, res) {
    try {
      const page = parseInt(req.query.page) || 1; // Usamos 'page' y 'limit' para consistencia
      const limit = parseInt(req.query.limit) || 5; // Límite por defecto 10

      // Validar parámetros de paginación
      if (page < 1 || limit < 1) {
        return ResponseHandler.validationError(res, {
          general: 'La página y el límite deben ser números positivos'
        });
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await rol.findAndCountAll({
        where: { estado: true },
        attributes: ['idrol', 'nombre', 'estado'],
        limit: limit,
        offset: offset,
        order: [['nombre', 'ASC']]
      });

      const totalPaginas = Math.ceil(count / limit);

      // Validar si la página solicitada existe
      if (page > totalPaginas && count > 0) {
        return ResponseHandler.error(res, 'Página no encontrada', `La página ${page} no existe. El total de páginas es ${totalPaginas}`, 400);
      }

      // Formatear los roles para asegurar una serialización correcta
      const rolesFormateados = rows.map(rol => ({
        id: rol.idrol,
        nombre: rol.nombre,
        estado: rol.estado
      }));

      return ResponseHandler.success(res, {
        roles: rolesFormateados,
        paginacion: {
          total: count,
          totalPaginas,
          paginaActual: page,
          paginaSiguiente: page < totalPaginas ? page + 1 : null,
          paginaAnterior: page > 1 ? page - 1 : null,
          limite: limit
        }
      });

    } catch (error) {
      console.error('Error al obtener roles:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener los roles');
    }
  },

  // Obtener todos los roles activos sin paginación
  async obtenerRolesActivosParaSelector(req, res) {
    try {
      const rolesActivos = await rol.findAll({
        where: { estado: true },
        attributes: ['idrol', 'nombre'],
        order: [['nombre', 'ASC']]
      });

      return ResponseHandler.success(res, {
        roles: rolesActivos
      });

    } catch (error) {
      console.error('Error al obtener roles activos para selector:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener los roles para selector');
    }
  },

  // Obtener detalle de un rol con permisos
  async obtenerDetalleRol(req, res) {
    try {
      const { id } = req.params;

      // Validar que el ID sea proporcionado y sea un número válido
      if (!id || isNaN(id)) {
        return ResponseHandler.validationError(res, {
          id: 'El ID del rol es requerido y debe ser un número válido'
        });
      }

      const rolConPermisos = await rol.findOne({
        where: { idrol: id },
        attributes: ['idrol', 'nombre', 'descripcion', 'estado'],
        include: [
          {
            model: roles_permisos,
            as: 'permisos_asociados',
            include: [
              {
                model: permisos,
                as: 'permiso',
                attributes: ['idpermisos', 'nombre', 'descripcion']
              }
            ]
          }
        ]
      });

      if (!rolConPermisos) {
        return ResponseHandler.error(res, 'Rol no encontrado', 'No existe un rol con el ID proporcionado', 404);
      }

      // Formatear el rol y sus permisos para asegurar una serialización correcta
      const rolFormateado = {
        id: rolConPermisos.idrol,
        nombre: rolConPermisos.nombre,
        descripcion: rolConPermisos.descripcion,
        estado: rolConPermisos.estado,
        permisos: rolConPermisos.permisos_asociados.map(rp => ({
          id: rp.permiso.idpermisos,
          nombre: rp.permiso.nombre,
          descripcion: rp.permiso.descripcion
        }))
      };

      return ResponseHandler.success(res, rolFormateado);
    } catch (error) {
      console.error('Error al obtener detalles del rol:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener los detalles del rol');
    }
  },

  // Cambiar estado del rol
  async cambiarEstadoRol(req, res) {
    try {
      const { id } = req.params;

      // Validar que el ID sea un número
      if (!id || isNaN(id)) {
        return ResponseHandler.validationError(res, {
          id: 'El ID del rol es requerido y debe ser un número válido'
        });
      }

      // Verificar si es el rol administrador
      if (parseInt(id) === 1) {
        return ResponseHandler.error(res, 'Operación no permitida', 'No se permite cambiar el estado del rol de administrador', 403);
      }

      const rolEncontrado = await rol.findByPk(id);
      if (!rolEncontrado) {
        return ResponseHandler.error(res, 'Rol no encontrado', 'No existe un rol con el ID proporcionado', 404);
      }

      rolEncontrado.estado = !rolEncontrado.estado;
      await rolEncontrado.save();

      return ResponseHandler.success(res, {
        mensaje: 'Estado del rol actualizado',
        estado: rolEncontrado.estado 
      });
    } catch (error) {
      console.error('Error al cambiar estado del rol:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al cambiar estado del rol');
    }
  },

  // Crear rol
  async crearRol(req, res) {
    try {
      const { nombre, permisos } = req.body;

      // Validar campos requeridos
      if (!nombre || !permisos) {
        return ResponseHandler.validationError(res, {
          nombre: !nombre ? 'El nombre es requerido' : null,
          permisos: !permisos ? 'Los permisos son requeridos' : null
        });
      }

      // Validar tipo y longitud del nombre
      if (typeof nombre !== 'string' || nombre.length > 45) {
        return ResponseHandler.validationError(res, {
          nombre: 'El nombre debe ser una cadena de texto de máximo 45 caracteres'
        });
      }

      // Validar que permisos sea un array
      if (!Array.isArray(permisos)) {
        return ResponseHandler.validationError(res, {
          permisos: 'Los permisos deben ser un array'
        });
      }

      // Validar que cada permiso sea un número
      if (!permisos.every(permiso => typeof permiso === 'number')) {
        return ResponseHandler.validationError(res, {
          permisos: 'Cada permiso debe ser un número'
        });
      }

      // Crear el rol
      const nuevoRol = await rol.create({
        nombre,
        estado: true
      });

      // Asociar los permisos al rol
      await Promise.all(permisos.map(permisoId => 
        roles_permisos.create({
          rol_idrol: nuevoRol.idrol,
          permisos_idpermisos: permisoId
        })
      ));

      // Formatear el rol creado para asegurar una serialización correcta
      const rolFormateado = {
        id: nuevoRol.idrol,
        nombre: nuevoRol.nombre,
        estado: nuevoRol.estado,
        permisos: permisos.map(permisoId => ({
          id: permisoId,
          nombre: 'Permiso ' + permisoId // Aquí deberías obtener el nombre real del permiso
        }))
      };

      return ResponseHandler.success(res, {
        mensaje: 'Rol creado exitosamente',
        rol: rolFormateado
      });
    } catch (error) {
      console.error('Error al crear el rol:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al crear el rol');
    }
  },

  // Editar rol
  async editarRol(req, res) {
    try {
      const { id } = req.params;
      const { nombre, permisos } = req.body;

      // Validar que el ID sea un número
      if (!id || isNaN(id)) {
        return ResponseHandler.validationError(res, {
          id: 'El ID del rol es requerido y debe ser un número válido'
        });
      }

      // Validar campos requeridos
      if (!nombre || !permisos) {
        return ResponseHandler.validationError(res, {
          nombre: !nombre ? 'El nombre es requerido' : null,
          permisos: !permisos ? 'Los permisos son requeridos' : null
        });
      }

      // Validar tipo y longitud del nombre
      if (typeof nombre !== 'string' || nombre.length > 45) {
        return ResponseHandler.validationError(res, {
          nombre: 'El nombre debe ser una cadena de texto de máximo 45 caracteres'
        });
      }

      // Validar que permisos sea un array
      if (!Array.isArray(permisos)) {
        return ResponseHandler.validationError(res, {
          permisos: 'Los permisos deben ser un array'
        });
      }

      // Validar que cada permiso sea un número
      if (!permisos.every(permiso => typeof permiso === 'number')) {
        return ResponseHandler.validationError(res, {
          permisos: 'Cada permiso debe ser un número'
        });
      }

      // Verificar si es el rol administrador
      if (parseInt(id) === 1) {
        return ResponseHandler.error(res, 'Operación no permitida', 'No se permite editar el rol de administrador', 403);
      }

      const rolExistente = await rol.findByPk(id);
      if (!rolExistente) {
        return ResponseHandler.error(res, 'Rol no encontrado', 'No existe un rol con el ID proporcionado', 404);
      }

      // Actualizar el rol
      await rolExistente.update({ nombre });

      // Eliminar permisos existentes
      await roles_permisos.destroy({
        where: { rol_idrol: id }
      });

      // Asociar los nuevos permisos
      await Promise.all(permisos.map(permisoId => 
        roles_permisos.create({
          rol_idrol: id,
          permisos_idpermisos: permisoId
        })
      ));

      // Formatear el rol actualizado para asegurar una serialización correcta
      const rolFormateado = {
        id: rolExistente.idrol,
        nombre: rolExistente.nombre,
        estado: rolExistente.estado,
        permisos: permisos
      };

      return ResponseHandler.success(res, {
        mensaje: 'Rol actualizado exitosamente',
        rol: rolFormateado
      });
    } catch (error) {
      console.error('Error al editar rol:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al actualizar el rol');
    }
  },

  async eliminarRol(req, res) {
    try {
      const { id } = req.params;

      // Validar que el ID sea proporcionado y sea un número válido
      if (!id || isNaN(id)) {
        return ResponseHandler.validationError(res, {
          id: 'El ID del rol es requerido y debe ser un número válido'
        });
      }

      // *** Nueva verificación para el rol administrador ***
      if (parseInt(id) === 1) {
        return ResponseHandler.error(res, 'Operación no permitida', 'No se permite eliminar el rol de administrador', 403);
      }

      // Verificar si el rol existe
      const rolEncontrado = await rol.findByPk(id);
      if (!rolEncontrado) {
        return ResponseHandler.error(res, 'Rol no encontrado', 'No existe un rol con el ID proporcionado', 404);
      }

      // Verificar si el rol tiene usuarios asociados
      const usuariosConRol = await Usuario.count({ where: { rol_idrol: id } });
      if (usuariosConRol > 0) {
        return ResponseHandler.error(res, 'No se puede eliminar', 'El rol tiene usuarios asociados', 400);
      }

      // Eliminar las asociaciones con los permisos
      await roles_permisos.destroy({ where: { rol_idrol: id } });

      // Eliminar el rol
      await rol.destroy({ where: { idrol: id } });

      // Formatear la respuesta para asegurar una serialización correcta
      const respuestaFormateada = {
        mensaje: 'Rol y sus permisos asociados eliminados con éxito',
        rol: {
          id: id
        }
      };

      return ResponseHandler.success(res, respuestaFormateada);
    } catch (error) {
      console.error('Error al eliminar el rol:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al eliminar el rol');
    }
  },

  // Buscar roles
  async buscarRoles(req, res) {
    try {
      const {
        nombre,
        estado,
        pagina = 1,
        limite = 10
      } = req.query;

      // Validar parámetros de paginación
      if (pagina < 1 || limite < 1) {
        return ResponseHandler.validationError(res, {
          general: 'La página y el límite deben ser números positivos'
        });
      }

      // Construir objeto de condiciones dinámicas
      const condiciones = {};

      if (nombre) {
        const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
        if (nombreTrimmed === '') {
          return ResponseHandler.validationError(res, {
            nombre: 'El nombre del rol en la búsqueda no puede estar vacío'
          });
        }
        condiciones.nombre = { [Op.iLike]: `%${nombreTrimmed}%` };
      }

      if (estado !== undefined) {
        condiciones.estado = estado === 'true';
      }

      const offset = (parseInt(pagina) - 1) * parseInt(limite);

      const { count, rows } = await rol.findAndCountAll({
        where: condiciones,
        limit: parseInt(limite),
        offset: offset,
        order: [['idrol', 'ASC']]
      });

      const totalPaginas = Math.ceil(count / parseInt(limite));

      // Validar si la página solicitada existe
      if (pagina > totalPaginas && count > 0) {
        return ResponseHandler.error(res, 'Página no encontrada', `La página ${pagina} no existe. El total de páginas es ${totalPaginas}`, 400);
      }

      return ResponseHandler.success(res, {
        roles: rows,
        paginacion: {
          total: count,
          totalPaginas,
          paginaActual: parseInt(pagina),
          paginaSiguiente: parseInt(pagina) < totalPaginas ? parseInt(pagina) + 1 : null,
          paginaAnterior: parseInt(pagina) > 1 ? parseInt(pagina) - 1 : null,
          limite: parseInt(limite)
        }
      });

    } catch (error) {
      console.error('Error al buscar roles:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al buscar roles');
    }
  }
};

module.exports = rolController;