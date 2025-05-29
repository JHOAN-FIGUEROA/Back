const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { usuarios, rol, cliente, roles_permisos, permisos, venta } = require('../models');
const { Op } = require('sequelize');
const ResponseHandler = require('../utils/responseHandler');

// Transportador para enviar correos
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'postwaret@gmail.com',
    pass: 'qbau mkje qwml bgof' // Contraseña de aplicación
  }
});

// Función mejorada para enviar correo de bienvenida en HTML
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

// Definición de todas las funciones del controlador
const usuarioController = {
  async enviarTokenRecuperacion(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return ResponseHandler.validationError(res, {
          email: 'El email es requerido'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return ResponseHandler.validationError(res, {
          email: 'El formato del email no es válido'
        });
      }

      const usuario = await usuarios.findOne({ where: { email } });
      if (!usuario) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'No existe un usuario con ese email', 404);
      }

      const token = crypto.randomBytes(20).toString('hex');
      const tokenExpira = new Date();
      tokenExpira.setHours(tokenExpira.getHours() + 1);

      await usuario.update({
        resetToken: token,
        resetTokenExpira: tokenExpira
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
      const html = `
        <h1>Recuperación de Contraseña</h1>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
        <a href="${resetUrl}">Restablecer Contraseña</a>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      `;

      await enviarCorreo(email, 'Recuperación de Contraseña', html);

      return ResponseHandler.success(res, {
        mensaje: 'Se ha enviado un correo con instrucciones para restablecer la contraseña'
      });
    } catch (error) {
      console.error('Error al enviar token de recuperación:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al procesar la solicitud de recuperación de contraseña');
    }
  },

  async registrarUsuario(req, res) {
    try {
      const {
        tipodocumento,
        documento,
        nombre,
        apellido,
        email,
        password,
        municipio,
        complemento,
        dirrecion,
        barrio,
        rol_idrol,
        estado
      } = req.body;

      // Validaciones de campos requeridos
      const camposRequeridos = {
        tipodocumento: 'El tipo de documento es requerido',
        documento: 'El documento es requerido',
        nombre: 'El nombre es requerido',
        apellido: 'El apellido es requerido',
        email: 'El email es requerido',
        password: 'La contraseña es requerida',
        rol_idrol: 'El rol es requerido'
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
        documento: { tipo: 'number', mensaje: 'El documento debe ser un número' },
        nombre: { tipo: 'string', maxLength: 45, mensaje: 'El nombre debe ser una cadena de texto de máximo 45 caracteres' },
        apellido: { tipo: 'string', maxLength: 45, mensaje: 'El apellido debe ser una cadena de texto de máximo 45 caracteres' },
        email: { tipo: 'string', maxLength: 45, mensaje: 'El email debe ser una cadena de texto de máximo 45 caracteres' },
        password: { tipo: 'string', minLength: 6, mensaje: 'La contraseña debe tener al menos 6 caracteres' }
      };

      for (const [campo, validacion] of Object.entries(validaciones)) {
        if (req.body[campo]) {
          if (typeof req.body[campo] !== validacion.tipo) {
            return ResponseHandler.validationError(res, { [campo]: validacion.mensaje });
          }
          if (validacion.maxLength && req.body[campo].length > validacion.maxLength) {
            return ResponseHandler.validationError(res, { [campo]: validacion.mensaje });
          }
          if (validacion.minLength && req.body[campo].length < validacion.minLength) {
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

      // Verificar si el email ya está registrado
      const usuarioExistente = await usuarios.findOne({ where: { email } });
      if (usuarioExistente) {
        return ResponseHandler.error(res, 'Email duplicado', 'Ya existe un usuario registrado con ese email', 400);
      }

      // Verificar si el rol existe
      const rolExistente = await rol.findByPk(rol_idrol);
      if (!rolExistente) {
        return ResponseHandler.error(res, 'Rol no encontrado', 'El rol especificado no existe', 400);
      }

      // Encriptar contraseña
      const salt = await bcrypt.genSalt(10);
      const passwordEncriptada = await bcrypt.hash(password, salt);

      // Crear usuario
      const nuevoUsuario = await usuarios.create({
        tipodocumento,
        documento,
        nombre,
        apellido,
        email,
        password: passwordEncriptada,
        municipio,
        complemento,
        dirrecion,
        barrio,
        rol_idrol,
        estado: estado !== undefined ? estado : true
      });

      // Formatear el usuario creado para asegurar una serialización correcta
      const usuarioFormateado = {
        id: nuevoUsuario.idusuario,
        tipodocumento: nuevoUsuario.tipodocumento,
        documento: nuevoUsuario.documento,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        email: nuevoUsuario.email,
        direccion: {
          municipio: nuevoUsuario.municipio,
          barrio: nuevoUsuario.barrio,
          complemento: nuevoUsuario.complemento,
          direccion: nuevoUsuario.dirrecion
        },
        rol: rolExistente.nombre,
        estado: nuevoUsuario.estado
      };

      return ResponseHandler.success(res, {
        mensaje: 'Usuario registrado exitosamente',
        usuario: usuarioFormateado
      });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al registrar el usuario');
    }
  },

  async registrarUsuarioYCliente(req, res) {
    try {
      const {
        tipodocumento,
        documento,
        nombre,
        apellido,
        email,
        password,
        municipio,
        complemento,
        dirrecion,
        barrio,
        estado,
        numerocontacto
      } = req.body;

      // Validaciones de campos requeridos
      if (!tipodocumento || !documento || !nombre || !apellido || !email || !password || !numerocontacto) {
        return ResponseHandler.validationError(res, {
          general: 'Todos los campos obligatorios son requeridos'
        });
      }

      // Validaciones de tipos y longitudes
      if (typeof tipodocumento !== 'string' || tipodocumento.length > 10) {
        return ResponseHandler.validationError(res, {
          tipodocumento: 'El tipo de documento debe ser una cadena de texto de máximo 10 caracteres'
        });
      }

      if (typeof documento !== 'number') {
        return ResponseHandler.validationError(res, {
          documento: 'El documento debe ser un número'
        });
      }

      if (typeof nombre !== 'string' || nombre.length > 45) {
        return ResponseHandler.validationError(res, {
          nombre: 'El nombre debe ser una cadena de texto de máximo 45 caracteres'
        });
      }

      if (typeof apellido !== 'string' || apellido.length > 45) {
        return ResponseHandler.validationError(res, {
          apellido: 'El apellido debe ser una cadena de texto de máximo 45 caracteres'
        });
      }

      if (typeof email !== 'string' || email.length > 45) {
        return ResponseHandler.validationError(res, {
          email: 'El email debe ser una cadena de texto de máximo 45 caracteres'
        });
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return ResponseHandler.validationError(res, {
          email: 'El formato del email no es válido'
        });
      }

      if (typeof password !== 'string' || password.length < 6) {
        return ResponseHandler.validationError(res, {
          password: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      if (municipio && (typeof municipio !== 'string' || municipio.length > 10)) {
        return ResponseHandler.validationError(res, {
          municipio: 'El municipio debe ser una cadena de texto de máximo 10 caracteres'
        });
      }

      if (complemento && (typeof complemento !== 'string' || complemento.length > 30)) {
        return ResponseHandler.validationError(res, {
          complemento: 'El complemento debe ser una cadena de texto de máximo 30 caracteres'
        });
      }

      if (dirrecion && (typeof dirrecion !== 'string' || dirrecion.length > 50)) {
        return ResponseHandler.validationError(res, {
          direccion: 'La dirección debe ser una cadena de texto de máximo 50 caracteres'
        });
      }

      if (barrio && (typeof barrio !== 'string' || barrio.length > 20)) {
        return ResponseHandler.validationError(res, {
          barrio: 'El barrio debe ser una cadena de texto de máximo 20 caracteres'
        });
      }

      if (typeof numerocontacto !== 'string' || numerocontacto.length > 10) {
        return ResponseHandler.validationError(res, {
          numerocontacto: 'El número de contacto debe ser una cadena de texto de máximo 10 caracteres'
        });
      }

      if (estado !== undefined && typeof estado !== 'boolean') {
        return ResponseHandler.validationError(res, {
          estado: 'El estado debe ser un booleano'
        });
      }

      // Verificar si el email ya está registrado
      const usuarioExistente = await usuarios.findOne({ where: { email } });
      if (usuarioExistente) {
        return ResponseHandler.error(res, 'Email duplicado', 'Ya existe un usuario registrado con ese email', 400);
      }

      // Encriptar contraseña
      const salt = await bcrypt.genSalt(10);
      const passwordEncriptada = await bcrypt.hash(password, salt);

      // Crear usuario con rol de cliente (2)
      const nuevoUsuario = await usuarios.create({
        tipodocumento,
        documento,
        nombre,
        apellido,
        email,
        password: passwordEncriptada,
        municipio,
        complemento,
        dirrecion,
        barrio,
        rol_idrol: 2, // Rol de cliente
        estado: estado !== undefined ? estado : true
      });

      // Crear cliente asociado
      const nuevoCliente = await cliente.create({
        tipodocumento,
        documentocliente: documento,
        nombre,
        apellido,
        email,
        telefono: numerocontacto,
        estado: estado !== undefined ? estado : true,
        municipio,
        complemento,
        direccion: dirrecion,
        barrio,
        usuario_idusuario: nuevoUsuario.idusuario
      });

      // Enviar correo de bienvenida al cliente
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

      return ResponseHandler.success(res, {
        mensaje: 'Usuario y cliente registrados exitosamente',
        usuario: {
          id: nuevoUsuario.idusuario,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email,
          rol: 'Cliente'
        },
        cliente: {
          id: nuevoCliente.documentocliente,
          nombre: nuevoCliente.nombre,
          email: nuevoCliente.email
        }
      }, 201);
    } catch (error) {
      console.error('Error al registrar usuario y cliente:', error);
      return ResponseHandler.error(res, 'Error interno del servidor', 'Error al registrar el usuario y cliente');
    }
  },

  async iniciarSesion(req, res) {
    try {
      const { email, password } = req.body;

      // Validación de campos requeridos
      if (!email || !password) {
        return ResponseHandler.validationError(res, {
          email: !email ? 'El email es requerido' : null,
          password: !password ? 'La contraseña es requerida' : null
        });
      }

      // Convertir a string y validar
      const emailStr = String(email).trim();
      const passwordStr = String(password).trim();

      // Validación de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        return ResponseHandler.error(res, 'Credenciales incorrectas', 'El email o la contraseña son incorrectos', 401);
      }

      const usuario = await usuarios.findOne({
        where: {
          email: emailStr,
        },
        include: [{
          model: rol,
          as: 'rol',
          include: [{
            model: roles_permisos,
            as: 'permisos_asociados',
            include: [{
              model: permisos,
              as: 'permiso',
              attributes: ['nombre']
            }]
          }]
        }]
      });

      if (!usuario) {
        return ResponseHandler.error(res, 'Credenciales incorrectas', 'El email o la contraseña son incorrectos', 401);
      }

      // Verificar si el usuario encontrado es un cliente
      if (usuario.rol_idrol === 2) {
        return ResponseHandler.error(res, 'Acceso no permitido', 'Eres un cliente. Por favor, inicia sesión a través de la aplicación móvil.', 403);
      }

      // Verificar estado del rol
      if (!usuario.rol || !usuario.rol.estado) {
        return ResponseHandler.error(res, 'Rol inactivo', 'Tu rol está inactivo. Contacta al administrador.', 403);
      }

      if (!usuario.estado) {
        return ResponseHandler.error(res, 'Cuenta inactiva', 'Tu cuenta está inactiva. Por favor, contacta al administrador', 403);
      }

      const passwordValida = await bcrypt.compare(passwordStr, String(usuario.password));
      if (!passwordValida) {
        return ResponseHandler.error(res, 'Credenciales incorrectas', 'El email o la contraseña son incorrectos', 401);
      }

      // Extraer los permisos del usuario
      const permisosUsuario = usuario.rol.permisos_asociados.map(rp => rp.permiso.nombre);

      const token = jwt.sign(
        { 
          id: usuario.idusuario, 
          rol: usuario.rol_idrol,
          permisos: permisosUsuario 
        },
        process.env.JWT_SECRET || 'secreto',
        { expiresIn: '8h' }
      );

      return ResponseHandler.success(res, {
        usuario: {
          id: usuario.idusuario,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol_idrol,
          permisos: permisosUsuario
        },
        token
      }, 'Inicio de sesión exitoso');
    } catch (error) {
      if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
        console.error('Error de conexión a la base de datos:', error);
        return ResponseHandler.error(res, 'Error de conexión', 'No se pudo conectar con el servidor. Por favor, intente más tarde', 503);
      }
      console.error('Error inesperado:', error);
      return ResponseHandler.error(res, 'Error interno', 'Ha ocurrido un error inesperado. Por favor, intente más tarde');
    }
  },

  async iniciarSesionCliente(req, res) {
    try {
      const { email, password } = req.body;

      // Validación de campos requeridos
      if (!email || !password) {
        return ResponseHandler.validationError(res, {
          email: !email ? 'El email es requerido' : null,
          password: !password ? 'La contraseña es requerida' : null
        });
      }

      // Convertir a string y validar
      const emailStr = String(email).trim();
      const passwordStr = String(password).trim();

      // Validación de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        return ResponseHandler.error(res, 'Credenciales incorrectas', 'El email o la contraseña son incorrectos', 401);
      }

      const usuario = await usuarios.findOne({ 
        where: { 
          email: emailStr,
          rol_idrol: 2 // Solo usuarios con rol 2 (clientes)
        },
        include: [{
          model: cliente,
          as: 'cliente'
        }, {
          model: rol,
          as: 'rol'
        }]
      });

      if (!usuario) {
        return ResponseHandler.error(res, 'Credenciales incorrectas', 'El email o la contraseña son incorrectos', 401);
      }

      // Verificar estado del rol
      if (!usuario.rol || !usuario.rol.estado) {
        return ResponseHandler.error(res, 'Rol inactivo', 'Tu rol está inactivo. Contacta al administrador.', 403);
      }

      if (!usuario.estado) {
        return ResponseHandler.error(res, 'Cuenta inactiva', 'Tu cuenta está inactiva. Por favor, contacta al administrador', 403);
      }

      const passwordValida = await bcrypt.compare(passwordStr, String(usuario.password));
      if (!passwordValida) {
        return ResponseHandler.error(res, 'Credenciales incorrectas', 'El email o la contraseña son incorrectos', 401);
      }

      const token = jwt.sign(
        { id: usuario.idusuario, rol: usuario.rol_idrol },
        process.env.JWT_SECRET || 'secreto',
        { expiresIn: '8h' }
      );

      return ResponseHandler.success(res, {
        mensaje: 'Inicio de sesión exitoso',
        usuario: {
          id: usuario.idusuario,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol_idrol,
          cliente: usuario.cliente
        },
        token
      }, 'Inicio de sesión exitoso');
    } catch (error) {
      if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
        console.error('Error de conexión a la base de datos:', error);
        return ResponseHandler.error(res, 'Error de conexión', 'No se pudo conectar con el servidor. Por favor, intente más tarde', 503);
      }
      console.error('Error inesperado:', error);
      return ResponseHandler.error(res, 'Error interno', 'Ha ocurrido un error inesperado. Por favor, intente más tarde');
    }
  },

  async editarUsuario(req, res) {
    try {
      const { idusuario } = req.params;
      const { tipodocumento, documento, nombre, apellido, email, password, municipio, complemento, dirrecion, barrio, rol_idrol, estado } = req.body;

      if (parseInt(idusuario) === 34 && rol_idrol !== undefined) {
        return ResponseHandler.error(res, 'Operación no permitida', 'No se puede modificar el rol del usuario administrador principal del sistema.', 403);
      }

      const usuarioExistente = await usuarios.findOne({ where: { idusuario } });
      if (!usuarioExistente) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'No existe un usuario con el ID proporcionado', 404);
      }

      const datosAActualizar = {};
      const validaciones = {
        tipodocumento: { tipo: 'string', maxLength: 10, mensaje: 'El tipo de documento debe ser una cadena de texto de máximo 10 caracteres' },
        documento: { tipo: 'number', mensaje: 'El documento debe ser un número' },
        nombre: { tipo: 'string', maxLength: 45, mensaje: 'El nombre debe ser una cadena de texto de máximo 45 caracteres' },
        apellido: { tipo: 'string', maxLength: 45, mensaje: 'El apellido debe ser una cadena de texto de máximo 45 caracteres' },
        email: { tipo: 'string', maxLength: 45, mensaje: 'El email debe ser una cadena de texto de máximo 45 caracteres' },
        password: { tipo: 'string', minLength: 6, mensaje: 'La contraseña debe tener al menos 6 caracteres' }
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
            if (validacion.minLength && valor.length < validacion.minLength) {
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

      if (password) {
        datosAActualizar.password = await bcrypt.hash(password, 10);
      }

      const usuarioActualizado = await usuarioExistente.update(datosAActualizar);

      // Formatear el usuario actualizado para asegurar una serialización correcta
      const usuarioFormateado = {
        id: usuarioActualizado.idusuario,
        tipodocumento: usuarioActualizado.tipodocumento,
        documento: usuarioActualizado.documento,
        nombre: usuarioActualizado.nombre,
        apellido: usuarioActualizado.apellido,
        email: usuarioActualizado.email,
        direccion: {
          municipio: usuarioActualizado.municipio,
          barrio: usuarioActualizado.barrio,
          complemento: usuarioActualizado.complemento,
          direccion: usuarioActualizado.dirrecion
        },
        rol: usuarioActualizado.rol_idrol,
        estado: usuarioActualizado.estado
      };

      return ResponseHandler.success(res, {
        mensaje: 'Usuario actualizado exitosamente',
        usuario: usuarioFormateado
      });
    } catch (error) {
      console.error('Error al editar usuario:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al actualizar el usuario');
    }
  },

  async cambiarEstadoUsuario(req, res) {
    try {
      const { idusuario } = req.params;
      const { estado } = req.body;

      if (isNaN(idusuario)) {
        return ResponseHandler.validationError(res, {
          id: 'El ID debe ser un número'
        });
      }

      if (typeof estado !== 'boolean') {
        return ResponseHandler.validationError(res, {
          estado: 'El estado debe ser un valor booleano (true/false)'
        });
      }

      const usuario = await usuarios.findOne({
        where: { idusuario },
        include: [{
          model: cliente,
          as: 'cliente'
        }]
      });

      if (!usuario) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'No existe un usuario con el ID proporcionado', 404);
      }

      // Verificar si es un usuario administrador
      if (usuario.rol_idrol === 1) {
        return ResponseHandler.error(res, 'Operación no permitida', 'No se puede cambiar el estado de un usuario administrador', 403);
      }

      // Actualizar estado del usuario
      await usuario.update({ estado });

      // Actualizar estado del cliente asociado si existe
      if (usuario.cliente) {
        await usuario.cliente.update({ estado });
      }

      // Formatear la respuesta para asegurar una serialización correcta
      const respuestaFormateada = {
        mensaje: `Usuario ${estado ? 'activado' : 'desactivado'} exitosamente`,
        usuario: {
          id: usuario.idusuario,
          nombre: usuario.nombre,
          email: usuario.email,
          estado: estado,
          cliente: usuario.cliente ? {
            id: usuario.cliente.documentocliente,
            nombre: usuario.cliente.nombre,
            estado: estado
          } : null
        }
      };

      return ResponseHandler.success(res, respuestaFormateada);
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al cambiar el estado del usuario');
    }
  },

  async obtenerUsuarios(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;

      // Validar parámetros de paginación
      if (page < 1 || limit < 1) {
        return res.status(400).json({ 
          error: 'Parámetros inválidos',
          detalles: 'La página y el límite deben ser números positivos'
        });
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await usuarios.findAndCountAll({
        limit: limit,
        offset: offset,
        order: [['idusuario', 'ASC']],
        attributes: { exclude: ['password'] }
      });

      const totalPaginas = Math.ceil(count / limit);

      // Validar si la página solicitada existe
      if (page > totalPaginas && count > 0) {
        return res.status(400).json({ 
          error: 'Página no encontrada',
          detalles: `La página ${page} no existe. El total de páginas es ${totalPaginas}`
        });
      }

      // Formatear los usuarios para asegurar una serialización correcta
      const usuariosFormateados = rows.map(usuario => ({
        id: usuario.idusuario,
        tipodocumento: usuario.tipodocumento,
        documento: usuario.documento,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        direccion: {
          municipio: usuario.municipio,
          barrio: usuario.barrio,
          complemento: usuario.complemento,
          direccion: usuario.dirrecion
        },
        rol: usuario.rol_idrol,
        estado: usuario.estado
      }));

      return ResponseHandler.success(res, {
        usuarios: usuariosFormateados,
        paginacion: {
          total: count,
          totalPaginas: totalPaginas,
          paginaActual: page,
          paginaSiguiente: page < totalPaginas ? page + 1 : null,
          paginaAnterior: page > 1 ? page - 1 : null,
          limite: limit
        }
      });
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return ResponseHandler.error(res, 'Error interno del servidor', 'Error al obtener la lista de usuarios');
    }
  },

  async verDetalleUsuario(req, res) {
    try {
      const { idusuario } = req.params;

      if (!idusuario) {
        return ResponseHandler.validationError(res, { message: "ID de usuario no proporcionado" });
      }

      const usuario = await usuarios.findOne({
        where: { idusuario },
        include: [{ model: cliente, as: 'cliente' }],
      });

      if (!usuario) {
        return ResponseHandler.error(res, 'Usuario no encontrado', "Usuario no encontrado", 404);
      }

      return ResponseHandler.success(res, usuario);
    } catch (error) {
      console.error("Error al obtener el detalle del usuario:", error);
      return ResponseHandler.error(res, 'Error interno', "Error interno al obtener el usuario");
    }
  },

  async eliminarUsuario(req, res) {
    const { idusuario } = req.params;

    try {
      // Validar que el ID sea un número
      if (!idusuario || isNaN(idusuario)) {
        return ResponseHandler.validationError(res, {
          id: 'El ID debe ser un número'
        });
      }

      // Buscar el usuario con su cliente asociado
      const usuario = await usuarios.findOne({
        where: { idusuario },
        include: [{
          model: cliente,
          as: 'cliente'
        }]
      });

      if (!usuario) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'No existe un usuario con el ID proporcionado', 404);
      }

      // Verificar si es un usuario administrador
      if (usuario.rol_idrol === 1) {
        return ResponseHandler.error(res, 'Operación no permitida', 'No se puede eliminar un usuario administrador', 403);
      }

      // Si el usuario tiene un cliente asociado, verificar si tiene ventas
      if (usuario.cliente) {
        const ventasAsociadas = await venta.findOne({
          where: { cliente_documentocliente: usuario.cliente.documentocliente }
        });

        if (ventasAsociadas) {
          return ResponseHandler.error(
            res,
            'No se puede eliminar el usuario',
            'El usuario tiene un cliente asociado con ventas y no puede ser eliminado',
            400
          );
        }

        // Eliminar el cliente asociado
        await usuario.cliente.destroy();
      }

      // Eliminar el usuario
      await usuario.destroy();

      // Formatear la respuesta para asegurar una serialización correcta
      const respuestaFormateada = {
        mensaje: 'Usuario y cliente asociado eliminados exitosamente',
        usuario: {
          id: usuario.idusuario,
          nombre: usuario.nombre,
          email: usuario.email,
          cliente: usuario.cliente ? {
            id: usuario.cliente.documentocliente,
            nombre: usuario.cliente.nombre
          } : null
        }
      };

      return ResponseHandler.success(res, respuestaFormateada);
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al eliminar el usuario');
    }
  },

  async restablecerContrasena(req, res) {
    const { token, nuevaPassword } = req.body;

    try {
      const usuario = await usuarios.findOne({
        where: {
          tokenRecuperacion: token,
          tokenExpira: { [Op.gt]: new Date() }
        }
      });

      if (!usuario) {
        return ResponseHandler.error(res, 'Token inválido o expirado.', 'Token inválido o expirado.', 400);
      }

      const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

      usuario.password = hashedPassword;
      usuario.tokenRecuperacion = null;
      usuario.tokenExpira = null;
      await usuario.save();

      return ResponseHandler.success(res, { message: 'Contraseña actualizada exitosamente.' });

    } catch (error) {
      console.error(error);
      return ResponseHandler.error(res, 'Error al restablecer la contraseña.', 'Error al restablecer la contraseña.');
    }
  },

  async buscarUsuarios(req, res) {
    try {
      const {
        nombre,
        email,
        rol,
        estado,
        pagina = 1,
        limite = 10
      } = req.query;

      // Validar parámetros de paginación
      if (pagina < 1 || limite < 1) {
        return res.status(400).json({ 
          error: 'Parámetros inválidos',
          detalles: 'La página y el límite deben ser números positivos'
        });
      }

      // Construir objeto de condiciones dinámicas
      const condiciones = {};

      if (nombre) {
        const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
        if (nombreTrimmed === '') {
          return res.status(400).json({ 
            error: 'Nombre inválido',
            detalles: 'El nombre en la búsqueda no puede estar vacío'
          });
        }
        condiciones.nombre = { [Op.iLike]: `%${nombreTrimmed}%` };
      }

      if (email) {
        const emailTrimmed = typeof email === 'string' ? email.trim() : email;
        if (emailTrimmed === '') {
          return res.status(400).json({ 
            error: 'Email inválido',
            detalles: 'El email en la búsqueda no puede estar vacío'
          });
        }
        condiciones.email = { [Op.iLike]: `%${emailTrimmed}%` };
      }

      if (rol) {
        const rolNum = parseInt(rol);
        if (isNaN(rolNum)) {
          return res.status(400).json({ 
            error: 'Rol inválido',
            detalles: 'El rol debe ser un número'
          });
        }
        condiciones.rol_idrol = rolNum;
      }

      if (estado !== undefined) {
        condiciones.estado = estado === 'true';
      }

      const offset = (parseInt(pagina) - 1) * parseInt(limite);

      const { count, rows } = await usuarios.findAndCountAll({
        where: condiciones,
        limit: parseInt(limite),
        offset: offset,
        order: [['idusuario', 'ASC']],
        attributes: { exclude: ['password'] }
      });

      const totalPaginas = Math.ceil(count / parseInt(limite));

      // Validar si la página solicitada existe
      if (pagina > totalPaginas && count > 0) {
        return ResponseHandler.error(res, 'Página no encontrada', `La página ${pagina} no existe. El total de páginas es ${totalPaginas}`, 400);
      }

      // Formatear los usuarios para asegurar una serialización correcta
      const usuariosFormateados = rows.map(usuario => ({
        id: usuario.idusuario,
        tipodocumento: usuario.tipodocumento,
        documento: usuario.documento,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        direccion: {
          municipio: usuario.municipio,
          barrio: usuario.barrio,
          complemento: usuario.complemento,
          direccion: usuario.dirrecion
        },
        rol: usuario.rol_idrol,
        estado: usuario.estado
      }));

      return ResponseHandler.success(res, {
        usuarios: usuariosFormateados,
        total: count,
        totalPaginas,
        paginaActual: parseInt(pagina),
        paginaSiguiente: parseInt(pagina) < totalPaginas ? parseInt(pagina) + 1 : null,
        paginaAnterior: parseInt(pagina) > 1 ? parseInt(pagina) - 1 : null,
        limite: parseInt(limite)
      });

    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      return ResponseHandler.error(res, 'Error interno del servidor', 'Error al buscar usuarios');
    }
  },

  async verPerfil(req, res) {
    try {
      const usuario = await usuarios.findByPk(req.usuario.id, {
        attributes: { exclude: ['password'] },
        include: [{ model: cliente, as: 'cliente' }]
      });

      if (!usuario) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'No se encontró el perfil del usuario', 404);
      }

      return ResponseHandler.success(res, usuario);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al obtener el perfil del usuario');
    }
  },

  async editarPerfil(req, res) {
    try {
      const { nombre, apellido, email, password, municipio, complemento, dirrecion, barrio } = req.body;
      const usuario = await usuarios.findByPk(req.usuario.id);

      if (!usuario) {
        return ResponseHandler.error(res, 'Usuario no encontrado', 'No se encontró el usuario', 404);
      }

      // Crear objeto con los datos a actualizar
      const datosAActualizar = {};

      if (nombre) {
        const nombreTrimmed = nombre.trim();
        if (nombreTrimmed === '') {
          return ResponseHandler.validationError(res, { error: 'El nombre no puede estar vacío' });
        }
        datosAActualizar.nombre = nombreTrimmed;
      }

      if (apellido) {
        const apellidoTrimmed = apellido.trim();
        if (apellidoTrimmed === '') {
          return ResponseHandler.validationError(res, { error: 'El apellido no puede estar vacío' });
        }
        datosAActualizar.apellido = apellidoTrimmed;
      }

      if (email) {
        const emailTrimmed = email.trim();
        if (emailTrimmed === '') {
          return ResponseHandler.validationError(res, { error: 'El email no puede estar vacío' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailTrimmed)) {
          return ResponseHandler.validationError(res, { error: 'Formato de email inválido' });
        }
        datosAActualizar.email = emailTrimmed;
      }

      if (password) {
        if (password.trim() === '') {
          return ResponseHandler.validationError(res, { error: 'La contraseña no puede estar vacía' });
        }
        datosAActualizar.password = await bcrypt.hash(password, 10);
      }

      if (municipio) {
        const municipioTrimmed = municipio.trim();
        if (municipioTrimmed === '') {
          return ResponseHandler.validationError(res, { error: 'El municipio no puede estar vacío' });
        }
        datosAActualizar.municipio = municipioTrimmed;
      }

      if (complemento) {
        const complementoTrimmed = complemento.trim();
        if (complementoTrimmed === '') {
          return ResponseHandler.validationError(res, { error: 'El complemento no puede estar vacío' });
        }
        datosAActualizar.complemento = complementoTrimmed;
      }

      if (dirrecion) {
        const dirrecionTrimmed = dirrecion.trim();
        if (dirrecionTrimmed === '') {
          return ResponseHandler.validationError(res, { error: 'La dirección no puede estar vacía' });
        }
        datosAActualizar.dirrecion = dirrecionTrimmed;
      }

      if (barrio) {
        const barrioTrimmed = barrio.trim();
        if (barrioTrimmed === '') {
          return ResponseHandler.validationError(res, { error: 'El barrio no puede estar vacío' });
        }
        datosAActualizar.barrio = barrioTrimmed;
      }

      if (Object.keys(datosAActualizar).length === 0) {
        return ResponseHandler.validationError(res, { error: 'No se proporcionaron datos para actualizar' });
      }

      await usuario.update(datosAActualizar);

      return ResponseHandler.success(res, {
        message: 'Perfil actualizado exitosamente',
        usuario: {
          id: usuario.idusuario,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol_idrol
        }
      });
    } catch (error) {
      console.error('Error al editar perfil:', error);
      return ResponseHandler.error(res, 'Error interno', 'Error al actualizar el perfil');
    }
  }
};

module.exports = usuarioController;
