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
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return meses[monthNumber - 1];
};

exports.obtenerEstadisticas = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    // 1. Productos próximos a agotarse (stock <= 3, activos)
    const productosProximosAgotarse = await Producto.findAll({
      attributes: ['idproducto', 'nombre', 'stock'],
      where: { estado: true, stock: { [Op.lte]: 3 } },
      order: [['stock', 'ASC']]
    });

    // 2. Total ventas del día (se reinicia a medianoche)
    const ventasDia = await Venta.sum('total', {
      where: {
        fechaventa: { [Op.between]: [hoy, finHoy] },
        estado: { [Op.ne]: 'ANULADA' }
      }
    }) || 0;

    // 3. Total ventas del mes (reinicio al primer día del mes a las 12 am)
    const ventasMes = await Venta.sum('total', {
      where: {
        fechaventa: { [Op.between]: [inicioMes, finMes] },
        estado: { [Op.ne]: 'ANULADA' }
      }
    }) || 0;

    // 4. Compras del último mes (reinicio cada 1 de mes a las 12 am)
    const comprasMes = await Compra.sum('total', {
      where: {
        fechadecompra: { [Op.between]: [inicioMes, finMes] },
        estado: 1
      }
    }) || 0;

    // 5. Historial de ventas y compras (últimos 6 meses, comparación mensual)
    const ventasPorMesRaw = await Venta.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa')), 'mes'],
        [sequelize.fn('sum', sequelize.col('total')), 'totalVentas']
      ],
      where: { fechaventa: { [Op.gte]: seisMesesAtras }, estado: 'COMPLETADA' },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa')), 'ASC']]
    });

    const comprasPorMesRaw = await Compra.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra')), 'mes'],
        [sequelize.fn('sum', sequelize.col('total')), 'totalCompras']
      ],
      where: { fechadecompra: { [Op.gte]: seisMesesAtras }, estado: 1 },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra')), 'ASC']]
    });

    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return getMonthName(d.getMonth() + 1);
    });

    const historialVentasCompras = meses.map(mes => {
      const ventas = ventasPorMesRaw.find(v =>
        getMonthName(new Date(v.dataValues.mes).getMonth() + 1) === mes
      );
      const compras = comprasPorMesRaw.find(c =>
        getMonthName(new Date(c.dataValues.mes).getMonth() + 1) === mes
      );
      return {
        mes,
        ventas: ventas ? parseFloat(ventas.dataValues.totalVentas) : 0,
        compras: compras ? parseFloat(compras.dataValues.totalCompras) : 0
      };
    });

    // 6. Top 5 productos más vendidos del mes
    const topProductosMes = await VentaProducto.findAll({
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
          fechaventa: { [Op.between]: [inicioMes, finMes] },
          estado: { [Op.ne]: 'ANULADA' }
        }
      }],
      group: [
        'ventaproducto.idproducto',
        'idproducto_producto.idproducto',
        'idproducto_producto.nombre'
      ],
      order: [[sequelize.fn('sum', sequelize.col('cantidad')), 'DESC']],
      limit: 5
    });

    // Respuesta estructurada para el dashboard
    const estadisticas = {
      productosProximosAgotarse: productosProximosAgotarse.map(p => ({
        id: p.idproducto,
        nombre: p.nombre,
        stock: p.stock
      })),
      ventasDia,
      ventasMes,
      comprasMes,
      historialVentasCompras,
      topProductosMes: topProductosMes.map(p => ({
        nombre: p.idproducto_producto?.nombre || null,
        cantidad: parseInt(p.dataValues.totalVendido, 10)
      }))
    };

    return ResponseHandler.success(res, estadisticas, 'Estadísticas obtenidas correctamente');
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return ResponseHandler.error(res, 'Error al obtener las estadísticas del dashboard', error.message);
  }
};
