const { producto, categoria, ventaproducto, compraproducto } = require('../models');
const ResponseHandler = require('../utils/responseHandler');
const { Op } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const sharp = require('sharp');

// Configura Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const formatoPesos = valor => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

function redondearPrecioColombiano(valor) {
  return Math.ceil(valor / 50) * 50;
}

// Crear producto
exports.createProducto = async (req, res) => {
  try {
    const { 
      nombre, 
      idcategoria, 
      margenganancia, 
      detalleproducto, 
      codigoproducto 
    } = req.body;

    // Si no viene estado, lo ponemos en true por defecto
    const estado = req.body.estado !== undefined ? req.body.estado : true;

    // Si no viene preciocompra, lo ponemos en 0 por defecto
    const preciocompra = req.body.preciocompra !== undefined ? req.body.preciocompra : 0;

    // Validar que la categoría exista
    const categoriaExistente = await categoria.findByPk(idcategoria);
    if (!categoriaExistente) {
      return ResponseHandler.error(res, 'La categoría especificada no existe', null, 400);
    }

    // Manejo de imagen
    let urlImagen = null;
    if (req.file) {
      // Validar tamaño máximo (500 KB)
      if (req.file.size > 500 * 1024) {
        fs.unlinkSync(req.file.path);
        return ResponseHandler.error(res, 'Imagen demasiado grande', 'La imagen no debe superar 500 KB', 400, null);
      }
      // Redimensionar y comprimir la imagen
      const processedPath = req.file.path.replace(/(\\|\/)([^\\\/]+)$/, '$1processed_$2');
      await sharp(req.file.path)
        .resize(800, 800, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(processedPath);
      // Sube processedPath a Cloudinary o donde guardes la imagen
      const resultadoCloudinary = await cloudinary.uploader.upload(processedPath);
      urlImagen = resultadoCloudinary.secure_url;
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(processedPath);
    } else if (req.body.imagen) {
      urlImagen = req.body.imagen;
    }

    // Antes de calcular el precio de venta:
    let margen = margenganancia;
    if (typeof margen === 'string') {
      margen = margen.replace('%', '').replace(',', '.');
      margen = parseFloat(margen);
    }
    if (margen > 1) {
      margen = margen / 100;
    }
    const precioventa = redondearPrecioColombiano(preciocompra * (1 + margen));

    const nuevoProducto = await producto.create({
      nombre,
      idcategoria,
      precioventa,
      preciocompra,
      margenganancia: margen,
      detalleproducto,
      estado,
      imagen: urlImagen,
      codigoproducto,
      stock: 0 // El stock siempre inicia en 0
    });
    // Enviar precios sin formatear y mostrar margen como porcentaje
    const productoResponse = nuevoProducto.toJSON();
    productoResponse.margenganancia = productoResponse.margenganancia > 1 ? productoResponse.margenganancia : productoResponse.margenganancia * 100;
    return ResponseHandler.success(res, productoResponse, 'Producto creado correctamente');
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

    // Manejo de imagen
    let urlImagen = productoActual.imagen;
    if (req.file) {
      // Validar tamaño máximo (500 KB)
      if (req.file.size > 500 * 1024) {
        fs.unlinkSync(req.file.path);
        return ResponseHandler.error(res, 'Imagen demasiado grande', 'La imagen no debe superar 500 KB', 400, null);
      }
      // Redimensionar y comprimir la imagen
      const processedPath = req.file.path.replace(/(\\|\/)([^\\\/]+)$/, '$1processed_$2');
      await sharp(req.file.path)
        .resize(800, 800, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(processedPath);
      // Sube processedPath a Cloudinary o donde guardes la imagen
      const resultadoCloudinary = await cloudinary.uploader.upload(processedPath);
      urlImagen = resultadoCloudinary.secure_url;
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(processedPath);
    } else if (req.body.imagen) {
      urlImagen = req.body.imagen;
    }

    // Antes de calcular el precio de venta:
    let margen = margenganancia !== undefined ? margenganancia : productoActual.margenganancia;
    if (typeof margen === 'string') {
      margen = margen.replace('%', '').replace(',', '.');
      margen = parseFloat(margen);
    }
    if (margen > 1) {
      margen = margen / 100;
    }
    const nuevoPrecioCompra = preciocompra !== undefined ? preciocompra : productoActual.preciocompra;
    const precioventa = redondearPrecioColombiano(nuevoPrecioCompra * (1 + margen));

    await productoActual.update({
      nombre,
      idcategoria,
      precioventa,
      preciocompra: nuevoPrecioCompra,
      margenganancia: margen,
      detalleproducto,
      estado,
      imagen: urlImagen,
      codigoproducto
    });
    // Enviar precios sin formatear y mostrar margen como porcentaje
    const productoResponse = productoActual.toJSON();
    productoResponse.margenganancia = productoResponse.margenganancia > 1 ? productoResponse.margenganancia : productoResponse.margenganancia * 100;
    return ResponseHandler.success(res, productoResponse, 'Producto actualizado correctamente');
  } catch (error) {
    console.error('Error en updateProducto:', error);
    return ResponseHandler.error(res, 'Error al actualizar producto', error.message);
  }
};

// Listar productos con paginación y búsqueda
exports.getProductos = async (req, res) => {
  try {
    let { page = 1, limit = 5, search = '' } = req.query;
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

    // Incluir el stock en cada producto de la lista, sin formatear precios
    const productosConStock = rows.map(prod => ({
      idproducto: prod.idproducto,
      nombre: prod.nombre,
      idcategoria: prod.idcategoria,
      precioventa: prod.precioventa,
      preciocompra: prod.preciocompra,
      margenganancia: prod.margenganancia,
      detalleproducto: prod.detalleproducto,
      estado: prod.estado,
      imagen: prod.imagen,
      codigoproducto: prod.codigoproducto,
      stock: prod.stock
    }));

    return ResponseHandler.success(res, {
      productos: productosConStock,
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
    // Enviar producto sin formatear precios
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

    // Se intenta eliminar el producto directamente.
    const productoEliminado = await producto.destroy({ where: { idproducto: id } });
    
    if (!productoEliminado) {
      return ResponseHandler.notFound(res, 'Producto no encontrado');
    }

    return ResponseHandler.success(res, null, 'Producto eliminado correctamente');

  } catch (error) {
    // Si el error es por una restricción de clave foránea (el producto está en uso).
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      // Logueamos el error técnico para nosotros en el servidor.
      console.error('Intento de eliminar producto en uso:', error.message);
      // Enviamos una respuesta clara y amigable al usuario.
      return ResponseHandler.error(
        res, 
        'No se puede eliminar el producto', 
        'El producto tiene un historial de ventas, compras o presentaciones asociadas. En lugar de eliminar, considere desactivarlo.', 
        400
      );
    }
    
    // Para cualquier otro error inesperado.
    console.error('Error no controlado en deleteProducto:', error);
    return ResponseHandler.error(res, 'Error interno al eliminar producto', error.message, 500);
  }
};

// Buscar producto por código de barras/codigoproducto y devolver presentaciones
exports.buscarProductoPorCodigo = async (req, res) => {
  try {
    const { codigoproducto } = req.query;
    if (!codigoproducto) {
      return ResponseHandler.error(res, 'Código de producto requerido', 'Debes enviar el parámetro codigoproducto.', 400);
    }
    const prod = await producto.findOne({
      where: { codigoproducto },
      include: [
        {
          model: require('../models').unidad,
          as: 'presentaciones',
          attributes: ['idpresentacion', 'nombre', 'factor_conversion', 'es_predeterminada']
        }
      ]
    });
    if (!prod) {
      return ResponseHandler.error(res, 'Producto no encontrado', 'No existe un producto con ese código.', 404);
    }
    return ResponseHandler.success(res, prod, 'Producto encontrado correctamente');
  } catch (error) {
    return ResponseHandler.error(res, 'Error al buscar producto', error.message);
  }
};
