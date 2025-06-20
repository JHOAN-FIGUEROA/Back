module.exports = function ventaEmailTemplate({ venta, cliente, productos }) {
  const formatearMoneda = (valor) => valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  const subject = venta.tipo === 'VENTA_DIRECTA' 
    ? `Confirmación de tu compra #${venta.idventas} en Granero el Poste`
    : `Confirmación de tu pedido #${venta.idventas} en Granero el Poste`;

  const title = venta.tipo === 'VENTA_DIRECTA' 
    ? '¡Gracias por tu compra!' 
    : 'Hemos recibido tu pedido';

  const intro = venta.tipo === 'VENTA_DIRECTA' 
    ? 'A continuación, encontrarás los detalles de tu compra:'
    : 'Tu pedido ha sido registrado y está pendiente de confirmación por parte de nuestro equipo. A continuación, encontrarás los detalles:';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f4; }
        .webkit { max-width: 600px; background-color: #ffffff; }
        .outer { margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #333; }
        
        .header { background-color: #0a3d62; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        
        .content { padding: 20px; }
        .content p { margin: 0 0 16px; line-height: 1.6; }

        .product-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .product-table th, .product-table td { padding: 10px; text-align: left; border-bottom: 1px solid #dddddd; word-break: break-word; }
        .product-table th { background-color: #f8f8f8; font-weight: bold; }
        .product-table img { border-radius: 4px; }
        .product-name { vertical-align: middle; padding-left: 10px; }
        
        .total-section { text-align: right; margin-top: 20px; padding: 20px; background-color: #f8f8f8; border-top: 2px solid #0a3d62; }
        .total-section h3 { margin: 0; font-size: 1.3em; }

        .footer { text-align: center; padding: 20px; font-size: 0.9em; color: #777777; }
        
        @media screen and (max-width: 600px) {
          .header h1 { font-size: 20px; }
          .content { padding: 15px; }
          .product-table th, .product-table td { padding: 8px; font-size: 14px; }
          .total-section h3 { font-size: 1.1em; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="webkit">
          <table class="outer" align="center">
            <tr>
              <td>
                <div class="header">
                  <h1>${title}</h1>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="content">
                  <p>Hola ${cliente.nombre},</p>
                  <p>${intro}</p>
                  
                  <table class="product-table">
                    <thead>
                      <tr>
                        <th colspan="2" style="width: 60%;">Producto</th>
                        <th style="width: 15%;">Cant.</th>
                        <th style="width: 25%;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${productos.map(p => `
                        <tr>
                          <td style="width: 50px;">
                            <img src="${p.imagen || 'https://via.placeholder.com/150'}" alt="${p.nombre}" width="50" style="max-width: 50px; height: auto; display: block;">
                          </td>
                          <td class="product-name">
                            <strong>${p.nombre}</strong><br>
                            <small>(${p.presentacion_nombre})</small>
                          </td>
                          <td>${p.cantidad}</td>
                          <td>${formatearMoneda(p.subtotal)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="total-section">
                  <h3>Total: ${formatearMoneda(venta.total)}</h3>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="footer">
                  <p>Gracias por confiar en Granero el Poste.</p>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return { subject, html };
}; 