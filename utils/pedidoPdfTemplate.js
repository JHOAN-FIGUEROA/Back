module.exports = function pedidoPdfTemplate({ venta, cliente, productos, logoUrl }) {
  const formatearMoneda = (valor) => valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Pedido N° ${venta.idventas}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #333; margin: 40px; font-size: 14px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0a3d62; padding-bottom: 15px; }
          .logo { height: 80px; }
          .store-details { text-align: right; }
          .store-name { font-size: 2em; color: #0a3d62; font-weight: bold; }
          .section-title { color: #009432; font-size: 1.2em; margin-top: 30px; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #009432; padding-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { background: #f9f9f9; padding: 15px; border-radius: 5px; }
          .info-box h3 { margin-top: 0; font-size: 1em; color: #0a3d62; }
          .productos-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .productos-table th, .productos-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .productos-table th { background: #0a3d62; color: #fff; }
          .productos-table .text-right { text-align: right; }
          .summary { margin-top: 30px; width: 50%; margin-left: auto; }
          .summary table { width: 100%; }
          .summary td { padding: 5px; }
          .summary .total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; }
          .footer { text-align: center; margin-top: 50px; font-size: 0.9em; color: #777; }
          .status { font-size: 1.5em; font-weight: bold; text-align: center; margin: 20px 0; padding: 10px; border-radius: 5px; }
          .status.completada { color: #009432; background: #e8f5e9; }
          .status.pendiente { color: #f57c00; background: #fff3e0; }
          .status.anulada { color: #d32f2f; background: #ffebee; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" class="logo" />
          <div class="store-details">
            <div class="store-name">GRANERO EL POSTE</div>
            <div>NIT: 123.456.789-0</div>
            <div>Tel: 300-123-4567</div>
            <div>Calle Falsa 123, Ciudad</div>
          </div>
        </div>

        <div class="status ${venta.estado.toLowerCase()}">${venta.estado}</div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>Cliente</h3>
            <strong>${cliente.nombre} ${cliente.apellido}</strong><br>
            Documento: ${cliente.documentocliente}<br>
            Email: ${cliente.email || 'N/A'}<br>
            Teléfono: ${cliente.telefono || 'N/A'}
          </div>
          <div class="info-box">
            <h3>Detalles del Pedido</h3>
            <strong>Pedido N°:</strong> ${venta.idventas}<br>
            <strong>Fecha:</strong> ${new Date(venta.fechaventa).toLocaleDateString('es-CO')}<br>
            <strong>Tipo:</strong> ${venta.tipo === 'PEDIDO_MOVIL' ? 'Pedido Móvil' : 'Venta Directa'}
          </div>
        </div>

        <div class="section-title">Productos</div>
        <table class="productos-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Presentación</th>
              <th class="text-right">Cantidad</th>
              <th class="text-right">Precio Unitario</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productos.map(p => `
              <tr>
                <td>${p.nombre}</td>
                <td>${p.presentacion.nombre}</td>
                <td class="text-right">${p.cantidad}</td>
                <td class="text-right">${formatearMoneda(p.precioventa * p.presentacion.factor_conversion)}</td>
                <td class="text-right">${formatearMoneda(p.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">${formatearMoneda(venta.total)}</td>
            </tr>
            <tr>
              <td class="total">Total:</td>
              <td class="text-right total">${formatearMoneda(venta.total)}</td>
            </tr>
          </table>
        </div>

        ${venta.estado === 'ANULADA' ? `
          <div class="info-box" style="margin-top: 20px; border-color: #d32f2f;">
            <h3>Motivo de Anulación</h3>
            <p>${venta.motivo_anulacion || 'No especificado'}</p>
          </div>
        ` : ''}

        <div class="footer">
          Generado por Postware. ¡Gracias por su preferencia!
        </div>
      </body>
    </html>
  `;
}; 