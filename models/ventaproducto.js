const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ventaproducto', {
    idventaproducto: {
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
    idventa: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ventas',
        key: 'idventas'
      }
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    precioventa: {
      type: DataTypes.REAL,
      allowNull: false
    },
    subtotal: {
      type: DataTypes.REAL,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'ventaproducto',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "ventaproducto_pkey",
        unique: true,
        fields: [
          { name: "idventaproducto" },
        ]
      },
    ]
  });
};
