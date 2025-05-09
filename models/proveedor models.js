const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('proveedor', {
    tipodocumento: {  // Campo para el tipo de documento
      type: DataTypes.STRING(10),
      allowNull: false
    },
    nitproveedor: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    contacto: {  // Campo para el contacto del proveedor
      type: DataTypes.STRING(30),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    municipio: {  // Campo para el municipio
      type: DataTypes.STRING(15),
      allowNull: true
    },
    complemento: {  // Campo para complemento de la dirección
      type: DataTypes.STRING(30),
      allowNull: true
    },
    direccion: {  // Campo para la dirección
      type: DataTypes.STRING(30),
      allowNull: true
    },
    telefono: {  // Campo para el teléfono
      type: DataTypes.STRING(10),
      allowNull: false
    },
    estado: {  // Campo para el estado
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    barrio: {  // Nuevo campo barrio
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'proveedor',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "proveedor_pkey",
        unique: true,
        fields: [
          { name: "nitproveedor" },
        ]
      },
    ]
  });
};
