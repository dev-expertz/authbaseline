const app = require('./src/app');
const sequelize = require('./src/config/database');
const config = require('config');
const User = require('./src/domains/users/models/User');
const apiServer = config.get('apiServer');

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const totalCount = activeUserCount + inactiveUserCount;
  for (let i = 0; i < totalCount; i++) {
    try {
      let user = {
        username: `user${i + 1}`,
        email: `user${i + 1}@example.com`,
        inactive: i >= activeUserCount ? 1 : 0,
      };
      await User.create(user);
    } catch (error) {
      console.log(i, 'error', error);
      break;
    }
  }
};

const port = apiServer.port;

sequelize.sync().then(async () => {
  if (process.env.NODE_ENV === 'development') {
    await addUsers(25);
  }
});

app.listen(port, () => console.log('App is Running on Port', port));
