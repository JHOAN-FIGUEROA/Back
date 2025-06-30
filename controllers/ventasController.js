const { ventas: Venta, ventaproducto: VentaProducto, producto: Producto, cliente: Cliente } = require('../models');
const ResponseHandler = require('../utils/responseHandler');
const { Op } = require('sequelize');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const ventaPdfTemplate = require('../utils/ventaPdfTemplate');
const pedidoPdfTemplate = require('../utils/pedidoPdfTemplate');
const { sequelize } = require('../models');
const enviarCorreo = require('../utils/emailService');
const ventaEmailTemplate = require('../utils/ventaEmailTemplate');
const pedidoConfirmadoEmailTemplate = require('../utils/pedidoConfirmadoEmailTemplate');
const pedidoAnuladoEmailTemplate = require('../utils/pedidoAnuladoEmailTemplate');
const generarVentaPDF = require('../utils/ventaPdfKit');

// Documento del cliente genérico para ventas rápidas
const DOCUMENTO_CONSUMIDOR_FINAL = '1010101010';

function redondearPrecioColombiano(valor) {
  return Math.ceil(valor / 50) * 50;
}

exports.crearVenta = async (req, res) => {
  const t = await sequelize.transaction();
  let clienteVenta;
  try {
    // El 'total' se ignora y se recalcula siempre en el backend.
    let { documentocliente, productos, fechaventa, tipo } = req.body;

    // 1. Validar Tipo de Transacción
    if (!tipo || !['VENTA_DIRECTA', 'PEDIDO_MOVIL'].includes(tipo)) {
      return ResponseHandler.error(res, 'Tipo de transacción inválido', "Debe especificar si es 'VENTA_DIRECTA' o 'PEDIDO_MOVIL'.", 400);
    }

    // 2. Validar Cliente y su estado
    if (!documentocliente || documentocliente === DOCUMENTO_CONSUMIDOR_FINAL) {
      clienteVenta = await Cliente.findByPk(DOCUMENTO_CONSUMIDOR_FINAL);
      if (!clienteVenta) {
        clienteVenta = await Cliente.create({
          documentocliente: DOCUMENTO_CONSUMIDOR_FINAL,
          tipodocumento: 'CC',
          nombre: 'Consumidor',
          apellido: 'Final',
          telefono: '',
          email: '',
          estado: true,
          municipio: '',
          complemento: '',
          direccion: '',
          barrio: '',
        }, { transaction: t });
      }
      documentocliente = DOCUMENTO_CONSUMIDOR_FINAL;
    } else {
      clienteVenta = await Cliente.findByPk(documentocliente);
      if (!clienteVenta) {
        await t.rollback();
        return ResponseHandler.error(res, 'Cliente no encontrado', 'El cliente especificado no existe.', 400);
      }
      // --> NUEVA VALIDACIÓN: Estado del cliente
      if (!clienteVenta.estado) {
        await t.rollback();
        return ResponseHandler.error(res, 'Cliente inactivo', 'El cliente especificado no está activo.', 400);
      }
    }

    // 3. Consolidar y Validar Productos
    const productosMap = new Map();
    for (const item of productos) {
      // --> NUEVA VALIDACIÓN: Cantidad numérica
      if (!item.idproducto || !item.idpresentacion || !item.cantidad || isNaN(item.cantidad) || item.cantidad <= 0) {
        await t.rollback();
        return ResponseHandler.error(res, 'Datos de producto inválidos', 'Cada producto debe tener idproducto, idpresentacion y una cantidad numérica mayor a 0.', 400);
      }
      const key = `${item.idproducto}_${item.idpresentacion}`;
      if (productosMap.has(key)) {
        const existente = productosMap.get(key);
        existente.cantidad += item.cantidad;
      } else {
        productosMap.set(key, { ...item });
      }
    }
    const productosConsolidados = Array.from(productosMap.values());

    // 4. Validar Stock, Estado del Producto y Calcular Totales
    let totalVenta = 0;
    for (const item of productosConsolidados) {
      const prod = await Producto.findByPk(item.idproducto);
      if (!prod) {
        await t.rollback();
        return ResponseHandler.error(res, 'Producto no encontrado', `El producto con ID ${item.idproducto} no existe.`, 400);
      }
      // --> NUEVA VALIDACIÓN: Estado del producto
      if (!prod.estado) {
        await t.rollback();
        return ResponseHandler.error(res, 'Producto inactivo', `El producto '${prod.nombre}' no está activo y no puede ser vendido.`, 400);
      }
      // Validar presentación
      const presentacion = await require('../models').unidad.findByPk(item.idpresentacion);
      if (!presentacion || presentacion.producto_idproducto !== item.idproducto) {
        await t.rollback();
        return ResponseHandler.error(res, 'Presentación inválida', `La presentación con ID ${item.idpresentacion} no corresponde al producto.`, 400);
      }
      // Calcular unidades totales a vender
      const unidadesTotales = item.cantidad * presentacion.factor_conversion;
      if (prod.stock < unidadesTotales) {
        await t.rollback();
        return ResponseHandler.error(res, 'Stock insuficiente', `No hay stock suficiente para ${prod.nombre}.`, 400);
      }
      item.nombre = prod.nombre;
      item.precioventa = prod.precioventa;
      item.subtotal = item.cantidad * presentacion.factor_conversion * prod.precioventa;
      item.unidadesTotales = unidadesTotales;
      item.presentacion_nombre = presentacion.nombre;
      item.factor_conversion = presentacion.factor_conversion;
      item.imagen = prod.imagen;
      totalVenta += item.subtotal;
    }

    totalVenta = redondearPrecioColombiano(totalVenta);

    // 5. Determinar Estado y Registrar Venta
    const estadoVenta = tipo === 'VENTA_DIRECTA' ? 'COMPLETADA' : 'PENDIENTE';
    
    const nuevaVenta = await Venta.create({
      documentocliente,
      fechaventa: fechaventa || new Date(),
      total: totalVenta,
      estado: estadoVenta,
      tipo: tipo
    }, { transaction: t });

    // 6. Registrar detalle y descontar stock
    for (const item of productosConsolidados) {
      await VentaProducto.create({
        idproducto: item.idproducto,
        idventa: nuevaVenta.idventas,
        cantidad: item.cantidad,
        precioventa: item.precioventa,
        subtotal: item.subtotal,
        idpresentacion: item.idpresentacion // <-- registrar presentación
      }, { transaction: t });

      if (tipo === 'VENTA_DIRECTA') {
        const prod = await Producto.findByPk(item.idproducto, { transaction: t });
        prod.stock -= item.unidadesTotales;
        await prod.save({ transaction: t });
      }
    }

    await t.commit();

    // --- Enviar Correo de Confirmación ---
    if (clienteVenta && clienteVenta.email) {
      try {
        const { subject, html } = ventaEmailTemplate({
          venta: nuevaVenta,
          cliente: clienteVenta,
          productos: productosConsolidados,
        });
        await enviarCorreo(clienteVenta.email, subject, html);
      } catch (emailError) {
        console.error('Error al enviar correo de venta:', emailError.message);
        // No se devuelve error al usuario, la venta fue exitosa.
      }
    }

    return ResponseHandler.success(res, { venta: nuevaVenta, productos: productosConsolidados }, 'Transacción registrada correctamente', 201);
  } catch (error) {
    await t.rollback();
    return ResponseHandler.error(res, 'Error al registrar la transacción', error.message);
  }
};

// Obtener ventas con paginación y filtros avanzados
exports.obtenerVentas = async (req, res) => {
  try {
    let { page = 1, limit = 5, search = '', fecha_inicio, fecha_fin, estado } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const whereVenta = {};
    const whereCliente = {};

    // 1. Filtro por rango de fechas
    if (fecha_inicio && fecha_fin) {
      whereVenta.fechaventa = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
    }

    // Filtro por estado
    if (estado !== undefined) {
      whereVenta.estado = estado;
    }

    // 2. Búsqueda flexible por cliente
    if (search) {
      whereCliente[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { documentocliente: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Buscar ventas con cliente asociado
    const { count, rows } = await Venta.findAndCountAll({
      where: whereVenta,
      limit,
      offset,
      order: [['idventas', 'DESC']],
      include: [
        {
          model: require('../models').cliente,
          as: 'documentocliente_cliente',
          attributes: ['documentocliente', 'nombre', 'apellido'],
          where: whereCliente,
          required: true // Hace un INNER JOIN para filtrar por cliente
        }
      ]
    });

    // Formatear respuesta
    const ventas = rows.map(v => ({
      idventas: v.idventas,
      cliente: v.documentocliente_cliente
        ? `${v.documentocliente_cliente.nombre} ${v.documentocliente_cliente.apellido}`
        : v.documentocliente,
      documentocliente: v.documentocliente,
      fechaventa: v.fechaventa,
      total: v.total,
      estado: v.estado
    }));

    return ResponseHandler.success(res, {
      ventas,
      total: count,
      page,
      pages: Math.ceil(count / limit)
    }, 'Ventas obtenidas correctamente');
  } catch (error) {
    return ResponseHandler.error(res, 'Error al obtener ventas', error.message);
  }
};

// Obtener detalle de una venta
exports.obtenerVenta = async (req, res) => {
  try {
    const { id } = req.params;

    const venta = await Venta.findByPk(id, {
      include: [
        {
          model: require('../models').cliente,
          as: 'documentocliente_cliente',
          attributes: ['documentocliente', 'nombre', 'apellido', 'email', 'telefono']
        },
        {
          model: VentaProducto,
          as: 'ventaproductos',
          include: [
            {
              model: require('../models').producto,
              as: 'idproducto_producto',
              attributes: ['idproducto', 'nombre', 'codigoproducto']
            },
            {
              model: require('../models').unidad,
              as: 'presentacion',
              attributes: ['idpresentacion', 'nombre', 'factor_conversion']
            }
          ]
        }
      ]
    });

    if (!venta) {
      return ResponseHandler.notFound(res, 'Venta no encontrada');
    }

    // Formatear la respuesta para que sea más clara
    const ventaFormateada = {
      idventas: venta.idventas,
      fechaventa: venta.fechaventa,
      total: venta.total,
      estado: venta.estado,
      cliente: venta.documentocliente_cliente,
      productos: venta.ventaproductos.map(item => ({
        idproducto: item.idproducto_producto.idproducto,
        nombre: item.idproducto_producto.nombre,
        codigoproducto: item.idproducto_producto.codigoproducto,
        cantidad: item.cantidad,
        precioventa: item.precioventa,
        subtotal: item.subtotal,
        presentacion: {
          idpresentacion: item.presentacion.idpresentacion,
          nombre: item.presentacion.nombre,
          factor_conversion: item.presentacion.factor_conversion
        }
      }))
    };

    return ResponseHandler.success(res, ventaFormateada, 'Detalle de venta obtenido correctamente');
  } catch (error) {
    return ResponseHandler.error(res, 'Error al obtener el detalle de la venta', error.message);
  }
};

// Anular una venta o pedido
exports.anularVenta = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { motivo_anulacion } = req.body;

    if (!motivo_anulacion) {
      return ResponseHandler.error(res, 'Motivo requerido', 'El motivo de anulación es obligatorio.', 400);
    }

    const venta = await Venta.findByPk(id, {
      include: [
        { model: VentaProducto, as: 'ventaproductos' },
        { model: require('../models').cliente, as: 'documentocliente_cliente' }
      ],
      transaction: t
    });

    if (!venta) {
      await t.rollback();
      return ResponseHandler.notFound(res, 'Venta o Pedido no encontrado');
    }

    if (venta.estado === 'ANULADA') {
      await t.rollback();
      return ResponseHandler.error(res, 'Transacción ya anulada', 'Esta transacción ya ha sido anulada previamente.', 400);
    }

    // Solo se devuelve el stock si la venta fue completada
    if (venta.estado === 'COMPLETADA') {
      for (const item of venta.ventaproductos) {
        const presentacion = await require('../models').unidad.findByPk(item.idpresentacion, { transaction: t });
        const producto = await Producto.findByPk(item.idproducto, { transaction: t });
        if (producto && presentacion) {
          const unidadesDevueltas = item.cantidad * presentacion.factor_conversion;
          producto.stock += unidadesDevueltas;
          await producto.save({ transaction: t });
        }
      }
    }

    // Anular la transacción (sea venta o pedido)
    venta.estado = 'ANULADA';
    venta.motivo_anulacion = motivo_anulacion;
    await venta.save({ transaction: t });

    await t.commit();

    // --- Enviar Correo de Anulación (solo para pedidos) ---
    if (venta.tipo === 'PEDIDO_MOVIL' && venta.documentocliente_cliente && venta.documentocliente_cliente.email) {
      try {
        const { subject, html } = pedidoAnuladoEmailTemplate({
          pedido: venta,
          cliente: venta.documentocliente_cliente,
          motivoAnulacion: motivo_anulacion
        });
        await enviarCorreo(venta.documentocliente_cliente.email, subject, html);
      } catch (emailError) {
        console.error('Error al enviar correo de anulación:', emailError.message);
        // No se devuelve error al usuario, la anulación fue exitosa.
      }
    }

    return ResponseHandler.success(res, venta, 'Transacción anulada correctamente');

  } catch (error) {
    await t.rollback();
    return ResponseHandler.error(res, 'Error al anular la transacción', error.message);
  }
};

// Confirmar un pedido para convertirlo en venta
exports.confirmarVenta = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const pedido = await Venta.findByPk(id, {
      include: [
        { model: VentaProducto, as: 'ventaproductos' },
        { model: require('../models').cliente, as: 'documentocliente_cliente' }
      ],
      transaction: t
    });

    if (!pedido) {
      await t.rollback();
      return ResponseHandler.notFound(res, 'Pedido no encontrado');
    }

    if (pedido.estado !== 'PENDIENTE') {
      await t.rollback();
      return ResponseHandler.error(res, 'Estado inválido', 'Solo se pueden confirmar pedidos en estado PENDIENTE.', 400);
    }

    // Verificar stock y descontar
    for (const item of pedido.ventaproductos) {
      const producto = await Producto.findByPk(item.idproducto, { transaction: t });
      const presentacion = await require('../models').unidad.findByPk(item.idpresentacion, { transaction: t });
      
      const unidadesRequeridas = item.cantidad * presentacion.factor_conversion;

      if (producto.stock < unidadesRequeridas) {
        await t.rollback();
        return ResponseHandler.error(res, 'Stock insuficiente', `No hay suficiente stock para el producto ${producto.nombre}.`, 400);
      }

      producto.stock -= unidadesRequeridas;
      await producto.save({ transaction: t });
    }

    // Actualizar estado del pedido
    pedido.estado = 'COMPLETADA';
    await pedido.save({ transaction: t });

    await t.commit();

    // --- Enviar Correo de Confirmación ---
    if (pedido.documentocliente_cliente && pedido.documentocliente_cliente.email) {
      try {
        const { subject, html } = pedidoConfirmadoEmailTemplate({
          pedido: pedido,
          cliente: pedido.documentocliente_cliente
        });
        await enviarCorreo(pedido.documentocliente_cliente.email, subject, html);
      } catch (emailError) {
        console.error('Error al enviar correo de confirmación:', emailError.message);
        // No se devuelve error al usuario, la confirmación fue exitosa.
      }
    }

    return ResponseHandler.success(res, pedido, 'Pedido confirmado y convertido en venta correctamente.');

  } catch (error) {
    await t.rollback();
    return ResponseHandler.error(res, 'Error al confirmar el pedido', error.message);
  }
};

// Generar PDF de la venta
exports.generarPdfVenta = async (req, res) => {
  try {
    const { id } = req.params;
    // Obtener datos completos de la venta
    const venta = await Venta.findByPk(id, {
      include: [
        { model: require('../models').cliente, as: 'documentocliente_cliente' },
        {
          model: VentaProducto,
          as: 'ventaproductos',
          include: [
            { model: require('../models').producto, as: 'idproducto_producto' },
            { model: require('../models').unidad, as: 'presentacion' }
          ]
        }
      ]
    });

    if (!venta) {
      return ResponseHandler.notFound(res, 'Venta no encontrada');
    }

    const ventaFormateada = {
      idventas: venta.idventas,
      fechaventa: venta.fechaventa,
      total: venta.total,
      estado: venta.estado,
      motivo_anulacion: venta.motivo_anulacion,
      cliente: venta.documentocliente_cliente,
      productos: venta.ventaproductos.map(item => ({
        nombre: item.idproducto_producto.nombre,
        cantidad: item.cantidad,
        precioventa: item.precioventa,
        subtotal: item.subtotal,
        presentacion: {
          nombre: item.presentacion.nombre,
          factor_conversion: item.presentacion.factor_conversion
        }
      }))
    };

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recibo_venta_${venta.idventas}.pdf"`
    });
    const chromium = (await import('@sparticuz/chromium')).default;
    generarVentaPDF({
      venta: ventaFormateada,
      cliente: ventaFormateada.cliente,
      productos: ventaFormateada.productos
    }, res);
  } catch (error) {
    return ResponseHandler.error(res, 'Error al generar el PDF de la venta', error.message);
  }
}; 