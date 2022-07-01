const { check } = require('express-validator');
const UserService = require('../UserService');

module.exports = check('email')
  .notEmpty()
  .withMessage('email_null')
  .bail()
  .isEmail()
  .withMessage('email_invalid')
  .bail()
  .custom(async (email) => {
    const user = await UserService.findByEmail(email);
    if (user) {
      throw new Error('email_inuse');
    }
  });
