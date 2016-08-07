// Copyright IBM Corp. 2013,2015. All Rights Reserved.
// Node module: loopback-testing
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var _describe = {};
var _it = {};
var _beforeEach = {};
var helpers = exports = module.exports = {
  describe: _describe,
  it: _it,
  beforeEach: _beforeEach
};
var assert = require('assert');
var request = require('supertest');
var expect = require('chai').expect;

_beforeEach.withApp = function(app) {
  if (app.models.User) {
    // Speed up the password hashing algorithm
    app.models.User.settings.saltWorkFactor = 4;
  }

  beforeEach(function() {
    this.app = app;
    var _request = this.request = request(app);
    this.post = _request.post;
    this.get = _request.get;
    this.put = _request.put;
    this.del = _request.del;
    this.agent = function() {
        return request.agent(app);
    };
  });
}

_beforeEach.cleanDatasource = function(dsName) {
  beforeEach(function(done) {
    if(!dsName) dsName = 'db';

    if (typeof this.app === 'function'
        && typeof this.app.datasources === 'object'
        && typeof this.app.datasources[dsName] === 'object') {
      this.app.datasources[dsName].automigrate(done);
      this.app.datasources[dsName].connector.ids = {};
    } else {
      done();
    }
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
  var modelKey = modelName;

  if(typeof attrs === 'function') {
    optionalHandler = attrs;
    attrs = undefined;
  }

  if(typeof optionalHandler === 'string') {
    modelKey = optionalHandler;
  }

  attrs = attrs || {};

  beforeEach(function(done) {
    if(modelName === '__USERMODEL__') {
      modelName = this.userModel ? this.userModel : 'user';
    }

    var test = this;
    var app = this.app;
    var model = app.models[modelName];
    assert(model, 'cannot get model of name ' + modelName + ' from app.models');
    assert(model.dataSource, 'cannot test model '+ modelName
      + ' without attached dataSource');
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

_beforeEach.withUserModel = function(model) {
  beforeEach(function(done) {
    this.userModel = model;
    done();
  });
};

_beforeEach.givenUser = function(attrs, optionalHandler) {
  _beforeEach.givenModel('__USERMODEL__', attrs, optionalHandler);
}

_beforeEach.givenUserWithRole = function (attrs, role, optionalHandler) {
  if (typeof role === 'string') {
    role = {
      name: role
    }
  }
  _beforeEach.givenUser(attrs, function (done) {
    var test = this;
    test.app.models.Role.findOrCreate({name: role}, function (err, result) {
      if(err) {
        console.error(err.message);
        if(err.details) console.error(err.details);
        return done(err);
      }

      test.userRole = result;
      test.app.models.roleMapping.create(
        {principalId: test.user.id,
         principalType: test.app.models.roleMapping.USER,
         roleId: result.id},
        function (err, result) {
          if(err) {
            console.error(err.message);
            if(err.details) console.error(err.details);
            return done(err);
          }
    
          test.userRoleMapping = result;
          done();
        }
      );
    });
  });

  if(typeof optionalHandler === 'function') {
    beforeEach(optionalHandler);
  }

  afterEach(function(done) {
    var test = this;
    this.userRole.destroy(function(err) {
      if(err) return done(err);
      test.userRole = undefined;

      test.userRoleMapping.destroy(function(err) {
        if(err) return done(err);
        test.userRoleMapping = undefined;
        done();
      });
    });
  });
}

_beforeEach.givenLoggedInUser = function(credentials, optionalHandler) {
  _beforeEach.givenUser(credentials, function(done) {
    var test = this;
    this.app.models[this.userModel].login(credentials, function(err, token) {
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

_beforeEach.givenLoggedInUserWithRole = function(credentials, role, optionalHandler){
  _beforeEach.givenUserWithRole(credentials, role, function(done) {
    var test = this;
    this.app.models[this.userModel].login(credentials, function(err, token) {
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
  _beforeEach.givenModel('AccessToken', attrs, optionalHandler);
}

_beforeEach.givenAnAnonymousToken = function(attrs, optionalHandler) {
  _beforeEach.givenModel('AccessToken', {id: '$anonymous'}, optionalHandler);
}

_describe.whenCalledRemotely = function(verb, url, data, cb) {
  if (cb == undefined) {
    cb = data;
    data = null;
  }

  var urlStr = url;
  if(typeof url === 'function') {
    urlStr = '/<dynamic>';
  }
  else if(typeof url === 'object' && url.hasOwnProperty('placeHolder')) {
    urlStr = url.placeHolder;
  }

  describe(verb.toUpperCase() + ' ' + urlStr, function() {
    beforeEach(function(cb) {
      if(typeof url === 'function') {
        this.url = url.call(this);
      }
      else if(typeof url === 'object' && url.hasOwnProperty('callback')){
        this.url = url.callback.call(this);
      }
      this.remotely = true;
      this.verb = verb.toUpperCase();
      this.url = this.url || url;
      var methodForVerb = verb.toLowerCase();
      if(methodForVerb === 'delete') methodForVerb = 'del';

      if (this.request === undefined) {
          throw new Error('App is not specified. Please use lt.beforeEach.withApp to specify the app.');
      }

      this.http = this.request[methodForVerb](this.url);
      delete this.url;
      this.http.set('Accept', 'application/json');
      if(this.loggedInAccessToken) {
        this.http.set('authorization', this.loggedInAccessToken.id);
      }
      if (data) {
        var payload = data;
        if (typeof data === 'function')
          payload = data.call(this);
        this.http.send(payload);
      }
      this.req = this.http.req;
      var test = this;
      this.http.end(function(err) {
        test.req = test.http.req;
        test.res = test.http.res;
        delete test.url;
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

_describe.whenLoggedInAsUserWithRole = function(credentials, role, cb) {
  describe('when logged in as user', function () {
    _beforeEach.givenLoggedInUser(credentials, role);
    cb();
  });
}

_describe.whenCalledByUser = function(credentials, verb, url, data, cb) {
  describe('when called by logged in user', function () {
    _beforeEach.givenLoggedInUser(credentials);
    _describe.whenCalledRemotely(verb, url, data, cb);
  });
}

_describe.whenCalledByUserWithRole = function (credentials, role, verb, url, data, cb) {
   describe('when called by logged in user with role ' + role, function () {
    _beforeEach.givenLoggedInUserWithRole(credentials, role);
    _describe.whenCalledRemotely(verb, url, data, cb);
  }); 
}

_describe.whenCalledAnonymously = function(verb, url, data, cb) {
  describe('when called anonymously', function () {
    _beforeEach.givenAnAnonymousToken();
    _describe.whenCalledRemotely(verb, url, data, cb);
  });
}

_describe.whenCalledUnauthenticated = function(verb, url, data, cb) {
  describe('when called with unauthenticated token', function () {
    _beforeEach.givenAnAnonymousToken();
    _describe.whenCalledRemotely(verb, url, data, cb);
  });
}

_it.shouldBeAllowed = function() {
  it('should be allowed', function() {
    assert(this.req);
    assert(this.res);
    // expect success - status 2xx or 3xx
    expect(this.res.statusCode).to.be.within(100, 399);
  });
}

_it.shouldBeDenied = function() {
  it('should not be allowed', function() {
    assert(this.res);
    var expectedStatus = this.aclErrorStatus ||
      this.app && this.app.get('aclErrorStatus') ||
      401;
    expect(this.res.statusCode).to.equal(expectedStatus);
  });
}

_it.shouldNotBeFound = function() {
  it('should not be found', function() {
    assert(this.res);
    assert.equal(this.res.statusCode, 404);
  });
}

_it.shouldBeAllowedWhenCalledAnonymously =
function(verb, url, data) {
  _describe.whenCalledAnonymously(verb, url, data, function() {
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
function(verb, url, data) {
  _describe.whenCalledUnauthenticated(verb, url, data, function() {
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
function(credentials, verb, url, data) {
  _describe.whenCalledByUser(credentials, verb, url, data, function() {
    _it.shouldBeAllowed();
  });
}

_it.shouldBeDeniedWhenCalledByUser =
function(credentials, verb, url) {
  _describe.whenCalledByUser(credentials, verb, url, function() {
    _it.shouldBeDenied();
  });
}

_it.shouldBeAllowedWhenCalledByUserWithRole =
function(credentials, role, verb, url, data) {
  _describe.whenCalledByUserWithRole(credentials, role, verb, url, data, function() {
    _it.shouldBeAllowed();
  });
}

_it.shouldBeDeniedWhenCalledByUserWithRole =
function(credentials, role, verb, url) {
  _describe.whenCalledByUserWithRole(credentials, role, verb, url, function() {
    _it.shouldBeDenied();
  });
}
