const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('categoria', {
    idcategoria: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    estado: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    // CAMPO NUEVO AGREGADO PARA CLOUDINARY
    imagen: {
      type: DataTypes.STRING(255),  // Longitud adecuada para URLs de Cloudinary
      allowNull: true,              // Permite valores nulos para categorías sin imagen
      defaultValue: null            // Valor por defecto explícito
    }
  }, {
    sequelize,
    tableName: 'categoria',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "categoria_pkey",
        unique: true,
        fields: [
          { name: "idcategoria" },
        ]
      },
    ]
  });
};