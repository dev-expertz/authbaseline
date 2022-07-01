const express = require('express');
const i18next = require('i18next');
const UserRouter = require('./api/1.0/routers/UserRouter');
const i18nextBackend = require('i18next-fs-backend');
const i18nextMiddleware = require('i18next-http-middleware');
const ErrorHandler = require('./domains/common/exceptions/ErrorHandler');

i18next
  .use(i18nextBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

const app = express();

app.use(i18nextMiddleware.handle(i18next));
app.use(express.json());
app.use(UserRouter);
app.use(ErrorHandler);

module.exports = app;
