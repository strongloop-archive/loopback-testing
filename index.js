var _describe = {};
var _it = {};
var _beforeEach = {};
var helpers = exports = module.exports = {
  describe: _describe,
  it: _it,
  beforeEach: _beforeEach
};
var modelBuilder = require('loopback-datasource-juggler').ModelBuilder.defaultInstance;
var assert = require('assert');
var request = require('supertest');

_beforeEach.withApp = function(app) {
  beforeEach(function() {
    this.app = app;
    var _request = this.request = request(app);
    this.post = _request.post;
    this.get = _request.get;
    this.put = _request.put;
    this.del = _request.del;
  });
}

_beforeEach.withDefaultDataSource = function(dataSource) {
  beforeEach(function() {
    this.dataSource = dataSource;

    // TODO(ritch) this should not be required
    modelBuilder.getModel('AccessToken').attachTo(dataSource);
  });
}

_describe.model = function describeModel(app, modelName, cb) {
  assert(app, 'describeModel called without app');

  describe('Model: ' + modelName, function() {
    beforeEach(function() {
      this.app = app;
      this.model = modelBuilder.getModel(modelName);
      assert(this.model, 'you must define a model before testing it');
    });
    cb();
  });
}

function mixin(obj, into) {
  Object.keys(obj).forEach(function(key) {
    if(typeof obj[key] === 'function') {
      into[key] = obj[key];
    }
  });
}

_describe.staticMethod = function(methodName, cb) {
  describe('.' + methodName, function() {
    beforeEach(function() {
      this.method = methodName;
      this.isStaticMethod = true;
    });
    cb();
  });
}

_describe.instanceMethod = function(methodName, cb) {
  describe('.prototype.' + methodName, function() {
    beforeEach(function() {
      this.method = methodName;
      this.isInstanceMethod = true;
    });
    cb();
  });
}

_beforeEach.withArgs = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  beforeEach(function() {
    this.args = args;
  });
}

_beforeEach.givenModel = function(modelName, attrs, optionalHandler) {
  var modelKey = modelName

  if(typeof attrs === 'funciton') {
    optionalHandler = attrs;
    attrs = undefined;
  }

  if(typeof optionalHandler === 'string') {
    modelKey = optionalHandler;
  }

  attrs = attrs || {};

  var model = modelBuilder.getModel(modelName);

  assert(model, 'cannot get model of name ' + modelName);

  beforeEach(function(done) {
    var test = this;

    if(!model.dataSource) {
      model.attachTo(this.dataSource);
    }

    assert(model.dataSource, modelName + ' is not attached to a dataSource');
    assert(
      typeof model.create === 'function',
      modelName + ' does not have a create method'
    );

    model.create(attrs, function(err, result) {
      if(err) {
        console.error(err.message);
        if(err.details) console.error(err.details);
        done(err);
      } else {
        test[modelKey] = result;
        done();
      }
    });
  });

  if(typeof optionalHandler === 'function') {
    beforeEach(optionalHandler);
  }

  afterEach(function(done) {
    this[modelKey].destroy(done);
  });
}

_beforeEach.givenUser = function(attrs, optionalHandler) {
  _beforeEach.givenModel('user', attrs, optionalHandler);
}

_beforeEach.givenLoggedInUser = function(credentials, optionalHandler) {
  _beforeEach.givenUser(credentials, function(done) {
    var test = this;
    this.user.constructor.login(credentials, function(err, token) {
      if(err) {
        done(err);
      } else {
        test.loggedInAccessToken = token;
        done();
      }
    });
  });

  afterEach(function(done) {
    var test = this;
    this.loggedInAccessToken.destroy(function(err) {
      if(err) return done(err);
      test.loggedInAccessToken = undefined;
      done();
    });
  });
}

_beforeEach.givenAnUnauthenticatedToken = function(attrs, optionalHandler) {
  _beforeEach.givenModel('accessToken', attrs, optionalHandler);
}

_beforeEach.givenAnAnonymousToken = function(attrs, optionalHandler) {
  _beforeEach.givenModel('accessToken', {id: '$anonymous'}, optionalHandler);
}

_describe.whenCalledRemotely = function(verb, url, cb) {
  var urlStr = url;
  if(typeof url === 'function') {
    urlStr = '/<dynamic>';
  }

  describe(verb.toUpperCase() + ' ' + urlStr, function() {
    beforeEach(function(cb) {
      if(typeof url === 'function') {
        url = url.call(this);
      }
      this.remotely = true;
      this.verb = verb.toUpperCase();
      this.url = this.url || url;
      var methodForVerb = verb.toLowerCase();
      if(methodForVerb === 'delete') methodForVerb = 'del';

      this.http = this.request[methodForVerb](this.url);
      this.url = undefined;
      this.http.set('Accept', 'application/json');
      if(this.loggedInAccessToken) {
        this.http.set('authorization', this.loggedInAccessToken.id);
      }
      this.req = this.http.req;
      var test = this;
      this.http.end(function(err) {
        test.req = test.http.req;
        test.res = test.http.res;
        test.url = undefined;
        cb();
      });
    });

    cb();
  });
}

_describe.whenLoggedInAsUser = function(credentials, cb) {
  describe('when logged in as user', function () {
    _beforeEach.givenLoggedInUser(credentials);
    cb();
  });
}

_describe.whenCalledByUser = function(credentials, verb, url, cb) {
  describe('when called by logged in user', function () {
    _beforeEach.givenLoggedInUser(credentials);
    _describe.whenCalledRemotely(verb, url, cb);
  });
}

_describe.whenCalledAnonymously = function(verb, url, cb) {
  describe('when called anonymously', function () {
    _beforeEach.givenAnAnonymousToken();
    _describe.whenCalledRemotely(verb, url, cb);
  });
}

_describe.whenCalledUnauthenticated = function(verb, url, cb) {
  describe('when called with unauthenticated token', function () {
    _beforeEach.givenAnAnonymousToken();
    _describe.whenCalledRemotely(verb, url, cb);
  });
}

_it.shouldBeAllowed = function() {
  it('should be allowed', function() {
    assert(this.req);
    assert(this.res);
    assert.notEqual(this.res.statusCode, 401);
  });
}

_it.shouldBeDenied = function() {
  it('should not be allowed', function() {
    assert(this.res);
    var status = this.res.statusCode;
    assert(status === 401 || status === 404);
  });
}

_it.shouldNotBeFound = function() {
  it('should not be found', function() {
    assert(this.res);
    assert.equal(this.res.statusCode, 404);
  });
}

_it.shouldBeAllowedWhenCalledAnonymously =
function(verb, url) {
  _describe.whenCalledAnonymously(verb, url, function() {
    _it.shouldBeAllowed();
  });
}

_it.shouldBeDeniedWhenCalledAnonymously =
function(verb, url) {
  _describe.whenCalledAnonymously(verb, url, function() {
    _it.shouldBeDenied();
  });
}

_it.shouldBeAllowedWhenCalledUnauthenticated =
function(verb, url) {
  _describe.whenCalledUnauthenticated(verb, url, function() {
    _it.shouldBeAllowed();
  });
}

_it.shouldBeDeniedWhenCalledUnauthenticated =
function(verb, url) {
  _describe.whenCalledUnauthenticated(verb, url, function() {
    _it.shouldBeDenied();
  });
}

_it.shouldBeAllowedWhenCalledByUser =
function(credentials, verb, url) {
  _describe.whenCalledByUser(credentials, verb, url, function() {
    _it.shouldBeAllowed();
  });
}

_it.shouldBeDeniedWhenCalledByUser =
function(credentials, verb, url) {
  _describe.whenCalledByUser(credentials, verb, url, function() {
    _it.shouldBeDenied();
  });
}

exports.TestDataBuilder = require('./lib/test-data-builder');
