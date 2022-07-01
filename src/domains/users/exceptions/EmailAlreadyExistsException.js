module.exports = function EmailAlreadyExitsException(error = null) {
  this.message = 'user_notcreated';
  this.status = 400;
  this.success = false;
  this.error = error;
  this.validationErrors = { email: 'email_inuse' };
};
