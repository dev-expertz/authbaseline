const express = require('express');
const router = express.Router();
const UserService = require('../../../domains/users/UserService');

const { validationResult } = require('express-validator');
const InvalidTokenException = require('../../../domains/users/exceptions/InvalidTokenException');
const ValidationException = require('../../../domains/common/exceptions/ValidationException');
const UsernameValidator = require('../../../domains/users/validators/UsernameValidator');
const EmailValidator = require('../../../domains/users/validators/EmailValidator');
const PasswordValidator = require('../../../domains/users/validators/PasswordValidator');

router.post('/api/1.0/users', UsernameValidator, EmailValidator, PasswordValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(req.t('user_datainvalid'), errors.array()));
    }
    const response = await UserService.register(req.body);
    return res.status(response.status).send({
      message: req.t(response.message),
      user: response.user,
      success: response.success,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/api/1.0/users', async (req, res, next) => {
  try {
    const response = await UserService.getUsers({ ...req.body, ...req.query });
    return res.status(response.status).send(response);
  } catch (error) {
    next(error);
  }
});

router.post('/api/1.0/users/token/:token', async (req, res, next) => {
  try {
    const response = await UserService.activateAccount(req.params.token);
    return res.status(response.status).send({
      message: req.t(response.message),
      user: response.user,
      success: response.success,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/api/1.0/testexception', async (req, res, next) => {
  next(new InvalidTokenException());
});

module.exports = router;
