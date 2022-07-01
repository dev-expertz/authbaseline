const { Sequelize } = require('sequelize');
const sequelize = require('../../../config/database');

const Model = Sequelize.Model;

class User extends Model {}

User.init(
  {
    username: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
      unique: true,
    },
    password: {
      type: Sequelize.STRING,
    },
    activationToken: {
      type: Sequelize.STRING,
    },
    inactive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    }
  },
  {
    sequelize,
    modelName: 'users',
  }
);

module.exports = User;
