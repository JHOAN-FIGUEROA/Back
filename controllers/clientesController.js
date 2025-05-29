const { cliente: Cliente, usuarios: Usuario, ventas: Venta } = require('../models');
const { Op } = require('sequelize');
const ResponseHandler = require('../utils/responseHandler');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Transportador para enviar correos
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'postwaret@gmail.com',
    pass: 'qbau mkje qwml bgof'
  }
});

// Función para enviar correo en HTML
const enviarCorreo = async (destinatario, asunto, html) => {
  const mailOptions = {
    from: '"Postware Soporte" <postwaret@gmail.com>',
    to: destinatario,
    subject: asunto,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${destinatario}`);
  } catch (error) {
    console.error('Error al enviar el correo:', error.message);
  }
};

const clientesController = {
    // Obtener todos los clientes con paginación
    async obtenerClientes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;
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
                    { apellido: { [Op.iLike]: `%${search}%` } },
                    { documentocliente: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    { telefono: { [Op.iLike]: `%${search}%` } },
                    { barrio: { [Op.iLike]: `%${search}%` } }
                ]
            } : {};

            const { count, rows: clientes } = await Cliente.findAndCountAll({
                where: whereClause,
                include: [{
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['idusuario', 'email', 'estado', 'rol_idrol']
                }],
                limit,
                offset,
                order: [['nombre', 'ASC']]
            });

            const totalPages = Math.ceil(count / limit);

            if (page > totalPages && count > 0) {
                return ResponseHandler.error(res, 'Página no encontrada', `La página ${page} no existe. El total de páginas es ${totalPages}`, 400);
            }

            const clientesFormateados = clientes.map(cliente => ({
                id: cliente.documentocliente,
                tipodocumento: cliente.tipodocumento,
                nombre: cliente.nombre,
                apellido: cliente.apellido,
                telefono: cliente.telefono,
                email: cliente.email,
                direccion: {
                    municipio: cliente.municipio,
                    barrio: cliente.barrio,
                    complemento: cliente.complemento,
                    direccion: cliente.direccion
                },
                estado: cliente.estado,
                usuario: cliente.usuario ? {
                    id: cliente.usuario.idusuario,
                    email: cliente.usuario.email,
                    estado: cliente.usuario.estado,
                    rol: cliente.usuario.rol_idrol === 2 ? 'Cliente' : 'Otro'
                } : null
            }));

            return ResponseHandler.success(res, {
                clientes: clientesFormateados,
                paginacion: {
                    total: count,
                    paginaActual: page,
                    totalPaginas: totalPages,
                    limite: limit
                }
            });
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            return ResponseHandler.error(res, 'Error interno', 'Error al obtener los clientes');
        }
    },

    // Obtener un cliente por ID
    async obtenerCliente(req, res) {
        try {
            const { id } = req.params;
            const { incluirVentas } = req.query;
            
            if (isNaN(id)) {
                return ResponseHandler.validationError(res, {
                    id: 'El ID debe ser un número'
                });
            }

            const cliente = await Cliente.findByPk(id, {
                include: [{
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['idusuario', 'email', 'estado', 'rol_idrol']
                }]
            });
            
            if (!cliente) {
                return ResponseHandler.error(res, 'Cliente no encontrado', 'No existe un cliente con el ID proporcionado', 404);
            }

            const clienteFormateado = {
                id: cliente.documentocliente,
                tipodocumento: cliente.tipodocumento,
                nombre: cliente.nombre,
                apellido: cliente.apellido,
                telefono: cliente.telefono,
                email: cliente.email,
                direccion: {
                    municipio: cliente.municipio,
                    barrio: cliente.barrio,
                    complemento: cliente.complemento,
                    direccion: cliente.direccion
                },
                estado: cliente.estado,
                usuario: {
                    id: cliente.usuario?.idusuario,
                    email: cliente.usuario?.email,
                    estado: cliente.usuario?.estado,
                    rol: cliente.usuario?.rol_idrol === 2 ? 'Cliente' : 'Otro'
                }
            };

            if (incluirVentas === 'true') {
                const ventas = await Venta.findAll({
                    where: { documentocliente: id },
                    order: [['fechaventa', 'DESC']]
                });

                clienteFormateado.ventas = {
                    total: ventas.length,
                    historial: ventas.map(venta => ({
                        id: venta.idventas,
                        fecha: venta.fechaventa,
                        total: venta.total,
                        estado: venta.estado
                    }))
                };
            }
            
            return ResponseHandler.success(res, clienteFormateado);
        } catch (error) {
            console.error('Error al obtener cliente:', error);
            return ResponseHandler.error(res, 'Error interno', 'Error al obtener el cliente');
        }
    },

    // Crear un nuevo cliente
    async crearCliente(req, res) {
        try {
            const {
                tipodocumento,
                documentocliente,
                nombre,
                apellido,
                email,
                telefono,
                municipio,
                complemento,
                direccion,
                barrio,
                password
            } = req.body;

            const camposRequeridos = {
                tipodocumento: 'El tipo de documento es requerido',
                documentocliente: 'El documento es requerido',
                nombre: 'El nombre es requerido',
                apellido: 'El apellido es requerido',
                telefono: 'El teléfono es requerido',
                barrio: 'El barrio es requerido',
                email: 'El email es requerido',
                password: 'La contraseña es requerida'
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

            const validaciones = {
                tipodocumento: { tipo: 'string', maxLength: 10, mensaje: 'El tipo de documento debe ser una cadena de texto de máximo 10 caracteres' },
                documentocliente: { tipo: 'number', mensaje: 'El documento debe ser un número' },
                nombre: { tipo: 'string', maxLength: 45, mensaje: 'El nombre debe ser una cadena de texto de máximo 45 caracteres' },
                apellido: { tipo: 'string', maxLength: 45, mensaje: 'El apellido debe ser una cadena de texto de máximo 45 caracteres' },
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

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return ResponseHandler.validationError(res, {
                    email: 'El formato del email no es válido'
                });
            }

            const usuarioExistente = await Usuario.findOne({ where: { email } });
            if (usuarioExistente) {
                return ResponseHandler.error(res, 'Email duplicado', 'Ya existe un usuario registrado con ese email', 400);
            }

            const clienteExistente = await Cliente.findOne({ where: { documentocliente } });
            if (clienteExistente) {
                return ResponseHandler.error(res, 'Documento duplicado', 'Ya existe un cliente registrado con ese documento', 400);
            }

            const salt = await bcrypt.genSalt(10);
            const passwordEncriptada = await bcrypt.hash(password, salt);

            const nuevoUsuario = await Usuario.create({
                tipodocumento,
                documento: documentocliente,
                nombre,
                apellido,
                email,
                password: passwordEncriptada,
                municipio,
                complemento,
                dirrecion: direccion,
                barrio,
                rol_idrol: 2,
                estado: true
            });

            const nuevoCliente = await Cliente.create({
                tipodocumento,
                documentocliente,
                nombre,
                apellido,
                email,
                telefono,
                estado: true,
                municipio,
                complemento,
                direccion,
                barrio,
                usuario_idusuario: nuevoUsuario.idusuario
            });

            const asunto = '¡Gracias por registrarte en Postware!';
            const htmlBienvenida = `
              <h1>¡Bienvenido a Postware!</h1>
              <p>Hola ${nuevoCliente.nombre} ${nuevoCliente.apellido},</p>
              <p>Gracias por registrarte en Postware. Tu número de identificación registrado es: ${nuevoCliente.documentocliente}.</p>
              <p>¡Esperamos que disfrutes de nuestra aplicación!</p>
              <p>Saludos,</p>
              <p>El equipo de Postware</p>
            `;

            await enviarCorreo(nuevoCliente.email, asunto, htmlBienvenida);

            const clienteFormateado = {
                id: nuevoCliente.documentocliente,
                tipodocumento: nuevoCliente.tipodocumento,
                nombre: nuevoCliente.nombre,
                apellido: nuevoCliente.apellido,
                telefono: nuevoCliente.telefono,
                email: nuevoCliente.email,
                direccion: {
                    municipio: nuevoCliente.municipio,
                    barrio: nuevoCliente.barrio,
                    complemento: nuevoCliente.complemento,
                    direccion: nuevoCliente.direccion
                },
                estado: nuevoCliente.estado,
                usuario: {
                    id: nuevoUsuario.idusuario,
                    email: nuevoUsuario.email,
                    estado: nuevoUsuario.estado,
                    rol: 'Cliente'
                }
            };

            return ResponseHandler.success(res, {
                mensaje: 'Cliente y usuario creados exitosamente',
                cliente: clienteFormateado
            });
        } catch (error) {
            console.error('Error al crear cliente:', error);
            return ResponseHandler.error(res, 'Error interno', 'Error al crear el cliente');
        }
    },

    // Actualizar un cliente
    async actualizarCliente(req, res) {
        try {
            const { id } = req.params;
            
            if (isNaN(id)) {
                return ResponseHandler.validationError(res, {
                    id: 'El ID debe ser un número'
                });
            }

            const cliente = await Cliente.findByPk(id, {
                include: [{
                    model: Usuario,
                    as: 'usuario'
                }]
            });

            if (!cliente) {
                return ResponseHandler.error(res, 'Cliente no encontrado', 'No existe un cliente con el ID proporcionado', 404);
            }

            const {
                tipodocumento,
                nombre,
                apellido,
                email,
                telefono,
                estado,
                municipio,
                complemento,
                direccion,
                barrio
            } = req.body;

            const validaciones = {
                tipodocumento: { tipo: 'string', maxLength: 10, mensaje: 'El tipo de documento debe ser una cadena de texto de máximo 10 caracteres' },
                nombre: { tipo: 'string', maxLength: 45, mensaje: 'El nombre debe ser una cadena de texto de máximo 45 caracteres' },
                apellido: { tipo: 'string', maxLength: 45, mensaje: 'El apellido debe ser una cadena de texto de máximo 45 caracteres' },
                email: { tipo: 'string', maxLength: 45, mensaje: 'El email debe ser una cadena de texto de máximo 45 caracteres' },
                telefono: { tipo: 'string', maxLength: 10, mensaje: 'El teléfono debe ser una cadena de texto de máximo 10 caracteres' },
                estado: { tipo: 'boolean', mensaje: 'El estado debe ser un valor booleano' },
                municipio: { tipo: 'string', maxLength: 10, mensaje: 'El municipio debe ser una cadena de texto de máximo 10 caracteres' },
                complemento: { tipo: 'string', maxLength: 30, mensaje: 'El complemento debe ser una cadena de texto de máximo 30 caracteres' },
                direccion: { tipo: 'string', maxLength: 50, mensaje: 'La dirección debe ser una cadena de texto de máximo 50 caracteres' },
                barrio: { tipo: 'string', maxLength: 20, mensaje: 'El barrio debe ser una cadena de texto de máximo 20 caracteres' }
            };

            for (const [campo, validacion] of Object.entries(validaciones)) {
                if (req.body[campo] !== undefined) {
                    if (typeof req.body[campo] !== validacion.tipo) {
                        return ResponseHandler.validationError(res, { [campo]: validacion.mensaje });
                    }
                    if (validacion.maxLength && req.body[campo].length > validacion.maxLength) {
                        return ResponseHandler.validationError(res, { [campo]: validacion.mensaje });
                    }
                }
            }

            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return ResponseHandler.validationError(res, {
                        email: 'El formato del email no es válido'
                    });
                }

                const usuarioExistente = await Usuario.findOne({
                    where: {
                        email,
                        idusuario: { [Op.ne]: cliente.usuario?.idusuario }
                    }
                });

                if (usuarioExistente) {
                    return ResponseHandler.error(res, 'Email duplicado', 'Ya existe otro usuario registrado con ese email', 400);
                }
            }

            await cliente.update({
                tipodocumento,
                nombre,
                apellido,
                email,
                telefono,
                estado,
                municipio,
                complemento,
                direccion,
                barrio
            });

            if (cliente.usuario) {
                await cliente.usuario.update({
                    tipodocumento,
                    nombre,
                    apellido,
                    email,
                    municipio,
                    complemento,
                    dirrecion: direccion,
                    barrio,
                    estado
                });
            }

            const clienteActualizado = await Cliente.findByPk(id, {
                include: [{
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['idusuario', 'email', 'estado', 'rol_idrol']
                }]
            });

            return ResponseHandler.success(res, {
                mensaje: 'Cliente actualizado exitosamente',
                cliente: clienteActualizado
            });
        } catch (error) {
            console.error('Error al actualizar cliente:', error);
            return ResponseHandler.error(res, 'Error interno', 'Error al actualizar el cliente');
        }
    },

    // Eliminar un cliente
    async eliminarCliente(req, res) {
        try {
            const { id } = req.params;
            
            if (isNaN(id)) {
                return ResponseHandler.validationError(res, {
                    id: 'El ID debe ser un número'
                });
            }

            const cliente = await Cliente.findByPk(id, {
                include: [{
                    model: Usuario,
                    as: 'usuario'
                }]
            });

            if (!cliente) {
                return ResponseHandler.error(res, 'Cliente no encontrado', 'No existe un cliente con el ID proporcionado', 404);
            }

            const ventasAsociadas = await Venta.findOne({
                where: { documentocliente: id }
            });

            if (ventasAsociadas) {
                return ResponseHandler.error(
                    res,
                    'No se puede eliminar el cliente',
                    'El cliente tiene ventas asociadas y no puede ser eliminado',
                    400
                );
            }

            if (cliente.usuario) {
                await cliente.usuario.destroy();
            }

            await cliente.destroy();

            return ResponseHandler.success(res, {
                mensaje: 'Cliente y usuario asociado eliminados correctamente'
            });
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            return ResponseHandler.error(res, 'Error interno', 'Error al eliminar el cliente');
        }
    },

    // Buscar clientes
    async buscarClientes(req, res) {
        try {
            const { termino } = req.query;
            
            if (!termino) {
                return ResponseHandler.validationError(res, {
                    termino: 'El término de búsqueda es requerido'
                });
            }

            const clientes = await Cliente.findAll({
                where: {
                    [Op.or]: [
                        { nombre: { [Op.iLike]: `%${termino}%` } },
                        { apellido: { [Op.iLike]: `%${termino}%` } },
                        { documentocliente: { [Op.iLike]: `%${termino}%` } },
                        { email: { [Op.iLike]: `%${termino}%` } },
                        { telefono: { [Op.iLike]: `%${termino}%` } },
                        { barrio: { [Op.iLike]: `%${termino}%` } }
                    ]
                },
                include: [{
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['idusuario', 'email', 'estado', 'rol_idrol']
                }],
                order: [['nombre', 'ASC']]
            });

            const clientesFormateados = clientes.map(cliente => ({
                id: cliente.documentocliente,
                tipodocumento: cliente.tipodocumento,
                nombre: cliente.nombre,
                apellido: cliente.apellido,
                telefono: cliente.telefono,
                email: cliente.email,
                direccion: {
                    municipio: cliente.municipio,
                    barrio: cliente.barrio,
                    complemento: cliente.complemento,
                    direccion: cliente.direccion
                },
                estado: cliente.estado,
                usuario: cliente.usuario ? {
                    id: cliente.usuario.idusuario,
                    email: cliente.usuario.email,
                    estado: cliente.usuario.estado,
                    rol: cliente.usuario.rol_idrol === 2 ? 'Cliente' : 'Otro'
                } : null
            }));

            return ResponseHandler.success(res, {
                total: clientesFormateados.length,
                clientes: clientesFormateados
            });
        } catch (error) {
            console.error('Error al buscar clientes:', error);
            return ResponseHandler.error(res, 'Error interno', 'Error al buscar los clientes');
        }
    },

    // Cambiar estado del cliente
    async cambiarEstadoCliente(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (isNaN(id)) {
                return ResponseHandler.validationError(res, {
                    id: 'El ID debe ser un número'
                });
            }

            if (typeof estado !== 'boolean') {
                return ResponseHandler.validationError(res, {
                    estado: 'El estado debe ser un valor booleano (true/false)'
                });
            }

            const cliente = await Cliente.findByPk(id, {
                include: [{
                    model: Usuario,
                    as: 'usuario'
                }]
            });

            if (!cliente) {
                return ResponseHandler.error(res, 'Cliente no encontrado', 'No existe un cliente con el ID proporcionado', 404);
            }

            await cliente.update({ estado });

            if (cliente.usuario) {
                await cliente.usuario.update({ estado });
            }

            return ResponseHandler.success(res, {
                mensaje: `Cliente ${estado ? 'activado' : 'desactivado'} exitosamente`,
                cliente: {
                    id: cliente.documentocliente,
                    nombre: cliente.nombre,
                    estado: estado,
                    usuario: cliente.usuario ? {
                        id: cliente.usuario.idusuario,
                        email: cliente.usuario.email,
                        estado: estado
                    } : null
                }
            });
        } catch (error) {
            console.error('Error al cambiar estado del cliente:', error);
            return ResponseHandler.error(res, 'Error interno', 'Error al cambiar el estado del cliente');
        }
    }
};

module.exports = clientesController; 