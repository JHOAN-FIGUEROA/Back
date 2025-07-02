const { sequelize } = require('../models');
const Venta = require('../models').ventas;
const Compra = require('../models').compras;
const Cliente = require('../models').cliente;
const Producto = require('../models').producto;
const VentaProducto = require('../models').ventaproducto;
const ResponseHandler = require('../utils/responseHandler');
const { Op } = require('sequelize');

// Función para obtener el nombre del mes en español
const getMonthName = (monthNumber) => {
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return meses[monthNumber - 1];
};

exports.obtenerEstadisticas = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    // Helper para obtener el producto más vendido en un rango (solo ventas no anuladas)
    const productoMasVendido = async (fechaInicio, fechaFin) => {
      const result = await VentaProducto.findAll({
        attributes: [
          'idproducto',
          [sequelize.fn('sum', sequelize.col('cantidad')), 'totalVendido']
        ],
        include: [{
          model: Producto,
          as: 'idproducto_producto',
          attributes: ['nombre']
        }, {
          model: Venta,
          as: 'idventa_venta',
          attributes: [],
          where: {
            ...(fechaInicio && fechaFin ? { fechaventa: { [Op.between]: [fechaInicio, fechaFin] } } : {}),
            estado: { [Op.ne]: 'ANULADA' }
          }
        }],
        group: [
          'ventaproducto.idproducto',
          'idproducto_producto.idproducto',
          'idproducto_producto.nombre'
        ],
        order: [[sequelize.fn('sum', sequelize.col('cantidad')), 'DESC']],
        limit: 1
      });
      if (result.length > 0) {
        return {
          nombre: result[0].idproducto_producto.nombre,
          cantidad: parseInt(result[0].dataValues.totalVendido, 10)
        };
      }
      return null;
    };

    // Helper para sumar ventas en un rango
    const totalVentas = async (fechaInicio, fechaFin) => {
      const result = await Venta.findOne({
        attributes: [[sequelize.fn('sum', sequelize.col('total')), 'totalVentas']],
        where: {
          fechaventa: { [Op.between]: [fechaInicio, fechaFin] },
          estado: 'COMPLETADA'
        }
      });
      return parseFloat(result.dataValues.totalVentas) || 0;
    };

    // Helper para sumar compras en un rango
    const totalCompras = async (fechaInicio, fechaFin) => {
      const result = await Compra.findOne({
        attributes: [[sequelize.fn('sum', sequelize.col('total')), 'totalCompras']],
        where: {
          fechadecompra: { [Op.between]: [fechaInicio, fechaFin] },
          estado: 1
        }
      });
      return parseFloat(result.dataValues.totalCompras) || 0;
    };

    // Helper para productos con más compras
    const productosMasComprados = async (fechaInicio, fechaFin, limit = 5) => {
      const Compraproducto = require('../models').compraproducto;
      const Compra = require('../models').compras;
      const result = await Compraproducto.findAll({
        attributes: [
          'idproducto',
          [sequelize.fn('sum', sequelize.col('cantidad')), 'totalComprado']
        ],
        include: [{
          model: Producto,
          as: 'idproducto_producto',
          attributes: ['nombre']
        }, {
          model: Compra,
          as: 'idcompra_compra',
          attributes: [],
          where: {
            fechadecompra: { [Op.between]: [fechaInicio, fechaFin] }
          }
        }],
        group: [
          'compraproducto.idproducto',
          'idproducto_producto.idproducto',
          'idproducto_producto.nombre'
        ],
        order: [[sequelize.fn('sum', sequelize.col('cantidad')), 'DESC']],
        limit
      });
      return result.map(p => ({
        nombre: p.idproducto_producto.nombre,
        cantidad: parseInt(p.dataValues.totalComprado, 10)
      }));
    };

    // Fechas para los rangos
    const finHoy = new Date(hoy); finHoy.setHours(23, 59, 59, 999);
    const finSemana = new Date(hoy); finSemana.setDate(inicioSemana.getDate() + 6); finSemana.setHours(23, 59, 59, 999);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
    const finAnio = new Date(hoy.getFullYear(), 11, 31, 23, 59, 59, 999);

    // 1. Ventas por mes (últimos 6 meses)
    const ventasPorMesRaw = await Venta.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa')), 'mes'],
        [sequelize.fn('sum', sequelize.col('total')), 'totalVentas']
      ],
      where: {
        fechaventa: { [Op.gte]: seisMesesAtras },
        estado: 'COMPLETADA'
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa')), 'ASC']]
    });

    // 2. Compras por mes (últimos 6 meses)
    const comprasPorMesRaw = await Compra.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra')), 'mes'],
        [sequelize.fn('sum', sequelize.col('total')), 'totalCompras']
      ],
      where: {
        fechadecompra: { [Op.gte]: seisMesesAtras },
        estado: 1
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra')), 'ASC']]
    });

    // 3. Productos más vendidos por mes (últimos 6 meses, array de varios productos por mes, solo ventas no anuladas)
    const productosMasVendidosPorMes = [];
    for (let i = 5; i >= 0; i--) {
      const inicio = new Date();
      inicio.setMonth(inicio.getMonth() - i, 1);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0, 23, 59, 59, 999);
      const result = await VentaProducto.findAll({
        attributes: [
          'idproducto',
          [sequelize.fn('sum', sequelize.col('cantidad')), 'totalVendido']
        ],
        include: [{
          model: Producto,
          as: 'idproducto_producto',
          attributes: ['nombre']
        }, {
          model: Venta,
          as: 'idventa_venta',
          attributes: [],
          where: {
            fechaventa: { [Op.between]: [inicio, fin] },
            estado: { [Op.ne]: 'ANULADA' }
          }
        }],
        group: [
          'ventaproducto.idproducto',
          'idproducto_producto.idproducto',
          'idproducto_producto.nombre'
        ],
        order: [[sequelize.fn('sum', sequelize.col('cantidad')), 'DESC']]
      });
      productosMasVendidosPorMes.push({
        mes: getMonthName(inicio.getMonth() + 1),
        productos: result.map(r => ({
          nombre: r.idproducto_producto?.nombre || null,
          cantidad: r ? parseInt(r.dataValues.totalVendido, 10) : 0
        }))
      });
    }

    // Formatear ventas y compras por mes
    const meses = Array.from({length: 6}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return getMonthName(d.getMonth() + 1);
    });
    const ventasPorMes = meses.map(mes => {
      const found = ventasPorMesRaw.find(v => getMonthName(new Date(v.dataValues.mes).getMonth() + 1) === mes);
      return { mes, total: found ? parseFloat(found.dataValues.totalVentas) : 0 };
    });
    const comprasPorMes = meses.map(mes => {
      const found = comprasPorMesRaw.find(c => getMonthName(new Date(c.dataValues.mes).getMonth() + 1) === mes);
      return { mes, total: found ? parseFloat(found.dataValues.totalCompras) : 0 };
    });

    // Producto más vendido (solo ventas no anuladas)
    const productoDia = await VentaProducto.findAll({
      attributes: [
        'idproducto',
        [sequelize.fn('sum', sequelize.col('cantidad')), 'totalVendido']
      ],
      include: [{
        model: Producto,
        as: 'idproducto_producto',
        attributes: ['nombre'],
        where: { estado: true }
      }, {
        model: Venta,
        as: 'idventa_venta',
        attributes: [],
        where: {
          fechaventa: { [Op.between]: [hoy, finHoy] },
          estado: { [Op.ne]: 'ANULADA' }
        }
      }],
      group: [
        'ventaproducto.idproducto',
        'idproducto_producto.idproducto',
        'idproducto_producto.nombre'
      ],
      order: [[sequelize.fn('sum', sequelize.col('cantidad')), 'DESC']],
      limit: 1
    });
    const productoMasVendidoDia = productoDia.length > 0 ? {
      nombre: productoDia[0].idproducto_producto.nombre,
      cantidad: parseInt(productoDia[0].dataValues.totalVendido, 10)
    } : null;

    // Total de clientes
    const totalClientes = await Cliente.count();
    // Ventas del día (solo no anuladas)
    const ventasDia = await Venta.sum('total', {
      where: {
        fechaventa: { [Op.between]: [hoy, finHoy] },
        estado: { [Op.ne]: 'ANULADA' }
      }
    }) || 0;
    // Ventas del último mes (solo no anuladas)
    const ventasMes = await Venta.sum('total', {
      where: {
        fechaventa: { [Op.between]: [inicioMes, finMes] },
        estado: { [Op.ne]: 'ANULADA' }
      }
    }) || 0;
    // Compras del último mes (solo activas)
    const comprasMes = await Compra.sum('total', {
      where: {
        fechadecompra: { [Op.between]: [inicioMes, finMes] },
        estado: 1
      }
    }) || 0;
    // Total de productos activos
    const totalProductos = await Producto.count({ where: { estado: true } });

    // Respuesta estructurada para el dashboard
    const estadisticas = {
      ventasPorMes,
      comprasPorMes,
      productosMasVendidosPorMes,
      ventasDia,
      ventasMes,
      comprasMes,
      totalClientes,
      totalProductos,
      productoMasVendidoDia
    };

    return ResponseHandler.success(res, estadisticas, 'Estadísticas obtenidas correctamente');
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return ResponseHandler.error(res, 'Error al obtener las estadísticas del dashboard', error.message);
  }
}; 