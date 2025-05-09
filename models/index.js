const sequelize = require('../config/database'); // o '../database' según tu estructura
const initModels = require('./init-models');

const models = initModels(sequelize);

module.exports = {
  sequelize,
  ...models
};
