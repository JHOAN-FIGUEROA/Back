const { producto, categoria } = require('../models');
const ResponseHandler = require('../utils/responseHandler');
const { Op } = require('sequelize');

// Crear producto
exports.createProducto = async (req, res) => {
  try {
    const { 
      nombre, 
      idcategoria, 
      preciocompra, 
      margenganancia, 
      detalleproducto, 
      estado, 
      imagen, 
      codigoproducto 
    } = req.body;

    // Validar que la categoría exista
    const categoriaExistente = await categoria.findByPk(idcategoria);
    if (!categoriaExistente) {
      return ResponseHandler.error(res, 'La categoría especificada no existe', null, 400);
    }

    // Calcular precio de venta basado en el margen
    const precioventa = preciocompra * (1 + margenganancia);

    const nuevoProducto = await producto.create({
      nombre,
      idcategoria,
      precioventa,
      preciocompra,
      margenganancia,
      detalleproducto,
      estado,
      imagen,
      codigoproducto
    });
    return ResponseHandler.success(res, nuevoProducto, 'Producto creado correctamente');
  } catch (error) {
    console.error('Error en createProducto:', error);
    return ResponseHandler.error(res, 'Error al crear producto', error.message);
  }
};

// Editar producto
exports.updateProducto = async (req, res) => {
  try {
    const id = req.params.id;
    const { 
      nombre, 
      idcategoria, 
      preciocompra, 
      margenganancia, 
      detalleproducto, 
      estado, 
      imagen, 
      codigoproducto 
    } = req.body;

    const productoActual = await producto.findByPk(id);
    if (!productoActual) {
      return ResponseHandler.error(res, 'Producto no encontrado', null, 404);
    }

    // Validar que la categoría exista si se está actualizando
    if (idcategoria) {
      const categoriaExistente = await categoria.findByPk(idcategoria);
      if (!categoriaExistente) {
        return ResponseHandler.error(res, 'La categoría especificada no existe', null, 400);
      }
    }

    // Calcular nuevo precio de venta si cambia el precio de compra o el margen
    const precioventa = preciocompra * (1 + margenganancia);

    await productoActual.update({
      nombre,
      idcategoria,
      precioventa,
      preciocompra,
      margenganancia,
      detalleproducto,
      estado,
      imagen,
      codigoproducto
    });
    return ResponseHandler.success(res, productoActual, 'Producto actualizado correctamente');
  } catch (error) {
    console.error('Error en updateProducto:', error);
    return ResponseHandler.error(res, 'Error al actualizar producto', error.message);
  }
};

// Listar productos con paginación y búsqueda
exports.getProductos = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      nombre: { [Op.iLike]: `%${search}%` }
    } : {};

    const { count, rows } = await producto.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['idproducto', 'ASC']]
    });

    return ResponseHandler.success(res, {
      productos: rows,
      total: count,
      page,
      pages: Math.ceil(count / limit)
    }, 'Productos obtenidos correctamente');
  } catch (error) {
    console.error('Error en getProductos:', error);
    return ResponseHandler.error(res, 'Error al obtener productos', error.message);
  }
};

// Obtener producto por id
exports.getProductoById = async (req, res) => {
  try {
    const id = req.params.id;
    const productoBuscado = await producto.findByPk(id);
    if (!productoBuscado) {
      return ResponseHandler.error(res, 'Producto no encontrado', null, 404);
    }
    return ResponseHandler.success(res, productoBuscado, 'Producto obtenido correctamente');
  } catch (error) {
    console.error('Error en getProductoById:', error);
    return ResponseHandler.error(res, 'Error al obtener producto', error.message);
  }
};

// Cambiar estado producto
exports.cambiarEstadoProducto = async (req, res) => {
  try {
    const id = req.params.id;
    const { estado } = req.body;
    const productoActual = await producto.findByPk(id);
    if (!productoActual) {
      return ResponseHandler.error(res, 'Producto no encontrado', null, 404);
    }
    productoActual.estado = estado;
    await productoActual.save();
    return ResponseHandler.success(res, productoActual, 'Estado del producto actualizado correctamente');
  } catch (error) {
    console.error('Error en cambiarEstadoProducto:', error);
    return ResponseHandler.error(res, 'Error al cambiar estado del producto', error.message);
  }
};

// Eliminar producto
exports.deleteProducto = async (req, res) => {
  try {
    const id = req.params.id;
    const productoEliminado = await producto.destroy({ where: { idproducto: id } });
    if (!productoEliminado) {
      return ResponseHandler.error(res, 'Producto no encontrado', null, 404);
    }
    return ResponseHandler.success(res, null, 'Producto eliminado correctamente');
  } catch (error) {
    console.error('Error en deleteProducto:', error);
    return ResponseHandler.error(res, 'Error al eliminar producto', error.message);
  }
};
