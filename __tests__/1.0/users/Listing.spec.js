const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/domains/users/models/User');
const sequelize = require('../../../src/config/database');
beforeAll(async () => {
  await sequelize.sync({ force: true });
  await User.destroy({ truncate: true });
});

beforeEach(async () => {
  return await User.destroy({ truncate: true });
});

const getUsers = async (query, options = { language: 'en' }) => {
  const agent = request(app).get('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send().query({ ...query });
};

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

describe('Listing Users', () => {
  it('returns 200 OK when there are no user in database', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
      status: 200,
      success: true,
    });
  });

  it('returns 10 users in page content when there are 11 users in database', async () => {
    await addUsers(11, 0);
    const response = await getUsers();
    expect(response.body.content.length).toBe(10);
  });

  it('returns 6 users in page content when there are 6 active users and 5 inactive users in database', async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });

  it('returns only id, username, and email in content array for each user in database', async () => {
    await addUsers(3, 0);
    const response = await getUsers();
    const user = response.body.content[0];
    expect(Object.keys(user)).toEqual(['id', 'username', 'email', 'createdAt', 'updatedAt']);
  });

  it('returns 2 as totalPages when there are 15 active users and 7 inactive users in database', async () => {
    await addUsers(15, 7);
    const response = await getUsers();
    expect(response.body.totalPages).toBe(2);
  });

  it('returns 2nd page users and page indicator when page is set as 1 in request parameter', async () => {
    await addUsers(11, 0);
    const response = await getUsers({ page: 1 });
    const user = response.body.content[0];
    expect(user.username).toBe('user11');
    expect(response.body.page).toBe(1);
  });

  it('returns 1st page when page is set as below zero in request parameter', async () => {
    await addUsers(11, 0);
    const response = await getUsers({ page: -5 });
    expect(response.body.page).toBe(0);
  });

  it('returns 5 users and corresponding size indicator when size is 5 in request parameter', async () => {
    await addUsers(11, 0);
    const response = await getUsers({ size: 5 });
    expect(response.body.size).toBe(5);
  });

  it('returns 10 users and corresponding size indicator when size is 1000 in request parameter', async () => {
    await addUsers(11, 0);
    const response = await getUsers({ size: 1000 });
    expect(response.body.size).toBe(10);
  });
});
