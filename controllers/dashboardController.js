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
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    // 1. Ventas por mes (últimos 6 meses)
    const ventasPorMes = await Venta.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa')), 'mes'],
        [sequelize.fn('sum', sequelize.col('total')), 'totalVentas']
      ],
      where: {
        fechaventa: { [Op.gte]: seisMesesAtras },
        estado: 'COMPLETADA' // Solo ventas completadas
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('fechaventa')), 'ASC']]
    });

    // 2. Compras por mes (últimos 6 meses)
    const comprasPorMes = await Compra.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra')), 'mes'],
        [sequelize.fn('sum', sequelize.col('total')), 'totalCompras']
      ],
      where: {
        fechadecompra: { [Op.gte]: seisMesesAtras },
        estado: 1 // Asumiendo que 1 es 'activa' o 'completada'
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('fechadecompra')), 'ASC']]
    });

    // 3. Total de clientes registrados (Métrica simplificada)
    const totalClientes = await Cliente.count();

    // 4. Top 5 productos más vendidos
    const productosMasVendidos = await VentaProducto.findAll({
      attributes: [
        'idproducto',
        [sequelize.fn('sum', sequelize.col('cantidad')), 'totalVendido']
      ],
      include: [{
        model: Producto,
        as: 'idproducto_producto',
        attributes: ['nombre']
      }],
      group: [
        'ventaproducto.idproducto', 
        'idproducto_producto.idproducto',
        'idproducto_producto.nombre'
      ],
      order: [[sequelize.fn('sum', sequelize.col('cantidad')), 'DESC']],
      limit: 5
    });
    
    // Formateo de datos para el frontend
    const formatData = (data, valueKey) => {
        const result = {};
        data.forEach(item => {
            const mesNumero = new Date(item.dataValues.mes).getMonth() + 1;
            const mesNombre = getMonthName(mesNumero);
            result[mesNombre] = parseFloat(item.dataValues[valueKey]);
        });
        return result;
    };
    
    const meses = Array.from({length: 6}, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return getMonthName(d.getMonth() + 1);
    }).reverse();

    const ventasData = meses.map(mes => ({ mes, total: formatData(ventasPorMes, 'totalVentas')[mes] || 0 }));
    const comprasData = meses.map(mes => ({ mes, total: formatData(comprasPorMes, 'totalCompras')[mes] || 0 }));

    const productosData = productosMasVendidos.map(p => ({
      nombre: p.idproducto_producto.nombre,
      cantidad: parseInt(p.dataValues.totalVendido, 10)
    }));

    // Ensamblar la respuesta final
    const estadisticas = {
      ventasPorMes: ventasData,
      comprasPorMes: comprasData,
      totalClientes: totalClientes,
      productosMasVendidos: productosData
    };

    return ResponseHandler.success(res, estadisticas, 'Estadísticas obtenidas correctamente');
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return ResponseHandler.error(res, 'Error al obtener las estadísticas del dashboard', error.message);
  }
}; 