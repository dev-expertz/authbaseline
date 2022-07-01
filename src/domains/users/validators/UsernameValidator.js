const { check } = require('express-validator');

module.exports = check('username')
  .notEmpty()
  .withMessage('username_null')
  .bail()
  .isLength({ min: 6, max: 32 })
  .withMessage('username_size');
