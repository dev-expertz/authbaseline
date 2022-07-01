module.exports = function ValidationException(error = null) {
    this.message = 'database_error';
    this.status = 404;
    this.success = false;
    this.error = error;
  };