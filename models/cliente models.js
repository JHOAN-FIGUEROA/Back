const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cliente = sequelize.define('cliente', {
    tipodocumento: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    documentocliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    apellido: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    estado: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    municipio: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    complemento: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    direccion: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    barrio: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    usuario_idusuario: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'cliente',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "cliente_pkey",
        unique: true,
        fields: [{ name: "documentocliente" }]
      }
    ]
  });

  Cliente.associate = (models) => {
    // Asociación lógica con usuarios
    Cliente.belongsTo(models.usuarios, {
      foreignKey: 'usuario_idusuario',
      as: 'usuario'
    });
  };

  return Cliente;
};
