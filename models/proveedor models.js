const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('proveedor', {
    tipodocumento: {  // Tipo de documento
      type: DataTypes.STRING(10),
      allowNull: false
    },
    nitproveedor: {
  type: DataTypes.INTEGER,
  primaryKey: true,
  allowNull: false
    },
    nombre: {  // Nombre del proveedor
      type: DataTypes.STRING(20),
      allowNull: false
    },
    contacto: {  // Nombre de contacto del proveedor
      type: DataTypes.STRING(30),
      allowNull: false
    },
    email: {  // Correo electrónico del proveedor
      type: DataTypes.STRING(45),
      allowNull: false
    },
    municipio: {  // Municipio
      type: DataTypes.STRING(15),
      allowNull: true
    },
    complemento: {  // Complemento de la dirección
      type: DataTypes.STRING(30),
      allowNull: true
    },
    direccion: {  // Dirección
      type: DataTypes.STRING(30),
      allowNull: true
    },
    telefono: {  // Teléfono de contacto
      type: DataTypes.STRING(10),
      allowNull: false
    },
    estado: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: true
    },
    barrio: {  // Barrio del proveedor
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
