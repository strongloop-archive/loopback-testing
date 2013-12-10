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
  lt.whenCalledRemotely('GET', '/products', function() {
    lt.itShouldBeAllowed();
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
