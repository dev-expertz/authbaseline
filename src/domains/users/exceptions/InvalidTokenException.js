module.exports = function InvalidTokenException(error = null) {
  this.message = 'activation_token_invalid';
  this.status = 400;
  this.success = false;
  this.error = error;
};
