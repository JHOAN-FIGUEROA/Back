const { proveedor, compras } = require('../models');
const { Op } = require('sequelize');
const ResponseHandler = require('../utils/responseHandler'); // Ruta al archivo de ResponseHandler

module.exports = {
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

      return ResponseHandler.success(res, {
        proveedores: proveedoresData.rows,
        total: proveedoresData.count,
        totalPaginas,
        paginaActual: pagina,
        paginaSiguiente: pagina < totalPaginas ? pagina + 1 : null,
        paginaAnterior: pagina > 1 ? pagina - 1 : null
      });
    } catch (error) {
      ResponseHandler.error(res, 'Error interno del servidor');
    }
  },

  async obtenerProveedorPorNit(req, res) {
    const { nit } = req.params;
    try {
      const proveedorEncontrado = await proveedor.findOne({
        where: { nitproveedor: nit }
      });

      if (!proveedorEncontrado) {
        return ResponseHandler.notFound(res, 'Proveedor no encontrado');
      }

      ResponseHandler.success(res, proveedorEncontrado);
    } catch (error) {
      ResponseHandler.error(res, 'Error al obtener el proveedor');
    }
  },

  async crearProveedor(req, res) {
    try {
      // Validar que no exista un proveedor con el mismo tipo y número de documento
      if (req.body.tipodocumento && req.body.nitproveedor) {
        const proveedorExistente = await proveedor.findOne({ where: { tipodocumento: req.body.tipodocumento, nitproveedor: req.body.nitproveedor } });
        if (proveedorExistente) {
          return ResponseHandler.error(res, 'Documento duplicado', 'Ya existe un proveedor registrado con ese tipo y número de documento', 400);
        }
      }
      // Validar longitud del nombre
      if (req.body.nombre && req.body.nombre.length > 30) {
        return ResponseHandler.validationError(res, { nombre: 'El nombre del proveedor no puede superar los 30 caracteres' });
      }
      const nuevoProveedor = await proveedor.create(req.body);
      ResponseHandler.success(res, nuevoProveedor, 'Proveedor creado con éxito', 201);
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        ResponseHandler.validationError(res, error.errors);
      } else {
        ResponseHandler.error(res, 'Error al crear el proveedor');
      }
    }
  },

  async editarProveedor(req, res) {
    const { nit } = req.params;
    try {
      // Validar que no exista otro proveedor con el mismo tipo y número de documento
      if (req.body.tipodocumento && req.body.nitproveedor) {
        const proveedorDuplicado = await proveedor.findOne({
          where: {
            tipodocumento: req.body.tipodocumento,
            nitproveedor: req.body.nitproveedor,
            nitproveedor: { [Op.ne]: nit }
          }
        });
        if (proveedorDuplicado) {
          return ResponseHandler.error(res, 'Documento duplicado', 'Ya existe otro proveedor registrado con ese tipo y número de documento', 400);
        }
      }
      // Validar longitud del nombre
      if (req.body.nombre && req.body.nombre.length > 30) {
        return ResponseHandler.validationError(res, { nombre: 'El nombre del proveedor no puede superar los 30 caracteres' });
      }
      // Actualizar proveedor
      const [updated] = await proveedor.update(req.body, {
        where: { nitproveedor: nit }
      });
      if (updated === 0) {
        return ResponseHandler.notFound(res, 'Proveedor no encontrado');
      }
      const proveedorActualizado = await proveedor.findByPk(req.body.nitproveedor || nit);
      ResponseHandler.success(res, proveedorActualizado, 'Proveedor actualizado con éxito');
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        ResponseHandler.validationError(res, error.errors);
      } else {
        ResponseHandler.error(res, 'Error al editar el proveedor');
      }
    }
  },

  async eliminarProveedor(req, res) {
    const { nit } = req.params;
    try {
      const comprasAsociadas = await compras.count({
        where: { nitproveedor: nit }
      });

      if (comprasAsociadas > 0) {
        return ResponseHandler.error(res, 
          'No se puede eliminar el proveedor, tiene compras asociadas', 
          null, 
          400
        );
      }

      const deleted = await proveedor.destroy({
        where: { nitproveedor: nit }
      });

      if (deleted === 0) {
        return ResponseHandler.notFound(res, 'Proveedor no encontrado');
      }

      ResponseHandler.success(res, null, 'Proveedor eliminado con éxito');
    } catch (error) {
      ResponseHandler.error(res, 'Error al eliminar el proveedor');
    }
  },

  async buscarProveedores(req, res) {
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
      if (estado !== undefined) condiciones.estado = estado === 'true';

      const offset = (parseInt(pagina) - 1) * parseInt(limite);
      const { count, rows } = await proveedor.findAndCountAll({
        where: condiciones,
        limit: parseInt(limite),
        offset,
        order: [['nitproveedor', 'ASC']]
      });

      const totalPaginas = Math.ceil(count / limite);

      return ResponseHandler.success(res, {
        proveedores: rows,
        total: count,
        totalPaginas,
        paginaActual: parseInt(pagina),
        paginaSiguiente: pagina < totalPaginas ? parseInt(pagina) + 1 : null,
        paginaAnterior: pagina > 1 ? parseInt(pagina) - 1 : null
      });
    } catch (error) {
      ResponseHandler.error(res, 'Error interno del servidor');
    }
  },

  async cambiarEstadoProveedor(req, res) {
    const { nit } = req.params;
    try {
      const proveedorEncontrado = await proveedor.findByPk(nit);
      
      if (!proveedorEncontrado) {
        return ResponseHandler.notFound(res, 'Proveedor no encontrado');
      }

      proveedorEncontrado.estado = !proveedorEncontrado.estado;
      await proveedorEncontrado.save();

      ResponseHandler.success(res, {
        estado: proveedorEncontrado.estado
      }, 'Estado del proveedor actualizado');
    } catch (error) {
      ResponseHandler.error(res, 'Error al cambiar estado del proveedor');
    }
  },

  async verDetalleProveedor(req, res) {
    try {
      const { nit } = req.params;
      const proveedorEncontrado = await proveedor.findByPk(nit);

      if (!proveedorEncontrado) {
        return ResponseHandler.notFound(res, "Proveedor no encontrado");
      }

      ResponseHandler.success(res, proveedorEncontrado);
    } catch (error) {
      ResponseHandler.error(res, "Error interno al obtener el proveedor");
    }
  }
};