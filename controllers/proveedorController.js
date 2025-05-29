const { proveedor, compras } = require('../models'); // Asegúrate de tener la ruta correcta para tus modelos
const { Op } = require('sequelize');
const ResponseHandler = require('../utils/responseHandler');

module.exports = {
  // Obtener todos los proveedores
  async obtenerProveedores(req, res) {
    try {
      const pagina = parseInt(req.query.pagina) || 1;
      const limite = parseInt(req.query.limite) || 5;

      // Validar parámetros de paginación
      if (pagina < 1 || limite < 1) {
        return ResponseHandler.validationError(res, {
          general: 'La página y el límite deben ser números positivos'
        });
      }

      const offset = (pagina - 1) * limite;

      const proveedoresData = await proveedor.findAndCountAll({
        limit: limite,
        offset: offset,
        order: [['nitproveedor', 'ASC']]
      });

      const totalPaginas = Math.ceil(proveedoresData.count / limite);

      // Validar si la página solicitada existe
      if (pagina > totalPaginas && proveedoresData.count > 0) {
        return ResponseHandler.error(res, 'Página no encontrada', `La página ${pagina} no existe. El total de páginas es ${totalPaginas}`, 400);
      }

      // Formatear los proveedores para asegurar una serialización correcta
      const proveedoresFormateados = proveedoresData.rows.map(prov => ({
        id: prov.nitproveedor,
        tipodocumento: prov.tipodocumento,
        nombre: prov.nombre,
        contacto: prov.contacto,
        email: prov.email,
        telefono: prov.telefono,
        direccion: {
          municipio: prov.municipio,
          barrio: prov.barrio,
          complemento: prov.complemento,
          direccion: prov.direccion
        },
        estado: prov.estado
      }));

      return ResponseHandler.success(res, {
        proveedores: proveedoresFormateados,
        paginacion: {
          total: proveedoresData.count,
          totalPaginas,
          paginaActual: pagina,
          paginaSiguiente: pagina < totalPaginas ? pagina + 1 : null,
          paginaAnterior: pagina > 1 ? pagina - 1 : null,
          limite
        }
      });
    } catch (error) {
      console.error('Error al obtener proveedores:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener los proveedores');
    }
  },

  // Obtener un proveedor por su nit
  async obtenerProveedorPorNit(req, res) {
    try {
      const { nit } = req.params;

      if (!nit) {
        return ResponseHandler.validationError(res, {
          nit: 'El NIT del proveedor es requerido'
        });
      }

      const proveedorEncontrado = await proveedor.findOne({
        where: { nitproveedor: nit }
      });

      if (!proveedorEncontrado) {
        return ResponseHandler.error(res, 'Proveedor no encontrado', 'No existe un proveedor con el NIT proporcionado', 404);
      }

      // Formatear el proveedor para asegurar una serialización correcta
      const proveedorFormateado = {
        id: proveedorEncontrado.nitproveedor,
        tipodocumento: proveedorEncontrado.tipodocumento,
        nombre: proveedorEncontrado.nombre,
        contacto: proveedorEncontrado.contacto,
        email: proveedorEncontrado.email,
        telefono: proveedorEncontrado.telefono,
        direccion: {
          municipio: proveedorEncontrado.municipio,
          barrio: proveedorEncontrado.barrio,
          complemento: proveedorEncontrado.complemento,
          direccion: proveedorEncontrado.direccion
        },
        estado: proveedorEncontrado.estado
      };

      return ResponseHandler.success(res, proveedorFormateado);
    } catch (error) {
      console.error('Error al obtener proveedor:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener el proveedor');
    }
  },

  // Obtener todos los proveedores sin paginación
  async obtenerTodosProveedores(req, res) {
    try {
      const search = req.query.search || '';

      const whereClause = search ? {
        [Op.or]: [
          { nitproveedor: { [Op.iLike]: `%${search}%` } },
          { nombre: { [Op.iLike]: `%${search}%` } },
          { contacto: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { telefono: { [Op.iLike]: `%${search}%` } },
          { barrio: { [Op.iLike]: `%${search}%` } }
        ]
      } : {};

      const proveedores = await proveedor.findAll({
        where: whereClause,
        order: [['nitproveedor', 'ASC']]
      });

      // Formatear los proveedores para asegurar una serialización correcta
      const proveedoresFormateados = proveedores.map(prov => ({
        id: prov.nitproveedor,
        tipodocumento: prov.tipodocumento,
        nombre: prov.nombre,
        contacto: prov.contacto,
        email: prov.email,
        telefono: prov.telefono,
        direccion: {
          municipio: prov.municipio,
          barrio: prov.barrio,
          complemento: prov.complemento,
          direccion: prov.direccion
        },
        estado: prov.estado
      }));

      return ResponseHandler.success(res, proveedoresFormateados);
    } catch (error) {
      console.error('Error al obtener todos los proveedores:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener todos los proveedores');
    }
  },

  // Crear un nuevo proveedor
  async crearProveedor(req, res) {
    try {
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

      // Validaciones de campos requeridos
      const camposRequeridos = {
        tipodocumento: 'El tipo de documento es requerido',
        nitproveedor: 'El NIT es requerido',
        nombre: 'El nombre es requerido',
        contacto: 'El contacto es requerido',
        email: 'El email es requerido',
        telefono: 'El teléfono es requerido',
        barrio: 'El barrio es requerido'
      };

      const errores = {};
      Object.entries(camposRequeridos).forEach(([campo, mensaje]) => {
        if (!req.body[campo]) {
          errores[campo] = mensaje;
        }
      });

      if (Object.keys(errores).length > 0) {
        return ResponseHandler.validationError(res, errores);
      }

      // Validaciones de tipos y longitudes
      const validaciones = {
        tipodocumento: { tipo: 'string', maxLength: 10, mensaje: 'El tipo de documento debe ser una cadena de texto de máximo 10 caracteres' },
        nitproveedor: { tipo: 'number', mensaje: 'El NIT debe ser un número' },
        nombre: { tipo: 'string', maxLength: 20, mensaje: 'El nombre debe ser una cadena de texto de máximo 20 caracteres' },
        contacto: { tipo: 'string', maxLength: 30, mensaje: 'El contacto debe ser una cadena de texto de máximo 30 caracteres' },
        email: { tipo: 'string', maxLength: 45, mensaje: 'El email debe ser una cadena de texto de máximo 45 caracteres' },
        telefono: { tipo: 'string', maxLength: 10, mensaje: 'El teléfono debe ser una cadena de texto de máximo 10 caracteres' },
        municipio: { tipo: 'string', maxLength: 10, mensaje: 'El municipio debe ser una cadena de texto de máximo 10 caracteres' },
        complemento: { tipo: 'string', maxLength: 30, mensaje: 'El complemento debe ser una cadena de texto de máximo 30 caracteres' },
        direccion: { tipo: 'string', maxLength: 50, mensaje: 'La dirección debe ser una cadena de texto de máximo 50 caracteres' },
        barrio: { tipo: 'string', maxLength: 20, mensaje: 'El barrio debe ser una cadena de texto de máximo 20 caracteres' }
      };

      for (const [campo, validacion] of Object.entries(validaciones)) {
        if (req.body[campo]) {
          if (typeof req.body[campo] !== validacion.tipo) {
            return ResponseHandler.validationError(res, { [campo]: validacion.mensaje });
          }
          if (validacion.maxLength && req.body[campo].length > validacion.maxLength) {
            return ResponseHandler.validationError(res, { [campo]: validacion.mensaje });
          }
        }
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return ResponseHandler.validationError(res, {
          email: 'El formato del email no es válido'
        });
      }

      // Verificar si el NIT ya existe
      const proveedorExistente = await proveedor.findOne({
        where: { nitproveedor }
      });

      if (proveedorExistente) {
        return ResponseHandler.error(res, 'NIT duplicado', 'Ya existe un proveedor con ese NIT', 400);
      }

      const nuevoProveedor = await proveedor.create({
        tipodocumento,
        nitproveedor,
        nombre,
        contacto,
        email,
        municipio,
        complemento,
        direccion,
        telefono,
        estado: estado !== undefined ? estado : true,
        barrio
      });

      // Formatear el proveedor creado para asegurar una serialización correcta
      const proveedorFormateado = {
        id: nuevoProveedor.nitproveedor,
        tipodocumento: nuevoProveedor.tipodocumento,
        nombre: nuevoProveedor.nombre,
        contacto: nuevoProveedor.contacto,
        email: nuevoProveedor.email,
        telefono: nuevoProveedor.telefono,
        direccion: {
          municipio: nuevoProveedor.municipio,
          barrio: nuevoProveedor.barrio,
          complemento: nuevoProveedor.complemento,
          direccion: nuevoProveedor.direccion
        },
        estado: nuevoProveedor.estado
      };

      return ResponseHandler.success(res, {
        mensaje: 'Proveedor creado exitosamente',
        proveedor: proveedorFormateado
      });
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al crear el proveedor');
    }
  },

  // Editar un proveedor
  async editarProveedor(req, res) {
    try {
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

      if (!nit) {
        return ResponseHandler.validationError(res, {
          nit: 'El NIT del proveedor es requerido'
        });
      }

      const proveedorEncontrado = await proveedor.findOne({
        where: { nitproveedor: nit }
      });

      if (!proveedorEncontrado) {
        return ResponseHandler.error(res, 'Proveedor no encontrado', 'No existe un proveedor con el NIT proporcionado', 404);
      }

      const datosAActualizar = {};
      const validaciones = {
        tipodocumento: { tipo: 'string', maxLength: 10, mensaje: 'El tipo de documento debe ser una cadena de texto de máximo 10 caracteres' },
        nombre: { tipo: 'string', maxLength: 20, mensaje: 'El nombre debe ser una cadena de texto de máximo 20 caracteres' },
        contacto: { tipo: 'string', maxLength: 30, mensaje: 'El contacto debe ser una cadena de texto de máximo 30 caracteres' },
        email: { tipo: 'string', maxLength: 45, mensaje: 'El email debe ser una cadena de texto de máximo 45 caracteres' },
        telefono: { tipo: 'string', maxLength: 10, mensaje: 'El teléfono debe ser una cadena de texto de máximo 10 caracteres' },
        municipio: { tipo: 'string', maxLength: 10, mensaje: 'El municipio debe ser una cadena de texto de máximo 10 caracteres' },
        complemento: { tipo: 'string', maxLength: 30, mensaje: 'El complemento debe ser una cadena de texto de máximo 30 caracteres' },
        direccion: { tipo: 'string', maxLength: 50, mensaje: 'La dirección debe ser una cadena de texto de máximo 50 caracteres' },
        barrio: { tipo: 'string', maxLength: 20, mensaje: 'El barrio debe ser una cadena de texto de máximo 20 caracteres' }
      };

      for (const [campo, valor] of Object.entries(req.body)) {
        if (valor !== undefined) {
          if (validaciones[campo]) {
            const validacion = validaciones[campo];
            if (typeof valor !== validacion.tipo) {
              return ResponseHandler.validationError(res, { [campo]: validacion.mensaje });
            }
            if (validacion.maxLength && valor.length > validacion.maxLength) {
              return ResponseHandler.validationError(res, { [campo]: validacion.mensaje });
            }
          }
          datosAActualizar[campo] = valor;
        }
      }

      if (Object.keys(datosAActualizar).length === 0) {
        return ResponseHandler.validationError(res, {
          general: 'No se proporcionaron campos válidos para actualizar'
        });
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return ResponseHandler.validationError(res, {
          email: 'El formato del email no es válido'
        });
      }

      const proveedorActualizado = await proveedorEncontrado.update(datosAActualizar);

      // Formatear el proveedor actualizado para asegurar una serialización correcta
      const proveedorFormateado = {
        id: proveedorActualizado.nitproveedor,
        tipodocumento: proveedorActualizado.tipodocumento,
        nombre: proveedorActualizado.nombre,
        contacto: proveedorActualizado.contacto,
        email: proveedorActualizado.email,
        telefono: proveedorActualizado.telefono,
        direccion: {
          municipio: proveedorActualizado.municipio,
          barrio: proveedorActualizado.barrio,
          complemento: proveedorActualizado.complemento,
          direccion: proveedorActualizado.direccion
        },
        estado: proveedorActualizado.estado
      };

      return ResponseHandler.success(res, {
        mensaje: 'Proveedor actualizado exitosamente',
        proveedor: proveedorFormateado
      });
    } catch (error) {
      console.error('Error al editar proveedor:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al actualizar el proveedor');
    }
  },

  // Eliminar un proveedor
  async eliminarProveedor(req, res) {
    try {
      const { nit } = req.params;

      if (!nit) {
        return ResponseHandler.validationError(res, {
          nit: 'El NIT del proveedor es requerido'
        });
      }

      const proveedorEncontrado = await proveedor.findOne({
        where: { nitproveedor: nit }
      });

      if (!proveedorEncontrado) {
        return ResponseHandler.error(res, 'Proveedor no encontrado', 'No existe un proveedor con el NIT proporcionado', 404);
      }

      const comprasAsociadas = await compras.count({
        where: { nitproveedor: nit }
      });

      if (comprasAsociadas > 0) {
        return ResponseHandler.error(res, 'No se puede eliminar', 'El proveedor tiene compras asociadas', 400);
      }

      await proveedorEncontrado.destroy();

      // Formatear la respuesta para asegurar una serialización correcta
      const respuestaFormateada = {
        mensaje: 'Proveedor eliminado exitosamente',
        proveedor: {
          id: proveedorEncontrado.nitproveedor,
          nombre: proveedorEncontrado.nombre
        }
      };

      return ResponseHandler.success(res, respuestaFormateada);
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al eliminar el proveedor');
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

      // Validar parámetros de paginación
      if (pagina < 1 || limite < 1) {
        return ResponseHandler.validationError(res, {
          general: 'La página y el límite deben ser números positivos'
        });
      }

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

      const totalPaginas = Math.ceil(count / parseInt(limite));

      // Validar si la página solicitada existe
      if (pagina > totalPaginas && count > 0) {
        return ResponseHandler.error(res, 'Página no encontrada', `La página ${pagina} no existe. El total de páginas es ${totalPaginas}`, 400);
      }

      // Formatear los proveedores para asegurar una serialización correcta
      const proveedoresFormateados = rows.map(prov => ({
        id: prov.nitproveedor,
        tipodocumento: prov.tipodocumento,
        nombre: prov.nombre,
        contacto: prov.contacto,
        email: prov.email,
        telefono: prov.telefono,
        direccion: {
          municipio: prov.municipio,
          barrio: prov.barrio,
          complemento: prov.complemento,
          direccion: prov.direccion
        },
        estado: prov.estado
      }));

      return ResponseHandler.success(res, {
        proveedores: proveedoresFormateados,
        paginacion: {
          total: count,
          totalPaginas,
          paginaActual: parseInt(pagina),
          paginaSiguiente: parseInt(pagina) < totalPaginas ? parseInt(pagina) + 1 : null,
          paginaAnterior: parseInt(pagina) > 1 ? parseInt(pagina) - 1 : null,
          limite: parseInt(limite)
        }
      });
    } catch (error) {
      console.error('Error al buscar proveedores:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al buscar proveedores');
    }
  },

  async cambiarEstadoProveedor(req, res) {
    try {
      const { nit } = req.params;

      if (!nit) {
        return ResponseHandler.validationError(res, {
          nit: 'El NIT del proveedor es requerido'
        });
      }

      const proveedorEncontrado = await proveedor.findOne({
        where: { nitproveedor: nit }
      });

      if (!proveedorEncontrado) {
        return ResponseHandler.error(res, 'Proveedor no encontrado', 'No existe un proveedor con el NIT proporcionado', 404);
      }

      proveedorEncontrado.estado = !proveedorEncontrado.estado;
      await proveedorEncontrado.save();

      // Formatear la respuesta para asegurar una serialización correcta
      const respuestaFormateada = {
        mensaje: 'Estado del proveedor actualizado',
        proveedor: {
          id: proveedorEncontrado.nitproveedor,
          nombre: proveedorEncontrado.nombre,
          estado: proveedorEncontrado.estado
        }
      };

      return ResponseHandler.success(res, respuestaFormateada);
    } catch (error) {
      console.error('Error al cambiar estado del proveedor:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al cambiar el estado del proveedor');
    }
  },

  async verDetalleProveedor(req, res) {
    try {
      const { nit } = req.params;

      if (!nit) {
        return ResponseHandler.validationError(res, {
          nit: 'El NIT del proveedor es requerido'
        });
      }

      const proveedorEncontrado = await proveedor.findOne({
        where: { nitproveedor: nit }
      });

      if (!proveedorEncontrado) {
        return ResponseHandler.error(res, 'Proveedor no encontrado', 'No existe un proveedor con el NIT proporcionado', 404);
      }

      // Formatear el proveedor para asegurar una serialización correcta
      const proveedorFormateado = {
        id: proveedorEncontrado.nitproveedor,
        tipodocumento: proveedorEncontrado.tipodocumento,
        nombre: proveedorEncontrado.nombre,
        contacto: proveedorEncontrado.contacto,
        email: proveedorEncontrado.email,
        telefono: proveedorEncontrado.telefono,
        direccion: {
          municipio: proveedorEncontrado.municipio,
          barrio: proveedorEncontrado.barrio,
          complemento: proveedorEncontrado.complemento,
          direccion: proveedorEncontrado.direccion
        },
        estado: proveedorEncontrado.estado
      };

      return ResponseHandler.success(res, proveedorFormateado);
    } catch (error) {
      console.error('Error al obtener detalle del proveedor:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener el detalle del proveedor');
    }
  }
};
