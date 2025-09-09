module.exports = function ventaPdfTemplate({ venta, cliente, productos, logoUrl }) {
  const formatearMoneda = (valor) => valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  
  // Función para formatear fecha y hora en zona horaria de Colombia (UTC-5)
  const formatearFechaHoraColombia = (fecha) => {
    const fechaObj = new Date(fecha);
    // Ajustar a UTC-5 (Colombia)
    const fechaColombia = new Date(fechaObj.getTime() - (5 * 60 * 60 * 1000));
    
    const dia = fechaColombia.getUTCDate().toString().padStart(2, '0');
    const mes = (fechaColombia.getUTCMonth() + 1).toString().padStart(2, '0');
    const año = fechaColombia.getUTCFullYear();
    
    let horas = fechaColombia.getUTCHours();
    const minutos = fechaColombia.getUTCMinutes().toString().padStart(2, '0');
    const segundos = fechaColombia.getUTCSeconds().toString().padStart(2, '0');
    
    const ampm = horas >= 12 ? 'p. m.' : 'a. m.';
    horas = horas % 12;
    horas = horas ? horas : 12; // 0 debe ser 12
    const horasStr = horas.toString().padStart(2, '0');
    
    return `${dia}/${mes}/${año} ${horasStr}:${minutos}:${segundos} ${ampm}`;
  };

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Recibo Venta #${venta.idventas}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; color: #000; margin: 0; padding: 10px; font-size: 12px; }
          .receipt-container { width: 80mm; margin: auto; }
          .header { text-align: center; margin-bottom: 10px; }
          .logo { height: 60px; margin-bottom: 5px; }
          .store-name { font-size: 1.2em; font-weight: bold; }
          .section { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
          .info-table { width: 100%; }
          .info-table td.label { text-align: left; }
          .info-table td.value { text-align: right; }
          .productos-table { width: 100%; margin-top: 10px; }
          .productos-table td { padding: 2px 0; }
          .total { text-align: right; font-size: 1.1em; font-weight: bold; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px;}
          .footer { text-align: center; margin-top: 15px; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <img src="${logoUrl}" class="logo" />
            <div class="store-name">GRANERO EL POSTE</div>
            <div>NIT: 123.456.789-0</div>
            <div>Tel: 300-123-4567</div>
          </div>

          <div class="section">
            <table class="info-table">
              <tr>
                <td class="label">Recibo N°:</td>
                <td class="value">${venta.idventas}</td>
              </tr>
              <tr>
                <td class="label">Fecha:</td>
                <td class="value">${formatearFechaHoraColombia(venta.fechaventa)}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <table class="info-table">
              <tr>
                <td class="label">Cliente:</td>
                <td class="value">${cliente.nombre} ${cliente.apellido}</td>
              </tr>
              <tr>
                <td class="label">Documento:</td>
                <td class="value">${cliente.documentocliente}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <strong>PRODUCTOS</strong>
            <table class="productos-table">
              ${productos.map(p => `
                <tr>
                  <td colspan="2">${p.nombre} (${p.presentacion.nombre})</td>
                </tr>
                <tr>
                  <td>${p.cantidad} x ${formatearMoneda(p.precioventa * p.presentacion.factor_conversion)}</td>
                  <td style="text-align:right;">${formatearMoneda(p.subtotal)}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="total">
            <table class="info-table">
              <tr>
                <td class="label" style="font-size: 1.1em; font-weight: bold;">TOTAL:</td>
                <td class="value" style="font-size: 1.1em; font-weight: bold;">${formatearMoneda(venta.total)}</td>
              </tr>
            </table>
          </div>
          
          ${!venta.estado ? `
            <div class="section" style="text-align:center; color: red; font-weight: bold;">
              <div>** VENTA ANULADA **</div>
              <div>Motivo: ${venta.motivo_anulacion || 'No especificado'}</div>
            </div>
          ` : ''}

          <div class="footer">
            ¡Gracias por su compra!
          </div>
        </div>
      </body>
    </html>
  `;
};