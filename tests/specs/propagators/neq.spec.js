import {
  fixt_arrdom_nums,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
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
  domain__debug,
  domain_toArr,
} from 'fdlib/src/domain';

import {
  config_addVarDomain,
  config_create,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';
import {
  propagator_neqStepBare,
} from '../../../src/propagators/neq';

describe('fdo/propagators/neq.spec', () => {

  test('should exist', () => {
    expect(typeof propagator_neqStepBare).toBe('function');
  });

  test('should expect args', () => {
    let config = config_create();
    config_addVarDomain(config, 'A', fixt_arrdom_nums(11, 15));
    config_addVarDomain(config, 'B', fixt_arrdom_nums(5, 8));
    let space = space_createRoot();
    space_initFromConfig(space, config);

    let A = config.allVarNames.indexOf('A');
    let B = config.allVarNames.indexOf('B');

    expect(_ => { propagator_neqStepBare(space, config, A, B) }).not.toThrowError();
    expect(_ => { propagator_neqStepBare() }).toThrowError('SHOULD_GET_SPACE');
    expect(_ => { propagator_neqStepBare(space) }).toThrowError('VAR_INDEX_SHOULD_BE_NUMBER');
    expect(_ => { propagator_neqStepBare(space, config, A) }).toThrowError('VAR_INDEX_SHOULD_BE_NUMBER');
    expect(_ => { propagator_neqStepBare(space, undefined, B) }).toThrowError('VAR_INDEX_SHOULD_BE_NUMBER');
    expect(_ => { propagator_neqStepBare(undefined, A, B) }).toThrowError('SHOULD_GET_SPACE');
  });

  test('should throw for empty domains', () => {
    let config = config_create();
    config_addVarDomain(config, 'A', fixt_arrdom_nums(9, 10));
    config_addVarDomain(config, 'B', fixt_arrdom_nums(11, 15));
    config_addVarDomain(config, 'C', fixt_arrdom_nums(100));
    config_addVarDomain(config, 'D', fixt_arrdom_nums(100));
    let space = space_createRoot();
    space_initFromConfig(space, config);
    space.vardoms[config.allVarNames.indexOf('C')] = fixt_dom_empty();
    space.vardoms[config.allVarNames.indexOf('D')] = fixt_dom_empty();

    let A = config.allVarNames.indexOf('A');
    let B = config.allVarNames.indexOf('B');
    let C = config.allVarNames.indexOf('C');
    let D = config.allVarNames.indexOf('D');

    expect(_ => { propagator_neqStepBare(space, config, A, B) }).not.toThrowError();
    expect(_ => { propagator_neqStepBare(space, config, A, D) }).toThrowError('SHOULD_NOT_BE_REJECTED');
    expect(_ => { propagator_neqStepBare(space, config, C, B) }).toThrowError('SHOULD_NOT_BE_REJECTED');
    expect(_ => { propagator_neqStepBare(space, config, C, D) }).toThrowError('SHOULD_NOT_BE_REJECTED');
  });

  describe('should not change anything as long as both domains are unsolved', () => {

    function testThis(domain1, domain2) {
      test(
        `should not change anything (left-right): ${[domain1, domain2].join('|')}`,
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', domain_toArr(domain1));
          config_addVarDomain(config, 'B', domain_toArr(domain2));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_neqStepBare(space, config, A, B);

          fixt_domainEql(space.vardoms[A], domain1);
          fixt_domainEql(space.vardoms[B], domain2);
        }
      );

      test(
        `should not change anything (right-left): ${[domain2, domain1].join('|')}`,
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', domain_toArr(domain2));
          config_addVarDomain(config, 'B', domain_toArr(domain1));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_neqStepBare(space, config, A, B);

          fixt_domainEql(space.vardoms[A], domain2);
          fixt_domainEql(space.vardoms[B], domain1);
        }
      );
    }

    describe('with array', () => {
      // these are the (non-solved) cases plucked from eq tests
      testThis(fixt_dom_range(SUB, SUP), fixt_dom_ranges([0, 10], [20, 140]));
      testThis(fixt_dom_range(SUP - 1, SUP), fixt_dom_range(SUP - 1, SUP));
      testThis(fixt_dom_range(20, 50), fixt_dom_range(20, 50));
      testThis(fixt_dom_ranges([0, 10], [20, 30], [40, 50]), fixt_dom_ranges([0, 10], [20, 30], [40, 50]));
      testThis(fixt_dom_ranges([0, 10], [25, 25], [40, 50]), fixt_dom_ranges([0, 10], [25, 25], [40, 50]));
      testThis(fixt_dom_range(SUP - 2, SUP), fixt_dom_range(SUP - 2, SUP));
      testThis(fixt_dom_ranges([0, 10], [20, 30], [40, 50]), fixt_dom_ranges([5, 15], [25, 35]));
      testThis(fixt_dom_ranges([0, 10], [20, 30], [40, 50]), fixt_dom_ranges([SUB, SUP]));
      testThis(fixt_dom_range(SUP - 2, SUP), fixt_dom_range(SUP - 3, SUP - 1));
      testThis(fixt_dom_range(SUP - 2, SUP), fixt_dom_range(SUP - 4, SUP - 1));
    });

    describe('with numbers', () => {
      testThis(fixt_dom_range(0, 1), fixt_dom_range(0, 1));
      testThis(fixt_dom_range(2, 5), fixt_dom_range(2, 5));
      testThis(fixt_dom_range(0, 1), fixt_dom_range(0, 2));
      testThis(fixt_dom_range(0, 2), fixt_dom_range(0, 3));
      testThis(fixt_dom_range(0, 2), fixt_dom_range(0, 4));
    });
  });

  describe('with one solved domain', () => {

    function testThis(solvedDomain, unsolvedDomainBefore, unsolvedDomainAfter) {
      test(
        `should not change anything (right-left): [${[domain_toArr(solvedDomain), domain_toArr(unsolvedDomainBefore)].join(']|[')}]`,
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', domain_toArr(solvedDomain));
          config_addVarDomain(config, 'B', domain_toArr(unsolvedDomainBefore));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_neqStepBare(space, config, A, B);

          fixt_domainEql(space.vardoms[A], solvedDomain);
          fixt_domainEql(space.vardoms[B], unsolvedDomainAfter);
        }
      );

      test(
        `should remove solved domain from unsolve domain (left-right): [${[unsolvedDomainBefore, solvedDomain].join(']|[')}]`,
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', domain_toArr(unsolvedDomainBefore));
          config_addVarDomain(config, 'B', domain_toArr(solvedDomain));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let B = config.allVarNames.indexOf('B');
          let A = config.allVarNames.indexOf('A');

          propagator_neqStepBare(space, config, A, B);

          fixt_domainEql(space.vardoms[A], unsolvedDomainAfter);
          fixt_domainEql(space.vardoms[B], solvedDomain);
        }
      );
    }

    describe('with array', () => {
      testThis(fixt_dom_range(SUP, SUP), fixt_dom_range(SUP - 1, SUP), fixt_dom_solved(SUP - 1));
      testThis(fixt_dom_range(SUP - 1, SUP - 1), fixt_dom_range(SUP - 1, SUP), fixt_dom_solved(SUP));
      testThis(fixt_dom_range(SUP, SUP), fixt_dom_range(SUP - 50, SUP), fixt_dom_range(SUP - 50, SUP - 1));
      testThis(fixt_dom_range(120, 120), fixt_dom_ranges([120, SUP - 1]), fixt_dom_range(121, SUP - 1));
      testThis(fixt_dom_range(910, 910), fixt_dom_ranges([910, 910], [912, 950]), fixt_dom_ranges([912, 950]));
      testThis(fixt_dom_range(910, 910), fixt_dom_ranges([90, 98], [910, 910], [912, 920]), fixt_dom_ranges([90, 98], [912, 920]));
      testThis(fixt_dom_range(910, 910), fixt_dom_ranges([90, 910], [912, 950]), fixt_dom_ranges([90, 909], [912, 950]));
      testThis(fixt_dom_range(91, 91), fixt_dom_range(90, 93), fixt_dom_ranges([90, 90], [92, 93]));
    });

    describe('with numbers', () => {
      testThis(fixt_dom_nums(0), fixt_dom_range(0, 1), fixt_dom_solved(1));
      testThis(fixt_dom_nums(1), fixt_dom_range(0, 1), fixt_dom_solved(0));
      testThis(fixt_dom_nums(0), fixt_dom_range(0, 15), fixt_dom_range(1, 15));
      testThis(fixt_dom_nums(2), fixt_dom_range(2, 5), fixt_dom_range(3, 5));
      testThis(fixt_dom_nums(10), fixt_dom_nums(10, 13, 14, 15), fixt_dom_range(13, 15));
      testThis(fixt_dom_nums(10), fixt_dom_nums(0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15), fixt_dom_nums(0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15));
      testThis(fixt_dom_nums(4), fixt_dom_nums(0, 1, 2, 3, 4, 10, 12, 13, 14, 15), fixt_dom_nums(0, 1, 2, 3, 10, 12, 13, 14, 15));
      testThis(fixt_dom_nums(1), fixt_dom_range(0, 3), fixt_dom_nums(0, 2, 3));
    });
  });

  describe('two neq solved domains', () => {

    function testThis(domain1, domain2) {
      test(
        `should be "solved" (left-right): ${[domain__debug(domain1), domain__debug(domain2)].join('|')}`,
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', domain_toArr(domain1));
          config_addVarDomain(config, 'B', domain_toArr(domain2));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_neqStepBare(space, config, A, B);

          fixt_domainEql(space.vardoms[A], domain1);
          fixt_domainEql(space.vardoms[B], domain2);
        }
      );

      test(
        `should be "solved" (right-left): ${[domain__debug(domain1), domain__debug(domain2)].join('|')}`,
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', domain_toArr(domain2));
          config_addVarDomain(config, 'B', domain_toArr(domain1));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_neqStepBare(space, config, A, B);

          fixt_domainEql(space.vardoms[A], domain2);
          fixt_domainEql(space.vardoms[B], domain1);
        }
      );

      test(
        `should reject if same (left-left): ${[domain__debug(domain1), domain__debug(domain2)].join('|')}`,
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', domain_toArr(domain1));
          config_addVarDomain(config, 'B', domain_toArr(domain1));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_neqStepBare(space, config, A, B);

          fixt_domainEql(space.vardoms[A], fixt_dom_empty());
          fixt_domainEql(space.vardoms[B], fixt_dom_empty());
        }
      );

      test(
        `should reject if same (right-right): ${[domain__debug(domain1), domain__debug(domain2)].join('|')}`,
        () => {
          let config = config_create();
          config_addVarDomain(config, 'A', domain_toArr(domain2));
          config_addVarDomain(config, 'B', domain_toArr(domain2));
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_neqStepBare(space, config, A, B);

          fixt_domainEql(space.vardoms[A], fixt_dom_empty());
          fixt_domainEql(space.vardoms[B], fixt_dom_empty());
        }
      );
    }

    describe('with array', () => {
      testThis(fixt_dom_solved(SUP), fixt_dom_solved(SUP - 1));
      testThis(fixt_dom_solved(SUP - 1), fixt_dom_solved(SUP - 2));
      testThis(fixt_dom_solved(SUP - 1), fixt_dom_solved(SUP - 20));
      testThis(fixt_dom_solved(SUP), fixt_dom_solved(500));
      testThis(fixt_dom_solved(800), fixt_dom_solved(801));
    });

    describe('with numbers', () => {
      testThis(fixt_dom_nums(0), fixt_dom_nums(1));
      testThis(fixt_dom_nums(1), fixt_dom_nums(2));
      testThis(fixt_dom_nums(1), fixt_dom_nums(15));
      testThis(fixt_dom_nums(0), fixt_dom_nums(5));
      testThis(fixt_dom_nums(8), fixt_dom_nums(1));
    });

    describe('with solved numbers', () => {
      testThis(fixt_dom_solved(0), fixt_dom_solved(1));
      testThis(fixt_dom_solved(1), fixt_dom_solved(2));
      testThis(fixt_dom_solved(1), fixt_dom_solved(15));
      testThis(fixt_dom_solved(0), fixt_dom_solved(5));
      testThis(fixt_dom_solved(8), fixt_dom_solved(1));
    });
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

      propagator_neqStepBare(space, config, A, B);

      expect(true).toBe(true);
    });

    afterAll(function() {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});

// TOFIX: migrate and dedupe these tests:
//  describe('fdvar_forceNeqInline', function() {
//    // these tests are pretty much tbd
//
//    it('should exist', function() {
//      expect(fdvar_forceNeqInline).to.be.a('function');
//    });
//
//    describe('with array', function() {
//
//      it('should return NO_CHANGES if neither domain is solved', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//        let B = fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50])));
//      });
//
//      it('should return SOME_CHANGES if left domain is solved', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([20, 20]));
//        let B = fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(SOME_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([20, 20])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([15, 19], [21, 35], [40, 50])));
//      });
//
//      it('should return SOME_CHANGES if right domain is solved', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([15, 35], [40, 50]));
//        let B = fdvar_create('B', specDomainCreateRanges([20, 20]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(SOME_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([15, 19], [21, 35], [40, 50])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([20, 20])));
//      });
//
//      it('should return NO_CHANGES if domains are equal but not solved (small)', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([SUP - 1, SUP]));
//        let B = fdvar_create('B', specDomainCreateRanges([SUP - 1, SUP]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([SUP - 1, SUP])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([SUP - 1, SUP])));
//      });
//
//      it('should return NO_CHANGES if domains are equal but not solved (large)', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//        let B = fdvar_create('B', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([10, 20], [30, 40], [50, 60])));
//      });
//
//      // TOFIX: this exposes a serious problem with assumptions on solved vars
//      it('should return REJECTED if domains resolved to same value', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([SUP, SUP]));
//        let B = fdvar_create('B', specDomainCreateRanges([SUP, SUP]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(REJECTED);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([SUP, SUP])));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallEmpty()));
//      });
//
//      it('should return NO_CHANGES both domains solve to different value', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([30, 30]));
//        let B = fdvar_create('B', specDomainCreateRanges([40, 40]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([30, 30])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([40, 40])));
//      });
//    });
//
//    describe('with numbers', function() {
//
//      it('should return SOME_CHANGES if right side was solved and the left wasnt', function() {
//        let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let B = fdvar_create('B', specDomainSmallNums(2));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(SOME_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(1, 3, 6, 7, 8)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(2)));
//      });
//
//      it('should return SOME_CHANGES if left side was solved and the right had it', function() {
//        let A = fdvar_create('A', specDomainSmallNums(2));
//        let B = fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(SOME_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(2)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(1, 3, 6, 7, 8)));
//      });
//
//      it('should return NO_CHANGES if right side was solved and the left already did not have it', function() {
//        let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let B = fdvar_create('B', specDomainSmallNums(4));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(4)));
//      });
//
//      it('should return NO_CHANGES if left side was solved and the right already did not have it', function() {
//        let A = fdvar_create('A', specDomainSmallNums(4));
//        let B = fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(4)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8)));
//      });
//
//      it('should return NO_CHANGES if neither domain is solved', function() {
//        let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let B = fdvar_create('B', specDomainSmallNums(2, 3, 4, 5, 6, 7));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(2, 3, 4, 5, 6, 7)));
//      });
//
//      it('should return NO_CHANGES if both domains are solved to different value', function() {
//        let A = fdvar_create('A', specDomainSmallNums(0));
//        let B = fdvar_create('B', specDomainSmallNums(1));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(0)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(1)));
//      });
//    });
//
//    describe('with array and numbers', function() {
//
//      it('should work with an array and a number', function() {
//        let A = fdvar_create('A', specDomainCreateRange(10, 100));
//        let B = fdvar_create('B', specDomainSmallRange(5, 15));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRange(10, 100)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallRange(5, 15)));
//      });
//
//      it('should work with a numbert and an array', function() {
//        let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 10, 11, 13));
//        let B = fdvar_create('B', specDomainCreateRange(8, 100));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(1, 2, 3, 10, 11, 13)));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRange(8, 100)));
//      });
//    });
//  });

