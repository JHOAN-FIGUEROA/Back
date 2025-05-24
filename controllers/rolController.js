const { rol, roles_permisos, permisos } = require('../models'); // Asegúrate de tener la ruta correcta para tus modelos
const { Op } = require('sequelize');
const { usuarios: Usuario, cliente: Cliente } = require('../models');
module.exports = {
  // Obtener todos los roles
  async obtenerRoles(req, res) {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 5;

    const offset = (pagina - 1) * limite;

    const rolesData = await rol.findAndCountAll({
      attributes: ['idrol', 'nombre', 'estado'],
      limit: limite,
      offset: offset,
      order: [['idrol', 'ASC']]
    });

    const totalPaginas = Math.ceil(rolesData.count / limite);

    return res.status(200).json({
      roles: rolesData.rows,
      total: rolesData.count,
      totalPaginas: totalPaginas,
      paginaActual: pagina,
      paginaSiguiente: pagina < totalPaginas ? pagina + 1 : null,
      paginaAnterior: pagina > 1 ? pagina - 1 : null
    });
  } catch (error) {
    console.error('Error al obtener roles:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
},

  // Obtener detalle de un rol con permisos
async  obtenerDetalleRol  (req, res)  {
  try {
    const { id } = req.params;

    // Validar que el ID sea proporcionado y sea un número válido
    if (!id || isNaN(id)) {
      return res.status(400).json({ mensaje: 'ID de rol no proporcionado o inválido' });
    }

    const rolConPermisos = await rol.findOne({
      where: { idrol: id },
      include: [
        {
          model: roles_permisos,
          as: 'permisos_asociados',
          include: [
            {
              model: permisos,
              as: 'permiso'
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
        return res.status(400).json({ error: 'Nombre y lista de permisos son requeridos' });
      }

      // Limpiar espacios en el nombre
      const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;

      // Validar que el nombre no esté vacío después de limpiar espacios
      if (nombreTrimmed === '') {
        return res.status(400).json({ error: 'El nombre del rol no puede estar vacío o contener solo espacios' });
      }

      // Validar que permisos_ids no contenga valores nulos o indefinidos y sean números
      const permisosValidos = permisos_ids.filter(id => id !== null && id !== undefined && !isNaN(id)).map(Number);

      if (permisosValidos.length !== permisos_ids.length) {
        return res.status(400).json({ error: 'La lista de permisos contiene valores inválidos' });
      }

      // Crear el rol
      const nuevoRol = await rol.create({ nombre: nombreTrimmed, estado });

      // Asociar permisos
      const asociaciones = permisosValidos.map(idPermiso => ({
        rol_idrol: nuevoRol.idrol,
        permisos_idpermisos: idPermiso
      }));

      if (asociaciones.length > 0) {
        await roles_permisos.bulkCreate(asociaciones);
      }

      res.status(201).json({ mensaje: 'Rol creado con éxito', rol: nuevoRol });
    } catch (error) {
      console.error('Error al crear el rol:', error);
      res.status(500).json({ error: 'Error al crear el rol' });
    }
  },
async editarRol(req, res) {
  const { id } = req.params;
  // Validar que el ID sea proporcionado y sea un número válido
    if (!id || isNaN(id)) {
      return res.status(400).json({ mensaje: 'ID de rol no proporcionado o inválido' });
    }
  const { nombre, descripcion, estado, permisos: nuevosPermisos } = req.body;

  try {
    const rolEncontrado = await rol.findByPk(id);
    if (!rolEncontrado) {
      return res.status(404).json({ mensaje: 'Rol no encontrado' });
    }

    // Actualizar solo los campos enviados y aplicar validaciones
    const datosAActualizar = {};

    if (nombre !== undefined) {
        const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
        if (nombreTrimmed === '') return res.status(400).json({ error: 'El nombre del rol no puede estar vacío' });
        datosAActualizar.nombre = nombreTrimmed;
    }

    if (descripcion !== undefined) {
         const descripcionTrimmed = typeof descripcion === 'string' ? descripcion.trim() : descripcion;
         if (descripcionTrimmed === '') return res.status(400).json({ error: 'La descripción no puede estar vacía' });
         datosAActualizar.descripcion = descripcionTrimmed;
    }

    if (estado !== undefined) {
        // Puedes agregar validaciones específicas para estado si es necesario
        datosAActualizar.estado = estado;
    }

     if (Object.keys(datosAActualizar).length > 0) {
        await rolEncontrado.update(datosAActualizar);
     }

    // Si se envía un array de permisos, actualizarlos
    if (Array.isArray(nuevosPermisos)) {

        // Validar que permisos_ids no contenga valores nulos o indefinidos y sean números
        const permisosValidos = nuevosPermisos.filter(idpermiso => idpermiso !== null && idpermiso !== undefined && !isNaN(idpermiso)).map(Number);

        if (permisosValidos.length !== nuevosPermisos.length) {
             return res.status(400).json({ error: 'La lista de permisos contiene valores inválidos' });
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

    res.json({ mensaje: 'Rol actualizado correctamente' });
  } catch (error) {
    console.error('Error al editar el rol:', error);
    res.status(500).json({ mensaje: 'Error al editar el rol' });
  }
},
async eliminarRol(req, res) {
  const { id } = req.params;

  // Validar que el ID sea proporcionado y sea un número válido
    if (!id || isNaN(id)) {
      return res.status(400).json({ mensaje: 'ID de rol no proporcionado o inválido' });
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