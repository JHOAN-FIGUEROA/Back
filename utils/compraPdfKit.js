const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarCompraPDF({ compra, proveedor, productos }, stream) {
  const doc = new PDFDocument({ margin: 40 });

  // Logo
  const logoPath = path.resolve(__dirname, 'logotipo.PNG');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 30, { width: 60 });
  }

  // Encabezado
  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#0a3d62')
    .text('Granero el Poste', 120, 35, { align: 'left' })
    .font('Helvetica')
    .fontSize(14)
    .fillColor('#009432')
    .text('Sistema: Postware', 120, 65, { align: 'left' });

  doc.moveDown(2);
  doc.moveTo(40, 100).lineTo(550, 100).stroke('#0a3d62');

  // Datos de la compra (dos columnas)
  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#009432').text('Datos de la compra', 40, doc.y);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('black');
  const yDatos = doc.y;
  doc.text('N° Compra:', 40, yDatos);
  doc.text('Estado:', 40, yDatos + 18);
  doc.text('Fecha:', 250, yDatos);
  doc.text('Total:', 250, yDatos + 18);
  doc.font('Helvetica').fontSize(11);
  doc.text(compra.nrodecompra, 120, yDatos);
  doc.text(compra.estado === 1 ? 'Activa' : 'Anulada', 120, yDatos + 18);
  doc.text(compra.fechadecompra, 320, yDatos);
  doc.text(`$${compra.total.toLocaleString('es-CO')}`, 320, yDatos + 18);
  if (compra.estado === 0) {
    doc.font('Helvetica-Bold').fillColor('red').text('Motivo de anulación:', 40, yDatos + 36);
    doc.font('Helvetica').fillColor('black').text(compra.motivo_anulacion || 'No proporcionado', 180, yDatos + 36);
  }

  // Proveedor (dos columnas)
  doc.moveDown(3);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#009432').text('Proveedor', 40, doc.y);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('black');
  const yProv = doc.y;
  doc.text('NIT:', 40, yProv);
  doc.text('Dirección:', 40, yProv + 18);
  doc.text('Email:', 40, yProv + 36);
  doc.text('Nombre:', 250, yProv);
  doc.text('Teléfono:', 250, yProv + 18);
  doc.text('Ciudad:', 250, yProv + 36);
  doc.font('Helvetica').fontSize(11);
  doc.text(proveedor.nitproveedor, 120, yProv);
  doc.text(proveedor.direccion || '', 120, yProv + 18);
  doc.text(proveedor.email || '', 120, yProv + 36);
  doc.text(proveedor.nombre, 320, yProv);
  doc.text(proveedor.telefono || '', 320, yProv + 18);
  doc.text(proveedor.ciudad || '', 320, yProv + 36);

  // Tabla de productos
  doc.moveDown(3);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#009432').text('Productos', 40, doc.y);
  doc.moveDown(0.5);

  // Encabezado de tabla con fondo azul
  const tableTop = doc.y;
  const colWidths = [30, 120, 100, 60, 80, 80];
  const startX = 40;
  const headerHeight = 20;
  doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b, 0), headerHeight).fill('#0a3d62');
  doc
    .fillColor('white')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('#', startX + 2, tableTop + 5, { width: colWidths[0], align: 'left' })
    .text('Producto', startX + colWidths[0] + 2, tableTop + 5, { width: colWidths[1], align: 'left' })
    .text('Presentación', startX + colWidths[0] + colWidths[1] + 2, tableTop + 5, { width: colWidths[2], align: 'left' })
    .text('Cantidad', startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, tableTop + 5, { width: colWidths[3], align: 'left' })
    .text('Precio Compra', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, tableTop + 5, { width: colWidths[4], align: 'left' })
    .text('Subtotal', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, tableTop + 5, { width: colWidths[5], align: 'left' });
  doc.fillColor('black');

  // Filas de productos
  let y = tableTop + headerHeight;
  productos.forEach((p, i) => {
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(i + 1, startX + 2, y + 5, { width: colWidths[0], align: 'left' })
      .text(p.producto_nombre, startX + colWidths[0] + 2, y + 5, { width: colWidths[1], align: 'left' })
      .text(p.presentacion_nombre, startX + colWidths[0] + colWidths[1] + 2, y + 5, { width: colWidths[2], align: 'left' })
      .text(p.cantidad, startX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5, { width: colWidths[3], align: 'left' })
      .text(`$${p.preciodecompra.toLocaleString('es-CO')}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 5, { width: colWidths[4], align: 'left' })
      .text(`$${p.subtotal.toLocaleString('es-CO')}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, y + 5, { width: colWidths[5], align: 'left' });
    // Línea separadora
    doc.moveTo(startX, y + headerHeight).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y + headerHeight).stroke('#b0b0b0');
    y += headerHeight;
  });

  // Total destacado
  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#009432').text(`Total: $${compra.total.toLocaleString('es-CO')}`, { align: 'right' });

  // Pie de página
  doc.moveDown(3);
  doc.font('Helvetica').fontSize(11).fillColor('black').text('Firma y sello', { align: 'left' });
  doc.moveDown(1);
  doc.font('Helvetica-Oblique').fontSize(10).fillColor('#555').text('Generado por Postware - Granero el Poste', { align: 'left' });

  doc.pipe(stream);
  doc.end();
}

module.exports = generarCompraPDF; 