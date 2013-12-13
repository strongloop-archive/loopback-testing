#loopback-testing

**Utilities for testing LoopBack apps**

## overview

The following helpers are designed to generate [mocha] tests against
[LoopBack](http://strongloop.com/loopback) apps.

## install

```sh
npm install loopback-testing --save-dev
```

## basic usage

Below is a simple LoopBack app.

```js
var loopback = require('loopback');
var app = loopback();
var Product = app.model('product');
Product.attachTo(loopback.memory());
```

Use the `loopback-testing` module to generate `mocha` tests.

```js
var lt = require('loopback-testing');
var assert = require('assert');

describe('/products', function() {
  lt.beforeEach.withApp(app);
  lt.describe.whenCalledRemotely('GET', '/products', function() {
    lt.it.shouldBeAllowed();
    it('should have statusCode 200', function() {
      assert.equal(this.res.statusCode, 200);
    });

    lt.givenModel('product');
    it('should respond with an array of products', function() {
      assert(Array.isArray(this.res.body));
    });
  });
});
```

## building test data

Use TestDataBuilder to build many Model instances in one async call. Specify
only properties relevant to your test, the builder will pre-fill remaining
required properties with sensible defaults.

```js
var TestDataBuilder = require('loopback-testing').TestDataBuilder;
var ref = TestDataBuilder.ref;

// The context object to hold the created models.
// You can use `this` in mocha test instead.
var context = {};

var ref = TestDataBuilder.ref;
new TestDataBuilder()
  .define('application', Application, {
    pushSettings: { stub: { } }
  })
  .define('device', Device, {
     // use the value of application's id
     // the value is resolved at build time
     appId: ref('application.id'),
     deviceType: 'android'
  })
  .define('notification', Notification)
  .buildTo(context, function(err) {
    // test models are available as
    //   context.application
    //   context.device
    //   context.notification
  });
```
