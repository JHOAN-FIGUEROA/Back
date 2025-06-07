const { unidad: Unidad } = require('../models');
const ResponseHandler = require('../utils/responseHandler');


exports.getUnidades = async (req, res) => {
  try {
    // Parámetros de paginación (desde query)
    const page = parseInt(req.query.page) || 1; // página actual, default 1
    const limit = parseInt(req.query.limit) || 10; // items por página, default 10
    const offset = (page - 1) * limit;

    // Opcional: filtro por nombre (ejemplo)
    const { nombre } = req.query;

    // Construir condición where si hay filtro
    const where = {};
    if (nombre) {
      where.nombre = {
        [Unidad.sequelize.Op.iLike]: `%${nombre}%` // filtro case-insensitive (Postgres)
      };
    }

    // Consultar con paginación y filtro
    const { count, rows } = await Unidad.findAndCountAll({
      where,
      limit,
      offset,
      order: [['idpresentacion', 'ASC']] // ordenar por id
    });

    // Total páginas
    const totalPages = Math.ceil(count / limit);

    // Respuesta paginada
    return ResponseHandler.success(res, {
      totalItems: count,
      totalPages,
      currentPage: page,
      unidades: rows
    }, 'Presentaciones obtenidas correctamente');
  } catch (error) {
    console.error('Error en getUnidades:', error);
    return ResponseHandler.error(res, 'Error al obtener presentaciones', error.message);
  }
};
exports.getUnidadess = async (req, res) => {
  try {
    const unidades = await Unidad.findAll();
    return ResponseHandler.success(res, unidades, 'Presentaciones obtenidas correctamente');
  } catch (error) {
    console.error('Error en getUnidades:', error);
    return ResponseHandler.error(res, 'Error al obtener presentaciones', error.message);
  }
};

exports.createUnidad = async (req, res) => {
  try {
    const {
      producto_idproducto,
      nombre,
      factor_conversion,
      precio_presentacion,
      es_predeterminada = false
    } = req.body;

    // Validación básica (más completa en rutas)
    if (
      !producto_idproducto ||
      !nombre ||
      factor_conversion === undefined ||
      precio_presentacion === undefined
    ) {
      return ResponseHandler.validationError(res, [
        'producto_idproducto, nombre, factor_conversion y precio_presentacion son obligatorios'
      ]);
    }

    const nueva = await Unidad.create({
      producto_idproducto,
      nombre,
      factor_conversion,
      precio_presentacion,
      es_predeterminada
    });
    return ResponseHandler.success(res, nueva, 'Presentación creada correctamente', 201);
  } catch (error) {
    console.error('Error en createUnidad:', error);
    return ResponseHandler.error(res, 'Error al crear presentación', error.message);
  }
};

exports.updateUnidad = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      producto_idproducto,
      nombre,
      factor_conversion,
      precio_presentacion,
      es_predeterminada
    } = req.body;

    const unidad = await Unidad.findByPk(id);
    if (!unidad) {
      return ResponseHandler.notFound(res, 'Presentación no encontrada');
    }

    await unidad.update({
      producto_idproducto: producto_idproducto !== undefined ? producto_idproducto : unidad.producto_idproducto,
      nombre: nombre !== undefined ? nombre : unidad.nombre,
      factor_conversion: factor_conversion !== undefined ? factor_conversion : unidad.factor_conversion,
      precio_presentacion: precio_presentacion !== undefined ? precio_presentacion : unidad.precio_presentacion,
      es_predeterminada: es_predeterminada !== undefined ? es_predeterminada : unidad.es_predeterminada
    });

    return ResponseHandler.success(res, unidad, 'Presentación actualizada correctamente');
  } catch (error) {
    console.error('Error en updateUnidad:', error);
    return ResponseHandler.error(res, 'Error al actualizar presentación', error.message);
  }
};

exports.deleteUnidad = async (req, res) => {
  try {
    const { id } = req.params;

    const unidad = await Unidad.findByPk(id);
    if (!unidad) {
      return ResponseHandler.notFound(res, 'Presentación no encontrada');
    }

    await unidad.destroy();
    return ResponseHandler.success(res, null, 'Presentación eliminada correctamente');
  } catch (error) {
    console.error('Error en deleteUnidad:', error);
    return ResponseHandler.error(res, 'Error al eliminar presentación', error.message);
  }
};
