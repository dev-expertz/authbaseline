const { check } = require('express-validator');

module.exports = check('password')
  .notEmpty()
  .withMessage('password_null')
  .bail()
  .isLength({ min: 8, max: 128 })
  .withMessage('password_size')
  .bail()
  .isStrongPassword()
  .withMessage('password_pattern');
