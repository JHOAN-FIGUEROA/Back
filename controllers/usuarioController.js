const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { usuarios, rol, cliente } = require('../models');
const { usuarios: Usuario, cliente: Cliente } = require('../models');
const { Op } = require('sequelize');

// Transportador para enviar correos
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jhoan24figueroa@gmail.com',
    pass: 'jjtm csmk tuqd fnus' // Contraseña de aplicación
  }
});


async function enviarTokenRecuperacion(req, res) {
  const { email } = req.body;

  try {
    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      return res.status(404).json({ message: 'No existe una cuenta con ese correo' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const tokenExpira = Date.now() + 3600000; // 1 hora desde ahora

    // Guarda el token en el usuario
    usuario.tokenRecuperacion = token;
    usuario.tokenExpira = tokenExpira;
    await usuario.save();

    const frontendUrl = `http://localhost:3000/recuperar/${token}`; // Ajusta URL según tu frontend

    const mailOptions = {
    from: '"Postware S.A.S" jhoan24figueroa@gmail.com',
    to: email,
    subject: 'Recuperación de contraseña',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #ccc; border-radius: 10px;">
        <h2 style="color: #333;">Recuperación de Contraseña</h2>
        <p>Has solicitado recuperar tu contraseña. Usa el siguiente código para restablecerla:</p>

        <div style="margin: 20px 0; padding: 10px; background-color: #f7f7f7; border: 1px solid #ddd; border-radius: 5px; text-align: center;">
          <strong style="font-size: 20px; letter-spacing: 1px; color: #222;">${token}</strong>
        </div>

        <p style="margin-bottom: 10px;">Copia este código y pégalo en la aplicación para continuar.</p>
        <p style="font-size: 12px; color: #888;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
      </div>
    `
  };

  

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Correo de recuperación enviado con éxito' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al enviar el correo' });
  }
}



// Función mejorada para enviar correo de bienvenida en HTML
const enviarCorreo = async (destinatario, asunto, html) => {
  const mailOptions = {
    from: '"Postware Soporte" <jhoan24figueroa@gmail.com>',
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

// Controlador para registrar solo un usuario
const registrarUsuario = async (req, res) => {
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

    if (!tipodocumento || !documento || !nombre || !apellido || !email || !password || !rol_idrol) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const estadoFinal = estado !== undefined ? estado : true;

    const rolAsignado = await rol.findOne({ where: { idrol: rol_idrol } });
    if (!rolAsignado) {
      return res.status(400).json({ error: 'Rol no encontrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await usuarios.create({
      tipodocumento,
      documento,
      nombre,
      apellido,
      email,
      password: hashedPassword,
      municipio,
      complemento,
      dirrecion,
      barrio,
      rol_idrol: rolAsignado.idrol,
      estado: estadoFinal
    });

    await enviarCorreo(
      email,
      'Bienvenido a nuestra plataforma de Postware',
      `<h3>Hola ${nombre},</h3><p>Gracias por registrarte en <strong>Postware</strong>. ¡Estamos felices de tenerte con nosotros!</p>`
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
};

// Controlador para registrar tanto un usuario como un cliente
const registrarUsuarioYCliente = async (req, res) => {
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

    if (!tipodocumento || !documento || !nombre || !apellido || !email || !password || !numerocontacto) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await usuarios.create({
      tipodocumento,
      documento,
      nombre,
      apellido,
      email,
      password: hashedPassword,
      municipio,
      complemento,
      dirrecion,
      barrio,
      rol_idrol: 2, // Cliente
      estado: true
    });

    const nuevoCliente = await cliente.create({
      tipodocumento,
      documentocliente: documento,
      nombre,
      apellido,
      email,
      telefono: numerocontacto,
      estado: 1,
      municipio,
      complemento,
      direccion: dirrecion,
      barrio,
      usuario_idusuario: nuevoUsuario.idusuario
    });

    await enviarCorreo(
      email,
      'Bienvenido a nuestra plataforma de Postware',
      `<h3>Hola ${nombre},</h3><p>Gracias por registrarte en <strong>Postware</strong> como cliente. ¡Esperamos que disfrutes de nuestros servicios!</p>`
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
};

// Controlador para iniciar sesión
const iniciarSesion = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const usuario = await usuarios.findOne({ where: { email } });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!usuario.estado) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const passwordValida = await bcrypt.compare(String(password), String(usuario.password));
    if (!passwordValida) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const clienteAsociado = await cliente.findOne({ where: { usuario_idusuario: usuario.idusuario } });

    const token = jwt.sign(
      { id: usuario.idusuario, rol: usuario.rol_idrol },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      usuario: {
        id: usuario.idusuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol_idrol,
        cliente: clienteAsociado || null
      },
      token
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Controlador para editar solo la información del usuario (sin tocar la del cliente)
const editarUsuario = async (req, res) => {
  try {
    const { idusuario } = req.params;  // Recibe el id del usuario desde los parámetros
    const { tipodocumento, documento, nombre, apellido, email, password, municipio, complemento, dirrecion, barrio, rol_idrol, estado } = req.body;

    const usuarioExistente = await usuarios.findOne({ where: { idusuario } });
    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Solo se encriptará la contraseña si se pasa un nuevo valor
    let hashedPassword = usuarioExistente.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Crear un objeto con los valores a actualizar, pero solo los campos proporcionados
    const datosAActualizar = {
      ...(tipodocumento && { tipodocumento }),
      ...(documento && { documento }),
      ...(nombre && { nombre }),
      ...(apellido && { apellido }),
      ...(email && { email }),
      ...(password && { password: hashedPassword }),
      ...(municipio && { municipio }),
      ...(complemento && { complemento }),
      ...(dirrecion && { dirrecion }),
      ...(barrio && { barrio }),
      ...(rol_idrol && { rol_idrol }),
      ...(estado !== undefined && { estado }) // Si el estado no se pasa, se omite la actualización
    };

    // Actualizar solo los campos que han sido proporcionados
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
};

const cambiarEstadoUsuario = async (req, res) => {
  try {
    const { idusuario } = req.params;  // Recibe el id del usuario desde los parámetros
    const { estado } = req.body;  // El estado que se quiere asignar

    if (estado === undefined) {
      return res.status(400).json({ error: 'El estado es requerido' });
    }

    const usuarioExistente = await usuarios.findOne({ where: { idusuario } });
    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
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
};

// Controlador para obtener usuarios con paginación
const obtenerUsuarios = async (req, res) => {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 5;

    const offset = (pagina - 1) * limite;

    const usuariosData = await usuarios.findAndCountAll({
      limit: limite,
      offset: offset,
      order: [['idusuario', 'ASC']]
    });

    const totalPaginas = Math.ceil(usuariosData.count / limite);

    return res.status(200).json({
      usuarios: usuariosData.rows,
      total: usuariosData.count,
      totalPaginas: totalPaginas,
      paginaActual: pagina,
      paginaSiguiente: pagina < totalPaginas ? pagina + 1 : null,
      paginaAnterior: pagina > 1 ? pagina - 1 : null
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const verDetalleUsuario = async (req, res) => {
  try {
    const { idusuario } = req.params;

    if (!idusuario) {
      return res.status(400).json({ message: "ID de usuario no proporcionado" });
    }

    const usuario = await Usuario.findOne({
      where: { idusuario },
      include: [{ model: Cliente, as: 'cliente' }],
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(usuario);
  } catch (error) {
    console.error("Error al obtener el detalle del usuario:", error);
    res.status(500).json({ message: "Error interno al obtener el usuario" });
  }
};

const eliminarUsuario = async (req, res) => {
  const { idusuario } = req.params; // Obtener el idusuario desde los parámetros

  try {
    // Buscar el usuario en la base de datos
    const usuario = await usuarios.findOne({ where: { idusuario } });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
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
};

const restablecerContrasena = async (req, res) => {
  const { token, nuevaPassword } = req.body;

  try {
    const usuario = await usuarios.findOne({
      where: {
        tokenRecuperacion: token,
        tokenExpira: { [Op.gt]: new Date() }
      }
    });

    if (!usuario) {
      return res.status(400).json({ message: 'Token inválido o expirado.' });
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
};

// Controlador para buscar usuarios con filtros por todos los campos
const buscarUsuarios = async (req, res) => {
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
    
    // Para campos numéricos, no usar iLike
    if (rol_idrol) condiciones.rol_idrol = rol_idrol;
    if (estado !== undefined) condiciones.estado = estado === 'true';

    console.log("Condiciones de búsqueda:", JSON.stringify(condiciones, null, 2)); // Depuración

    // Calcular offset para paginación
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    // Realizar la búsqueda con las condiciones
    const { count, rows } = await usuarios.findAndCountAll({
      where: condiciones,
      limit: parseInt(limite),
      offset: offset,
      order: [['idusuario', 'ASC']]
    });

    console.log(`Encontrados ${count} resultados`); // Depuración

    // Calcular total de páginas
    const totalPaginas = Math.ceil(count / parseInt(limite));

    return res.status(200).json({
      usuarios: rows,
      total: count,
      totalPaginas,
      paginaActual: parseInt(pagina),
      paginaSiguiente: parseInt(pagina) < totalPaginas ? parseInt(pagina) + 1 : null,
      paginaAnterior: parseInt(pagina) > 1 ? parseInt(pagina) - 1 : null
    });
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }

 
};
module.exports = {
  registrarUsuario,
  registrarUsuarioYCliente,
  editarUsuario,
  iniciarSesion,
  cambiarEstadoUsuario,
  obtenerUsuarios,
  verDetalleUsuario,
  eliminarUsuario,
  buscarUsuarios,
  enviarTokenRecuperacion,
  restablecerContrasena
};