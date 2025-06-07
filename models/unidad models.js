module.exports = (sequelize, DataTypes) => {
  const Unidad = sequelize.define('unidad', {
    idpresentacion: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    producto_idproducto: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    factor_conversion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    precio_presentacion: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    es_predeterminada: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'presentaciones_producto',
    freezeTableName: true,
    timestamps: false // ya que no hay columnas createdAt/updatedAt
  });

  return Unidad;
};
