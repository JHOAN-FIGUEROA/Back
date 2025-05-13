// models/roles_permisos.js

module.exports = (sequelize, DataTypes) => {
  const roles_permisos = sequelize.define('roles_permisos', {
    rol_idrol: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    permisos_idpermisos: {
      type: DataTypes.INTEGER,
      primaryKey: true
    }
  }, {
    tableName: 'roles_permisos',
    timestamps: false
  });

  return roles_permisos;
};
