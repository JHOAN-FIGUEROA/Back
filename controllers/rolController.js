const { rol, roles_permisos, permisos } = require('../models'); // Asegúrate de tener la ruta correcta para tus modelos
const { Op } = require('sequelize');
const { usuarios: Usuario, cliente: Cliente } = require('../models');
const ResponseHandler = require('../utils/responseHandler');

module.exports = {
  // Obtener roles con paginación
  async obtenerRoles(req, res) {
    try {
      // Aceptar tanto page/limit como pagina/limite
      const page = parseInt(req.query.page || req.query.pagina) || 1;
      const limit = parseInt(req.query.limit || req.query.limite) || 5;

      // Asegurarnos de que page y limit sean números positivos
      if (page < 1) {
        return res.status(400).json({ 
          error: 'Página inválida',
          detalles: 'El número de página debe ser mayor a 0'
        });
      }

      if (limit < 1) {
        return res.status(400).json({ 
          error: 'Límite inválido',
          detalles: 'El límite debe ser mayor a 0'
        });
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await rol.findAndCountAll({ // Solo roles activos en la paginación
        attributes: ['idrol', 'nombre', 'estado'],
        limit: limit,
        offset: offset,
        order: [['nombre', 'ASC']]
      });

      console.log('ObtenerRoles (Paginado) - Condiciones:', { estado: true });
      console.log('ObtenerRoles (Paginado) - Paginación:', { page, limit, offset });

      const totalPaginas = Math.ceil(count / limit);

      // Validar si la página solicitada existe
      if (page > totalPaginas && count > 0) {
        return res.status(400).json({ 
          error: 'Página no encontrada',
          detalles: `La página ${page} no existe. El total de páginas es ${totalPaginas}`
        });
      }

      return res.status(200).json({
        roles: rows,
        total: count,
        totalPaginas: totalPaginas,
        paginaActual: page,
        paginaSiguiente: page < totalPaginas ? page + 1 : null,
        paginaAnterior: page > 1 ? page - 1 : null,
        limite: limit
      });

    } catch (error) {
      console.error('Error al obtener roles (paginado):', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        detalles: process.env.NODE_ENV === 'development' ? error.message : 'Ha ocurrido un error al obtener los roles paginados'
      });
    }
  },

  // Nueva función para obtener todos los roles activos sin paginación (para selectores)
  async obtenerRolesActivosParaSelector(req, res) {
    try {
      console.log('ObtenerRolesActivosParaSelector - Solicitud recibida');
      const rolesActivos = await rol.findAll({
        where: { estado: true }, // Solo roles activos
        attributes: ['idrol', 'nombre'], // Solo campos necesarios para selectores
        order: [['nombre', 'ASC']] // Ordenar por nombre
      });

      console.log('ObtenerRolesActivosParaSelector - Roles encontrados:', rolesActivos.length);

      // Devolver directamente el array de roles
      return res.status(200).json(rolesActivos);

    } catch (error) {
      console.error('Error al obtener roles activos para selector:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        detalles: process.env.NODE_ENV === 'development' ? error.message : 'Ha ocurrido un error al obtener los roles para selector'
      });
    }
  },

  // Obtener detalle de un rol con permisos
async obtenerDetalleRol(req, res) {
  try {
    const { id } = req.params;

    // Validar que el ID sea proporcionado y sea un número válido
    if (!id || isNaN(id)) {
      return res.status(400).json({ mensaje: 'ID de rol no proporcionado o inválido' });
    }

    const rolConPermisos = await rol.findOne({
      where: { idrol: id },
      attributes: ['idrol', 'nombre', 'descripcion', 'estado'], // Incluimos explícitamente todos los campos
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
      return res.status(404).json({ mensaje: 'Rol no encontrado' });
    }

    res.json(rolConPermisos);
  } catch (error) {
    console.error('Error al obtener detalles del rol:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
},


  // Cambiar estado del rol (activo/inactivo)
  async cambiarEstadoRol(req, res) {
    const { id } = req.params;
    // Validar que el ID sea proporcionado y sea un número válido
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de rol no proporcionado o inválido' });
    }

    // *** Nueva verificación para el rol administrador ***
    if (parseInt(id) === 1) {
      return res.status(403).json({
        error: 'Operación no permitida',
        detalles: 'No se permite cambiar el estado del rol de administrador.'
      });
    }

    try {
      const rolEncontrado = await rol.findByPk(id);
      if (!rolEncontrado) return res.status(404).json({ error: 'Rol no encontrado' });

      rolEncontrado.estado = !rolEncontrado.estado;
      await rolEncontrado.save();

      res.json({ mensaje: 'Estado del rol actualizado', estado: rolEncontrado.estado });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al cambiar estado del rol' });
    }
  },
 // Crear un nuevo rol y asociarle permisos
  async crearRol(req, res) {
    try {
      const { nombre, estado, permisos_ids } = req.body;

      // Validaciones de campos requeridos
      if (!nombre || !Array.isArray(permisos_ids)) {
        return ResponseHandler.error(res, 'Datos requeridos', 'Nombre y lista de permisos (array) son requeridos', 400);
      }

      // Limpiar espacios en el nombre
      const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;

      // Validar que el nombre no esté vacío después de limpiar espacios
      if (nombreTrimmed === '') {
        return ResponseHandler.error(res, 'Nombre inválido', 'El nombre del rol no puede estar vacío o contener solo espacios', 400);
      }

      // Validar que no exista un rol con el mismo nombre (ignorando mayúsculas/minúsculas)
      const rolExistente = await rol.findOne({ where: { nombre: { [Op.iLike]: nombreTrimmed } } });
      if (rolExistente) {
        return ResponseHandler.error(res, 'Nombre duplicado', 'Ya existe un rol con ese nombre', 400);
      }

      // Validar que permisos_ids no contenga valores nulos o indefinidos y sean números
      const permisosValidos = permisos_ids.filter(id => id !== null && id !== undefined && !isNaN(id)).map(Number);

      if (permisosValidos.length !== permisos_ids.length) {
        return res.status(400).json({ error: 'La lista de permisos contiene valores inválidos (deben ser números).' });
      }

      // *** Nueva validación: El rol debe tener al menos un permiso ***
      if (permisosValidos.length === 0) {
         return res.status(400).json({
           error: 'Validación fallida',
           detalles: 'Al crear un rol, se debe asociar al menos un permiso.'
         });
      }

      // Crear el rol
      const nuevoRol = await rol.create({ nombre: nombreTrimmed, estado });

      // Asociar permisos
      const asociaciones = permisosValidos.map(idPermiso => ({
        rol_idrol: nuevoRol.idrol,
        permisos_idpermisos: idPermiso
      }));

      // Ya validamos que hay al menos un permiso, así que asociaciones.length > 0 es siempre verdadero aquí
      await roles_permisos.bulkCreate(asociaciones);

      res.status(201).json({ mensaje: 'Rol creado con éxito', rol: nuevoRol });
    } catch (error) {
      console.error('Error al crear el rol:', error);
      res.status(500).json({ error: 'Error al crear el rol' });
    }
  },
  async editarRol(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, estado, permisos: nuevosPermisos } = req.body;
  
      // Validar que el ID sea proporcionado y sea un número válido
      if (!id || isNaN(id)) {
        return ResponseHandler.error(res, 'ID inválido', 'ID de rol no proporcionado o inválido', 400);
      }

      // *** Nueva verificación para el rol administrador ***
      if (parseInt(id) === 1) {
        const datosAActualizarAdmin = {};

        if (nombre !== undefined) {
           const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
           if (!nombreTrimmed) {
             return res.status(400).json({ 
               error: 'Nombre inválido',
               detalles: 'El nombre del rol no puede estar vacío'
             });
           }
           datosAActualizarAdmin.nombre = nombreTrimmed;
        }

        if (descripcion !== undefined) {
           const descripcionTrimmed = typeof descripcion === 'string' ? descripcion.trim() : descripcion;
           if (!descripcionTrimmed) {
             return res.status(400).json({ 
               error: 'Descripción inválida',
               detalles: 'La descripción no puede estar vacía'
             });
           }
           datosAActualizarAdmin.descripcion = descripcionTrimmed;
        }

        // Si se intentan modificar otros campos, retornar error
        if (estado !== undefined || nuevosPermisos !== undefined) {
           return res.status(403).json({
              error: 'Operación no permitida',
              detalles: 'No se puede cambiar el estado o los permisos del rol de administrador'
           });
        }

        // Si no hay campos válidos para actualizar, retornar error
        if (Object.keys(datosAActualizarAdmin).length === 0) {
           return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar el rol de administrador' });
        }

        const rolEncontradoAdmin = await rol.findByPk(id);
         if (!rolEncontradoAdmin) {
           return res.status(404).json({ 
             error: 'Rol no encontrado',
             detalles: `No existe un rol con el ID ${id}`
           });
         }

         await rolEncontradoAdmin.update(datosAActualizarAdmin);

        return res.status(200).json({
           message: 'Rol de administrador actualizado con éxito (solo nombre/descripción)',
           rol: rolEncontradoAdmin // Retornar el rol actualizado
        });
      }

      // Si no es el rol administrador, proceder con la lógica de edición completa

      const rolEncontrado = await rol.findByPk(id);
      if (!rolEncontrado) {
        return res.status(404).json({ 
          error: 'Rol no encontrado',
          detalles: `No existe un rol con el ID ${id}`
        });
      }
  
      // Actualizar solo los campos enviados y aplicar validaciones
      const datosAActualizar = {};
  
      if (nombre !== undefined) {
        const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
        // Validar que no exista otro rol con el mismo nombre
        const rolExistente = await rol.findOne({
          where: {
            nombre: { [Op.iLike]: nombreTrimmed },
            idrol: { [Op.ne]: id }
          }
        });
        if (rolExistente) {
          return ResponseHandler.error(res, 'Nombre duplicado', 'Ya existe un rol con ese nombre', 400);
        }
        if (!nombreTrimmed) {
          return ResponseHandler.error(res, 'Nombre inválido', 'El nombre del rol no puede estar vacío', 400);
        }
        datosAActualizar.nombre = nombreTrimmed;
      }
  
      if (descripcion !== undefined) {
        const descripcionTrimmed = typeof descripcion === 'string' ? descripcion.trim() : descripcion;
        if (!descripcionTrimmed) {
          return res.status(400).json({ 
            error: 'Descripción inválida',
            detalles: 'La descripción no puede estar vacía'
          });
        }
        datosAActualizar.descripcion = descripcionTrimmed;
      }
  
      if (estado !== undefined) {
        // Convertir el estado a booleano si es necesario
        let estadoBooleano;
        if (typeof estado === 'string') {
          estadoBooleano = estado.toLowerCase() === 'true';
        } else {
          estadoBooleano = Boolean(estado);
        }
        datosAActualizar.estado = estadoBooleano;
      }
  
      // Actualizar los datos básicos del rol si hay cambios
      if (Object.keys(datosAActualizar).length > 0) {
        await rolEncontrado.update(datosAActualizar);
      }
  
      // Si se envía un array de permisos, actualizarlos
      if (Array.isArray(nuevosPermisos)) {
        // Validar que permisos_ids no contenga valores nulos o indefinidos y sean números
        const permisosValidos = nuevosPermisos.filter(idpermiso => 
          idpermiso !== null && 
          idpermiso !== undefined && 
          !isNaN(idpermiso)
        ).map(Number);
  
        if (permisosValidos.length !== nuevosPermisos.length) {
          return res.status(400).json({ 
            error: 'Permisos inválidos',
            detalles: 'La lista de permisos contiene valores inválidos (deben ser números).'
          });
        }

        // *** Nueva validación: El rol debe tener al menos un permiso si se envían permisos para actualizar ***
        if (permisosValidos.length === 0) {
          return res.status(400).json({
            error: 'Validación fallida',
            detalles: 'Al editar un rol, si se envían permisos, se debe asociar al menos uno.'
          });
        }
  
        // Eliminar permisos actuales
        await roles_permisos.destroy({ where: { rol_idrol: id } });
  
        // Crear los nuevos permisos
        const permisosAInsertar = permisosValidos.map(idpermiso => ({
          rol_idrol: id,
          permisos_idpermisos: idpermiso
        }));
  
        if (permisosAInsertar.length > 0) {
          await roles_permisos.bulkCreate(permisosAInsertar);
        }
      }
  
      // Obtener el rol actualizado con sus permisos
      const rolActualizado = await rol.findOne({
        where: { idrol: id },
        include: [{
          model: roles_permisos,
          as: 'permisos_asociados',
          include: [{
            model: permisos,
            as: 'permiso'
          }]
        }]
      });
  
      return res.status(200).json({
        message: 'Rol actualizado con éxito',
        rol: rolActualizado
      });
    } catch (error) {
      console.error('Error al editar rol:', error);
      return res.status(500).json({ 
        error: 'Error interno',
        detalles: 'Error al actualizar el rol'
      });
    }
  },
async eliminarRol(req, res) {
  const { id } = req.params;

  // Validar que el ID sea proporcionado y sea un número válido
    if (!id || isNaN(id)) {
      return res.status(400).json({ mensaje: 'ID de rol no proporcionado o inválido' });
    }

  // *** Nueva verificación para el rol administrador ***
  if (parseInt(id) === 1) {
    return res.status(403).json({ 
      error: 'Operación no permitida',
      detalles: 'No se permite eliminar el rol de administrador.'
    });
  }

  try {
    // Verificar si el rol existe
    const rolEncontrado = await rol.findByPk(id);
    if (!rolEncontrado) {
      return res.status(404).json({ mensaje: 'Rol no encontrado' });
    }

    // Verificar si el rol tiene usuarios asociados
    const usuariosConRol = await Usuario.count({ where: { rol_idrol: id } });
    if (usuariosConRol > 0) {
      return res.status(400).json({ mensaje: 'No se puede eliminar el rol porque tiene usuarios asociados' });
    }

    // Eliminar las asociaciones con los permisos
    await roles_permisos.destroy({ where: { rol_idrol: id } });

    // Eliminar el rol
    await rol.destroy({ where: { idrol: id } });

    res.json({ mensaje: 'Rol y sus permisos asociados eliminados con éxito' });
  } catch (error) {
    console.error('Error al eliminar el rol:', error);
    res.status(500).json({ mensaje: 'Error al eliminar el rol' });
  }
},
async buscarRoles (req, res)  {
  try {
    console.log('Parámetros de búsqueda recibidos:', req.query);

    const {
      nombre,
      estado,
      pagina = 1,
      limite = 10
    } = req.query;

    // Construir objeto de condiciones dinámicas
    const condiciones = {};

    if (nombre) {
        const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
        if (nombreTrimmed === '') return res.status(400).json({ error: 'El nombre del rol en la búsqueda no puede estar vacío' });
      condiciones.nombre = { [Op.iLike]: `%${nombreTrimmed}%` };
    }

    if (estado !== undefined) {
      condiciones.estado = estado === 'true'; // convierte string a boolean
    }

    console.log('Condiciones de búsqueda:', condiciones);

    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    const { count, rows } = await rol.findAndCountAll({
      where: condiciones,
      limit: parseInt(limite),
      offset: offset,
      order: [['idrol', 'ASC']]
    });

    const totalPaginas = Math.ceil(count / parseInt(limite));

    return res.status(200).json({
      roles: rows,
      total: count,
      totalPaginas,
      paginaActual: parseInt(pagina),
      paginaSiguiente: parseInt(pagina) < totalPaginas ? parseInt(pagina) + 1 : null,
      paginaAnterior: parseInt(pagina) > 1 ? parseInt(pagina) - 1 : null
    });

  } catch (error) {
    console.error('Error al buscar roles:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

};