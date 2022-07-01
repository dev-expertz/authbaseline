const ActivationEmail = require('./actions/ActivationEmail');

const sendActivationEmail = async (email, token) => {
  return await ActivationEmail.__invoke(email, token);
};

module.exports = { sendActivationEmail };
