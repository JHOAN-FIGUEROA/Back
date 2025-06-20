module.exports = function pedidoAnuladoEmailTemplate({ pedido, cliente, motivoAnulacion }) {
  const formatearMoneda = (valor) => valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  const subject = `Tu pedido #${pedido.idventas} ha sido anulado`;
  const title = 'Pedido Anulado';
  const intro = 'Lamentamos informarte que tu pedido ha sido anulado. A continuación encontrarás los detalles:';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; }
        .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { color: #e74c3c; } /* Rojo para anulación */
        .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
        .summary p { margin: 5px 0; }
        .motivo { margin-top: 15px; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; }
        .motivo h4 { color: #856404; margin-top: 0; }
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
          <h3>Detalles del Pedido Anulado</h3>
          <p><strong>Número de Pedido:</strong> ${pedido.idventas}</p>
          <p><strong>Fecha de Anulación:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
          <p><strong>Total del Pedido:</strong> ${formatearMoneda(pedido.total)}</p>
        </div>

        <div class="motivo">
          <h4>Motivo de la Anulación:</h4>
          <p>${motivoAnulacion || 'No se especificó un motivo.'}</p>
        </div>

        <div class="footer">
          <p>Si tienes alguna pregunta sobre esta anulación, no dudes en contactarnos.</p>
          <p>Gracias por tu comprensión.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return { subject, html };
}; 