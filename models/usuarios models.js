const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('usuarios', {
    idusuario: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    tipodocumento: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    documento: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    apellido: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    municipio: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    complemento: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    dirrecion: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    rol_idrol: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rol',
        key: 'idrol'
      }
    },
    barrio: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    tokenRecuperacion: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tokenExpira: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'usuarios',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "usuarios_pkey",
        unique: true,
        fields: [{ name: "idusuario" }]
      }
    ]
  });

  Usuario.associate = (models) => {
    Usuario.belongsTo(models.rol, {
      foreignKey: 'rol_idrol',
      as: 'rol'
    });

    Usuario.hasOne(models.cliente, {
      foreignKey: 'usuario_idusuario',
      as: 'cliente'
    });
  };

  return Usuario;
};
