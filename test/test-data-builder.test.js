var loopback = require('loopback');
var TestDataBuilder = require('../lib/test-data-builder');
var expect = require('chai').expect;

describe('TestDataBuilder', function() {
  var db;
  var TestModel;

  beforeEach(function() {
    db = loopback.createDataSource({ connector: loopback.Memory });
  });

  it('builds a model', function(done) {
    givenTestModel({ value: String });

    new TestDataBuilder()
      .define('model', TestModel, { value: 'a-string-value' })
      .buildTo(this, function(err) {
        if (err) return done(err);
        expect(this.model).to.have.property('value', 'a-string-value');
        done();
      }.bind(this));
  });

  // Parameterized test
  function itAutoFillsRequiredPropertiesWithUniqueValuesFor(type) {
    it(
      'auto-fills required ' + type + ' properties with unique values',
      function(done) {
        givenTestModel({
          required1: { type: type, required: true },
          required2: { type: type, required: true }
        });

        new TestDataBuilder()
          .define('model', TestModel, {})
          .buildTo(this, function(err) {
            if (err) return done(err);
            expect(this.model.required1).to.not.equal(this.model.required2);
            expect(this.model.optional).to.satisfy(notSet);
            done();
          }.bind(this));
      }
    );
  }

  itAutoFillsRequiredPropertiesWithUniqueValuesFor(String);
  itAutoFillsRequiredPropertiesWithUniqueValuesFor(Number);
  itAutoFillsRequiredPropertiesWithUniqueValuesFor(Date);

  it('limits the length of the generated string value to the property length', function(done) {
    var testMaxStringLength = 10;
    givenTestModel({
      required1: { type: String, required: true },
      required2: { type: String, required: true, length: testMaxStringLength }
    });

    new TestDataBuilder()
      .define('model', TestModel, {})
      .buildTo(this, function(err) {
        if (err) return done(err);
        expect(this.model.required1).to.not.equal(this.model.required2);
        expect(this.model.required2).to.have.length.of.at.most(testMaxStringLength);
        done();
      }.bind(this));
  });

  it('auto-fills required Boolean properties with false', function(done) {
    givenTestModel({
      required: { type: Boolean, required: true }
    });

    new TestDataBuilder()
      .define('model', TestModel, {})
      .buildTo(this, function(err) {
        if (err) return done(err);
        expect(this.model.required).to.equal(false);
        done();
      }.bind(this));
  });

  it('does not fill optional properties', function(done) {
    givenTestModel({
      optional: { type: String, required: false }
    });

    new TestDataBuilder()
      .define('model', TestModel, {})
      .buildTo(this, function(err) {
        if (err) return done(err);
        expect(this.model.optional).to.satisfy(notSet);
        done();
      }.bind(this));
  });

  it('resolves references', function(done) {
    var Parent = givenModel('Parent', { name: { type: String, required: true } });
    var Child = givenModel('Child', { parentName: String });

    new TestDataBuilder()
      .define('parent', Parent)
      .define('child', Child, {
        parentName: TestDataBuilder.ref('parent.name')
      })
      .buildTo(this, function(err) {
        if(err) return done(err);
        expect(this.child.parentName).to.equal(this.parent.name);
        done();
      }.bind(this));
  });

  function givenTestModel(properties) {
    TestModel = givenModel('TestModel', properties);
  }

  function givenModel(name, properties) {
    var ModelCtor = loopback.createModel(name, properties);
    ModelCtor.attachTo(db);
    return ModelCtor;
  }

  function notSet(value) {
    // workaround for `expect().to.exist` that triggers a JSHint error
    // (a no-op statement discarding the property value)
    return value === undefined || value === null;
  }
});
