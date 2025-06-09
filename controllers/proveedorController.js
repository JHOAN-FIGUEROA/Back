const { proveedor, compras } = require('../models'); // Asegúrate de tener la ruta correcta para tus modelos
const { Op } = require('sequelize');
module.exports = {
  // Obtener todos los proveedores
  async obtenerProveedores(req, res) {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 5;
    const offset = (pagina - 1) * limite;

    const proveedoresData = await proveedor.findAndCountAll({
      limit: limite,
      offset: offset,
      order: [['nitproveedor', 'ASC']]
    });

    const totalPaginas = Math.ceil(proveedoresData.count / limite);

    return res.status(200).json({
      proveedores: proveedoresData.rows,
      total: proveedoresData.count,
      totalPaginas,
      paginaActual: pagina,
      paginaSiguiente: pagina < totalPaginas ? pagina + 1 : null,
      paginaAnterior: pagina > 1 ? pagina - 1 : null
    });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
},

  // Obtener un proveedor por su nit
  async obtenerProveedorPorNit(req, res) {
    const { nit } = req.params;
    try {
      const proveedorEncontrado = await proveedor.findOne({
        where: { nitproveedor: nit }
      });

      if (!proveedorEncontrado) {
        return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
      }

      res.json(proveedorEncontrado);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el proveedor' });
    }
  },

  // Crear un nuevo proveedor
  async crearProveedor(req, res) {
    const {
      tipodocumento,
      nitproveedor,
      nombre,
      contacto,
      email,
      municipio,
      complemento,
      direccion,
      telefono,
      estado,
      barrio
    } = req.body;

    try {
      const nuevoProveedor = await proveedor.create({
        tipodocumento,
        nitproveedor,  // Auto-generado por la base de datos
        nombre,
        contacto,
        email,
        municipio,
        complemento,
        direccion,
        telefono,
        estado,
        barrio
      });

      res.status(201).json({ mensaje: 'Proveedor creado con éxito', proveedor: nuevoProveedor });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear el proveedor' });
    }
  },

  // Editar un proveedor
  async editarProveedor(req, res) {
    const { nit } = req.params;
    const {
      tipodocumento,
      nombre,
      contacto,
      email,
      municipio,
      complemento,
      direccion,
      telefono,
      estado,
      barrio
    } = req.body;

    try {
      const proveedorEncontrado = await proveedor.findOne({
        where: { nitproveedor: nit }
      });

      if (!proveedorEncontrado) {
        return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
      }

      // Actualizar solo los campos proporcionados
      if (tipodocumento) proveedorEncontrado.tipodocumento = tipodocumento;
      if (nombre) proveedorEncontrado.nombre = nombre;
      if (contacto) proveedorEncontrado.contacto = contacto;
      if (email) proveedorEncontrado.email = email;
      if (municipio) proveedorEncontrado.municipio = municipio;
      if (complemento) proveedorEncontrado.complemento = complemento;
      if (direccion) proveedorEncontrado.direccion = direccion;
      if (telefono) proveedorEncontrado.telefono = telefono;
      if (estado !== undefined) proveedorEncontrado.estado = estado; // Incluye la verificación si es editable
      if (barrio) proveedorEncontrado.barrio = barrio;

      await proveedorEncontrado.save();

      res.json({ mensaje: 'Proveedor actualizado con éxito', proveedor: proveedorEncontrado });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al editar el proveedor' });
    }
  },

  // Eliminar un proveedor
  async eliminarProveedor(req, res) {
  const { nit } = req.params;

  // Validación temprana
  if (!nit) {
    return res.status(400).json({ mensaje: 'NIT del proveedor es requerido' });
  }

  try {
    // Buscar el proveedor por su NIT
    const proveedorEncontrado = await proveedor.findOne({
      where: { nitproveedor: nit }
    });

    if (!proveedorEncontrado) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }

    // Verificar si el proveedor tiene compras asociadas
    const comprasAsociadas = await compras.count({
      where: { nitproveedor: nit }
    });

    if (comprasAsociadas > 0) {
      return res.status(400).json({ mensaje: 'No se puede eliminar el proveedor, tiene compras asociadas' });
    }

    // Eliminar el proveedor si no tiene compras asociadas
    await proveedor.destroy({
      where: { nitproveedor: nit }
    });

    res.json({ mensaje: 'Proveedor eliminado con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el proveedor' });
  }

}, async buscarProveedores  (req, res) {
  try {
    const {
      nit,
      nombre,
      contacto,
      email,
      municipio,
      direccion,
      barrio,
      estado,
      pagina = 1,
      limite = 10
    } = req.query;

    const condiciones = {};

    if (nit) condiciones.nitproveedor = { [Op.iLike]: `%${nit}%` };
    if (nombre) condiciones.nombre = { [Op.iLike]: `%${nombre}%` };
    if (contacto) condiciones.contacto = { [Op.iLike]: `%${contacto}%` };
    if (email) condiciones.email = { [Op.iLike]: `%${email}%` };
    if (municipio) condiciones.municipio = { [Op.iLike]: `%${municipio}%` };
    if (direccion) condiciones.direccion = { [Op.iLike]: `%${direccion}%` };
    if (barrio) condiciones.barrio = { [Op.iLike]: `%${barrio}%` };

    // Solo si es booleano explícito
    if (estado !== undefined) condiciones.estado = estado === 'true';

    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    const { count, rows } = await proveedor.findAndCountAll({
      where: condiciones,
      limit: parseInt(limite),
      offset,
      order: [['nitproveedor', 'ASC']]
    });

    const totalPaginas = Math.ceil(count / limite);

    return res.status(200).json({
      proveedores: rows,
      total: count,
      totalPaginas,
      paginaActual: parseInt(pagina),
      paginaSiguiente: pagina < totalPaginas ? parseInt(pagina) + 1 : null,
      paginaAnterior: pagina > 1 ? parseInt(pagina) - 1 : null
    });
  } catch (error) {
    console.error('Error al buscar proveedores:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
},async cambiarEstadoProveedor(req, res) {
  const { nit } = req.params;
  try {
    const proveedorEncontrado = await proveedor.findOne({
      where: { nitproveedor: nit }
    });

    if (!proveedorEncontrado) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    proveedorEncontrado.estado = !proveedorEncontrado.estado;
    await proveedorEncontrado.save();

    res.json({
      mensaje: 'Estado del proveedor actualizado',
      estado: proveedorEncontrado.estado
    });
  } catch (error) {
    console.error('Error al cambiar estado del proveedor:', error);
    res.status(500).json({ error: 'Error al cambiar estado del proveedor' });
  }
}, async verDetalleProveedor  (req, res) {
  try {
    const { nit } = req.params;

    if (!nit) {
      return res.status(400).json({ message: "NIT del proveedor no proporcionado" });
    }

    const proveedorEncontrado = await proveedor.findOne({
      where: { nitproveedor: nit }
    });

    if (!proveedorEncontrado) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    res.json(proveedorEncontrado);
  } catch (error) {
    console.error("Error al obtener el detalle del proveedor:", error);
    res.status(500).json({ message: "Error interno al obtener el proveedor" });
  }
}
};
