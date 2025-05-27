/**
 * Clase para manejar respuestas estandarizadas
 */
class ResponseHandler {
  /**
   * Respuesta exitosa
   * @param {Object} res - Objeto response de Express
   * @param {Object} data - Datos a enviar
   * @param {string} message - Mensaje de éxito
   * @param {number} statusCode - Código de estado HTTP
   */
  static success(res, data = null, message = 'Operación exitosa', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Respuesta de error
   * @param {Object} res - Objeto response de Express
   * @param {string} error - Tipo de error
   * @param {string|Array} detalles - Detalles del error
   * @param {number} statusCode - Código de estado HTTP
   */
  static error(res, error = 'Error', detalles = 'Ha ocurrido un error', statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      error,
      detalles
    });
  }

  /**
   * Respuesta de validación
   * @param {Object} res - Objeto response de Express
   * @param {Array} errors - Array de errores de validación
   */
  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      detalles: errors
    });
  }

  /**
   * Respuesta de no autorizado
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje de error
   */
  static unauthorized(res, message = 'No autorizado') {
    return res.status(401).json({
      success: false,
      error: 'No autorizado',
      detalles: message
    });
  }

  /**
   * Respuesta de no encontrado
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje de error
   */
  static notFound(res, message = 'Recurso no encontrado') {
    return res.status(404).json({
      success: false,
      error: 'No encontrado',
      detalles: message
    });
  }
}

module.exports = ResponseHandler; 