module.exports = function pedidoConfirmadoEmailTemplate({ pedido, cliente }) {
  const formatearMoneda = (valor) => valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  const subject = `¡Tu pedido #${pedido.idventas} ha sido confirmado!`;
  const title = '¡Tu pedido está listo!';
  const intro = 'Nos complace informarte que tu pedido ha sido confirmado y está listo para ser recogido en nuestra tienda. ¡Te esperamos!';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; }
        .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { color: #009432; } /* Verde para confirmación */
        .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
        .summary p { margin: 5px 0; }
        .total { text-align: right; margin-top: 20px; font-size: 1.2em; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <p>Hola ${cliente.nombre},</p>
        <p>${intro}</p>
        
        <div class="summary">
          <h3>Resumen del Pedido</h3>
          <p><strong>Número de Pedido:</strong> ${pedido.idventas}</p>
          <p><strong>Fecha de Confirmación:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
          <p><strong>Total a Pagar:</strong> ${formatearMoneda(pedido.total)}</p>
        </div>

        <div class="footer">
          <p>Gracias por confiar en Granero el Poste.</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return { subject, html };
}; 