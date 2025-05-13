const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rol', {
    idrol: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    estado: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: true
}
  }, {
    sequelize,
    tableName: 'rol',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "rol_pkey",
        unique: true,
        fields: [
          { name: "idrol" },
        ]
      },
    ]
  });
};
