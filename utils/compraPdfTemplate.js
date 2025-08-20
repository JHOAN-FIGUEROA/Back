module.exports = function compraPdfTemplate({ compra, proveedor, productos, logoUrl }) {
  return `
  <html>
    <head>
      <meta charset="utf-8">
      <title>Compra #${compra.nrodecompra}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #222; margin: 40px; }
        .header { display: flex; align-items: center; border-bottom: 2px solid #0a3d62; padding-bottom: 10px; margin-bottom: 20px; }
        .logo { height: 80px; margin-right: 20px; }
        .empresa { font-size: 2.2em; color: #0a3d62; font-weight: bold; }
        .sistema { font-size: 1.1em; color: #009432; font-weight: bold; }
        .section-title { color: #009432; font-size: 1.1em; margin-top: 30px; margin-bottom: 8px; font-weight: bold; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 4px 8px; word-wrap: break-word; overflow-wrap: break-word; }
        .productos-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .productos-table th, .productos-table td { border: 1px solid #0a3d62; padding: 8px; text-align: left; }
        .productos-table th { background: #0a3d62; color: #fff; }
        .total { text-align: right; font-size: 1.2em; color: #009432; font-weight: bold; margin-top: 5px; }
        .footer { margin-top: 40px; font-size: 0.95em; color: #555; }
        .firma { margin-top: 50px; border-top: 1px solid #222; width: 200px; text-align: center; color: #222; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" class="logo" />
        <div>
          <div class="empresa">Granero el Poste</div>
          <div class="sistema">Sistema: Postware</div>
        </div>
      </div>
      <div class="section-title">Datos de la compra</div>
      <table class="info-table">
        <tr><td><b>N° Compra:</b></td><td>${compra.nrodecompra}</td><td><b>Fecha:</b></td><td>${compra.fechadecompra}</td></tr>
        <tr><td><b>Estado:</b></td><td>${compra.estado === 1 ? 'Activa' : 'Anulada'}</td><td><b>Total:</b></td><td>$${compra.total.toLocaleString('es-CO')}</td></tr>
        ${compra.estado === 0 ? `<tr><td><b>Motivo de anulación:</b></td><td colspan="3">${compra.motivo_anulacion || 'No proporcionado'}</td></tr>` : ''}
      </table>
      <div class="section-title">Proveedor</div>
      <table class="info-table">
        <tr><td><b>NIT:</b></td><td>${proveedor.nitproveedor}</td><td><b>Nombre:</b></td><td>${proveedor.nombre}</td></tr>
        <tr><td><b>Dirección:</b></td><td>${proveedor.direccion || ''}</td><td><b>Teléfono:</b></td><td>${proveedor.telefono || ''}</td></tr>
        <tr><td><b>Email:</b></td><td colspan="3">${proveedor.email || ''}</td></tr>
        <tr><td><b>Ciudad:</b></td><td colspan="3">${proveedor.ciudad || ''}</td></tr>
      </table>
      <div class="section-title">Productos</div>
      <table class="productos-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Producto</th>
            <th>Presentación</th>
            <th>Cantidad</th>
            <th>Precio Compra</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${productos.map((p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.producto_nombre}</td>
              <td>${p.presentacion_nombre}</td>
              <td>${p.cantidad}</td>
              <td>$${p.preciodecompra.toLocaleString('es-CO')}</td>
              <td>$${p.subtotal.toLocaleString('es-CO')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="total" style="margin-top:10px;">
        <span style="font-size:1.2em; color:#009432; font-weight:bold;">Total: $${compra.total.toLocaleString('es-CO')}</span>
      </div>
      <div class="footer">
        <div class="firma">Firma y sello</div>
        <div>Generado por Postware - Granero el Poste</div>
      </div>
    </body>
  </html>
  `;
}; 