const User = require('../models/User');
const InvalidTokenException = require('../exceptions/InvalidTokenException');
const DatabaseException = require('../../common/exceptions/DatabaseException');

const __invoke = async (token) => {
  let user;
  try {
    user = await User.findOne({ where: { activationToken: token } });
    user.inactive = false;
    user.activationToken = null;
  } catch (error) {
    throw new InvalidTokenException(error);
  }
  try {
    await user.save();
  } catch (error) {
    throw new DatabaseException(error);
  }
  return {
    status: 200,
    message: 'user_activated',
    success: true,
  };
};

module.exports = { __invoke };
