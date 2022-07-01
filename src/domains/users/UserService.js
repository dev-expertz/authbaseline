const RegisterUser = require('./actions/Register');
const FetchUser = require('./actions/Fetch');
const ActivateUser = require('./actions/Activate');
const UserRegistrationSuccessResponse = require('./responses/UserRegistrationSuccessResponse');
const UsersListResponse = require('./responses/UsersListResponse');

const findByEmail = async (email) => {
  return await FetchUser.byEmail(email);
};

const getUsers = async (body) => {
  const response = await FetchUser.listAndCount(body);
  const totalPages = Math.ceil(response.totalCount / response.limit);
  return new UsersListResponse(response.content, response.page, response.limit, totalPages);
};

const register = async (body) => {
  const response = await RegisterUser.__invoke(body);
  return new UserRegistrationSuccessResponse(response);
};

const activateAccount = async (token) => {
  return await ActivateUser.__invoke(token);
};

module.exports = { activateAccount, findByEmail, getUsers, register };
