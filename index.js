'use strict';

const express = require('express');
const logger = require('morgan');
const session = require('express-session');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const handlebars = require('express-handlebars');
const expressValidator = require('express-validator');
const mongoose = require('mongoose');
const path = require('path');
const Q = require('q');
const winston = require('winston');

winston.level = 'debug';
const pmx = require('pmx').init({ // eslint-disable-line no-unused-vars
  http: true, // HTTP routes logging (default: false)
  http_latency: 200,  // Limit of acceptable latency
  http_code: 500,  // Error code to track'
  ignore_routes: [/socket\.io/, /notFound/], // Ignore http routes with this pattern (default: [])
  network: true, // Network monitoring at the application level (default: false)
  ports: true, // Shows which ports your app is listening on (default: false),

  // Transaction system configuration
  transactions: true,  // Enable transaction tracing (default: false)
  ignoreFilter: {
    url: [],
    method: ['OPTIONS']
  },
  // can be 'express', 'hapi', 'http', 'restify'
  excludedHooks: []
});


const app = module.exports = express();

// DB connection
mongoose.Promise = Q.Promise;
mongoose.connect('mongodb://localhost/home-data');

// remove header
app.disable('x-powered-by');

// set our default template engine to "handlebars"

app.engine('handlebars', handlebars({
  defaultLayout: 'main',
  helpers: {
    section(name, options) {
      // eslint-disable-next-line no-underscore-dangle
      if (!this._sections) this._sections = {};
      // eslint-disable-next-line no-underscore-dangle
      this._sections[name] = options.fn(this);
      return null;
    },
    if(conditional, options) {
      if (conditional) {
        return options.fn(this);
      }
      return options.inverse(this);
    }
  },
}));

app.set('view engine', 'handlebars');
app.enable('view cache');

// set views for error and 404 pages
app.set('views', path.join(__dirname, '/views'));

// define a custom res.message() method
// which stores messages in the session
app.response.message = (msg) => {
  // reference `req.session` via the `this.req` reference
  const sess = this.req.session;
  // simply add the msg to an array for later
  sess.messages = sess.messages || [];
  sess.messages.push(msg);
  return this;
};

// log
if (!module.parent) {
  app.use(logger('dev'));
}

// serve static files
app.use(express.static(path.join(__dirname, '/public')));
app.use('/vendors', express.static(path.join(__dirname, '/bower_components')));

// session support
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: '',
}));

// parse request bodies (req.body)
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb'
}));

// parse application/json
app.use(bodyParser.json({ limit: '50mb' }));
// this line must be immediately after any of the bodyParser middlewares!
app.use(expressValidator({
  customValidators: {
    lte(param, num) {
      return param <= num;
    },
    gte(param, num) {
      return param >= num;
    }
  }
}));

// allow overriding methods in query (?_method=put)
app.use(methodOverride('_method'));

// expose the "messages" local variable when views are rendered
app.use((req, res, next) => {
  const msgs = req.session.messages || [];

  // eslint-disable-next-line no-param-reassign
  res.locals.messages = msgs;
  // eslint-disable-next-line no-param-reassign
  res.locals.hasMessages = !!msgs.length;

  next();

  // empty or "flush" the messages so they
  // don't build up
  // eslint-disable-next-line no-param-reassign
  req.session.messages = [];
});

require('./routes/index')(app);

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (!module.parent) {
    winston.error(err.stack);
  }
  winston.debug(arguments);
  res.status(500);
  res.render('5xx');
});

// assume 404 since no middleware responded
app.use((req, res) => {
  res.status(404);
  res.render('404', {
    url: req.originalUrl,
  });
});

if (!module.parent) {
  const server = app.listen(3000);
  winston.debug('Express started on port 3000');
}