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

    // Helper para obtener el producto más vendido en un rango
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
        }],
        where: fechaInicio && fechaFin ? {
          createdAt: { [Op.between]: [fechaInicio, fechaFin] }
        } : {},
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
      const result = await Compraproducto.findAll({
        attributes: [
          'idproducto',
          [sequelize.fn('sum', sequelize.col('cantidad')), 'totalComprado']
        ],
        include: [{
          model: Producto,
          as: 'idproducto_producto',
          attributes: ['nombre']
        }],
        where: {
          createdAt: { [Op.between]: [fechaInicio, fechaFin] }
        },
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

    // Producto más vendido
    const productoDia = await productoMasVendido(hoy, finHoy);
    const productoSemana = await productoMasVendido(inicioSemana, finSemana);
    const productoMes = await productoMasVendido(inicioMes, finMes);
    const productoAnio = await productoMasVendido(inicioAnio, finAnio);

    // Ventas
    const ventasDia = await totalVentas(hoy, finHoy);
    const ventasSemana = await totalVentas(inicioSemana, finSemana);
    const ventasMes = await totalVentas(inicioMes, finMes);
    const ventasAnio = await totalVentas(inicioAnio, finAnio);

    // Compras
    const comprasSemana = await totalCompras(inicioSemana, finSemana);
    const comprasMes = await totalCompras(inicioMes, finMes);
    const comprasAnio = await totalCompras(inicioAnio, finAnio);

    // Productos con más compras
    const productosComprasMes = await productosMasComprados(inicioMes, finMes);
    const productosComprasAnio = await productosMasComprados(inicioAnio, finAnio);

    // Total de clientes
    const totalClientes = await Cliente.count();

    // Respuesta estructurada
    const estadisticas = {
      productosMasVendidos: {
        dia: productoDia,
        semana: productoSemana,
        mes: productoMes,
        anio: productoAnio
      },
      ventas: {
        dia: ventasDia,
        semana: ventasSemana,
        mes: ventasMes,
        anio: ventasAnio
      },
      compras: {
        semana: comprasSemana,
        mes: comprasMes,
        anio: comprasAnio
      },
      productosMasComprados: {
        mes: productosComprasMes,
        anio: productosComprasAnio
      },
      totalClientes
    };

    return ResponseHandler.success(res, estadisticas, 'Estadísticas obtenidas correctamente');
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return ResponseHandler.error(res, 'Error al obtener las estadísticas del dashboard', error.message);
  }
}; 