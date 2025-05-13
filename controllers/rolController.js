const { rol, roles_permisos, permisos } = require('../models'); // Asegúrate de tener la ruta correcta para tus modelos

const { usuarios: Usuario, cliente: Cliente } = require('../models');
module.exports = {
  // Obtener todos los roles
  async obtenerRoles(req, res) {
    try {
      const roles = await rol.findAll({
        attributes: ['idrol', 'nombre', 'estado']
      });
      res.json(roles);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los roles' });
    }
  },

  // Obtener detalle de un rol con permisos
async  obtenerDetalleRol  (req, res)  {
  try {
    const { id } = req.params;

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

      if (!nombre || !Array.isArray(permisos_ids)) {
        return res.status(400).json({ error: 'Nombre y lista de permisos son requeridos' });
      }

      // Crear el rol
      const nuevoRol = await rol.create({ nombre, estado });

      // Asociar permisos
      const asociaciones = permisos_ids.map(idPermiso => ({
        rol_idrol: nuevoRol.idrol,
        permisos_idpermisos: idPermiso
      }));

      await roles_permisos.bulkCreate(asociaciones);

      res.status(201).json({ mensaje: 'Rol creado con éxito', rol: nuevoRol });
    } catch (error) {
      console.error('Error al crear el rol:', error);
      res.status(500).json({ error: 'Error al crear el rol' });
    }
  },async editarRol(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, estado, permisos: nuevosPermisos } = req.body;

  try {
    const rolEncontrado = await rol.findByPk(id);
    if (!rolEncontrado) {
      return res.status(404).json({ mensaje: 'Rol no encontrado' });
    }

    // Solo actualiza los campos que vengan en el body
    if (nombre !== undefined) rolEncontrado.nombre = nombre;
    if (descripcion !== undefined) rolEncontrado.descripcion = descripcion;
    if (typeof estado === 'boolean') rolEncontrado.estado = estado;

    await rolEncontrado.save();

    // Si vienen permisos nuevos, los actualizamos
    if (Array.isArray(nuevosPermisos)) {
      // Eliminamos los permisos actuales
      await roles_permisos.destroy({ where: { rol_idrol: id } });

      // Creamos los nuevos
      const permisosAInsertar = nuevosPermisos.map(idpermiso => ({
        rol_idrol: id,
        permiso_idpermiso: idpermiso
      }));

      await roles_permisos.bulkCreate(permisosAInsertar);
    }

    res.json({ mensaje: 'Rol actualizado correctamente' });
  } catch (error) {
    console.error('Error al editar el rol:', error);
    res.status(500).json({ mensaje: 'Error al editar el rol' });
  }
},async eliminarRol(req, res) {
  const { id } = req.params;

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
}

};