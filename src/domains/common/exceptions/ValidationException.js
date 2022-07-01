module.exports = function ValidationException(error = null, validationErrorsArray = null, validationErrors = null) {
  this.message = 'validation_failure';
  this.status = 400;
  this.success = false;
  this.error = error;
  this.validationErrors = validationErrors;
  this.validationErrorsArray = validationErrorsArray;
};
