const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('compraproducto', {
    idcompraproducto: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    idproducto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'producto',
        key: 'idproducto'
      }
    },
    idcompra: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'compras',
        key: 'idcompras'
      }
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    preciodecompra: {
      type: DataTypes.REAL,
      allowNull: false
    },
    subtotal: {
      type: DataTypes.REAL,
      allowNull: false
    },
    preciocompra_anterior: {
      type: DataTypes.REAL,
      allowNull: true
    },
    precioventa_anterior: {
      type: DataTypes.REAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'compraproducto',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "compraproducto_pkey",
        unique: true,
        fields: [
          { name: "idcompraproducto" },
        ]
      },
    ]
  });
};
