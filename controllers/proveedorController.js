const { proveedor, compras } = require('../models'); // Asegúrate de tener la ruta correcta para tus modelos

module.exports = {
  // Obtener todos los proveedores
  async obtenerProveedores(req, res) {
    try {
      const proveedores = await proveedor.findAll();
      res.json(proveedores);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los proveedores' });
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
    await proveedorEncontrado.destroy();
    res.json({ mensaje: 'Proveedor eliminado con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el proveedor' });
  }
}
};
