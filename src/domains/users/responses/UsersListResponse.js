module.exports = function UsersListResponse(responseData = null, page = 0, size = 10, totalPages = 0) {
  this.status = 200;
  this.success = true;
  this.content = responseData;
  this.page = page;
  this.size = size;
  this.totalPages = totalPages;
};
