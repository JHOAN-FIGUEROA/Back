const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // necesario para Render
    }
  },
  logging: false, // opcional: desactiva logs de SQL en consola
});

module.exports = sequelize;
