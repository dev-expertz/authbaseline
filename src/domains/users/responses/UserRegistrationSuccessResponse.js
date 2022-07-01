module.exports = function UserRegistrationSuccessResponse(responseData = null) {
  this.status = 201;
  this.message = 'user_created';
  this.success = true;
  this.response = responseData;
};
