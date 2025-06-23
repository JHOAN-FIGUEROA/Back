const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarCompraPDF({ compra, proveedor, productos }, stream) {
  const doc = new PDFDocument({ margin: 40 });

  // Logo
  const logoPath = path.resolve(__dirname, 'logotipo.PNG');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 30, { width: 80 });
  }

  // Encabezado
  doc
    .fontSize(22)
    .fillColor('#0a3d62')
    .text('Granero el Poste', 130, 35, { align: 'left' })
    .fontSize(12)
    .fillColor('#009432')
    .text('Sistema: Postware', 130, 60, { align: 'left' });

  doc.moveDown(2);
  doc.moveTo(40, 90).lineTo(550, 90).stroke('#0a3d62');

  // Datos de la compra
  doc.moveDown(1.5);
  doc.fontSize(13).fillColor('#009432').text('Datos de la compra', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('black');
  doc.text(`N° Compra: ${compra.nrodecompra}    Fecha: ${compra.fechadecompra}`);
  doc.text(`Estado: ${compra.estado === 1 ? 'Activa' : 'Anulada'}    Total: $${compra.total.toLocaleString('es-CO')}`);
  if (compra.estado === 0) {
    doc.text(`Motivo de anulación: ${compra.motivo_anulacion || 'No proporcionado'}`);
  }

  // Proveedor
  doc.moveDown(1);
  doc.fontSize(13).fillColor('#009432').text('Proveedor', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('black');
  doc.text(`NIT: ${proveedor.nitproveedor}    Nombre: ${proveedor.nombre}`);
  doc.text(`Dirección: ${proveedor.direccion || ''}    Teléfono: ${proveedor.telefono || ''}`);
  doc.text(`Email: ${proveedor.email || ''}    Ciudad: ${proveedor.ciudad || ''}`);

  // Tabla de productos
  doc.moveDown(1);
  doc.fontSize(13).fillColor('#009432').text('Productos', { underline: true });
  doc.moveDown(0.5);

  // Encabezado de tabla
  const tableTop = doc.y;
  const colWidths = [30, 150, 90, 60, 80, 80];
  const startX = 40;
  doc
    .fontSize(11)
    .fillColor('#0a3d62')
    .text('#', startX, tableTop, { width: colWidths[0], align: 'left' })
    .text('Producto', startX + colWidths[0], tableTop, { width: colWidths[1], align: 'left' })
    .text('Presentación', startX + colWidths[0] + colWidths[1], tableTop, { width: colWidths[2], align: 'left' })
    .text('Cantidad', startX + colWidths[0] + colWidths[1] + colWidths[2], tableTop, { width: colWidths[3], align: 'left' })
    .text('Precio', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop, { width: colWidths[4], align: 'left' })
    .text('Subtotal', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], tableTop, { width: colWidths[5], align: 'left' });

  doc.moveTo(startX, tableTop + 15).lineTo(550, tableTop + 15).stroke('#0a3d62');

  // Filas de productos
  let y = tableTop + 20;
  productos.forEach((p, i) => {
    doc
      .fontSize(10)
      .fillColor('black')
      .text(i + 1, startX, y, { width: colWidths[0], align: 'left' })
      .text(p.producto_nombre, startX + colWidths[0], y, { width: colWidths[1], align: 'left' })
      .text(p.presentacion_nombre, startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'left' })
      .text(p.cantidad, startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: 'left' })
      .text(`$${p.preciodecompra.toLocaleString('es-CO')}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: 'left' })
      .text(`$${p.subtotal.toLocaleString('es-CO')}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, { width: colWidths[5], align: 'left' });
    y += 18;
  });

  // Total destacado
  doc.moveDown(2);
  doc.fontSize(13).fillColor('#009432').text(`Total: $${compra.total.toLocaleString('es-CO')}`, { align: 'right' });

  // Pie de página
  doc.moveDown(3);
  doc.fontSize(11).fillColor('black').text('Firma y sello', { align: 'left' });
  doc.moveDown(1);
  doc.fontSize(10).fillColor('#555').text('Generado por Postware - Granero el Poste', { align: 'left' });

  doc.pipe(stream);
  doc.end();
}

module.exports = generarCompraPDF; 