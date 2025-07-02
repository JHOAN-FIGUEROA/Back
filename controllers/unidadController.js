const { unidad: Unidad, producto: Producto } = require('../models');
const ResponseHandler = require('../utils/responseHandler');


exports.getUnidades = async (req, res) => {
  try {
    // Parámetros de paginación (desde query)
    const page = parseInt(req.query.page) || 1; // página actual, default 1
    const limit = parseInt(req.query.limit) || 5; // items por página, default 5
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
      order: [['idpresentacion', 'ASC']],
      include: [{
        model: Producto,
        as: 'producto',
        attributes: ['idproducto', 'nombre', 'preciocompra', 'precioventa', 'margenganancia', 'codigoproducto']
      }]
    });

    // Calcular precios para cada presentación
    const unidadesConPrecios = rows.map(unidad => {
      const precioCompraPresentacion = unidad.producto.preciocompra * unidad.factor_conversion;
      const precioVentaPresentacion = unidad.producto.precioventa * unidad.factor_conversion;
      // Asegurarse de que el objeto producto incluya codigoproducto
      const producto = unidad.producto ? {
        ...unidad.producto.toJSON(),
        codigoproducto: unidad.producto.codigoproducto
      } : undefined;
      return {
        ...unidad.toJSON(),
        producto,
        precio_compra_presentacion: precioCompraPresentacion,
        precio_venta_presentacion: precioVentaPresentacion
      };
    });

    // Total páginas
    const totalPages = Math.ceil(count / limit);

    // Respuesta paginada
    return ResponseHandler.success(res, {
      totalItems: count,
      totalPages,
      currentPage: page,
      unidades: unidadesConPrecios
    }, 'Presentaciones obtenidas correctamente');
  } catch (error) {
    console.error('Error en getUnidades:', error);
    return ResponseHandler.error(res, 'Error al obtener presentaciones', error.message);
  }
};
exports.getUnidadess = async (req, res) => {
  try {
    const unidades = await Unidad.findAll({
      include: [{
        model: Producto,
        as: 'producto',
        attributes: ['idproducto', 'nombre', 'preciocompra', 'precioventa', 'margenganancia', 'codigoproducto']
      }]
    });

    // Calcular precios para cada presentación
    const unidadesConPrecios = unidades.map(unidad => {
      const precioCompraPresentacion = unidad.producto.preciocompra * unidad.factor_conversion;
      const precioVentaPresentacion = unidad.producto.precioventa * unidad.factor_conversion;
      // Asegurarse de que el objeto producto incluya codigoproducto
      const producto = unidad.producto ? {
        ...unidad.producto.toJSON(),
        codigoproducto: unidad.producto.codigoproducto
      } : undefined;
      return {
        ...unidad.toJSON(),
        producto,
        precio_compra_presentacion: precioCompraPresentacion,
        precio_venta_presentacion: precioVentaPresentacion
      };
    });

    return ResponseHandler.success(res, unidadesConPrecios, 'Presentaciones obtenidas correctamente');
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
      es_predeterminada = false,
      codigobarras
    } = req.body;

    // Validación básica (más completa en rutas)
    if (
      !producto_idproducto ||
      !nombre ||
      factor_conversion === undefined ||
      !codigobarras
    ) {
      return ResponseHandler.validationError(res, [
        'producto_idproducto, nombre, factor_conversion y codigobarras son obligatorios'
      ]);
    }

    const nueva = await Unidad.create({
      producto_idproducto,
      nombre,
      factor_conversion,
      es_predeterminada,
      codigobarras
    });

    // Obtener el producto para calcular los precios
    const producto = await Producto.findByPk(producto_idproducto);
    const precioCompraPresentacion = producto.preciocompra * factor_conversion;
    const precioVentaPresentacion = producto.precioventa * factor_conversion;

    return ResponseHandler.success(res, {
      ...nueva.toJSON(),
      precio_compra_presentacion: precioCompraPresentacion,
      precio_venta_presentacion: precioVentaPresentacion
    }, 'Presentación creada correctamente', 201);
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
      es_predeterminada: es_predeterminada !== undefined ? es_predeterminada : unidad.es_predeterminada
    });

    // Obtener el producto para calcular los precios actualizados
    const producto = await Producto.findByPk(unidad.producto_idproducto);
    const precioCompraPresentacion = producto.preciocompra * unidad.factor_conversion;
    const precioVentaPresentacion = producto.precioventa * unidad.factor_conversion;

    return ResponseHandler.success(res, {
      ...unidad.toJSON(),
      precio_compra_presentacion: precioCompraPresentacion,
      precio_venta_presentacion: precioVentaPresentacion
    }, 'Presentación actualizada correctamente');
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

// Buscar presentación por código de barras y devolver la presentación y el producto asociado
exports.buscarPorCodigoBarras = async (req, res) => {
  try {
    const { codigobarras } = req.query;
    if (!codigobarras) {
      return require('../utils/responseHandler').error(res, 'Código de barras requerido', 'Debes enviar el parámetro codigobarras.', 400);
    }
    const presentacion = await require('../models').unidad.findOne({
      where: { codigobarras },
      include: [
        {
          model: require('../models').producto,
          as: 'producto',
          attributes: ['idproducto', 'nombre', 'codigoproducto', 'precioventa', 'preciocompra', 'stock']
        }
      ]
    });
    if (!presentacion) {
      return require('../utils/responseHandler').error(res, 'Presentación no encontrada', 'No existe una presentación con ese código de barras.', 404);
    }
    // Validar stock del producto
    if (!presentacion.producto || presentacion.producto.stock <= 0) {
      return require('../utils/responseHandler').error(res, 'Sin stock', 'El producto asociado a esta presentación no tiene stock disponible.', 404);
    }
    return require('../utils/responseHandler').success(res, presentacion, 'Presentación encontrada correctamente');
  } catch (error) {
    return require('../utils/responseHandler').error(res, 'Error al buscar presentación', error.message);
  }
};
