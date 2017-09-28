import expect from '../../../fdlib/tests/lib/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_dom_nums,
  fixt_dom_range,
} from '../../../fdlib/tests/lib/domain.fixt';

import {
  SUB,
  SUP,
} from '../../../fdlib/src/helpers';

import {
  config_addConstraint,
  config_addVarAnonConstant,
  config_addVarAnonNothing,
  config_addVarAnonRange,
  config_addVarConstant,
  config_addVarDomain,
  config_addVarNothing,
  config_addVarRange,
  config_clone,
  config_create,
  config_setOptions,
  config_setOption,
} from '../../src/config';

describe('fdo/config.spec', function() {

  describe('config_addConstraint', function() {

    it('should exist', function() {
      expect(config_addConstraint).to.be.a('function');
    });

    it('should throw for unknown names', function() {
      let config = config_create();
      expect(_ => config_addConstraint(config, 'crap', [])).to.throw('UNKNOWN_PROPAGATOR');
    });
  });

  describe('config_create', function() {

    it('should return an object', function() {
      expect(config_create()).to.be.an('object');
    });
  });

  describe('config_addVarAnonConstant', function() {

    it('should add the value', function() {
      let config = config_create();
      let varIndex = config_addVarAnonConstant(config, 15);

      expect(config.allVarNames[varIndex]).to.be.a('string');
      expect(config.initialDomains[varIndex]).to.eql(fixt_dom_nums(15));
    });

    it('should populate the constant cache', function() {
      let config = config_create();
      let varIndex = config_addVarAnonConstant(config, 15);

      expect(config.constantCache[15]).to.equal(varIndex);
    });

    it('should reuse the constant cache if available', function() {
      let config = config_create();
      let index1 = config_addVarAnonConstant(config, 1);
      let index2 = config_addVarAnonConstant(config, 2);
      let index3 = config_addVarAnonConstant(config, 1);

      expect(index1).to.not.equal(index2);
      expect(index1).to.equal(index3);
    });
  });

  describe('config_addVarAnonNothing', function() {

    it('should exist', function() {
      expect(config_addVarAnonNothing).to.be.a('function');
    });

    it('should create a new var with max range', function() {
      let config = config_create();

      config_addVarAnonNothing(config);

      expect(config.allVarNames.length).to.equal(1);
      expect(config.initialDomains[0]).to.eql(fixt_dom_range(SUB, SUP));
    });
  });

  describe('config_addVarAnonRange', function() {

    it('should exist', function() {
      expect(config_addVarAnonRange).to.be.a('function');
    });

    it('should throw if hi is missing', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, 15)).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw if lo is missing', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, undefined, 15)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw if lo is an array', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, [15, 30], 15)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let lo = 50;
        let hi = 100;

        config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(lo, hi));
      });

      it('should make a constant if lo=hi', function() {
        let config = config_create();

        let lo = 58778;
        let hi = 58778;

        let varIndex = config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(lo, hi));
        expect(config.constantCache[lo]).to.eql(varIndex);
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let lo = 5;
        let hi = 10;

        config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(lo, hi));
      });

      it('should make a constant if lo=hi', function() {
        let config = config_create();

        let lo = 28;
        let hi = 28;

        let varIndex = config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(lo, hi));
        expect(config.constantCache[lo]).to.eql(varIndex);
      });
    });
  });

  describe('config_addVarConstant', function() {

    it('should exist', function() {
      expect(config_addVarConstant).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', undefined)).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    it('should throw for passing on an array', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', [10, 15])).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', '23')).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = 50;

        config_addVarConstant(config, 'A', value);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(value, value));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = 5;

        config_addVarConstant(config, 'A', value);

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(value, value));
      });
    });
  });

  describe('config_addVarDomain', function() {

    it('should exist', function() {
      expect(config_addVarDomain).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarDomain(config, 'A', undefined)).to.throw('DOMAIN_MUST_BE_ARRAY_HERE');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarDomain(config, 'A', '23')).to.throw('DOMAIN_MUST_BE_ARRAY_HERE');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarDomain(config, 'A', fixt_arrdom_range(50, 55));

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(50, 55));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarDomain(config, 'A', fixt_arrdom_range(5, 12));

        expect(config.allVarNames.length).to.equal(1);
        expect(config.initialDomains[0]).to.equal(fixt_dom_range(5, 12));
      });
    });
  });

  describe('config_addVarNothing', function() {

    it('should exist', function() {
      expect(config_addVarNothing).to.be.a('function');
    });

    it('should throw for missing the name', function() {
      let config = config_create();

      expect(_ => config_addVarNothing(config)).to.throw('Var names should be a string or anonymous');
    });

    it('should create a new var with max range', function() {
      let config = config_create();

      config_addVarNothing(config, 'A');

      expect(config.allVarNames).to.eql(['A']);
      expect(config.initialDomains[0]).to.eql(fixt_dom_range(SUB, SUP));
    });
  });

  describe('config_addVarRange', function() {

    it('should exist', function() {
      expect(config_addVarRange).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', undefined)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', '23')).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for missing lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', undefined, 12)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for missing hi', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, undefined)).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw for bad lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', '10', 12)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for bad hi', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, '12')).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw if hi is lower than lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, 10)).to.throw('A_RANGES_SHOULD_ASCEND');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarRange(config, 'A', 50, 55);

        expect(config.allVarNames).to.eql(['A']);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(50, 55));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarRange(config, 'A', 5, 12);

        expect(config.allVarNames).to.eql(['A']);
        expect(config.initialDomains[0]).to.eql(fixt_dom_range(5, 12));
      });
    });
  });

  describe('config_setOption', function() {

    it('should exist', function() {
      expect(config_setOption).to.be.a('function');
    });

    it('should set general var strategy', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {type: 'A'});

      expect(config.varStratConfig.type).to.equal('A');
    });

    it('should init the var config of a single level without priorityByName', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {type: 'max'});

      expect(config.varStratConfig.type).to.eql('max');
      expect(config.varStratConfig._priorityByIndex).to.equal(undefined);
    });

    it('should init the var config of a single level and a priorityByName', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {
        type: 'list',
        priorityByName: ['B_list', 'A_list'],
      });

      expect(config.varStratConfig.priorityByName).to.eql(['B_list', 'A_list']);
    });

    it('should throw for some legacy config structs', function() {
      let config = config_create();

      expect(_ => config_setOption(config, 'var', {})).to.throw('REMOVED. Replace `var` with `varStrategy`');
      expect(_ => config_setOption(config, 'varStrategy', _ => 0)).to.throw('functions no longer supported');
      expect(_ => config_setOption(config, 'varStrategy', 'foo')).to.throw('strings should be passed on as');
      expect(_ => config_setOption(config, 'varStrategy', 15)).to.throw('varStrategy should be object');
      expect(_ => config_setOption(config, 'varStrategy', {name: 'foo'})).to.throw('name should be type');
      expect(_ => config_setOption(config, 'varStrategy', {dist_name: 'foo'})).to.throw('dist_name should be type');
      expect(_ => config_setOption(config, 'val', {})).to.throw('REMOVED. Replace `var` with `valueStrategy`');
    });

    it('should copy the targeted var names', function() {
      let config = config_create();
      config_setOption(config, 'targeted_var_names', ['A']);

      expect(config.targetedVars).to.eql(['A']);
    });

    it('should copy the var distribution config', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {valtype: 'B'}, 'A');

      expect(config.varDistOptions).to.eql({A: {valtype: 'B'}});
    });

    it('DEPRECATED; remove once actually obsolete', function() {
      let config = config_create();

      expect(_ => config_setOption(config, 'varStratOverride', {valtype: 'B'}, 'A')).to.throw('deprecated');
    });

    it('should copy the beforeSpace callback', function() {
      let config = config_create();
      config_setOption(config, 'beforeSpace', 'A');

      expect(config.beforeSpace).to.equal('A');
    });

    it('should copy the afterSpace callback', function() {
      let config = config_create();
      config_setOption(config, 'afterSpace', 'A');

      expect(config.afterSpace).to.equal('A');
    });

    it('should override value strats per var', function() {
      let config = config_create();
      config_setOption(config, 'varStratOverrides', {
        'A': 'foobar',
      });

      expect(config.varDistOptions).to.be.an('object');
      expect(config.varDistOptions.A).to.equal('foobar');
    });

    it('should override value strats per var', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {
        'strat': 'foobar',
      }, 'A');

      expect(config.varDistOptions).to.be.an('object');
      expect(config.varDistOptions.A).to.be.an('object');
      expect(config.varDistOptions.A.strat).to.equal('foobar');
    });

    it('should throw for setting it twice', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {
        'strat': 'foobar',
      }, 'A');

      expect(_ => config_setOption(config, 'varValueStrat', {'another': 'thing'}, 'A')).to.throw('should not be known yet');
    });

    it('should throw for unknown config values', function() {
      let config = config_create();
      expect(_ => config_setOption(config, 'unknown value test', {'strat': 'foobar'}, 'A')).to.throw('unknown option');
    });
  });

  describe('config_setOptions', function() {

    it('should exist', function() {
      expect(config_setOptions).to.be.a('function');
    });

    it('should not require an options object', function() {
      let config = config_create();
      config_setOptions(config);

      expect(true).to.eql(true);
    });

    it('should override the global var strategy', function() {
      let config = config_create();
      config_setOptions(config, {
        varStrategy: {
          type: 'midmax',
        },
      });

      expect(config.varStratConfig.type).to.eql('midmax');
    });

    it('should override the global value strategy', function() {
      let config = config_create();
      expect(config.valueStratName).to.not.eql('mid');

      config_setOptions(config, {valueStrategy: 'mid'});

      expect(config.valueStratName).to.eql('mid');
    });

    it('should override the list of targeted var names', function() {
      let config = config_create();
      expect(config.targetedVars).to.eql('all');

      config_setOptions(config, {targeted_var_names: ['A', 'B']});

      expect(config.targetedVars).to.eql(['A', 'B']);
    });

    it('should override the var-specific strategies for multiple vars', function() {
      let config = config_create();
      expect(config.varDistOptions).to.eql({});

      config_setOptions(config, {varStratOverrides: {
        'A': 'something for a',
        'B': 'something for b',
      }});

      expect(config.varDistOptions).to.eql({
        'A': 'something for a',
        'B': 'something for b',
      });
    });

    it('should override the var-specific strategy for one var', function() {
      let config = config_create();
      expect(config.varDistOptions).to.eql({});

      config_setOptions(config, {varValueStrat: 'max', varStratOverrideName: 'A'});

      expect(config.varDistOptions).to.eql({
        'A': 'max',
      });
    });

    it('DEPRECATED; remove once obsoleted', function() {
      let config = config_create();
      expect(config.varDistOptions).to.eql({});

      config_setOptions(config, {varStratOverride: 'max', varStratOverrideName: 'A'});

      expect(config.varDistOptions).to.eql({
        'A': 'max',
      });
    });

    it('should set the beforeSpace callback', function() {
      let config = config_create();
      config_setOptions(config, {beforeSpace: function() {}});

      expect(true).to.eql(true);
    });

    it('should set the afterSpace callback', function() {
      let config = config_create();
      config_setOptions(config, {afterSpace: function() {}});

      expect(true).to.eql(true);
    });
  });

  describe('config_clone', function() {

    it('should exist', function() {
      expect(config_clone).to.be.a('function');
    });

    it('should clone a config', function() {
      let config = config_create();
      let clone = config_clone(config);
      delete config.beforeSpace;
      delete config.afterSpace;

      expect(clone).to.eql(config);
    });

    it('should clone a config with targetedVars as an array', function() {
      let config = config_create();
      let vars = ['a', 'b'];
      config.targetedVars = vars;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(vars);
    });

    it('should clone a config with targetedVars as a string', function() {
      let config = config_create();
      let vars = 'foobala';
      config.targetedVars = vars;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(vars);
    });

    it('should clone a config with targetedVars as an undefined', function() {
      let config = config_create();
      config.targetedVars = undefined;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(undefined);
    });

    it('should accept a new set of new vars', function() {
      let config = config_create();
      let newVars = [];
      let clone = config_clone(config, newVars);

      expect(clone.initialDomains).to.eql(newVars);
    });
  });

  it('should reject a known var', function() {
    let config = config_create();
    config_addVarRange(config, 'again', 0, 10);
    expect(_ => config_addVarRange(config, 'again', 0, 10)).to.throw('Var name already part of this config. Probably a bug?');
  });

  it('should reject number as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, 200, 0, 10)).to.throw('A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  });

  it('should reject zero as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, 0, 0, 10)).to.throw('A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  });

  it('should reject stringified zero as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, '0', 0, 10)).to.throw('Don\'t use numbers as var names');
  });

  it('should reject adding a number as a var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, '0', 0, 10)).to.throw('Don\'t use numbers as var names');
  });
});
