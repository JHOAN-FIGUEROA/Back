const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ventas', {
    idventas: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    documentocliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cliente',
        key: 'documentocliente'
      }
    },
    fechaventa: {
      type: DataTypes.DATE,
      allowNull: false
    },
    total: {
      type: DataTypes.REAL,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDIENTE'
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    motivo_anulacion: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'ventas',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "ventas_pkey",
        unique: true,
        fields: [
          { name: "idventas" },
        ]
      },
    ]
  });
};
