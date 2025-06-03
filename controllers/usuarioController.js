const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { usuarios, rol, cliente, roles_permisos, permisos } = require('../models');
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
    const { email } = req.body;
  
    try {
      const usuario = await usuarios.findOne({ where: { email } });
  
      if (!usuario) {
        return res.status(404).json({ message: 'No existe una cuenta con ese correo.' });
      }
  
      const token = crypto.randomBytes(20).toString('hex');
      const tokenExpira = new Date(Date.now() + 3600000); // 1 hora desde ahora
  
      usuario.tokenRecuperacion = token;
      usuario.tokenExpira = tokenExpira;
      await usuario.save();
  
      const mailOptions = {
        from: '"Postware S.A.S" <postwaret@gmail.com>',
        to: email,
        subject: 'Recuperación de contraseña',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #ccc; border-radius: 10px;">
            <h2 style="color: #004085;">🔐 Recuperación de Contraseña</h2>
            <p style="font-size: 16px;">Hola,</p>
            <p style="font-size: 15px;">Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código de recuperación:</p>
            
            <div style="margin: 20px 0; padding: 20px; background-color: #e9ecef; border-left: 5px solid #007bff; text-align: center; border-radius: 8px;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #343a40;">${token}</span>
            </div>
  
            <p style="font-size: 14px;">Este código es válido por 1 hora. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
  
            <hr style="margin-top: 30px;" />
            <p style="font-size: 12px; color: #6c757d;">Postware S.A.S</p>
          </div>
        `
      };
  
      await transporter.sendMail(mailOptions);
      res.json({ message: 'Correo de recuperación enviado con éxito.' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al enviar el correo.' });
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

      // Validaciones de campos requeridos (más robustas)
      if (!tipodocumento || !documento || !nombre || !apellido || !email || !password || rol_idrol === undefined || rol_idrol === null) {
        return res.status(400).json({ error: 'Todos los campos obligatorios son requeridos' });
      }

      // Limpiar espacios en campos de texto
      const tipodocumentoTrimmed = typeof tipodocumento === 'string' ? tipodocumento.trim() : tipodocumento;
      const documentoTrimmed = typeof documento === 'string' ? documento.trim() : documento;
      const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
      const apellidoTrimmed = typeof apellido === 'string' ? apellido.trim() : apellido;
      const emailTrimmed = typeof email === 'string' ? email.trim() : email;
      const municipioTrimmed = typeof municipio === 'string' ? municipio.trim() : municipio;
      const complementoTrimmed = typeof complemento === 'string' ? complemento.trim() : complemento;
      const dirrecionTrimmed = typeof dirrecion === 'string' ? dirrecion.trim() : dirrecion;
      const barrioTrimmed = typeof barrio === 'string' ? barrio.trim() : barrio;

       // Validar que los campos requeridos no estén vacíos después de limpiar espacios
       if (!tipodocumentoTrimmed || !documentoTrimmed || !nombreTrimmed || !apellidoTrimmed || !emailTrimmed || !password) { // Password se valida sin trim ya que bcrypt lo maneja
        return res.status(400).json({ error: 'Los campos obligatorios no pueden estar vacíos o contener solo espacios' });
      }

      // Validación de formato de email (estricta)
      const emailRegex = /^[\S+@\S+\.\S+]+$/; // Ajuste a regex más común para email
      if (!emailRegex.test(emailTrimmed)) {
          return res.status(400).json({ error: 'Formato de email inválido' });
      }

      // Verificar si ya existe un usuario con el mismo documento
      const usuarioExistente = await usuarios.findOne({ 
        where: { 
          documento: documentoTrimmed,
          tipodocumento: tipodocumentoTrimmed
        } 
      });

      if (usuarioExistente) {
        return res.status(400).json({ 
          error: 'Usuario ya existe', 
          detalles: 'Ya existe un usuario registrado con este documento y tipo de documento' 
        });
      }

      const estadoFinal = estado !== undefined ? estado : true;

      const rolAsignado = await rol.findOne({ where: { idrol: rol_idrol } });
      if (!rolAsignado) {
        return res.status(400).json({ error: 'Rol no encontrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const nuevoUsuario = await usuarios.create({
        tipodocumento: tipodocumentoTrimmed,
        documento: documentoTrimmed,
        nombre: nombreTrimmed,
        apellido: apellidoTrimmed,
        email: emailTrimmed,
        password: hashedPassword,
        municipio: municipioTrimmed,
        complemento: complementoTrimmed,
        dirrecion: dirrecionTrimmed,
        barrio: barrioTrimmed,
        rol_idrol: rolAsignado.idrol,
        estado: estadoFinal
      });

      await enviarCorreo(
        emailTrimmed,
        'Bienvenido a nuestra plataforma de Postware',
        `<h3>Hola ${nombreTrimmed},</h3><p>Gracias por registrarte en <strong>Postware</strong>. ¡Estamos felices de tenerte con nosotros!</p>`
      );

      return res.status(201).json({
        message: 'Usuario registrado exitosamente',
        usuario: {
          id: nuevoUsuario.idusuario,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email,
          rol: rolAsignado.nombre
        }
      });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
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
        return res.status(400).json({ error: 'Todos los campos obligatorios son requeridos' });
      }

      // Limpiar espacios en campos de texto
      const tipodocumentoTrimmed = typeof tipodocumento === 'string' ? tipodocumento.trim() : tipodocumento;
      const documentoTrimmed = typeof documento === 'string' ? documento.trim() : documento;
      const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
      const apellidoTrimmed = typeof apellido === 'string' ? apellido.trim() : apellido;
      const emailTrimmed = typeof email === 'string' ? email.trim() : email;
      const municipioTrimmed = typeof municipio === 'string' ? municipio.trim() : municipio;
      const complementoTrimmed = typeof complemento === 'string' ? complemento.trim() : complemento;
      const dirrecionTrimmed = typeof dirrecion === 'string' ? dirrecion.trim() : dirrecion;
      const barrioTrimmed = typeof barrio === 'string' ? barrio.trim() : barrio;
       const numerocontactoTrimmed = typeof numerocontacto === 'string' ? numerocontacto.trim() : numerocontacto;

       // Validar que los campos requeridos no estén vacíos después de limpiar espacios
       if (!tipodocumentoTrimmed || !documentoTrimmed || !nombreTrimmed || !apellidoTrimmed || !emailTrimmed || !password || !numerocontactoTrimmed) {
         return res.status(400).json({ error: 'Los campos obligatorios no pueden estar vacíos o contener solo espacios' });
       }

       // Validación de formato de email (estricta)
      const emailRegex = /^[\S+@\S+\.\S+]+$/; // Ajuste a regex más común para email
      if (!emailRegex.test(emailTrimmed)) {
          return res.status(400).json({ error: 'Formato de email inválido' });
      }

      // Verificar si ya existe un usuario con el mismo documento
      const usuarioExistente = await usuarios.findOne({ 
        where: { 
          documento: documentoTrimmed,
          tipodocumento: tipodocumentoTrimmed
        } 
      });

      if (usuarioExistente) {
        return res.status(400).json({ 
          error: 'Usuario ya existe', 
          detalles: 'Ya existe un usuario registrado con este documento y tipo de documento' 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const nuevoUsuario = await usuarios.create({
        tipodocumento: tipodocumentoTrimmed,
        documento: documentoTrimmed,
        nombre: nombreTrimmed,
        apellido: apellidoTrimmed,
        email: emailTrimmed,
        password: hashedPassword,
        municipio: municipioTrimmed,
        complemento: complementoTrimmed,
        dirrecion: dirrecionTrimmed,
        barrio: barrioTrimmed,
        rol_idrol: 2, // Cliente
        estado: true
      });

      const nuevoCliente = await cliente.create({
        tipodocumento: tipodocumentoTrimmed,
        documentocliente: documentoTrimmed,
        nombre: nombreTrimmed,
        apellido: apellidoTrimmed,
        email: emailTrimmed,
        telefono: numerocontactoTrimmed,
        estado: 1,
        municipio: municipioTrimmed,
        complemento: complementoTrimmed,
        direccion: dirrecionTrimmed,
        barrio: barrioTrimmed,
        usuario_idusuario: nuevoUsuario.idusuario
      });

      await enviarCorreo(
        emailTrimmed,
        'Bienvenido a nuestra plataforma de Postware',
        `<h3>Hola ${nombreTrimmed},</h3><p>Gracias por registrarte en <strong>Postware</strong> como cliente. ¡Esperamos que disfrutes de nuestros servicios!</p>`
      );

      return res.status(201).json({
        message: 'Usuario y cliente registrados exitosamente',
        data: {
          usuario: nuevoUsuario,
          cliente: nuevoCliente
        }
      });
    } catch (error) {
      console.error('Error al registrar usuario y cliente:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
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

      try {
        const usuario = await usuarios.findOne({
          where: {
            email: emailStr,
          },
          include: [{
            model: rol, // Incluir el rol primero
            as: 'rol', // Usar el alias definido en init-models.js
            include: [{
              model: roles_permisos, // Luego incluir roles_permisos a través del rol
              as: 'permisos_asociados', // Usar el alias definido
              include: [{
                model: permisos, // Finalmente incluir permisos a través de roles_permisos
                as: 'permiso', // Usar el alias definido
                attributes: ['nombre']
              }]
            }]
          }]
        });

        if (!usuario) {
          return ResponseHandler.error(res, 'Credenciales incorrectas', 'El email o la contraseña son incorrectos', 401);
        }

        // Verificar si el usuario encontrado es un cliente (rol_idrol = 2)
        if (usuario.rol_idrol === 2) {
          return ResponseHandler.error(res, 'Acceso no permitido', 'Eres un cliente. Por favor, inicia sesión a través de la aplicación móvil.', 403);
        }

        // *** Nueva verificación de estado del rol ***
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

        // Extraer los permisos del usuario a través de la relación rol -> roles_permisos -> permiso
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
      } catch (dbError) {
        if (dbError.name === 'SequelizeConnectionError' || dbError.name === 'SequelizeConnectionRefusedError') {
          console.error('Error de conexión a la base de datos:', dbError);
          return ResponseHandler.error(res, 'Error de conexión', 'No se pudo conectar con el servidor. Por favor, intente más tarde', 503);
        }
        throw dbError;
      }
    } catch (error) {
      if (error.name !== 'SequelizeConnectionError' && error.name !== 'SequelizeConnectionRefusedError') {
        console.error('Error inesperado:', error);
      }
      
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

      try {
        const usuario = await usuarios.findOne({ 
          where: { 
            email: emailStr,
            rol_idrol: 2 // Solo usuarios con rol 2 (clientes)
          },
          include: [{
            model: cliente,
            as: 'cliente'
          }, {
            model: rol, // Incluir el modelo rol
            as: 'rol' // Usar el alias correcto
          }]
        });

        if (!usuario) {
          return ResponseHandler.error(res, 'Credenciales incorrectas', 'El email o la contraseña son incorrectos', 401);
        }

        // *** Nueva verificación de estado del rol ***
         if (!usuario.rol || !usuario.rol.estado) {
          return ResponseHandler.error(res, 'Rol inactivo', 'Tu rol está inactivo. Contacta al administrador.', 403);
        }

        if (!usuario.estado) {
          return ResponseHandler.error(res, 'Cuenta inactiva', 'Tu cuenta está inactiva. Por favor, contacta al administrador'
            , 403);
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
          message: 'Inicio de sesión exitoso',
          usuario: {
            id: usuario.idusuario,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol_idrol,
            cliente: usuario.cliente
          },
          token
        }, 'Inicio de sesión exitoso');
      } catch (dbError) {
        if (dbError.name === 'SequelizeConnectionError' || dbError.name === 'SequelizeConnectionRefusedError') {
          console.error('Error de conexión a la base de datos:', dbError);
          return ResponseHandler.error(res, 'Error de conexión', 'No se pudo conectar con el servidor. Por favor, intente más tarde', 503);
        }
        throw dbError;
      }
    } catch (error) {
      if (error.name !== 'SequelizeConnectionError' && error.name !== 'SequelizeConnectionRefusedError') {
        console.error('Error inesperado:', error);
      }
      
      return ResponseHandler.error(res, 'Error interno', 'Ha ocurrido un error inesperado. Por favor, intente más tarde');
    }
  },

  async editarUsuario(req, res) {
    try {
      const { idusuario } = req.params;  // Recibe el id del usuario desde los parámetros
      const { tipodocumento, documento, nombre, apellido, email, password, municipio, complemento, dirrecion, barrio, rol_idrol, estado } = req.body;

      // *** Nueva validación para el usuario administrador principal (ID 34) ***
      if (parseInt(idusuario) === 34 && rol_idrol !== undefined) {
        // Opcional: Puedes verificar si el nuevo rol_idrol es diferente al actual si ya tienes el usuario cargado
        // Pero para simplificar, solo bloqueamos cualquier intento de enviar rol_idrol para el usuario 34
         return res.status(403).json({
           error: 'Operación no permitida',
           detalles: 'No se puede modificar el rol del usuario administrador principal del sistema.'
         });
      }

      const usuarioExistente = await usuarios.findOne({ where: { idusuario } });
      if (!usuarioExistente) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Crear un objeto con los valores a actualizar y aplicar validaciones si los campos se envían
      const datosAActualizar = {};

      if (tipodocumento !== undefined) {
        const tipodocumentoTrimmed = typeof tipodocumento === 'string' ? tipodocumento.trim() : tipodocumento;
        if (tipodocumentoTrimmed === '') return res.status(400).json({ error: 'El tipo de documento no puede estar vacío' });
        datosAActualizar.tipodocumento = tipodocumentoTrimmed;
      }

      if (documento !== undefined) {
        const documentoTrimmed = typeof documento === 'string' ? documento.trim() : documento;
        if (documentoTrimmed === '') return res.status(400).json({ error: 'El documento no puede estar vacío' });
        datosAActualizar.documento = documentoTrimmed;
      }

      if (nombre !== undefined) {
        const nombreTrimmed = typeof nombre === 'string' ? nombre.trim() : nombre;
        if (nombreTrimmed === '') return res.status(400).json({ error: 'El nombre no puede estar vacío' });
        datosAActualizar.nombre = nombreTrimmed;
      }

      if (apellido !== undefined) {
        const apellidoTrimmed = typeof apellido === 'string' ? apellido.trim() : apellido;
        if (apellidoTrimmed === '') return res.status(400).json({ error: 'El apellido no puede estar vacío' });
        datosAActualizar.apellido = apellidoTrimmed;
      }

      if (email !== undefined) {
        const emailTrimmed = typeof email === 'string' ? email.trim() : email;
        if (emailTrimmed === '') return res.status(400).json({ error: 'El email no puede estar vacío' });
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailTrimmed)) {
          return res.status(400).json({ error: 'Formato de email inválido' });
        }
        datosAActualizar.email = emailTrimmed;
      }

      if (password !== undefined) {
        if (typeof password === 'string' && password.trim() === '') return res.status(400).json({ error: 'La contraseña no puede estar vacía' });
        datosAActualizar.password = await bcrypt.hash(password, 10);
      }

      if (municipio !== undefined) {
        const municipioTrimmed = typeof municipio === 'string' ? municipio.trim() : municipio;
        if (municipioTrimmed === '') return res.status(400).json({ error: 'El municipio no puede estar vacío' });
        datosAActualizar.municipio = municipioTrimmed;
      }

      if (complemento !== undefined) {
        const complementoTrimmed = typeof complemento === 'string' ? complemento.trim() : complemento;
        if (complementoTrimmed === '') return res.status(400).json({ error: 'El complemento no puede estar vacío' });
        datosAActualizar.complemento = complementoTrimmed;
      }

      if (dirrecion !== undefined) {
        const dirrecionTrimmed = typeof dirrecion === 'string' ? dirrecion.trim() : dirrecion;
        if (dirrecionTrimmed === '') return res.status(400).json({ error: 'La dirección no puede estar vacía' });
        datosAActualizar.dirrecion = dirrecionTrimmed;
      }

      if (barrio !== undefined) {
        const barrioTrimmed = typeof barrio === 'string' ? barrio.trim() : barrio;
        if (barrioTrimmed === '') return res.status(400).json({ error: 'El barrio no puede estar vacío' });
        datosAActualizar.barrio = barrioTrimmed;
      }

      if (rol_idrol !== undefined) {
        // Puedes agregar validaciones específicas para rol_idrol si es necesario
        datosAActualizar.rol_idrol = rol_idrol;
      }

      if (estado !== undefined) {
        // Puedes agregar validaciones específicas para estado si es necesario
        datosAActualizar.estado = estado;
      }

      if (Object.keys(datosAActualizar).length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });
      }

      // Actualizar solo los campos que han sido proporcionados y validados
      const usuarioActualizado = await usuarioExistente.update(datosAActualizar);

      return res.status(200).json({
        message: 'Usuario actualizado exitosamente',
        usuario: {
          id: usuarioActualizado.idusuario,
          nombre: usuarioActualizado.nombre,
          email: usuarioActualizado.email,
          rol: usuarioActualizado.rol_idrol
        }
      });
    } catch (error) {
      console.error('Error al editar usuario:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async cambiarEstadoUsuario(req, res) {
    try {
      const { idusuario } = req.params;
      const { estado } = req.body;

      if (estado === undefined) {
        return res.status(400).json({ error: 'El estado es requerido' });
      }

      const usuarioExistente = await usuarios.findOne({ where: { idusuario } });
      if (!usuarioExistente) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar si es un usuario administrador
      if (usuarioExistente.rol_idrol === 1) {
        return res.status(403).json({ 
          error: 'Operación no permitida',
          detalles: 'No se puede cambiar el estado de un usuario administrador'
        });
      }

      // Actualizar el estado del usuario
      usuarioExistente.estado = estado;
      await usuarioExistente.save();

      return res.status(200).json({
        message: `Estado del usuario actualizado a ${estado ? 'activo' : 'inactivo'}`,
        usuario: {
          id: usuarioExistente.idusuario,
          nombre: usuarioExistente.nombre,
          email: usuarioExistente.email,
          estado: usuarioExistente.estado
        }
      });
    } catch (error) {
      console.error('Error al cambiar el estado del usuario:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async obtenerUsuarios(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;

      // Asegurarnos de que page y limit sean números positivos
      if (page < 1) {
        return res.status(400).json({ 
          error: 'Página inválida',
          detalles: 'El número de página debe ser mayor a 0'
        });
      }

      if (limit < 1) {
        return res.status(400).json({ 
          error: 'Límite inválido',
          detalles: 'El límite debe ser mayor a 0'
        });
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await usuarios.findAndCountAll({
        limit: limit,
        offset: offset,
        order: [['idusuario', 'ASC']],
        attributes: { exclude: ['password'] }
      });

      console.log('Número total de usuarios encontrados:', count);
      console.log('Límite por página:', limit);
      console.log('Página actual:', page);
      console.log('Offset calculado:', offset);

      const totalPaginas = Math.ceil(count / limit);

      // Validar si la página solicitada existe
      if (page > totalPaginas && count > 0) {
        return res.status(400).json({ 
          error: 'Página no encontrada',
          detalles: `La página ${page} no existe. El total de páginas es ${totalPaginas}`
        });
      }

      return res.status(200).json({
        usuarios: rows,
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
      return res.status(500).json({ 
        error: 'Error interno',
        detalles: 'Error al obtener la lista de usuarios'
      });
    }
  },

  async verDetalleUsuario(req, res) {
    try {
      const { idusuario } = req.params;

      if (!idusuario) {
        return res.status(400).json({ message: "ID de usuario no proporcionado" });
      }

      const usuario = await usuarios.findOne({
        where: { idusuario },
        include: [{ model: cliente, as: 'cliente' }],
      });

      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.json(usuario);
    } catch (error) {
      console.error("Error al obtener el detalle del usuario:", error);
      res.status(500).json({ message: "Error interno al obtener el usuario" });
    }
  },

  async eliminarUsuario(req, res) {
    const { idusuario } = req.params;

    try {
      // Buscar el usuario en la base de datos
      const usuario = await usuarios.findOne({ where: { idusuario } });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Verificar si es un usuario administrador
      if (usuario.rol_idrol === 1) {
        return res.status(403).json({ 
          error: 'Operación no permitida',
          detalles: 'No se puede eliminar un usuario administrador'
        });
      }

      // Eliminar el usuario
      await usuarios.destroy({
        where: { idusuario }
      });

      return res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      return res.status(500).json({ message: 'Error interno al eliminar el usuario' });
    }
  },

  async restablecerContrasena(req, res) {
    const { token, nuevaPassword } = req.body;
  
    try {
      const usuario = await usuarios.findOne({
        where: { tokenRecuperacion: token }
      });
  
      if (!usuario) {
        return res.status(404).json({ message: 'El token de recuperación es inválido.' });
      }
  
      if (usuario.tokenExpira < new Date()) {
        return res.status(410).json({ message: 'El token de recuperación ha expirado.' });
      }
  
      const mismaContrasena = await bcrypt.compare(nuevaPassword, usuario.password);
      if (mismaContrasena) {
        return res.status(422).json({ message: 'No puedes usar la misma contraseña que ya tenías.' });
      }
  
      const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
      usuario.password = hashedPassword;
      usuario.tokenRecuperacion = null;
      usuario.tokenExpira = null;
      await usuario.save();
  
      res.json({ message: 'Contraseña actualizada exitosamente.' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al restablecer la contraseña.' });
    }
  },

  async buscarUsuarios(req, res) {
    try {
      console.log("Parámetros de búsqueda recibidos:", req.query); // Depuración
      
      const {
        tipodocumento,
        documento,
        nombre,
        apellido,
        email,
        municipio,
        complemento,
        dirrecion,
        barrio,
        rol_idrol,
        estado,
        pagina = 1,
        limite = 10
      } = req.query;

      // Construir objeto de condiciones de búsqueda dinámicamente
      const condiciones = {};
      
      // Usar iLike para búsquedas insensibles a mayúsculas/minúsculas en PostgreSQL
      if (tipodocumento) condiciones.tipodocumento = { [Op.iLike]: `%${tipodocumento}%` };
      if (documento) condiciones.documento = { [Op.iLike]: `%${documento}%` };
      if (nombre) condiciones.nombre = { [Op.iLike]: `%${nombre}%` };
      if (apellido) condiciones.apellido = { [Op.iLike]: `%${apellido}%` };
      if (email) condiciones.email = { [Op.iLike]: `%${email}%` };
      if (municipio) condiciones.municipio = { [Op.iLike]: `%${municipio}%` };
      if (complemento) condiciones.complemento = { [Op.iLike]: `%${complemento}%` };
      if (dirrecion) condiciones.dirrecion = { [Op.iLike]: `%${dirrecion}%` };
      if (barrio) condiciones.barrio = { [Op.iLike]: `%${barrio}%` };
      if (rol_idrol) condiciones.rol_idrol = { [Op.iLike]: `%${rol_idrol}%` };
      if (estado) condiciones.estado = { [Op.iLike]: `%${estado}%` };

      const { count, rows } = await usuarios.findAndCountAll({
        where: condiciones,
        limit: limite,
        offset: (pagina - 1) * limite,
        order: [['idusuario', 'ASC']],
        attributes: { exclude: ['password'] }
      });

      const totalPaginas = Math.ceil(count / limite);

      // Validar si la página solicitada existe
      if (pagina > totalPaginas && count > 0) {
        return res.status(400).json({ 
          error: 'Página no encontrada',
          detalles: `La página ${pagina} no existe. El total de páginas es ${totalPaginas}`
        });
      }

      return res.status(200).json({
        usuarios: rows,
        paginacion: {
          total: count,
          totalPaginas: totalPaginas,
          paginaActual: pagina,
          paginaSiguiente: pagina < totalPaginas ? pagina + 1 : null,
          paginaAnterior: pagina > 1 ? pagina - 1 : null,
          limite: limite
        }
      });
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      return res.status(500).json({ 
        error: 'Error interno',
        detalles: 'Error al buscar la lista de usuarios'
      });
    }
  },

  async verPerfil(req, res) {
    try {
      const usuario = await usuarios.findByPk(req.usuario.id, {
        attributes: { exclude: ['password'] },
        include: [{ model: cliente, as: 'cliente' }]
      });

      if (!usuario) {
        return res.status(404).json({ 
          error: 'Usuario no encontrado',
          detalles: 'No se encontró el perfil del usuario'
        });
      }

      return res.status(200).json(usuario);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return res.status(500).json({ 
        error: 'Error interno',
        detalles: 'Error al obtener el perfil del usuario'
      });
    }
  },

  async editarPerfil(req, res) {
    try {
      const { nombre, apellido, email, password, municipio, complemento, dirrecion, barrio } = req.body;
      const usuario = await usuarios.findByPk(req.usuario.id);

      if (!usuario) {
        return res.status(404).json({ 
          error: 'Usuario no encontrado',
          detalles: 'No se encontró el usuario'
        });
      }

      // Crear objeto con los datos a actualizar
      const datosAActualizar = {};

      if (nombre) {
        const nombreTrimmed = nombre.trim();
        if (nombreTrimmed === '') {
          return res.status(400).json({ error: 'El nombre no puede estar vacío' });
        }
        datosAActualizar.nombre = nombreTrimmed;
      }

      if (apellido) {
        const apellidoTrimmed = apellido.trim();
        if (apellidoTrimmed === '') {
          return res.status(400).json({ error: 'El apellido no puede estar vacío' });
        }
        datosAActualizar.apellido = apellidoTrimmed;
      }

      if (email) {
        const emailTrimmed = email.trim();
        if (emailTrimmed === '') {
          return res.status(400).json({ error: 'El email no puede estar vacío' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailTrimmed)) {
          return res.status(400).json({ error: 'Formato de email inválido' });
        }
        datosAActualizar.email = emailTrimmed;
      }

      if (password) {
        if (password.trim() === '') {
          return res.status(400).json({ error: 'La contraseña no puede estar vacía' });
        }
        datosAActualizar.password = await bcrypt.hash(password, 10);
      }

      if (municipio) {
        const municipioTrimmed = municipio.trim();
        if (municipioTrimmed === '') {
          return res.status(400).json({ error: 'El municipio no puede estar vacío' });
        }
        datosAActualizar.municipio = municipioTrimmed;
      }

      if (complemento) {
        const complementoTrimmed = complemento.trim();
        if (complementoTrimmed === '') {
          return res.status(400).json({ error: 'El complemento no puede estar vacío' });
        }
        datosAActualizar.complemento = complementoTrimmed;
      }

      if (dirrecion) {
        const dirrecionTrimmed = dirrecion.trim();
        if (dirrecionTrimmed === '') {
          return res.status(400).json({ error: 'La dirección no puede estar vacía' });
        }
        datosAActualizar.dirrecion = dirrecionTrimmed;
      }

      if (barrio) {
        const barrioTrimmed = barrio.trim();
        if (barrioTrimmed === '') {
          return res.status(400).json({ error: 'El barrio no puede estar vacío' });
        }
        datosAActualizar.barrio = barrioTrimmed;
      }

      if (Object.keys(datosAActualizar).length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
      }

      await usuario.update(datosAActualizar);

      return res.status(200).json({
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
      return res.status(500).json({ 
        error: 'Error interno',
        detalles: 'Error al actualizar el perfil'
      });
    }
  }
};

module.exports = usuarioController;
