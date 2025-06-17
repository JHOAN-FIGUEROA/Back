const { producto, categoria } = require('../models');
const ResponseHandler = require('../utils/responseHandler');
const { Op } = require('sequelize');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configura Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const formatoPesos = valor => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

// Crear producto
exports.createProducto = async (req, res) => {
  try {
    const { 
      nombre, 
      idcategoria, 
      preciocompra, 
      margenganancia, 
      detalleproducto, 
      codigoproducto 
    } = req.body;

    // Si no viene estado, lo ponemos en true por defecto
    const estado = req.body.estado !== undefined ? req.body.estado : true;

    // Validar que la categoría exista
    const categoriaExistente = await categoria.findByPk(idcategoria);
    if (!categoriaExistente) {
      return ResponseHandler.error(res, 'La categoría especificada no existe', null, 400);
    }

    // Manejo de imagen
    let urlImagen = null;
    if (req.file) {
      const resultadoCloudinary = await cloudinary.uploader.upload(req.file.path);
      urlImagen = resultadoCloudinary.secure_url;
      fs.unlinkSync(req.file.path);
    } else if (req.body.imagen) {
      urlImagen = req.body.imagen;
    }

    // Antes de calcular el precio de venta:
    let margen = margenganancia;
    if (typeof margen === 'string') {
      margen = margen.replace(',', '.');
      margen = parseFloat(margen);
    }
    const precioventa = preciocompra * (1 + margen);

    const nuevoProducto = await producto.create({
      nombre,
      idcategoria,
      precioventa,
      preciocompra,
      margenganancia,
      detalleproducto,
      estado,
      imagen: urlImagen,
      codigoproducto,
      stock: 0 // El stock siempre inicia en 0
    });
    // Formatear precios
    const productoFormateado = {
      ...nuevoProducto.toJSON(),
      preciocompra: formatoPesos(nuevoProducto.preciocompra),
      precioventa: formatoPesos(nuevoProducto.precioventa)
    };
    return ResponseHandler.success(res, productoFormateado, 'Producto creado correctamente');
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
      // (Opcional: eliminar la anterior de Cloudinary si quieres)
      if (productoActual.imagen) {
        const publicId = productoActual.imagen.split('/').pop().split('.')[0];
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error('Error al eliminar imagen anterior:', error);
        }
      }
      const resultadoCloudinary = await cloudinary.uploader.upload(req.file.path);
      urlImagen = resultadoCloudinary.secure_url;
      fs.unlinkSync(req.file.path);
    } else if (req.body.imagen) {
      urlImagen = req.body.imagen;
    }

    // Antes de calcular el precio de venta:
    let margen = margenganancia;
    if (typeof margen === 'string') {
      margen = margen.replace(',', '.');
      margen = parseFloat(margen);
    }
    const precioventa = preciocompra * (1 + margen);

    await productoActual.update({
      nombre,
      idcategoria,
      precioventa,
      preciocompra,
      margenganancia,
      detalleproducto,
      estado,
      imagen: urlImagen,
      codigoproducto
    });
    // Formatear precios
    const productoFormateado = {
      ...productoActual.toJSON(),
      preciocompra: formatoPesos(productoActual.preciocompra),
      precioventa: formatoPesos(productoActual.precioventa)
    };
    return ResponseHandler.success(res, productoFormateado, 'Producto actualizado correctamente');
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

    // Incluir el stock en cada producto de la lista
    const productosConStock = rows.map(prod => ({
      idproducto: prod.idproducto,
      nombre: prod.nombre,
      idcategoria: prod.idcategoria,
      precioventa: formatoPesos(prod.precioventa),
      preciocompra: formatoPesos(prod.preciocompra),
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
    // Formatear precios
    const productoFormateado = {
      ...productoBuscado.toJSON(),
      preciocompra: formatoPesos(productoBuscado.preciocompra),
      precioventa: formatoPesos(productoBuscado.precioventa)
    };
    return ResponseHandler.success(res, productoFormateado, 'Producto obtenido correctamente');
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
