const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/domains/users/models/User');
const sequelize = require('../../../src/config/database');
const bcrypt = require('bcryptjs');
const SMTPServer = require('smtp-server').SMTPServer;

let lastMailContent, server;
let simulateSMTPFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData: (stream, session, callback) => {
      let mailBody = '';
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSMTPFailure) {
          const err = new Error('Invalid Mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMailContent = mailBody;
        callback();
      });
    },
  });
  await server.listen(8587, '127.0.0.1', () => {
    console.log('SMTP Server is Running on Port', 8587);
  });
  await sequelize.sync({ force: true });
});

beforeEach(() => {
  simulateSMTPFailure = false;
  return User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
  return User.destroy({ truncate: true });
});

const validUser = {
  username: 'username1',
  email: 'user1@test.com',
  password: 'P@ssw0rd',
};

const postUser = async (user = validUser, options = { language: 'en' }) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send(user);
};

const postUserToken = async (token, options = { language: 'en' }) => {
  const agent = request(app).post('/api/1.0/users/token/' + token);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send();
};

describe('User Registration', () => {
  const user_created = 'User Created';
  const username_null = 'Username cannot be null';
  const username_size = 'Username cannot be less than 6 and more than 32 characters';
  const email_null = 'Email cannot be null';
  const email_inuse = 'Email is in use';
  const email_invalid = 'Email is not Valid';
  const password_null = 'Password cannot be null';
  const password_size = 'Password cannot be less than 8 and more than 128 characters';
  const password_pattern = 'Password must have at least 1 uppercase, 1 lowercase, and 1 number';
  const email_failure = 'Email Failure';
  const validation_failure = 'Validation Failure';

  it('returns 201 Created when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(201);
  });

  it(`returns success message ${user_created} when signup request is valid`, async () => {
    const response = await postUser();
    expect(response.body.message).toBe(user_created);
  });

  it('saves the user to database', async () => {
    await postUser();
    //query user table
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe(validUser.username);
    expect(savedUser.email).toBe(validUser.email);
  });

  it('hashes the password in database', async () => {
    await postUser();
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe(validUser.password);
  });

  it('compare hashed password in database', async () => {
    await postUser();
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];
    const res = await bcrypt.compare(validUser.password, savedUser.password);
    expect(res).toBe(true);
  });

  it("Doesn't return validationErrors field in response body when validation error does not occur", async () => {
    const response = await postUser();
    expect(response.body.validationErrors).not.toBeDefined();
  });

  it('returns validationErrors field in response body when validation errors occur', async () => {
    const response = await postUser({ ...validUser, username: null });
    expect(response.body.validationErrors).not.toBeUndefined();
  });

  it.each([['username'], ['email'], ['password']])('returns 400 Bad Request when %s is null', async (field) => {
    const user = { ...validUser };
    user[field] = null;
    const response = await postUser(user);
    expect(response.status).toBe(400);
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'user1'}         | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'P'.repeat(129)} | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'NoNumber'}      | ${password_pattern}
    ${'password'} | ${'l0wernumber'}   | ${password_pattern}
    ${'password'} | ${'UPPER4UMBER'}   | ${password_pattern}
    ${'password'} | ${'12345678'}      | ${password_pattern}
  `('returns $expectedMessage error when $field is $value', async ({ field, value, expectedMessage }) => {
    const user = { ...validUser };
    user[field] = value;
    const response = await postUser(user);
    expect(response.body.validationErrors[field]).toBe(expectedMessage);
  });

  it('returns error for all when username, email, and password is null', async () => {
    const response = await postUser({ username: null, email: null, password: null });
    expect(Object.keys(response.body.validationErrors)).toEqual(['username', 'email', 'password']);
  });

  it(`returns ${email_inuse} when same email is already in use`, async () => {
    await postUser();
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(email_inuse);
  });

  it(`returns errors for both username is null and ${email_inuse}`, async () => {
    await postUser();
    const user = { ...validUser };
    user['username'] = null;
    const response = await postUser(user);
    expect(Object.keys(response.body.validationErrors)).toEqual(['username', 'email']);
  });

  it('creates user in inactive mode', async () => {
    await postUser();
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even when body contains inactive as false', async () => {
    const user = { ...validUser, inactive: false };
    await postUser(user);
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activationToken for user', async () => {
    await postUser();
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends an Account activation email with activationToken', async () => {
    await postUser();
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];

    expect(lastMailContent).toContain(validUser.email);
    expect(lastMailContent).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    simulateSMTPFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it(`returns Email failure message ${email_failure} when sending email fails`, async () => {
    simulateSMTPFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(email_failure);
  });

  it(`does not save user to database if activation email fails`, async () => {
    simulateSMTPFailure = true;
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(0);
  });

  it(`returns ${validation_failure} message in error response body when validation fails`, async () => {
    const user = { ...validUser };
    user['username'] = null;
    const response = await postUser(user);
    expect(response.body.message).toBe(validation_failure);
  });
});

describe('Internationalization', (options = { language: 'ur' }) => {
  const user_created = 'صارف بن گیا ہے';
  const username_null = 'صارف کا نام خالی نہیں ہونا چاہیے';
  const username_size = 'صارف نام 6 سے کم اور 32 حروف سے زیادہ نہیں ہو سکتا';
  const email_null = 'ای میل خالی نہیں ہونا چاہیے';
  const email_inuse = 'ای میل استعمال میں ہے';
  const email_invalid = 'ای میل درست نہیں ہے';
  const password_null = 'پاس ور خالی نہیں ہونا چاہیے';
  const password_size = 'پاس ورڈ 8 سے کم اور 128 حروف سے زیادہ نہیں ہو سکتا';
  const password_pattern = 'پاس ورڈ میں کم از کم 1 بڑے، 1 چھوٹے اور 1 نمبر کا ہونا ضروری ہے';
  const email_failure = 'Email Failure';
  const validation_failure = 'Validation Failure';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'user1'}         | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P4ssw'}         | ${password_size}
    ${'password'} | ${'P'.repeat(129)} | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'NoNumber'}      | ${password_pattern}
    ${'password'} | ${'l0wernumber'}   | ${password_pattern}
    ${'password'} | ${'UPPER4UMBER'}   | ${password_pattern}
    ${'password'} | ${'12345678'}      | ${password_pattern}
  `(
    'returns $expectedMessage error when $field is $value when language is set as Urdu',
    async ({ field, value, expectedMessage }) => {
      const user = { ...validUser };
      user[field] = value;
      const response = await postUser(user, options);
      expect(response.body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${email_inuse} when same email is already in use when language is set as Urdu`, async () => {
    await postUser();
    const response = await postUser(validUser, options);
    expect(response.body.validationErrors.email).toBe(email_inuse);
  });

  it(`returns success message ${user_created} when signup request is valid when language is set as Urdu`, async () => {
    const response = await postUser(validUser, options);
    expect(response.body.message).toBe(user_created);
  });

  it(`returns Email failure message ${email_failure} when sending email fails and language is set as Urdu`, async () => {
    simulateSMTPFailure = true;
    const response = await postUser(validUser, options);
    expect(response.body.message).toBe(email_failure);
  });

  it(`returns ${validation_failure} message in error response body when validation fails and language is set as Urdu`, async () => {
    const user = { ...validUser };
    user['username'] = null;
    const response = await postUser(user, options);
    expect(response.body.message).toBe(validation_failure);
  });
});

describe('Account Activation', () => {
  const activation_error_ur = 'This account is either already active or the token is invalid';
  const activation_error_en = 'This account is either already active or the token is invalid';
  const activation_success_ur = 'User has been Activated';
  const activation_success_en = 'User has been Activated';

  it('activates the account when correct token is sent', async () => {
    await postUser();
    //query user table
    let userList = await User.findAll();
    const token = userList[0].activationToken;
    await postUserToken(token);
    userList = await User.findAll();
    expect(userList[0].inactive).toBe(false);
  });

  it('Removes the token from user table after successful activation', async () => {
    await postUser();
    //query user table
    let userList = await User.findAll();
    const token = userList[0].activationToken;
    await postUserToken(token);
    userList = await User.findAll();
    expect(userList[0].activationToken).toBeFalsy();
  });

  it('does not activate the account when wrong token is sent', async () => {
    await postUser();
    const token = 'this-token-does-not-exist-in-database';
    await postUserToken(token);
    const userList = await User.findAll();
    expect(userList[0].inactive).toBe(true);
  });

  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist-in-database';
    const response = await postUserToken(token);
    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | expectedMessage
    ${'ur'}  | ${'wrong'}   | ${activation_error_ur}
    ${'en'}  | ${'wrong'}   | ${activation_error_en}
    ${'ur'}  | ${'correct'} | ${activation_success_ur}
    ${'en'}  | ${'correct'} | ${activation_success_en}
  `(
    'returns message $expectedMessage when token is $tokenStatus when language is set as $language',
    async ({ language, tokenStatus, expectedMessage }) => {
      await postUser(validUser, { language: language });
      let token = 'this-token-does-not-exist-in-database';
      if (tokenStatus === 'correct') {
        //query user table
        let userList = await User.findAll();
        token = userList[0].activationToken;
      }
      const response = await postUserToken(token);
      expect(response.body.message).toBe(expectedMessage);
    }
  );

  it('logs exception and returns', async () => {
    const agent = request(app).post('/api/1.0/testexception');
    const response = await agent.send();
    expect(response.status).toBe(400);
  });
});

describe('Error Model', () => {
  it(`returns path, timestamp, message, and validationErrors in response when validation fails`, async () => {
    const response = await postUser({ ...validUser, username: null });
    let keys = Object.keys(response.body).filter((k) => {
      return ['path', 'timestamp', 'message', 'validationErrors'].findIndex((m) => m === k) >= 0;
    });
    expect(keys).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it(`returns path, timestamp, and message in response when request fails other than validation`, async () => {
    const token = 'this-token-does-not-exist-in-database';
    const response = await postUserToken(token);
    let keys = Object.keys(response.body).filter((k) => {
      return ['path', 'timestamp', 'message', 'validationErrors'].findIndex((m) => m === k) >= 0;
    });
    expect(keys).toEqual(['path', 'timestamp', 'message']);
  });

  it(`returns path in error body`, async () => {
    const token = 'this-token-does-not-exist-in-database';
    const response = await postUserToken(token);
    expect(response.body.path).toEqual('/api/1.0/users/token/' + token);
  });

  it(`returns timestamp in milliseconds within 5 seconds value in error body`, async () => {
    const token = 'this-token-does-not-exist-in-database';
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5000;
    const response = await postUserToken(token);
    expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
    expect(response.body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
