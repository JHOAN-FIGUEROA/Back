const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('producto', {
    idproducto: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    idcategoria: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categoria',
        key: 'idcategoria'
      }
    },
    precioventa: {
      type: DataTypes.REAL,
      allowNull: false
    },
    preciocompra: {
      type: DataTypes.REAL,
      allowNull: false
    },
    margenganancia: {
      type: DataTypes.REAL,
      allowNull: false,
      comment: 'Porcentaje de ganancia para calcular el precio de venta'
    },
    detalleproducto: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    estado: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    imagen: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    codigoproducto: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'producto',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "producto_pkey",
        unique: true,
        fields: [
          { name: "idproducto" },
        ]
      },
    ]
  });
};
