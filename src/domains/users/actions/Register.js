const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const EmailService = require('../../emails/EmailService');
const sequelize = require('../../../config/database');
const EmailSendingFailure = require('../../emails/exceptions/EmailSendingFailure');
const EmailAlreadyExistsException = require('../exceptions/EmailAlreadyExistsException');

const generateToken = (length = 16) => {
  return crypto.randomBytes(length).toString('hex');
};

const __invoke = async (body) => {
  let transaction = {},
    savedUser = {};
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = { username, email, password: hash, activationToken: generateToken() };
  try {
    /*const user = Object.assign({}, body, { password: hash });
            const user = {
            username: body.username,
            email: body.email,
            password: hash,
            };*/
    transaction = await sequelize.transaction();
    savedUser = await User.create(user, { transaction });
  } catch (error) {
    throw new EmailAlreadyExistsException(error);
  }
  try {
    const emailSentStatus = await EmailService.sendActivationEmail(email, user.activationToken);
    await transaction.commit();
    return { user: savedUser, emailSentStatus: emailSentStatus };
  } catch (error) {
    await transaction.rollback();
    throw new EmailSendingFailure(error);
  }
};

module.exports = { __invoke };
