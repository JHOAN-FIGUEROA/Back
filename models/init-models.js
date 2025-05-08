var DataTypes = require("sequelize").DataTypes;
var _categoria = require("./categoria");
var _cliente = require("./cliente");
var _compraproducto = require("./compraproducto");
var _compras = require("./compras");
var _permisos = require("./permisos");
var _producto = require("./producto");
var _proveedor = require("./proveedor");
var _rol = require("./rol");
var _roles_permisos = require("./roles_permisos");
var _usuarios = require("./usuarios");
var _ventaproducto = require("./ventaproducto");
var _ventas = require("./ventas");

function initModels(sequelize) {
  var categoria = _categoria(sequelize, DataTypes);
  var cliente = _cliente(sequelize, DataTypes);
  var compraproducto = _compraproducto(sequelize, DataTypes);
  var compras = _compras(sequelize, DataTypes);
  var permisos = _permisos(sequelize, DataTypes);
  var producto = _producto(sequelize, DataTypes);
  var proveedor = _proveedor(sequelize, DataTypes);
  var rol = _rol(sequelize, DataTypes);
  var roles_permisos = _roles_permisos(sequelize, DataTypes);
  var usuarios = _usuarios(sequelize, DataTypes);
  var ventaproducto = _ventaproducto(sequelize, DataTypes);
  var ventas = _ventas(sequelize, DataTypes);

  producto.belongsTo(categoria, { as: "idcategoria_categorium", foreignKey: "idcategoria"});
  categoria.hasMany(producto, { as: "productos", foreignKey: "idcategoria"});
  ventas.belongsTo(cliente, { as: "documentocliente_cliente", foreignKey: "documentocliente"});
  cliente.hasMany(ventas, { as: "venta", foreignKey: "documentocliente"});
  compraproducto.belongsTo(compras, { as: "idcompra_compra", foreignKey: "idcompra"});
  compras.hasMany(compraproducto, { as: "compraproductos", foreignKey: "idcompra"});
  roles_permisos.belongsTo(permisos, { as: "permisos_idpermisos_permiso", foreignKey: "permisos_idpermisos"});
  permisos.hasMany(roles_permisos, { as: "roles_permisos", foreignKey: "permisos_idpermisos"});
  compraproducto.belongsTo(producto, { as: "idproducto_producto", foreignKey: "idproducto"});
  producto.hasMany(compraproducto, { as: "compraproductos", foreignKey: "idproducto"});
  ventaproducto.belongsTo(producto, { as: "idproducto_producto", foreignKey: "idproducto"});
  producto.hasMany(ventaproducto, { as: "ventaproductos", foreignKey: "idproducto"});
  compras.belongsTo(proveedor, { as: "nitproveedor_proveedor", foreignKey: "nitproveedor"});
  proveedor.hasMany(compras, { as: "compras", foreignKey: "nitproveedor"});
  roles_permisos.belongsTo(rol, { as: "rol_idrol_rol", foreignKey: "rol_idrol"});
  rol.hasMany(roles_permisos, { as: "roles_permisos", foreignKey: "rol_idrol"});
  usuarios.belongsTo(rol, { as: "rol_idrol_rol", foreignKey: "rol_idrol"});
  rol.hasMany(usuarios, { as: "usuarios", foreignKey: "rol_idrol"});
  ventaproducto.belongsTo(ventas, { as: "idventa_venta", foreignKey: "idventa"});
  ventas.hasMany(ventaproducto, { as: "ventaproductos", foreignKey: "idventa"});

  return {
    categoria,
    cliente,
    compraproducto,
    compras,
    permisos,
    producto,
    proveedor,
    rol,
    roles_permisos,
    usuarios,
    ventaproducto,
    ventas,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
