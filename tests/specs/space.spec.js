import {
  fixt_arrdom_nums,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_arrdom_solved,
  fixt_dom_empty,
  fixt_dom_nums,
  fixt_dom_range,
  fixt_domainEql,
  stripAnonVars,
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
  config_create,
  config_setOption,
} from '../../src/config';
import {
  space_createClone,
  space_createRoot,
  space_generateVars,
  space_getUnsolvedVarCount,
  _space_getUnsolvedVarNamesFresh,
  space_initFromConfig,
  space_updateUnsolvedVarList,
  space_propagate,
  space_solution,
  space_toConfig,
} from '../../src/space';

describe('fdo/space.spec', () => {

  describe('Space class', () => {

    describe('space_createRoot()', () => {

      test('should exist', () => {
        expect(typeof space_createRoot).toBe('function');
      });

      test('should create a new instance', () => {
        // I dont want to test for instanceof... but i dont think we can change that due to ext. api.
        expect(typeof space_createRoot()).toBe('object');
      });

      test('should init vars and var_names', () => {
        expect(Array.isArray(space_createRoot().vardoms)).toBe(true);
      });
    });

    describe('space_createClone()', () => {
      let config;
      let space;
      let clone;

      beforeEach(() => {
        config = config_create();
        space = space_createRoot();
        space_initFromConfig(space, config);
        clone = space_createClone(space);
      });

      test('should return a new space', () => {
        expect(clone).not.toBe(space);
      });

      test('should clone vardoms', () => {
        expect(space.vardoms).not.toBe(clone.vardoms);
      });

      test('should clone solved var list', () => {
        expect(space._unsolved).not.toBe(clone._unsolved);
      });

      test('should deep clone the vars', () => {
        //for var_name in config.allVarNames
        for (let i = 0; i < config.allVarNames.length; ++i) {
          let varName = config.allVarNames[i];

          if (typeof clone.vardoms[varName] !== 'number') expect(clone.vardoms[varName]).not.toBe(space.vardoms[varName]);
          expect(clone.vardoms[varName]).toEqual(space.vardoms[varName]);
        }
      });
    });

    describe('targeted vars', () => {

      test('should not add unconstrained vars when targeting all', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = 'all';

        let space = space_createRoot();
        space_initFromConfig(space, config);

        expect(space_getUnsolvedVarCount(space, config)).toBe(0);
      });

      test(
        'should use explicitly targeted vars regardless of being constrained',
        () => {
          let config = config_create();
          config_addVarRange(config, 'A', 32, 55);
          config_addVarRange(config, 'B', 0, 1);
          config.targetedVars = ['A', 'B'];

          let space = space_createRoot();
          space_initFromConfig(space, config);

          expect(_space_getUnsolvedVarNamesFresh(space, config).sort()).toEqual(['A', 'B']);
        }
      );

      test('should not care about the order of the var names', () => {
        let targets = ['B', 'A'];
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config.targetedVars = targets.slice(0);

        let space = space_createRoot();
        space_initFromConfig(space, config);

        expect(_space_getUnsolvedVarNamesFresh(space, config).sort()).toEqual(targets.sort());
      });

      test('should throw if var names dont exist', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = ['FAIL'];

        let space = space_createRoot();
        expect(_ => { space_initFromConfig(space, config) }).toThrowError('E_VARS_SHOULD_EXIST_NOW');
      });
    });

    describe('space_isSolved()', () => {

      test('should return true if there are no vars', () => {
        let config = config_create();
        let space = space_createRoot();
        space_initFromConfig(space, config);
        expect(space_updateUnsolvedVarList(space, config)).toBe(true);
      });

      test('should return true if all 1 vars are solved', () => {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonConstant(config, 1);
        space_initFromConfig(space, config);

        // only one solved var
        expect(space_updateUnsolvedVarList(space, config)).toBe(true);
      });

      test('should return true if all 2 vars are solved', () => {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonConstant(config, 1);
        config_addVarAnonConstant(config, 1);
        space_initFromConfig(space, config);

        // two solved vars
        expect(space_updateUnsolvedVarList(space, config)).toBe(true);
      });

      test(
        'should return false if one var is not solved and is targeted',
        () => {
          let config = config_create();
          let space = space_createRoot();
          config_addVarAnonRange(config, 0, 1);
          config.targetedVars = config.allVarNames.slice(0);
          space_initFromConfig(space, config);

          // only one unsolved var
          expect(space_updateUnsolvedVarList(space, config)).toBe(false);
        }
      );

      test(
        'should have no unsolved var indexes if explicitly targeting no vars',
        () => {
          let config = config_create();
          let space = space_createRoot();
          config_addVarAnonRange(config, 0, 1);
          config.targetedVars = [];
          space_initFromConfig(space, config);

          // unsolved vars to solve
          expect(space_getUnsolvedVarCount(space, config)).toBe(0);
        }
      );

      test(
        'should return false if at least one var of two is not solved and targeted',
        () => {
          let config = config_create();
          let space = space_createRoot();
          config_addVarAnonRange(config, 0, 1);
          config_addVarAnonRange(config, 0, 1);
          config.targetedVars = config.allVarNames.slice(0);
          space_initFromConfig(space, config);

          // two unsolved vars
          expect(space_updateUnsolvedVarList(space, config)).toBe(false);
        }
      );

      test(
        'should return false if at least one var of two is not solved and not targeted',
        () => {
          let config = config_create();
          let space = space_createRoot();
          config_addVarAnonRange(config, 0, 1);
          config_addVarAnonRange(config, 0, 1);
          space_initFromConfig(space, config);

          // two unsolved vars
          expect(space_updateUnsolvedVarList(space, config)).toBe(true);
        }
      );

      test(
        'should return false if at least one var of three is not solved and all targeted',
        () => {
          let config = config_create();
          let space = space_createRoot();
          config_addVarAnonRange(config, 0, 1);
          config_addVarAnonRange(config, 0, 1);
          config_addVarAnonConstant(config, 1);
          config.targetedVars = config.allVarNames.slice(0);
          space_initFromConfig(space, config);

          // two unsolved vars and a solved var
          expect(space_updateUnsolvedVarList(space, config)).toBe(false);
        }
      );

      test(
        'should return false if at least one var of three is not solved and not targeted',
        () => {
          let config = config_create();
          let space = space_createRoot();
          config_addVarAnonRange(config, 0, 1);
          config_addVarAnonRange(config, 0, 1);
          config_addVarAnonConstant(config, 1);
          space_initFromConfig(space, config);

          // two unsolved vars and a solved var
          expect(space_updateUnsolvedVarList(space, config)).toBe(true);
        }
      );

      test(
        'should return false if at least one var of three is not solved and only that one not is targeted',
        () => {
          let config = config_create();
          let space = space_createRoot();
          config_addVarAnonRange(config, 0, 1);
          config_addVarAnonRange(config, 0, 1);
          let A = config_addVarAnonConstant(config, 1);
          config.targetedVars = [config.allVarNames[A]];
          space_initFromConfig(space, config);

          // two unsolved vars and a solved var
          expect(space_updateUnsolvedVarList(space, config)).toBe(true);
        }
      );

      test(
        'should return false if at least one var of three is not solved and that one is targeted',
        () => {
          let config = config_create();
          let space = space_createRoot();
          let A = config_addVarAnonRange(config, 0, 1);
          let B = config_addVarAnonRange(config, 0, 1);
          config_addVarAnonConstant(config, 1);
          config.targetedVars = [config.allVarNames[A], config.allVarNames[B]];
          space_initFromConfig(space, config);

          // two unsolved vars and a solved var
          expect(space_updateUnsolvedVarList(space, config)).toBe(false);
        }
      );
    });

    describe('space_solution()', () => {

      test('should return an object, not array', () => {
        let config = config_create();
        expect(typeof space_solution(space_createRoot(), config)).toBe('object');
        expect(Array.isArray(space_solution(space_createRoot(), config))).toBe(false);
      });

      test('should return an empty object if there are no vars', () => {
        let config = config_create();
        let space = space_createRoot();
        expect(space_solution(space, config)).toEqual({});
      });

      test('should return false if a var covers no (more) elements', () => {
        let config = config_create();
        let space = space_createRoot();
        config_addVarDomain(config, 'test', fixt_arrdom_nums(100));
        space_initFromConfig(space, config);
        space.vardoms[config.allVarNames.indexOf('test')] = fixt_dom_empty();

        expect(space_solution(space, config)).toEqual({test: false});
      });

      test('should return the value of a var is solved', () => {
        let config = config_create();
        let space = space_createRoot();
        config_addVarDomain(config, 'test', fixt_arrdom_solved(5));
        space_initFromConfig(space, config);

        expect(space_solution(space, config)).toEqual({test: 5});
      });

      test('should return the domain of a var if not yet determined', () => {
        let config = config_create();
        let space = space_createRoot();
        config_addVarRange(config, 'single_range', 10, 120);
        config_addVarDomain(config, 'multi_range', fixt_arrdom_ranges([10, 20], [30, 40]));
        config_addVarDomain(config, 'multi_range_with_solved', fixt_arrdom_ranges([18, 20], [25, 25], [30, 40]));
        space_initFromConfig(space, config);

        expect(space_solution(space, config)).toEqual({
          single_range: fixt_arrdom_range(10, 120),
          multi_range: fixt_arrdom_ranges([10, 20], [30, 40]),
          multi_range_with_solved: fixt_arrdom_ranges([18, 20], [25, 25], [30, 40]),
        });
      });

      test('should not add anonymous vars to the result', () => {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonConstant(config, 15);
        config_addVarConstant(config, 'addme', 20);
        space_initFromConfig(space, config);

        expect(stripAnonVars(space_solution(space, config))).toEqual({addme: 20});
      });
    });

    describe('space_toConfig', () => {

      test('should convert a space to its config', () => {
        let config = config_create();
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let config2 = config_create(); // fresh config object
        delete config2.beforeSpace;
        delete config2.afterSpace;

        // if a space has no special things, it should produce a
        // fresh config... (but it's a fickle test at best)
        expect(space_toConfig(space, config)).toEqual(config2);
      });

      test('should convert a space with a var without domain', () => {
        let config = config_create();
        let space = space_createRoot(); // fresh space object
        config_addVarNothing(config, 'A'); // becomes [SUB SUP]
        space_initFromConfig(space, config);

        let config2 = space_toConfig(space, config);

        expect(config2.allVarNames).toEqual(['A']);
        // empty property should exist
        expect(config2.initialDomains).toEqual([fixt_dom_range(SUB, SUP)]);
      });
    });

    describe('space_propagate', () => {

      describe('simple cases', () => {

        test('should not reject this multiply case', () => {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 10);
          config_addVarRange(config, 'B', 0, 10);
          config_addVarRange(config, 'MAX', 25, 25);
          config_addVarRange(config, 'MUL', 0, 100);

          config_addConstraint(config, 'ring-mul', ['A', 'B', 'MUL'], 'mul');
          config_addConstraint(config, 'lt', ['MUL', 'MAX']);

          space_initFromConfig(space, config);

          expect(space_propagate(space, config)).toBe(false);
        });
      });

      describe('timeout callback', () => {

        test('should ignore timeout callback if not set at all', () => {
          // (base timeout callback test)

          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 10);
          config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'lt', ['A', 'B']);

          space_initFromConfig(space, config);
          expect(space_propagate(space, config)).toBe(false);
        });

        test('should not break early if callback doesnt return true', () => {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 10);
          config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'lt', ['A', 'B']);

          config_setOption(config, 'afterSpace', _ => false);
          space_initFromConfig(space, config);

          expect(space_propagate(space, config)).toBe(false);
        });

        test('should break early if callback returns true', () => {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 10);
          config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'lt', ['A', 'B']);

          config_setOption(config, 'afterSpace', _ => true);
          space_initFromConfig(space, config);

          expect(space_propagate(space, config)).toBe(true);
        });
      });
    });

    describe('space_generateVars', () => {

      test('should exist', () => {
        expect(typeof space_generateVars).toBe('function');
      });

      test('should require config and space', () => {
        let config = config_create();
        let space = space_createRoot();

        expect(_ => { space_generateVars(space, {}) }).toThrowError('EXPECTING_CONFIG');
        expect(_ => { space_generateVars({}, config) }).toThrowError('SPACE_SHOULD_BE_SPACE');
      });

      test('should create a constant', () => {
        let config = config_create();
        let name = config_addVarAnonConstant(config, 10);
        let space = space_createRoot();

        space_generateVars(space, config);

        fixt_domainEql(space.vardoms[name], fixt_dom_nums(10));
      });

      test('should create a full width var', () => {
        let config = config_create();
        let name = config_addVarAnonNothing(config);
        let space = space_createRoot();

        space_generateVars(space, config);

        expect(space.vardoms[name]).toEqual(fixt_dom_range(SUB, SUP));
      });

      test('should clone a domained var', () => {
        let config = config_create();
        let name = config_addVarAnonRange(config, 32, 55);
        let space = space_createRoot();

        space_generateVars(space, config);

        expect(space.vardoms[name]).toEqual(fixt_dom_range(32, 55));
      });
    });
  });
});
