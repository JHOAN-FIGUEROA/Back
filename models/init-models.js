var DataTypes = require("sequelize").DataTypes;
var _categoria = require("./categoria models");
var _cliente = require("./cliente models");
var _compraproducto = require("./compraproducto models");
var _compras = require("./compras models");
var _permisos = require("./permisos models");
var _producto = require("./producto models");
var _proveedor = require("./proveedor models");
var _rol = require("./rol models");
var _roles_permisos = require("./roles_permisos models");
var _usuarios = require("./usuarios models");
var _ventaproducto = require("./ventaproducto models");
var _ventas = require("./ventas models");

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

  // Relaciones existentes
  producto.belongsTo(categoria, { as: "idcategoria_categorium", foreignKey: "idcategoria" });
  categoria.hasMany(producto, { as: "productos", foreignKey: "idcategoria" });

  ventas.belongsTo(cliente, { as: "documentocliente_cliente", foreignKey: "documentocliente" });
  cliente.hasMany(ventas, { as: "venta", foreignKey: "documentocliente" });

  compraproducto.belongsTo(compras, { as: "idcompra_compra", foreignKey: "idcompra" });
  compras.hasMany(compraproducto, { as: "compraproductos", foreignKey: "idcompra" });

  roles_permisos.belongsTo(permisos, { as: "permisos_idpermisos_permiso", foreignKey: "permisos_idpermisos" });
  permisos.hasMany(roles_permisos, { as: "roles_permisos", foreignKey: "permisos_idpermisos" });

  compraproducto.belongsTo(producto, { as: "idproducto_producto", foreignKey: "idproducto" });
  producto.hasMany(compraproducto, { as: "compraproductos", foreignKey: "idproducto" });

  ventaproducto.belongsTo(producto, { as: "idproducto_producto", foreignKey: "idproducto" });
  producto.hasMany(ventaproducto, { as: "ventaproductos", foreignKey: "idproducto" });

  compras.belongsTo(proveedor, { as: "nitproveedor_proveedor", foreignKey: "nitproveedor" });
  proveedor.hasMany(compras, { as: "compras", foreignKey: "nitproveedor" });

  roles_permisos.belongsTo(rol, { as: "rol_idrol_rol", foreignKey: "rol_idrol" });
  rol.hasMany(roles_permisos, { as: "roles_permisos", foreignKey: "rol_idrol" });

  usuarios.belongsTo(rol, { as: "rol", foreignKey: "rol_idrol" });
  rol.hasMany(usuarios, { as: "usuarios", foreignKey: "rol_idrol" });

  ventaproducto.belongsTo(ventas, { as: "idventa_venta", foreignKey: "idventa" });
  ventas.hasMany(ventaproducto, { as: "ventaproductos", foreignKey: "idventa" });

  // Asociación lógica entre usuarios y cliente
  usuarios.hasOne(cliente, { as: "cliente", foreignKey: "usuario_idusuario" });
  cliente.belongsTo(usuarios, { as: "usuario", foreignKey: "usuario_idusuario" });

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
