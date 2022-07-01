// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let { status, message, success, validationErrors, validationErrorsArray, error } = err;

  if (validationErrorsArray) {
    if (!validationErrors) {
      validationErrors = {};
    }
    validationErrorsArray.forEach((error) => {
      validationErrors[error.param] = req.t(error.msg);
    });
  }

  res.status(status).send({
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: req.t(message),
    success: success,
    validationErrors: validationErrors,
    error: error,
  });
};
