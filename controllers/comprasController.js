const { compras, compraproducto, producto, unidad } = require('../models');
const ResponseHandler = require('../utils/responseHandler');
const { Op,sequelize } = require('sequelize');
const puppeteer = require('puppeteer-core');
const path = require('path');
const compraPdfTemplate = require('../utils/compraPdfTemplate');
const fs = require('fs');
const generarCompraPDF = require('../utils/compraPdfKit');


// Función para validar número de compra
const validarNumeroCompra = (nrodecompra) => {
  // Validar que el número de compra sea string y no esté vacío
  if (!nrodecompra || typeof nrodecompra !== 'string') {
    return { valido: false, error: 'El número de compra es requerido y debe ser texto' };
  }

  const numeroTrimmed = nrodecompra.trim();
  
  // Validar que no esté vacío después de trim
  if (numeroTrimmed === '') {
    return { valido: false, error: 'El número de compra no puede estar vacío' };
  }

  // Validar longitud mínima de 3 caracteres
  if (numeroTrimmed.length < 3) {
    return { valido: false, error: 'El número de compra debe tener mínimo 3 caracteres' };
  }

  // Validar longitud máxima de 20 caracteres
  if (numeroTrimmed.length > 20) {
    return { valido: false, error: 'El número de compra no puede tener más de 20 caracteres' };
  }

  // Validar formato: solo números, letras, guiones y espacios
  if (!/^[A-Za-z0-9\-\s]+$/.test(numeroTrimmed)) {
    return { valido: false, error: 'El número de compra solo puede contener números, letras, guiones y espacios' };
  }

  // Validar que no contenga solo espacios o guiones
  if (/^[\s\-]+$/.test(numeroTrimmed)) {
    return { valido: false, error: 'El número de compra no puede contener solo espacios o guiones' };
  }

  // Validar que no empiece o termine con espacios o guiones
  if (/^[\s\-]/.test(numeroTrimmed) || /[\s\-]$/.test(numeroTrimmed)) {
    return { valido: false, error: 'El número de compra no puede empezar o terminar con espacios o guiones' };
  }

  // Validar que no tenga espacios o guiones consecutivos
  if (/[\s\-]{2,}/.test(numeroTrimmed)) {
    return { valido: false, error: 'El número de compra no puede tener espacios o guiones consecutivos' };
  }

  return { valido: true, numero: numeroTrimmed };
};

// Listar compras
exports.obtenerCompras = async (req, res) => {
  try {
    let { 
      page = 1, 
      limit = 5, 
      nrodecompra = '', 
      fechadecompra = '', 
      nombreproveedor = '', 
      nitproveedor = '', 
      estado 
    } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // Inicializamos where y include
    const whereClause = {};
    const includeClause = [{
      model: require('../models').proveedor,
      as: 'nitproveedor_proveedor',
      attributes: ['nombre', 'nitproveedor'],
      required: false
    }];

    // 📌 Filtro por número de compra (ILIKE requiere casteo a texto)
    if (nrodecompra) {
      whereClause.nrodecompra = sequelize.where(
        sequelize.cast(sequelize.col("compras.nrodecompra"), "TEXT"),
        { [Op.iLike]: `%${nrodecompra}%` }
      );
    }

    // 📌 Filtro por fecha de compra (YYYY-MM-DD)
    if (fechadecompra) {
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (fechaRegex.test(fechadecompra)) {
        whereClause.fechadecompra = {
          [Op.between]: [
            new Date(fechadecompra + ' 00:00:00'),
            new Date(fechadecompra + ' 23:59:59')
          ]
        };
      }
    }

    // 📌 Filtro por NIT del proveedor (exacto)
    if (nitproveedor && !isNaN(nitproveedor)) {
      if (!includeClause[0].where) includeClause[0].where = {};
      includeClause[0].where.nitproveedor = { [Op.eq]: parseInt(nitproveedor) };
      includeClause[0].required = true;
    }

    // 📌 Filtro por nombre del proveedor (like parcial)
    if (nombreproveedor) {
      if (!includeClause[0].where) includeClause[0].where = {};
      includeClause[0].where.nombre = { [Op.iLike]: `%${nombreproveedor}%` };
      includeClause[0].required = true;
    }

    // 📌 Filtro por estado (1 = activas, 0 = anuladas)
    if (estado !== undefined) {
      whereClause.estado = estado;
    }

    // Consulta con paginación
    const { count, rows } = await compras.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['idcompras', 'DESC']],
      include: includeClause
    });

    // Formatear respuesta
    const comprasConProveedor = rows.map(compra => ({
      ...compra.toJSON(),
      proveedor_info: compra.nitproveedor_proveedor ? {
        nitproveedor: compra.nitproveedor_proveedor.nitproveedor,
        nombre: compra.nitproveedor_proveedor.nombre
      } : null
    }));

    return ResponseHandler.success(res, {
      compras: comprasConProveedor,
      total: count,
      page,
      pages: Math.ceil(count / limit)
    }, 'Compras obtenidas correctamente');
  } catch (error) {
    console.error("Error en obtenerCompras:", error);
    return ResponseHandler.error(res, 'Error al obtener compras', error.message);
  }
};

// Ver detalle de una compra
exports.obtenerCompra = async (req, res) => {
  try {
    const id = req.params.id;
    const compra = await compras.findByPk(id);
    if (!compra) {
      return ResponseHandler.notFound(res, 'Compra no encontrada');
    }
    // Buscar detalle de productos comprados con el alias correcto
    const detalle = await compraproducto.findAll({
      where: { idcompra: id },
      include: [
        {
          model: producto,
          as: 'idproducto_producto',
          attributes: ['nombre', 'codigoproducto']
        }
      ]
    });
    return ResponseHandler.success(res, { compra, detalle }, 'Detalle de compra obtenido correctamente');
  } catch (error) {
    return ResponseHandler.error(res, 'Error al obtener detalle de compra', error.message);
  }
};

// Crear compra
exports.crearCompra = async (req, res) => {
  const t = await compras.sequelize.transaction();
  try {
    const { nrodecompra, fechadecompra, nitproveedor, productos: productosComprados, iva = null } = req.body;
    
    // 1. Validación de datos de entrada
    if (!nrodecompra || !fechadecompra || !nitproveedor || !Array.isArray(productosComprados) || productosComprados.length === 0) {
      return ResponseHandler.error(res, 'Datos incompletos', 'Todos los campos son obligatorios y debe haber al menos un producto en la compra.', 400);
    }

    // Validar número de compra usando la función mejorada
    const validacionNumeroCompra = validarNumeroCompra(nrodecompra);
    if (!validacionNumeroCompra.valido) {
      return ResponseHandler.error(res, 'Número de compra inválido', validacionNumeroCompra.error, 400);
    }
    if (isNaN(Date.parse(fechadecompra))) {
      return ResponseHandler.error(res, 'Fecha de compra inválida', 'La fecha de compra debe tener formato YYYY-MM-DD.', 400);
    }
    // 3. Integridad de relaciones: proveedor debe existir y estar activo
    const proveedor = await require('../models').proveedor.findByPk(nitproveedor);
    if (!proveedor || proveedor.estado === false) {
      return ResponseHandler.error(res, 'Proveedor inválido', 'El proveedor no existe o está inactivo.', 400);
    }
    // Validar productos
    for (const item of productosComprados) {
      if (!item.idproducto || !item.cantidad || !item.preciodecompra || !item.idpresentacion) {
        return ResponseHandler.error(res, 'Datos de producto incompletos', 'Cada producto debe tener idproducto, cantidad, preciodecompra e idpresentacion.', 400);
      }
      if (isNaN(item.cantidad) || item.cantidad <= 0) {
        return ResponseHandler.error(res, 'Cantidad inválida', 'La cantidad debe ser un número positivo.', 400);
      }
      if (isNaN(item.preciodecompra) || item.preciodecompra <= 0) {
        return ResponseHandler.error(res, 'Precio de compra inválido', 'El precio de compra debe ser mayor a cero.', 400);
      }
      // Validar existencia de producto y presentación
      const prod = await producto.findByPk(item.idproducto);
      const presentacion = await unidad.findByPk(item.idpresentacion);
      if (!prod) {
        return ResponseHandler.error(res, 'Producto no encontrado', `El producto con ID ${item.idproducto} no existe.`, 400);
      }
      if (!presentacion) {
        return ResponseHandler.error(res, 'Presentación no encontrada', `La presentación con ID ${item.idpresentacion} no existe.`, 400);
      }
      // 2. Integridad de precios
      if (prod.margenganancia < 0) {
        return ResponseHandler.error(res, 'Margen de ganancia inválido', 'El margen de ganancia no puede ser negativo.', 400);
      }
      if (item.preciodecompra * (1 + prod.margenganancia) < 0) {
        return ResponseHandler.error(res, 'Precio de venta inválido', 'El precio de venta resultante no puede ser negativo.', 400);
      }
    }
    // Consolidar productos repetidos (mismo idproducto e idpresentacion)
    const productosMap = new Map();
    for (const item of productosComprados) {
      const key = `${item.idproducto}_${item.idpresentacion}`;
      if (productosMap.has(key)) {
        const existente = productosMap.get(key);
        existente.cantidad += item.cantidad;
        existente.subtotal += item.cantidad * item.preciodecompra;
      } else {
        productosMap.set(key, {
          ...item,
          subtotal: item.cantidad * item.preciodecompra
        });
      }
    }
    const productosConsolidados = Array.from(productosMap.values());
    // Calcular el total sumando los precios de las presentaciones
    let total = 0;
    for (const item of productosConsolidados) {
      const presentacion = await unidad.findByPk(item.idpresentacion);
      const factor = presentacion ? presentacion.factor_conversion : 1;
      // El subtotal es cantidad de presentaciones * precio de la presentación
      item.subtotal = item.cantidad * item.preciodecompra;
      // Calcular el precio unitario (por unidad básica)
      const precioUnitario = item.preciodecompra / factor;
      total += item.subtotal;
      // Actualizar el producto con el precio unitario en el campo preciocompra
      const prod = await producto.findByPk(item.idproducto);
      if (prod) {
        prod.preciocompra = precioUnitario;
        await prod.save({ transaction: t });
      }
    }
    // Validar que no exista compra duplicada para el mismo número de compra (sin importar proveedor)
    const compraExistente = await compras.findOne({
      where: {
        nrodecompra: validacionNumeroCompra.numero
      }
    });
    if (compraExistente) {
      return ResponseHandler.error(res, 'Número de compra duplicado', 'Ya existe una compra con ese número de compra. El número de compra debe ser único.', 400);
    }
    // Crear la compra con estado activo por defecto (1)
    const nuevaCompra = await compras.create({
      nrodecompra: validacionNumeroCompra.numero,
      fechadecompra,
      fechaderegistro: new Date(),
      estado: 1,
      total,
      nitproveedor
    }, { transaction: t });
    for (const item of productosConsolidados) {
      const { idproducto, cantidad, preciodecompra, idpresentacion, subtotal } = item;
      const prod = await producto.findByPk(idproducto);
      const presentacion = await unidad.findByPk(idpresentacion);
      // Guardar precios anteriores
      const preciocompra_anterior = prod.preciocompra;
      const precioventa_anterior = prod.precioventa;
      // Calcular el precio unitario correctamente
      const factor = presentacion ? presentacion.factor_conversion : 1;
      const precioUnitario = preciodecompra / factor;
      prod.stock += cantidad * factor;
      prod.preciocompra = precioUnitario;
      prod.precioventa = redondearPrecioColombiano(precioUnitario * (1 + (prod.margenganancia / 100)));
      await prod.save({ transaction: t });
      await compraproducto.create({
        idproducto,
        idcompra: nuevaCompra.idcompras,
        cantidad,
        preciodecompra,
        subtotal,
        idpresentacion,
        preciocompra_anterior,
        precioventa_anterior
      }, { transaction: t });
    }
    await t.commit();
    return ResponseHandler.success(res, {
      compra: nuevaCompra,
      proveedor: {
        nitproveedor: proveedor.nitproveedor,
        nombre: proveedor.nombre,
        contacto: proveedor.contacto,
        email: proveedor.email
      },
      productos: productosConsolidados
    }, 'Compra registrada correctamente');
  } catch (error) {
    await t.rollback();
    return ResponseHandler.error(res, 'Error al registrar compra', error.message);
  }
};

// Anular compra
exports.anularCompra = async (req, res) => {
  const t = await compras.sequelize.transaction();
  try {
    const id = req.params.id;
    const { motivo_anulacion } = req.body;
    const compra = await compras.findByPk(id);
    if (!compra) {
      return ResponseHandler.notFound(res, 'Compra no encontrada');
    }
    if (compra.estado === 0) {
      return ResponseHandler.error(res, 'La compra ya está anulada', null, 400);
    }
    // 4. No permitir anular compras de fechas muy antiguas (más de 30 días)
    const fechaCompra = new Date(compra.fechadecompra);
    const hoy = new Date();
    const diffDias = Math.floor((hoy - fechaCompra) / (1000 * 60 * 60 * 24));
    if (diffDias > 30) {
      return ResponseHandler.error(res, 'No se puede anular la compra', 'No se puede anular una compra con más de 30 días de antigüedad.', 400);
    }
    // Buscar detalle de productos comprados
    const detalle = await compraproducto.findAll({ where: { idcompra: id } });
    // Validar que el stock actual permita la anulación
    for (const item of detalle) {
      const prod = await producto.findByPk(item.idproducto);
      let presentacion = null;
      if (item.idpresentacion) {
        presentacion = await unidad.findByPk(item.idpresentacion);
      } else {
        presentacion = await unidad.findOne({ where: { producto_idproducto: prod.idproducto } });
      }
      if (prod && presentacion) {
        const cantidadADevolver = item.cantidad * presentacion.factor_conversion;
        if (prod.stock < cantidadADevolver) {
          return ResponseHandler.error(
            res,
            'No se puede anular la compra porque parte del stock ya fue vendido o consumido.',
            null,
            400
          );
        }
      }
    }
    // Restar del stock y restaurar precios
    for (const item of detalle) {
      const prod = await producto.findByPk(item.idproducto);
      let presentacion = null;
      if (item.idpresentacion) {
        presentacion = await unidad.findByPk(item.idpresentacion);
      } else {
        presentacion = await unidad.findOne({ where: { producto_idproducto: prod.idproducto } });
      }
      if (prod && presentacion) {
        prod.stock -= item.cantidad * presentacion.factor_conversion;
        if (prod.stock < 0) prod.stock = 0;
        // Restaurar precios anteriores
        if (item.preciocompra_anterior !== null && item.precioventa_anterior !== null) {
          prod.preciocompra = item.preciocompra_anterior;
          prod.precioventa = item.precioventa_anterior;
        }
        await prod.save({ transaction: t });
      }
    }
    // Cambiar estado de la compra y guardar motivo
    compra.estado = 0; // 0 = anulada
    compra.motivo_anulacion = motivo_anulacion || null;
    await compra.save({ transaction: t });
    await t.commit();
    return ResponseHandler.success(res, null, 'Compra anulada correctamente');
  } catch (error) {
    await t.rollback();
    return ResponseHandler.error(res, 'Error al anular compra', error.message);
  }
};

exports.generarPdfCompra = async (req, res) => {
  try {
    const id = req.params.id;
    // Buscar compra, proveedor y detalle
    const compra = await compras.findByPk(id);
    if (!compra) {
      return ResponseHandler.error(res, 'Compra no encontrada', null, 404);
    }
    const proveedor = await require('../models').proveedor.findByPk(compra.nitproveedor);
    const detalle = await compraproducto.findAll({
      where: { idcompra: id },
      include: [
        { model: producto, as: 'idproducto_producto', attributes: ['nombre'] },
        { model: require('../models').unidad, as: 'presentacion', attributes: ['nombre'] }
      ]
    });
    // Preparar datos de productos para la tabla
    const productos = detalle.map(item => ({
      producto_nombre: item.idproducto_producto?.nombre || '',
      presentacion_nombre: item.presentacion?.nombre || '',
      cantidad: item.cantidad,
      preciodecompra: item.preciodecompra,
      subtotal: item.subtotal
    }));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="compra_${compra.nrodecompra}.pdf"`
    });
    const chromium = (await import('@sparticuz/chromium')).default;
    generarCompraPDF({ compra, proveedor, productos }, res);
  } catch (error) {
    return ResponseHandler.error(res, 'Error al generar PDF de compra', error.message);
  }
};

// Definir función de redondeo si no existe
function redondearPrecioColombiano(valor) {
  return Math.ceil(valor / 50) * 50;
} 