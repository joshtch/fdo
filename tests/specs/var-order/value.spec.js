import {
  fixt_arrdom_nums,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_arrdom_solved,
  fixt_dom_empty,
  fixt_dom_nums,
  fixt_dom_range,
  fixt_dom_ranges,
  fixt_dom_solved,
  fixt_domainEql,
} from 'fdlib/tests/lib/domain.fixt';

import {
  LOG_FLAG_CHOICE,
  LOG_FLAG_NONE,

  ASSERT_SET_LOG,
} from 'fdlib/src/assert';

import {
  domain__debug,
} from 'fdlib/src/domain';

import distribute_getNextDomainForVar, {
  FIRST_CHOICE,
  SECOND_CHOICE,
  THIRD_CHOICE,
  NO_CHOICE,

  _distribute_getNextDomainForVar,
  distribution_valueByList,
  distribution_valueByMarkov,
  distribution_valueByMax,
  distribution_valueByMid,
  distribution_valueByMin,
  distribution_valueByMinMaxCycle,
  distribution_valueBySplitMax,
  distribution_valueBySplitMin,
} from '../../../src/distribution/value';
import {
  config_create,
  config_addVarRange,
  config_addVarDomain,
} from '../../../src/config';
import {
  space_createRoot,
  space_getDomainArr,
  space_initFromConfig,
} from '../../../src/space';
import FDO from '../../../src/fdo';

describe('fdo/distribution/value.spec', () => {

  test('should exist', () => {
    expect(typeof distribute_getNextDomainForVar).toBe('function'); // TODO: test this function properly
  });

  test('should throw for unknown name', () => {
    let config = config_create();
    let space = space_createRoot();
    expect(_ => { _distribute_getNextDomainForVar('error', space, config) }).toThrowError('unknown next var func');
  });

  describe('distribution_valueByThrow', () => {

    test('should throw', () => {
      let config = config_create();
      let space = space_createRoot();
      expect(_ => { _distribute_getNextDomainForVar('throw', space, config) }).toThrowError('Throwing an error because val-strat requests it');
    });
  });

  describe('distribution naive', () => {

    test('should work', () => {
      let config = config_create();
      config_addVarRange(config, 'A', 0, 10);
      let space = space_createRoot();
      space_initFromConfig(space, config);
      let A = config.allVarNames.indexOf('A');

      let dom = _distribute_getNextDomainForVar('naive', space, config, A, FIRST_CHOICE);

      fixt_domainEql(dom, fixt_dom_nums(0));
    });
  });

  describe('distribution_valueByMin', () => {

    test('should exist', () => {
      expect(typeof distribution_valueByMin).toBe('function');
    });

    describe('with array', () => {

      test('should pick lo for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, FIRST_CHOICE), fixt_dom_solved(101));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      test('should pick domain^lo for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMin(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueByMin(space, A, SECOND_CHOICE), fixt_dom_solved(102));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      test('should return NO_CHOICE for THIRD_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMin(space, A, FIRST_CHOICE);
        distribution_valueByMin(space, A, SECOND_CHOICE);

        expect(distribution_valueByMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 111], [113, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMin(space, A, FIRST_CHOICE), fixt_dom_solved(110));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 111], [113, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMin(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMin(space, A, SECOND_CHOICE), fixt_dom_ranges([111, 111], [113, 120]));
        }
      );

      test('should reject a "solved" var', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 110);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        // note: only rejects with ASSERTs
      });

      test('should reject a "rejected" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

        // note: only rejects with ASSERTs
      });
    });

    describe('with numbers', () => {

      test('should pick lo for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, FIRST_CHOICE), fixt_dom_nums(1));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
      });

      test('should pick hi for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMin(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueByMin(space, A, SECOND_CHOICE), fixt_dom_solved(2));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
      });

      test('should return NO_CHOICE for THIRD_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMin(space, A, FIRST_CHOICE);
        distribution_valueByMin(space, A, SECOND_CHOICE);

        expect(distribution_valueByMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(10, 11, 13, 14, 15));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMin(space, A, FIRST_CHOICE), fixt_dom_nums(10));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(10, 11, 13, 14, 15));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMin(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMin(space, A, SECOND_CHOICE), fixt_dom_nums(11, 13, 14, 15));
        }
      );

      test('should reject a "solved" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(10));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        // note: only rejects with ASSERTs
      });

      test('should reject a "rejected" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

        // note: only rejects with ASSERTs
      });
    });

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_CHOICE);
      });

      test('should improve test coverage by enabling logging', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMin(space, A, FIRST_CHOICE);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });

  describe('distribution_valueByList', () => {

    function testThis(choice, inDomain, list, outDomain) {
      let desc = 'choice: ' + choice + ', input: ' + domain__debug(inDomain) + ', list: [' + list + '], output: ' + domain__debug(outDomain);
      test(desc, () => {
        let solver = new FDO();
        solver.decl('A', inDomain, {
          valtype: 'list',
          list: list,
        });
        solver._prepare.call(solver, {});

        let space = solver.state.space;
        let config = solver.config;

        expect(space._class).toBe('$space');
        expect(config._class).toBe('$config');
        let A = config.allVarNames.indexOf('A');

        if (choice !== FIRST_CHOICE) {
          let r = distribution_valueByList(space, config, A, FIRST_CHOICE);
          expect(r).not.toEqual(NO_CHOICE);

          if (choice !== SECOND_CHOICE) {
            let s = distribution_valueByList(space, config, A, SECOND_CHOICE);
            expect(s).not.toEqual(NO_CHOICE);
          }
        }

        let domain = distribution_valueByList(space, config, A, choice);

        fixt_domainEql(domain, outDomain);
      });
    }

    testThis(FIRST_CHOICE, fixt_arrdom_range(0, 500), [5, 10, 6], fixt_dom_solved(5));
    testThis(FIRST_CHOICE, fixt_arrdom_range(10, 500), [5, 10, 6], fixt_dom_solved(10));
    testThis(FIRST_CHOICE, fixt_arrdom_range(10, 500), [5, 4, 6, 2], fixt_dom_solved(10));
    testThis(SECOND_CHOICE, fixt_arrdom_range(0, 500), [5, 10, 6], [0, 4, 6, 500]);
    testThis(SECOND_CHOICE, fixt_arrdom_range(10, 500), [5, 11, 6], [10, 10, 12, 500]);
    testThis(SECOND_CHOICE, fixt_arrdom_range(10, 500), [5, 4, 6, 2], [11, 500]);

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_CHOICE);
      });

      test('should improve test coverage by enabling logging', () => {
        let solver = new FDO();
        solver.decl('A', undefined, {
          valtype: 'list',
          list: [5, 10, 6],
        });
        solver._prepare.call(solver, {});

        let space = solver.state.space;
        let config = solver.config;
        let varIndex = 0;
        let choiceIndex = FIRST_CHOICE;

        expect(space._class).toBe('$space');
        expect(config._class).toBe('$config');

        distribution_valueByList(space, config, varIndex, choiceIndex);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });

  describe('distribution_valueByMarkov', () => {

    test('should return NO_CHOICE if it receives no values', () => {
      let solver = new FDO();
      solver.decl('A', undefined, {
        valtype: 'markov',
        matrix: [{
          vector: [],
        }],
        legend: [],
      });
      solver._prepare.call(solver, {});

      let space = solver.state.space;
      let config = solver.config;
      let varIndex = 0;
      let choiceIndex = FIRST_CHOICE;

      expect(space._class).toBe('$space');
      expect(config._class).toBe('$config');

      let value = distribution_valueByMarkov(space, config, varIndex, choiceIndex);

      expect(value).toEqual(NO_CHOICE);
    });

    test('should throw if given domain is solved', () => {
      let solver = new FDO();
      solver.decl('A', 100, {
        valtype: 'markov',
        matrix: [{
          vector: [100],
        }],
        legend: [1],
      });
      solver._prepare.call(solver, {});

      let space = solver.state.space;
      let config = solver.config;
      let varIndex = 0;
      let choiceIndex = SECOND_CHOICE; // !

      expect(space._class).toBe('$space');
      expect(config._class).toBe('$config');
      fixt_domainEql(space.vardoms[varIndex], fixt_dom_nums(100));

      space._lastChosenValue = 100;
    });

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_CHOICE);
      });

      test('should improve test coverage by enabling logging', () => {
        let solver = new FDO();
        solver.decl('A', undefined, {
          valtype: 'markov',
          matrix: [{
            vector: [],
          }],
          legend: [],
        });
        solver._prepare.call(solver, {});

        let space = solver.state.space;
        let config = solver.config;
        let varIndex = 0;
        let choiceIndex = FIRST_CHOICE;

        expect(space._class).toBe('$space');
        expect(config._class).toBe('$config');

        distribution_valueByMarkov(space, config, varIndex, choiceIndex);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });

  describe('distribution_valueByMax', () => {

    test('should exist', () => {
      expect(typeof distribution_valueByMax).toBe('function');
    });

    describe('with array', () => {

      test('should pick lo for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, FIRST_CHOICE), fixt_dom_range(102, 102));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      test('should pick hi for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMax(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueByMax(space, A, SECOND_CHOICE), fixt_dom_solved(101));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      test('should return NO_CHOICE for THIRD_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMax(space, A, FIRST_CHOICE);
        distribution_valueByMax(space, A, SECOND_CHOICE);

        expect(distribution_valueByMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 117], [119, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMax(space, A, FIRST_CHOICE), fixt_dom_solved(120));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 117], [119, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMax(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMax(space, A, SECOND_CHOICE), fixt_dom_ranges([110, 117], [119, 119]));
        }
      );

      test('should reject a "solved" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_solved(120));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        // note: only rejects with ASSERTs
      });

      test('should reject a "rejected" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

        // note: only rejects with ASSERTs
      });
    });

    describe('with numbers', () => {

      test('should pick lo for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, FIRST_CHOICE), fixt_dom_nums(10));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test('should pick hi for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMax(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueByMax(space, A, SECOND_CHOICE), fixt_dom_range(6, 9));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test('should return NO_CHOICE for third choice', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMax(space, A, FIRST_CHOICE);
        distribution_valueByMax(space, A, SECOND_CHOICE);

        expect(distribution_valueByMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(2, 3, 4, 6, 7, 8, 10, 11));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMax(space, A, FIRST_CHOICE), fixt_dom_nums(11));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(2, 3, 4, 6, 7, 8, 10, 11));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMax(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMax(space, A, SECOND_CHOICE), fixt_dom_nums(2, 3, 4, 6, 7, 8, 10));
        }
      );

      test('should reject a "solved" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        // note: only rejects with ASSERTs
      });

      test('should reject a "rejected" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

        // note: only rejects with ASSERTs
      });
    });

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_CHOICE);
      });

      test('should improve test coverage by enabling logging', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMax(space, A, FIRST_CHOICE);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });

  describe('distribution_valueByMid', () => {
    // note: counts elements in domain and takes the middle one, not by value
    // note: for uneven elements in a domains it takes the first value above middle

    test('should exist', () => {
      expect(typeof distribution_valueByMid).toBe('function');
    });

    describe('with array', () => {

      describe('binary', () => {

        test('should pick hi for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_range(102, 102));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
        });

        test('should pick hi for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_solved(101));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
        });
      });

      describe('ternary', () => {

        test('should pick mid for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_range(102, 102));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 103));
        });

        test('should remove mid for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_ranges([101, 101], [103, 103]));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 103));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);
          distribution_valueByMid(space, A, SECOND_CHOICE);

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 103));
        });
      });

      describe('quad', () => {

        test('should pick low-mid for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_range(103, 103));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 104));
        });

        test('should remove mid for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_ranges([101, 102], [104, 104]));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 104));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);
          distribution_valueByMid(space, A, SECOND_CHOICE);

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 104));
        });
      });

      describe('100-120', () => {

        test('should pick mid for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 120);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_range(110, 110));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 120));
        });

        test('should remove mid for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 120);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_ranges([100, 109], [111, 120]));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 120));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 120);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);
          distribution_valueByMid(space, A, SECOND_CHOICE);

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 120));
        });
      });

      describe('100-121', () => {

        test('should pick hi-mid for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 121);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_range(111, 111));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 121));
        });

        test('should remove mid for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 121);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_ranges([100, 110], [112, 121]));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 121));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 121);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);
          distribution_valueByMid(space, A, SECOND_CHOICE);

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 121));
        });
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 112], [118, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_solved(118));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 112], [118, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_ranges([110, 112], [119, 120]));
        }
      );

      test('should reject a "solved" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_solved(120));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        // note: only rejects with ASSERTs
      });

      test('should reject a "rejected" var', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

        // note: only rejects with ASSERTs
      });
    });

    describe('with numbers', () => {

      describe('binary', () => {

        test('should pick hi for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_nums(2));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
        });

        test('should pick hi for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_solved(1));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
        });
      });

      describe('ternary', () => {

        test('should pick mid for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_nums(2));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3));
        });

        test('should remove mid for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_nums(1, 3));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);
          distribution_valueByMid(space, A, SECOND_CHOICE);

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3));
        });
      });

      describe('quad', () => {

        test('should pick low-mid for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_nums(3));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3, 4));
        });

        test('should remove mid for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_nums(1, 2, 4));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3, 4));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);
          distribution_valueByMid(space, A, SECOND_CHOICE);

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3, 4));
        });
      });

      describe('0-10', () => {

        test('should pick mid for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_nums(5));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 10));
        });

        test('should remove mid for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_nums(0, 1, 2, 3, 4, 6, 7, 8, 9, 10));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 10));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);
          distribution_valueByMid(space, A, SECOND_CHOICE);

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 10));
        });
      });

      describe('100-121', () => {

        test('should pick hi-mid for FIRST_CHOICE ', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_nums(6));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 11));
        });

        test('should remove mid for SECOND_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_nums(0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 11));
        });

        test('should return NO_CHOICE for THIRD_CHOICE', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);
          distribution_valueByMid(space, A, SECOND_CHOICE);

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 11));
        });
      });

      test('should pick lo for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_nums(1));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 1));
      });

      test('should pick hi for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMid(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_solved(0));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 1));
      });

      test('should return NO_CHOICE for THIRD_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMid(space, A, FIRST_CHOICE);
        distribution_valueByMid(space, A, SECOND_CHOICE);

        expect(distribution_valueByMid(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 1));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 2, 8, 9, 10));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_dom_nums(8));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 2, 8, 9, 10));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueByMid(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_dom_nums(0, 1, 2, 9, 10));
        }
      );

      test('should reject a "solved" var', () => {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(5));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

      });

      test('should reject a "rejected" var', () => {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

      });
    });

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_CHOICE);
      });

      test('should improve test coverage by enabling logging', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMid(space, A, FIRST_CHOICE);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });

  describe('distribution_valueBySplitMin', () => {

    test('should exist', () => {
      expect(typeof distribution_valueBySplitMin).toBe('function');
    });

    test('should throw if choice is not a number', () => {
      let config = config_create();
      config_addVarRange(config, 'A', 110, 120);
      let space = space_createRoot();
      space_initFromConfig(space, config);
      let A = config.allVarNames.indexOf('A');

      expect(_ => { distribution_valueBySplitMin(space, A, undefined) }).toThrowError('CHOICE_SHOULD_BE_NUMBER');
    });

    describe('with array', () => {

      test('should pick lower half for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_range(110, 115));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      test('should pick upper half for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMin(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_range(116, 120));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      test('should return NO_CHOICE for THIRD_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMin(space, A, FIRST_CHOICE);

        expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([100, 101], [108, 112], [118, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueBySplitMin(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_ranges([100, 101], [108, 110]));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([100, 101], [108, 112], [118, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueBySplitMin(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_ranges([111, 112], [118, 120]));
        }
      );

      describe('range splitting unit tests', () => {

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_solved(101));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_solved(102));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_range(101, 102));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_solved(103));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_range(101, 102));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_range(103, 104));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });
      });

      test('should reject a "solved" var', () => {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarRange(config, 'A', 120, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

      });

      test('should reject a "rejected" var', () => {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

      });
    });

    describe('with numbers', () => {

      test('should pick lower half for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_nums(6, 7, 8));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test('should pick upper half for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMin(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_nums(9, 10));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test('should return NO_CHOICE for THIRD_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMin(space, A, FIRST_CHOICE);
        distribution_valueBySplitMin(space, A, SECOND_CHOICE);

        expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 5, 6, 7, 8, 11, 12, 14));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_nums(0, 1, 5, 6, 7));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 5, 6, 7, 8, 11, 12, 14));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueBySplitMin(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_nums(8, 11, 12, 14));
        }
      );

      describe('range splitting unit tests', () => {

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_solved(1));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_solved(2));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_nums(1, 2));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_solved(3));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_dom_nums(1, 2));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_dom_nums(3, 4));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });
      });

      test('should reject a "solved" var', () => {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(5, 5));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

      });

      test('should reject a "rejected" var', () => {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

      });
    });

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_CHOICE);
      });

      test('should improve test coverage by enabling logging', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMin(space, A, FIRST_CHOICE);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });

  describe('distribution_valueBySplitMax', () => {

    test('should exist', () => {
      expect(typeof distribution_valueBySplitMax).toBe('function');
    });

    test('should throw if choice is not a number', () => {
      let config = config_create();
      config_addVarRange(config, 'A', 110, 120);
      let space = space_createRoot();
      space_initFromConfig(space, config);
      let A = config.allVarNames.indexOf('A');

      expect(_ => { distribution_valueBySplitMax(space, A, undefined) }).toThrowError('CHOICE_SHOULD_BE_NUMBER');
    });

    describe('with array', () => {

      test('should pick lower half for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_range(116, 120));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      test('should pick upper half for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMax(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_range(110, 115));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      test('should return NO_CHOICE for THIRD_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMax(space, A, FIRST_CHOICE);
        distribution_valueBySplitMax(space, A, SECOND_CHOICE);

        expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([100, 101], [108, 112], [118, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_ranges([111, 112], [118, 120]));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_ranges([100, 101], [108, 112], [118, 120]));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueBySplitMax(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_ranges([100, 101], [108, 110]));
        }
      );

      describe('range splitting unit tests', () => {

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_solved(102));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_solved(101));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_solved(103));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_range(101, 102));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_range(103, 104));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_range(101, 102));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });
      });

      test('should reject a "solved" var', () => {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarRange(config, 'A', 120, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

      });

      test('should reject a "rejected" var', () => {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

      });
    });

    describe('with numbers', () => {

      test('should pick lower half for FIRST_CHOICE ', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_nums(9, 10));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test('should pick upper half for SECOND_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMax(space, A, FIRST_CHOICE);

        fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_nums(6, 7, 8));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test('should return NO_CHOICE for THIRD_CHOICE', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMax(space, A, FIRST_CHOICE);
        distribution_valueBySplitMax(space, A, SECOND_CHOICE);

        expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10));
      });

      test(
        'should intersect and not use lower range blindly for FIRST_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 5, 6, 7, 8, 11, 12, 14));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_nums(8, 11, 12, 14));
        }
      );

      test(
        'should intersect and not use lower range blindly for SECOND_CHOICE',
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 5, 6, 7, 8, 11, 12, 14));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          distribution_valueBySplitMax(space, A, FIRST_CHOICE);

          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_nums(0, 1, 5, 6, 7));
        }
      );

      describe('range splitting unit tests', () => {

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_solved(2));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_solved(1));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_solved(3));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_nums(1, 2));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });

        test('should work with two values in one range', () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.allVarNames.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_dom_nums(3, 4));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_dom_nums(1, 2));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).toEqual(NO_CHOICE);
        });
      });

      test('should reject a "solved" var', () => {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(5, 5));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

      });

      test('should reject a "rejected" var', () => {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        space.vardoms[A] = fixt_dom_empty();

      });
    });

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_CHOICE);
      });

      test('should improve test coverage by enabling logging', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueBySplitMax(space, A, FIRST_CHOICE);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });

  describe('distribution_valueByMinMaxCycle', () => {

    test('should exist', () => {
      expect(typeof distribution_valueByMinMaxCycle).toBe('function');
    });

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_CHOICE);
      });

      test('should improve test coverage by enabling logging', () => {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');

        distribution_valueByMinMaxCycle(space, A, FIRST_CHOICE);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });
});
