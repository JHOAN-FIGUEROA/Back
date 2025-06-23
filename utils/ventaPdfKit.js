const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarVentaPDF({ venta, cliente, productos }, stream) {
  // Tirilla: ancho pequeño
  const doc = new PDFDocument({ margin: 15, size: [220, 400 + productos.length * 30] });

  // Logo
  const logoPath = path.resolve(__dirname, 'logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, { width: 40, align: 'center' });
    doc.moveDown(0.2);
  }

  // Encabezado
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('black')
    .text('POSTWARE', { align: 'center' })
    .font('Courier-Bold')
    .fontSize(10)
    .text('GRANERO EL POSTE', { align: 'center' })
    .font('Courier')
    .fontSize(8)
    .text('NIT: 123.456.789-0', { align: 'center' })
    .text('Tel: 300-123-4567', { align: 'center' });

  doc.moveDown(0.2);
  doc.font('Courier').fontSize(8).fillColor('black');
  doc.text('----------------------------------------', { align: 'center' });

  // Datos de la venta
  doc.font('Courier-Bold').text(`Recibo N°:`, 15, doc.y, { continued: true }).font('Courier').text(` ${venta.idventas}`);
  doc.font('Courier-Bold').text(`Fecha:`, 15, doc.y, { continued: true }).font('Courier').text(` ${new Date(venta.fechaventa).toLocaleDateString('es-CO')} ${new Date(venta.fechaventa).toLocaleTimeString('es-CO')}`);
  doc.font('Courier-Bold').text(`Cliente:`, 15, doc.y, { continued: true }).font('Courier').text(` ${cliente.nombre} ${cliente.apellido}`);
  doc.font('Courier-Bold').text(`Documento:`, 15, doc.y, { continued: true }).font('Courier').text(` ${cliente.documentocliente}`);

  doc.text('----------------------------------------', { align: 'center' });
  doc.font('Courier-Bold').text('PRODUCTOS');

  // Productos
  productos.forEach(p => {
    doc.font('Courier').fontSize(8).text(`${p.nombre} (${p.presentacion?.nombre || ''})`);
    doc.font('Courier').fontSize(8).text(`${p.cantidad} x $${p.precioventa.toLocaleString('es-CO')}   $${p.subtotal.toLocaleString('es-CO')}`, { align: 'right' });
  });

  doc.text('----------------------------------------', { align: 'center' });
  doc.font('Courier-Bold').fontSize(9).text(`TOTAL:`, 15, doc.y, { continued: true }).font('Courier').text(` $${venta.total.toLocaleString('es-CO')}`, { align: 'right' });

  if (venta.estado === 'ANULADA') {
    doc.moveDown(0.5);
    doc.font('Courier-Bold').fillColor('red').text('** VENTA ANULADA **', { align: 'center' });
    doc.font('Courier').fillColor('black').text(`Motivo: ${venta.motivo_anulacion || 'No especificado'}`, { align: 'center' });
  }

  doc.moveDown(1);
  doc.font('Courier').fontSize(8).fillColor('black').text('¡Gracias por su compra!', { align: 'center' });

  doc.pipe(stream);
  doc.end();
}

module.exports = generarVentaPDF; 