const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('compras', {
    idcompras: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nrodecompra: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fechadecompra: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    fechaderegistro: {
      type: DataTypes.DATE,
      allowNull: false
    },
    estado: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    total: {
      type: DataTypes.REAL,
      allowNull: false
    },
    nitproveedor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'proveedor',
        key: 'nitproveedor'
      }
    }
  }, {
    sequelize,
    tableName: 'compras',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "compras_pkey",
        unique: true,
        fields: [
          { name: "idcompras" },
        ]
      },
    ]
  });
};
