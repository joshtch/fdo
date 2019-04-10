import {
  fixt_arrdom_nums,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_dom_clone,
  fixt_dom_empty,
  fixt_dom_nums,
  fixt_dom_range,
  fixt_dom_ranges,
  fixt_dom_solved,
  fixt_domainEql,
} from 'fdlib/tests/lib/domain.fixt';

import {
  SUB,
  SUP,
} from 'fdlib/src/constants';
import {
  ASSERT_SET_LOG,
  LOG_FLAG_PROPSTEPS,
  LOG_FLAG_NONE,
} from 'fdlib/src/assert';

import {
  config_addVarDomain,
  config_addVarRange,
  config_create,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';
import {
  propagator_eqStepBare,
  propagator_eqStepWouldReject,
} from '../../../src/propagators/eq';

describe('fdo/propagators/eq.spec', () => {

  describe('propagator_eqStepBare', () => {
    // in general after call v1 and v2 should be equal

    test('should exist', () => {
      expect(typeof propagator_eqStepBare).toBe('function');
    });

    test('should expect args', () => {
      let config = config_create();
      config_addVarRange(config, 'A', 11, 15);
      config_addVarRange(config, 'B', 5, 8);
      let space = space_createRoot();
      space_initFromConfig(space, config);

      expect(_ => { propagator_eqStepBare(space, config, config.allVarNames.indexOf('A'), config.allVarNames.indexOf('B')) }).not.toThrowError();
      expect(_ => { propagator_eqStepBare(space, config) }).toThrowError('VAR_INDEX_SHOULD_BE_NUMBER');
      expect(_ => { propagator_eqStepBare(space, config, config.allVarNames.indexOf('A')) }).toThrowError('VAR_INDEX_SHOULD_BE_NUMBER');
      expect(_ => { propagator_eqStepBare(space, config, undefined, config.allVarNames.indexOf('B')) }).toThrowError('VAR_INDEX_SHOULD_BE_NUMBER');
    });

    test('should throw for empty domains', () => {
      let config = config_create();
      config_addVarRange(config, 'A', 9, 10);
      config_addVarRange(config, 'B', 11, 15);
      config_addVarDomain(config, 'C', fixt_arrdom_nums(100));
      config_addVarDomain(config, 'D', fixt_arrdom_nums(100));
      let space = space_createRoot();
      space_initFromConfig(space, config);
      space.vardoms[config.allVarNames.indexOf('C')] = fixt_dom_empty();
      space.vardoms[config.allVarNames.indexOf('D')] = fixt_dom_empty();

      expect(_ => { propagator_eqStepBare(space, config, config.allVarNames.indexOf('A'), config.allVarNames.indexOf('B')) }).not.toThrowError();
      expect(_ => { propagator_eqStepBare(space, config, config.allVarNames.indexOf('A'), config.allVarNames.indexOf('D')) }).toThrowError('SHOULD_NOT_BE_REJECTED');
      expect(_ => { propagator_eqStepBare(space, config, config.allVarNames.indexOf('C'), config.allVarNames.indexOf('B')) }).toThrowError('SHOULD_NOT_BE_REJECTED');
      expect(_ => { propagator_eqStepBare(space, config, config.allVarNames.indexOf('C'), config.allVarNames.indexOf('D')) }).toThrowError('SHOULD_NOT_BE_REJECTED');
    });

    test(
      'with array should split a domain if it covers multiple ranges of other domain',
      () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_range(SUB, SUP));
        config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 300]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_eqStepBare(space, config, A, B);
        expect(space.vardoms[A]).toEqual(fixt_dom_ranges([0, 10], [20, 300]));
        expect(space.vardoms[B]).toEqual(fixt_dom_ranges([0, 10], [20, 300]));
      }
    );

    test(
      'with number should split a domain if it covers multiple ranges of other domain',
      () => {
        let config = config_create();
        config_addVarRange(config, 'A', SUB, 15);
        config_addVarDomain(config, 'B', fixt_arrdom_nums(0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        let C = fixt_dom_nums(0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15);

        propagator_eqStepBare(space, config, A, B);
        expect(space.vardoms[B]).toEqual(C);
        expect(space.vardoms[A]).toEqual(C);
      }
    );

    describe('when v1 == v2', () => {
      function testThis(domain) {
        test(`should not change anything: ${domain}`, () => {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_dom_clone(domain, 'array'));
          config_addVarDomain(config, 'B', fixt_dom_clone(domain, 'array'));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_eqStepBare(space, config, A, B);
          fixt_domainEql(space.vardoms[A], domain);
          fixt_domainEql(space.vardoms[B], domain);
        });
      }

      describe('with array', () => {
        testThis(fixt_arrdom_range(SUP, SUP));
        testThis(fixt_arrdom_range(20, 50));
        testThis(fixt_arrdom_ranges([0, 10], [20, 30], [40, 50]));
        testThis(fixt_arrdom_ranges([0, 10], [25, 25], [40, 50]));
      });

      describe('with numbers', () => {
        testThis(fixt_dom_nums(SUB, SUB));
        testThis(fixt_dom_nums(0, 0));
        testThis(fixt_dom_nums(1, 1));
        testThis(fixt_dom_nums(0, 1));
        testThis(fixt_dom_nums(0, 2));
        testThis(fixt_dom_nums(0, 2, 3));
      });
    });

    describe('when v1 != v2', () => {

      function testThis(left, right, result) {
        test(
          `should not change anything (left-right): ${[left, right, result].join('|')}`,
          () => {
            let config = config_create();
            config_addVarDomain(config, 'A', fixt_dom_clone(left, 'array'));
            config_addVarDomain(config, 'B', fixt_dom_clone(right, 'array'));
            let space = space_createRoot();
            space_initFromConfig(space, config);
            let A = config.allVarNames.indexOf('A');
            let B = config.allVarNames.indexOf('B');

            propagator_eqStepBare(space, config, A, B);
            expect(space.vardoms[A]).toEqual(result);
            expect(space.vardoms[B]).toEqual(result);
          }
        );

        test(
          `should not change anything (right-left): ${[right, left, result].join('|')}`,
          () => {
            let config = config_create();
            config_addVarDomain(config, 'A', fixt_dom_clone(right, 'array'));
            config_addVarDomain(config, 'B', fixt_dom_clone(left, 'array'));
            let space = space_createRoot();
            space_initFromConfig(space, config);
            let A = config.allVarNames.indexOf('A');
            let B = config.allVarNames.indexOf('B');

            propagator_eqStepBare(space, config, A, B);
            expect(space.vardoms[A]).toEqual(result);
            expect(space.vardoms[B]).toEqual(result);
          }
        );
      }

      testThis(fixt_dom_nums(0, 1), fixt_dom_nums(0, 0), fixt_dom_solved(0));
      testThis(fixt_dom_nums(0, 1), fixt_dom_nums(1, 1), fixt_dom_solved(1));
      testThis(fixt_dom_nums(SUB, 1), fixt_arrdom_range(1, SUP), fixt_dom_solved(1));
      testThis(fixt_arrdom_ranges([0, 10], [20, 30], [40, 50]), fixt_dom_nums(5, 5), fixt_dom_solved(5));
      testThis(fixt_arrdom_ranges([0, 10], [20, 30], [40, 50]), fixt_arrdom_ranges([5, 15], [25, 35]), fixt_dom_nums(5, 6, 7, 8, 9, 10, 25, 26, 27, 28, 29, 30));
      testThis(fixt_arrdom_ranges([0, 10], [20, 30], [40, 50]), fixt_arrdom_ranges([SUB, SUP]), fixt_dom_ranges([0, 10], [20, 30], [40, 50]));
      testThis(fixt_dom_nums(0, 2), fixt_dom_nums(1, 3), fixt_dom_empty());
      testThis(fixt_dom_nums(0, 2), fixt_dom_nums(1, 2, 4), fixt_dom_solved(2));
    });

    describe('with LOG', () => {

      beforeAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_PROPSTEPS);
      });

      test('should improve test coverage by enabling logging', () => {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_range(SUB, SUP));
        config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 300]));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_eqStepBare(space, config, A, B);

        expect(true).toBe(true);
      });

      afterAll(function() {
        ASSERT_SET_LOG(LOG_FLAG_NONE);
      });
    });
  });

  describe('propagator_eqStepWouldReject', () => {

    test('should exist', () => {
      expect(typeof propagator_eqStepWouldReject).toBe('function');
    });

    test('regression', () => {
      expect(propagator_eqStepWouldReject(fixt_dom_range(1, 64), fixt_dom_nums(1))).toBe(false);
      expect(propagator_eqStepWouldReject(fixt_dom_range(1, 64), fixt_dom_solved(1))).toBe(false);
    });
  });
});

// TOFIX: migrate these tests to this file. dedupe them too.
//describe.skip('fdvar_forceEqInline', function() {
//
//  it('should exist', function() {
//    expect(fdvar_forceEqInline).to.be.a('function');
//  });
//
//  describe('with array', function() {
//
//    it('should get start end', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
//      let B = fdvar_create('B', specDomainCreateRanges([20, 30]));
//      let C = specDomainCreateRanges([20, 20], [30, 30]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return SOME_CHANGES if domains are not equal and update them inline', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let B = fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50]));
//      let C = specDomainCreateRanges([15, 20], [30, 35], [40, 40], [50, 50]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return NO_CHANGES if domains are equal', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let B = fdvar_create('B', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let C = specDomainCreateRanges([10, 20], [30, 40], [50, 60]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(NO_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//
//  describe('with numbers', function() {
//
//    it('should return SOME_CHANGES if domains are not equal and update them inline', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let B = fdvar_create('B', specDomainSmallNums(2, 3, 4, 5, 6, 7));
//      let C = specDomainSmallNums(2, 3, 6, 7);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return NO_CHANGES if domains are equal', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let B = fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let C = specDomainSmallNums(1, 2, 3, 6, 7, 8);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(NO_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//
//  describe('with array and numbers', function() {
//
//    it('should work with an array and a number', function() {
//      let A = fdvar_create('A', specDomainCreateRange(10, 100));
//      let B = fdvar_create('B', specDomainSmallRange(5, 15));
//      let C = specDomainSmallRange(10, 15);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should work with a number and an array', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 10, 11, 13));
//      let B = fdvar_create('B', specDomainCreateRange(8, 100));
//      let C = specDomainSmallNums(10, 11, 13);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//});
