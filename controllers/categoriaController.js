const { categoria: Categoria, producto: Producto } = require('../models');
const { Op } = require('sequelize');
const ResponseHandler = require('../utils/responseHandler');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configura Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const categoriasController = {
  async obtenerCategorias(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      if (page < 1 || limit < 1) {
        return ResponseHandler.validationError(res, {
          general: 'La página y el límite deben ser números positivos'
        });
      }

      const whereClause = search ? {
        [Op.or]: [
          { nombre: { [Op.iLike]: `%${search}%` } },
          { descripcion: { [Op.iLike]: `%${search}%` } }
        ]
      } : {};

      const { count, rows: categorias } = await Categoria.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['nombre', 'ASC']]
      });

      const totalPages = Math.ceil(count / limit);

      if (page > totalPages && count > 0) {
        return ResponseHandler.error(
          res,
          'Página no encontrada',
          `La página ${page} no existe. El total de páginas es ${totalPages}`,
          400
        );
      }

      const categoriasFormateadas = categorias.map(categoria => ({
        id: categoria.idcategoria,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        estado: categoria.estado,
        imagen: categoria.imagen
      }));

      return ResponseHandler.success(res, {
        categorias: categoriasFormateadas,
        paginacion: {
          total: count,
          paginaActual: page,
          totalPaginas: totalPages,
          limite: limit
        }
      });
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener las categorías');
    }
  },

  async obtenerTodasCategorias(req, res) {
    try {
      const categorias = await Categoria.findAll({
        where: { estado: true },
        attributes: ['idcategoria', 'nombre', 'descripcion', 'estado', 'imagen'],
        order: [['nombre', 'ASC']]
      });

      return ResponseHandler.success(res, categorias);
    } catch (error) {
      console.error('Error al obtener todas las categorías:', error);
      return ResponseHandler.error(res, 'Error interno', 'No se pudieron obtener las categorías');
    }
  },

  async obtenerCategoria(req, res) {
    try {
      const { id } = req.params;
      const { incluirProductos } = req.query;

      if (isNaN(id)) {
        return ResponseHandler.validationError(res, {
          id: 'El ID debe ser un número'
        });
      }

      const categoria = await Categoria.findByPk(id);
      if (!categoria) {
        return ResponseHandler.error(
          res,
          'Categoría no encontrada',
          'No existe una categoría con el ID proporcionado',
          404
        );
      }

      const categoriaFormateada = {
        id: categoria.idcategoria,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        estado: categoria.estado,
        imagen: categoria.imagen
      };

      if (incluirProductos === 'true') {
        const productos = await Producto.findAll({
          where: { categoria_idcategoria: id },
          attributes: ['idproducto', 'nombre', 'precio', 'estado']
        });

        categoriaFormateada.productos = {
          total: productos.length,
          items: productos.map(producto => ({
            id: producto.idproducto,
            nombre: producto.nombre,
            precio: producto.precio,
            estado: producto.estado
          }))
        };
      }

      return ResponseHandler.success(res, categoriaFormateada);
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener la categoría');
    }
  },

  async crearCategoria(req, res) {
    try {
      const { nombre, descripcion } = req.body;

      const errores = {};
      if (!nombre) errores.nombre = 'El nombre es requerido';
      if (Object.keys(errores).length > 0) {
        return ResponseHandler.validationError(res, errores);
      }

      if (typeof nombre !== 'string' || nombre.length > 15) {
        return ResponseHandler.validationError(res, {
          nombre: 'El nombre debe ser una cadena de texto de máximo 15 caracteres'
        });
      }
      if (descripcion && (typeof descripcion !== 'string' || descripcion.length > 45)) {
        return ResponseHandler.validationError(res, {
          descripcion: 'La descripción debe ser una cadena de texto de máximo 45 caracteres'
        });
      }

      const categoriaExistente = await Categoria.findOne({ where: { nombre } });
      if (categoriaExistente) {
        return ResponseHandler.error(res, 'Nombre duplicado', 'Ya existe una categoría con ese nombre', 400);
      }

      let urlImagen = null;
      if (req.file) {
        const resultadoCloudinary = await cloudinary.uploader.upload(req.file.path);
        urlImagen = resultadoCloudinary.secure_url;
        fs.unlinkSync(req.file.path);
      }

      const nuevaCategoria = await Categoria.create({
        nombre,
        descripcion: descripcion || null,
        estado: true, // ✅ estado como booleano
        imagen: urlImagen
      });

      return ResponseHandler.success(res, {
        mensaje: 'Categoría creada exitosamente',
        categoria: {
          id: nuevaCategoria.idcategoria,
          nombre: nuevaCategoria.nombre,
          descripcion: nuevaCategoria.descripcion,
          estado: nuevaCategoria.estado,
          imagen: nuevaCategoria.imagen
        }
      });
    } catch (error) {
      console.error('Error al crear categoría:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al crear la categoría');
    }
  },

 async editarCategoria(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    if (isNaN(id)) {
      return ResponseHandler.validationError(res, { id: 'El ID debe ser un número' });
    }

    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return ResponseHandler.error(res, 'Categoría no encontrada', 'No existe una categoría con ese ID', 404);
    }

    // Validaciones de nombre
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.length > 15) {
        return ResponseHandler.validationError(res, {
          nombre: 'El nombre debe ser una cadena de texto de máximo 15 caracteres'
        });
      }

      const existeNombre = await Categoria.findOne({
        where: { nombre, idcategoria: { [Op.ne]: id } }
      });
      if (existeNombre) {
        return ResponseHandler.error(res, 'Nombre duplicado', 'Ya existe una categoría con ese nombre', 400);
      }
    }

    // Validación de descripción
    if (descripcion !== undefined) {
      if (typeof descripcion !== 'string' || descripcion.length > 45) {
        return ResponseHandler.validationError(res, {
          descripcion: 'La descripción debe ser una cadena de texto de máximo 45 caracteres'
        });
      }
    }

    // Subir nueva imagen si fue enviada
    if (req.file) {
      const resultadoCloudinary = await cloudinary.uploader.upload(req.file.path);
      categoria.imagen = resultadoCloudinary.secure_url;
      fs.unlinkSync(req.file.path);
    }

    // Solo actualiza si viene el campo
    if (nombre !== undefined) categoria.nombre = nombre;
    if (descripcion !== undefined) categoria.descripcion = descripcion;

    await categoria.save();

    return ResponseHandler.success(res, {
      mensaje: 'Categoría actualizada exitosamente',
      categoria: {
        id: categoria.idcategoria,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        estado: categoria.estado,
        imagen: categoria.imagen
      }
    });
  } catch (error) {
    console.error('Error al editar categoría:', error);
    return ResponseHandler.error(res, 'Error interno', 'Error al actualizar la categoría');
  }
},

  async cambiarEstadoCategoria(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (isNaN(id)) {
        return ResponseHandler.validationError(res, { id: 'El ID debe ser un número' });
      }
      if (typeof estado !== 'boolean') {
        return ResponseHandler.validationError(res, {
          estado: 'El estado debe ser true o false'
        });
      }

      const categoria = await Categoria.findByPk(id);
      if (!categoria) {
        return ResponseHandler.error(res, 'Categoría no encontrada', 'No existe una categoría con ese ID', 404);
      }

      categoria.estado = estado;
      await categoria.save();

      return ResponseHandler.success(res, {
        mensaje: 'Estado de la categoría actualizado correctamente',
        estado: categoria.estado
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      return ResponseHandler.error(res, 'Error interno', 'No se pudo cambiar el estado');
    }
  },

  async eliminarCategoria(req, res) {
    try {
      const { id } = req.params;

      const categoria = await Categoria.findByPk(id);
      if (!categoria) {
        return ResponseHandler.error(res, 'No encontrada', 'Categoría no encontrada', 404);
      }

      const productosAsociados = await Producto.count({
        where: { categoria_idcategoria: id }
      });

      if (productosAsociados > 0) {
        return ResponseHandler.error(
          res,
          'Acción denegada',
          'No se puede eliminar una categoría con productos asociados',
          400
        );
      }

      await categoria.destroy();

      return ResponseHandler.success(res, {
        mensaje: 'Categoría eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      return ResponseHandler.error(res, 'Error interno', 'No se pudo eliminar la categoría');
    }
  }
};

module.exports = categoriasController;
