const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    req.usuarioId = decoded.id; // Aquí se inyecta el ID en la request
    req.rol = decoded.rol;      // Opcional, si luego necesitas validar por rol
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = verificarToken;
