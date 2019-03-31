import {
  fixt_arrdom_range,
  fixt_dom_nums,
  fixt_dom_range,
} from 'fdlib/tests/lib/domain.fixt';

import {
  SUB,
  SUP,
} from 'fdlib';

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

describe('fdo/config.spec', () => {

  describe('config_addConstraint', () => {

    test('should exist', () => {
      expect(typeof config_addConstraint).toBe('function');
    });

    test('should throw for unknown names', () => {
      let config = config_create();
      expect(_ => { config_addConstraint(config, 'crap', []) }).toThrowError('UNKNOWN_PROPAGATOR');
    });
  });

  describe('config_create', () => {

    test('should return an object', () => {
      expect(typeof config_create()).toBe('object');
    });
  });

  describe('config_addVarAnonConstant', () => {

    test('should add the value', () => {
      let config = config_create();
      let varIndex = config_addVarAnonConstant(config, 15);

      expect(typeof config.allVarNames[varIndex]).toBe('string');
      expect(config.initialDomains[varIndex]).toEqual(fixt_dom_nums(15));
    });

    test('should populate the constant cache', () => {
      let config = config_create();
      let varIndex = config_addVarAnonConstant(config, 15);

      expect(config.constantCache[15]).toBe(varIndex);
    });

    test('should reuse the constant cache if available', () => {
      let config = config_create();
      let index1 = config_addVarAnonConstant(config, 1);
      let index2 = config_addVarAnonConstant(config, 2);
      let index3 = config_addVarAnonConstant(config, 1);

      expect(index1).not.toBe(index2);
      expect(index1).toBe(index3);
    });
  });

  describe('config_addVarAnonNothing', () => {

    test('should exist', () => {
      expect(typeof config_addVarAnonNothing).toBe('function');
    });

    test('should create a new var with max range', () => {
      let config = config_create();

      config_addVarAnonNothing(config);

      expect(config.allVarNames.length).toBe(1);
      expect(config.initialDomains[0]).toEqual(fixt_dom_range(SUB, SUP));
    });
  });

  describe('config_addVarAnonRange', () => {

    test('should exist', () => {
      expect(typeof config_addVarAnonRange).toBe('function');
    });

    test('should throw if hi is missing', () => {
      let config = config_create();

      expect(_ => { config_addVarAnonRange(config, 15) }).toThrowError('A_HI_MUST_BE_NUMBER');
    });

    test('should throw if lo is missing', () => {
      let config = config_create();

      expect(_ => { config_addVarAnonRange(config, undefined, 15) }).toThrowError('A_LO_MUST_BE_NUMBER');
    });

    test('should throw if lo is an array', () => {
      let config = config_create();

      expect(_ => { config_addVarAnonRange(config, [15, 30], 15) }).toThrowError('A_LO_MUST_BE_NUMBER');
    });

    describe('with array', () => {

      test('should create a new var with given range', () => {
        let config = config_create();

        let lo = 50;
        let hi = 100;

        config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).toBe(1);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(lo, hi));
      });

      test('should make a constant if lo=hi', () => {
        let config = config_create();

        let lo = 58778;
        let hi = 58778;

        let varIndex = config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).toBe(1);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(lo, hi));
        expect(config.constantCache[lo]).toEqual(varIndex);
      });
    });

    describe('with numbers', () => {

      test('should create a new var with given range', () => {
        let config = config_create();

        let lo = 5;
        let hi = 10;

        config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).toBe(1);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(lo, hi));
      });

      test('should make a constant if lo=hi', () => {
        let config = config_create();

        let lo = 28;
        let hi = 28;

        let varIndex = config_addVarAnonRange(config, lo, hi);

        expect(config.allVarNames.length).toBe(1);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(lo, hi));
        expect(config.constantCache[lo]).toEqual(varIndex);
      });
    });
  });

  describe('config_addVarConstant', () => {

    test('should exist', () => {
      expect(typeof config_addVarConstant).toBe('function');
    });

    test('should throw for passing on undefined', () => {
      let config = config_create();

      expect(_ => { config_addVarConstant(config, 'A', undefined) }).toThrowError('A_VALUE_SHOULD_BE_NUMBER');
    });

    test('should throw for passing on an array', () => {
      let config = config_create();

      expect(_ => { config_addVarConstant(config, 'A', [10, 15]) }).toThrowError('A_VALUE_SHOULD_BE_NUMBER');
    });

    test('should throw for passing on a string', () => {
      let config = config_create();

      expect(_ => { config_addVarConstant(config, 'A', '23') }).toThrowError('A_VALUE_SHOULD_BE_NUMBER');
    });

    describe('with array', () => {

      test('should create a new var with given range', () => {
        let config = config_create();

        let value = 50;

        config_addVarConstant(config, 'A', value);

        expect(config.allVarNames.length).toBe(1);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(value, value));
      });
    });

    describe('with numbers', () => {

      test('should create a new var with given range', () => {
        let config = config_create();

        let value = 5;

        config_addVarConstant(config, 'A', value);

        expect(config.allVarNames.length).toBe(1);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(value, value));
      });
    });
  });

  describe('config_addVarDomain', () => {

    test('should exist', () => {
      expect(typeof config_addVarDomain).toBe('function');
    });

    test('should throw for passing on undefined', () => {
      let config = config_create();

      expect(_ => { config_addVarDomain(config, 'A', undefined) }).toThrowError('DOMAIN_MUST_BE_ARRAY_HERE');
    });

    test('should throw for passing on a string', () => {
      let config = config_create();

      expect(_ => { config_addVarDomain(config, 'A', '23') }).toThrowError('DOMAIN_MUST_BE_ARRAY_HERE');
    });

    describe('with array', () => {

      test('should create a new var with given range', () => {
        let config = config_create();

        config_addVarDomain(config, 'A', fixt_arrdom_range(50, 55));

        expect(config.allVarNames.length).toBe(1);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(50, 55));
      });
    });

    describe('with numbers', () => {

      test('should create a new var with given range', () => {
        let config = config_create();

        config_addVarDomain(config, 'A', fixt_arrdom_range(5, 12));

        expect(config.allVarNames.length).toBe(1);
        expect(config.initialDomains[0]).toBe(fixt_dom_range(5, 12));
      });
    });
  });

  describe('config_addVarNothing', () => {

    test('should exist', () => {
      expect(typeof config_addVarNothing).toBe('function');
    });

    test('should throw for missing the name', () => {
      let config = config_create();

      expect(_ => { config_addVarNothing(config) }).toThrowError('Var names should be a string or anonymous');
    });

    test('should create a new var with max range', () => {
      let config = config_create();

      config_addVarNothing(config, 'A');

      expect(config.allVarNames).toEqual(['A']);
      expect(config.initialDomains[0]).toEqual(fixt_dom_range(SUB, SUP));
    });
  });

  describe('config_addVarRange', () => {

    test('should exist', () => {
      expect(typeof config_addVarRange).toBe('function');
    });

    test('should throw for passing on undefined', () => {
      let config = config_create();

      expect(_ => { config_addVarRange(config, 'A', undefined) }).toThrowError('A_LO_MUST_BE_NUMBER');
    });

    test('should throw for passing on a string', () => {
      let config = config_create();

      expect(_ => { config_addVarRange(config, 'A', '23') }).toThrowError('A_LO_MUST_BE_NUMBER');
    });

    test('should throw for missing lo', () => {
      let config = config_create();

      expect(_ => { config_addVarRange(config, 'A', undefined, 12) }).toThrowError('A_LO_MUST_BE_NUMBER');
    });

    test('should throw for missing hi', () => {
      let config = config_create();

      expect(_ => { config_addVarRange(config, 'A', 12, undefined) }).toThrowError('A_HI_MUST_BE_NUMBER');
    });

    test('should throw for bad lo', () => {
      let config = config_create();

      expect(_ => { config_addVarRange(config, 'A', '10', 12) }).toThrowError('A_LO_MUST_BE_NUMBER');
    });

    test('should throw for bad hi', () => {
      let config = config_create();

      expect(_ => { config_addVarRange(config, 'A', 12, '12') }).toThrowError('A_HI_MUST_BE_NUMBER');
    });

    test('should throw if hi is lower than lo', () => {
      let config = config_create();

      expect(_ => { config_addVarRange(config, 'A', 12, 10) }).toThrowError('A_RANGES_SHOULD_ASCEND');
    });

    describe('with array', () => {

      test('should create a new var with given range', () => {
        let config = config_create();

        config_addVarRange(config, 'A', 50, 55);

        expect(config.allVarNames).toEqual(['A']);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(50, 55));
      });
    });

    describe('with numbers', () => {

      test('should create a new var with given range', () => {
        let config = config_create();

        config_addVarRange(config, 'A', 5, 12);

        expect(config.allVarNames).toEqual(['A']);
        expect(config.initialDomains[0]).toEqual(fixt_dom_range(5, 12));
      });
    });
  });

  describe('config_setOption', () => {

    test('should exist', () => {
      expect(typeof config_setOption).toBe('function');
    });

    test('should set general var strategy', () => {
      let config = config_create();
      config_setOption(config, 'varStrategy', {type: 'A'});

      expect(config.varStratConfig.type).toBe('A');
    });

    test(
      'should init the var config of a single level without priorityByName',
      () => {
        let config = config_create();
        config_setOption(config, 'varStrategy', {type: 'max'});

        expect(config.varStratConfig.type).toBe('max');
        expect(config.varStratConfig._priorityByIndex).toBeUndefined();
      }
    );

    test(
      'should init the var config of a single level and a priorityByName',
      () => {
        let config = config_create();
        config_setOption(config, 'varStrategy', {
          type: 'list',
          priorityByName: ['B_list', 'A_list'],
        });

        expect(config.varStratConfig.priorityByName).toEqual(['B_list', 'A_list']);
      }
    );

    test('should throw for some legacy config structs', () => {
      let config = config_create();

      expect(_ => { config_setOption(config, 'var', {}) }).toThrowError('REMOVED. Replace `var` with `varStrategy`');
      expect(_ => { config_setOption(config, 'varStrategy', _ => 0) }).toThrowError('functions no longer supported');
      expect(_ => { config_setOption(config, 'varStrategy', 'foo') }).toThrowError('strings should be passed on as');
      expect(_ => { config_setOption(config, 'varStrategy', 15) }).toThrowError('varStrategy should be object');
      expect(_ => { config_setOption(config, 'varStrategy', {name: 'foo'}) }).toThrowError('name should be type');
      expect(_ => { config_setOption(config, 'varStrategy', {dist_name: 'foo'}) }).toThrowError('dist_name should be type');
      expect(_ => { config_setOption(config, 'val', {}) }).toThrowError('REMOVED. Replace `var` with `valueStrategy`');
    });

    test('should copy the targeted var names', () => {
      let config = config_create();
      config_setOption(config, 'targeted_var_names', ['A']);

      expect(config.targetedVars).toEqual(['A']);
    });

    test('should copy the var distribution config', () => {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {valtype: 'B'}, 'A');

      expect(config.varDistOptions).toEqual({A: {valtype: 'B'}});
    });

    test('DEPRECATED; remove once actually obsolete', () => {
      let config = config_create();

      expect(_ => { config_setOption(config, 'varStratOverride', {valtype: 'B'}, 'A') }).toThrowError('deprecated');
    });

    test('should copy the beforeSpace callback', () => {
      let config = config_create();
      config_setOption(config, 'beforeSpace', 'A');

      expect(config.beforeSpace).toBe('A');
    });

    test('should copy the afterSpace callback', () => {
      let config = config_create();
      config_setOption(config, 'afterSpace', 'A');

      expect(config.afterSpace).toBe('A');
    });

    test('should override value strats per var', () => {
      let config = config_create();
      config_setOption(config, 'varStratOverrides', {
        'A': 'foobar',
      });

      expect(typeof config.varDistOptions).toBe('object');
      expect(config.varDistOptions.A).toBe('foobar');
    });

    test('should override value strats per var', () => {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {
        'strat': 'foobar',
      }, 'A');

      expect(typeof config.varDistOptions).toBe('object');
      expect(typeof config.varDistOptions.A).toBe('object');
      expect(config.varDistOptions.A.strat).toBe('foobar');
    });

    test('should throw for setting it twice', () => {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {
        'strat': 'foobar',
      }, 'A');

      expect(_ => { config_setOption(config, 'varValueStrat', {'another': 'thing'}, 'A') }).toThrowError('should not be known yet');
    });

    test('should throw for unknown config values', () => {
      let config = config_create();
      expect(_ => { config_setOption(config, 'unknown value test', {'strat': 'foobar'}, 'A') }).toThrowError('unknown option');
    });
  });

  describe('config_setOptions', () => {

    test('should exist', () => {
      expect(typeof config_setOptions).toBe('function');
    });

    test('should not require an options object', () => {
      let config = config_create();
      config_setOptions(config);

      expect(true).toBe(true);
    });

    test('should override the global var strategy', () => {
      let config = config_create();
      config_setOptions(config, {
        varStrategy: {
          type: 'midmax',
        },
      });

      expect(config.varStratConfig.type).toBe('midmax');
    });

    test('should override the global value strategy', () => {
      let config = config_create();
      expect(config.valueStratName).not.toBe('mid');

      config_setOptions(config, {valueStrategy: 'mid'});

      expect(config.valueStratName).toBe('mid');
    });

    test('should override the list of targeted var names', () => {
      let config = config_create();
      expect(config.targetedVars).toBe('all');

      config_setOptions(config, {targeted_var_names: ['A', 'B']});

      expect(config.targetedVars).toEqual(['A', 'B']);
    });

    test(
      'should override the var-specific strategies for multiple vars',
      () => {
        let config = config_create();
        expect(config.varDistOptions).toEqual({});

        config_setOptions(config, {varStratOverrides: {
          'A': 'something for a',
          'B': 'something for b',
        }});

        expect(config.varDistOptions).toEqual({
          'A': 'something for a',
          'B': 'something for b',
        });
      }
    );

    test('should override the var-specific strategy for one var', () => {
      let config = config_create();
      expect(config.varDistOptions).toEqual({});

      config_setOptions(config, {varValueStrat: 'max', varStratOverrideName: 'A'});

      expect(config.varDistOptions).toEqual({
        'A': 'max',
      });
    });

    test('DEPRECATED; remove once obsoleted', () => {
      let config = config_create();
      expect(config.varDistOptions).toEqual({});

      config_setOptions(config, {varStratOverride: 'max', varStratOverrideName: 'A'});

      expect(config.varDistOptions).toEqual({
        'A': 'max',
      });
    });

    test('should set the beforeSpace callback', () => {
      let config = config_create();
      config_setOptions(config, {beforeSpace: function() {}});

      expect(true).toBe(true);
    });

    test('should set the afterSpace callback', () => {
      let config = config_create();
      config_setOptions(config, {afterSpace: function() {}});

      expect(true).toBe(true);
    });
  });

  describe('config_clone', () => {

    test('should exist', () => {
      expect(typeof config_clone).toBe('function');
    });

    test('should clone a config', () => {
      let config = config_create();
      let clone = config_clone(config);
      delete config.beforeSpace;
      delete config.afterSpace;

      expect(clone).toEqual(config);
    });

    test('should clone a config with targetedVars as an array', () => {
      let config = config_create();
      let vars = ['a', 'b'];
      config.targetedVars = vars;
      let clone = config_clone(config);

      expect(clone.targetedVars).toEqual(vars);
    });

    test('should clone a config with targetedVars as a string', () => {
      let config = config_create();
      let vars = 'foobala';
      config.targetedVars = vars;
      let clone = config_clone(config);

      expect(clone.targetedVars).toEqual(vars);
    });

    test('should clone a config with targetedVars as an undefined', () => {
      let config = config_create();
      config.targetedVars = undefined;
      let clone = config_clone(config);

      expect(clone.targetedVars).toEqual(undefined);
    });

    test('should accept a new set of new vars', () => {
      let config = config_create();
      let newVars = [];
      let clone = config_clone(config, newVars);

      expect(clone.initialDomains).toEqual(newVars);
    });
  });

  test('should reject a known var', () => {
    let config = config_create();
    config_addVarRange(config, 'again', 0, 10);
    expect(_ => { config_addVarRange(config, 'again', 0, 10) }).toThrowError('Var name already part of this config. Probably a bug?');
  });

  test('should reject number as var', () => {
    let config = config_create();
    expect(_ => { config_addVarRange(config, 200, 0, 10) }).toThrowError('A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  });

  test('should reject zero as var', () => {
    let config = config_create();
    expect(_ => { config_addVarRange(config, 0, 0, 10) }).toThrowError('A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  });

  test('should reject stringified zero as var', () => {
    let config = config_create();
    expect(_ => { config_addVarRange(config, '0', 0, 10) }).toThrowError('Don\'t use numbers as var names');
  });

  test('should reject adding a number as a var', () => {
    let config = config_create();
    expect(_ => { config_addVarRange(config, '0', 0, 10) }).toThrowError('Don\'t use numbers as var names');
  });
});
