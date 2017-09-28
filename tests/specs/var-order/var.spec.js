import expect from '../../../../fdlib/tests/lib/mocha_proxy.fixt';

import distribution_getNextVarIndex, {
  BETTER,
  SAME,
  WORSE,

  distribution_varByMin,
  distribution_varByMax,
  distribution_varByMinSize,
  distribution_varByList,
} from '../../../src/distribution/var';
import FDO from '../../../src/fdo';
import {
  config_addVarRange,
  config_create,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';

describe('fdo/distribution/var.spec', function() {

  describe('distribution_var_by_throw', function() {

    it('should throw', function() {
      expect(_ => distribution_getNextVarIndex({}, {varStratConfig: {type: 'throw'}})).to.throw('Throwing an error because var-strat requests it');
    });

    it('should throw for unknown var strats', function() {
      expect(_ => distribution_getNextVarIndex({}, {varStratConfig: {type: 'unknown'}})).to.throw('unknown next var func');
      expect(_ => distribution_getNextVarIndex({}, {varStratConfig: {type: 'crap'}})).to.throw('unknown next var func');
      expect(_ => distribution_getNextVarIndex({}, {varStratConfig: {type: 'nope'}})).to.throw('unknown next var func');
      expect(_ => distribution_getNextVarIndex({}, {varStratConfig: {type: 'anything'}})).to.throw('unknown next var func');
    });
  });

  function itAvsB(type, range_a, range_b, out, desc) {
    let stack = new Error('from').stack; // mocha wont tell us which line called itAvsB :(
    if (stack && stack.slice) stack = stack.slice(0, stack.indexOf('._compile')) + ' ...'; // dont need the whole thing

    it(`itAvsB: ${desc}; type: ${type}, rangeA: ${range_a}, rangeB: ${range_b}, out: ${out}`, function() {

      let dsl = `
        : A [${range_a}]
        : B [${range_b}]
        @custom var-strat ${type}
        @custom targets (A B)
      `;

      let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving

      let varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

      expect(varIndex, stack).to.equal(fdo.config.allVarNames.indexOf(out));
    });
  }

  describe('by_min', function() {

    describe('unit', function() {

      function ABmin(A, B, out) {
        let dsl = `
          : A ${A}
          : B ${B}
        `;
        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving
        let a = fdo.config.allVarNames.indexOf('A');
        let b = fdo.config.allVarNames.indexOf('B');

        expect(distribution_varByMin(fdo._space, fdo.config, a, b)).to.equal(out);
      }

      it('should return BETTER if lo(v1) < lo(v2)', function() {
        ABmin(10, 11, BETTER);
      });

      it('should return SAME if lo(v1) = lo(v2)', function() {
        ABmin(11, 11, SAME);
      });

      it('should return WORSE if lo(v1) > lo(v2)', function() {
        ABmin(12, 11, WORSE);
      });
    });

    describe('integration', function() {
      itAvsB('min', [0, 1], [10, 11], 'A', 'should decide on lowest vars first A');
      itAvsB('min', [20, 30], [5, 8], 'B', 'should decide on lowest vars first B');
      itAvsB('min', [9, 21], [10, 20], 'A', 'should base decision on lowest lo, not lowest hi');
    });
  });

  describe('by_max', function() {

    describe('unit', function() {

      function ABmax(A, B, out) {
        let dsl = `
          : A ${A}
          : B ${B}
        `;
        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving
        let a = fdo.config.allVarNames.indexOf('A');
        let b = fdo.config.allVarNames.indexOf('B');

        expect(distribution_varByMax(fdo._space, fdo.config, a, b)).to.equal(out);
      }

      it('should return BETTER if hi(v1) > hi(v2)', function() {
        ABmax(12, 11, BETTER);
      });

      it('should return SAME if hi(v1) = hi(v2)', function() {
        ABmax(11, 11, SAME);
      });

      it('should return WORSE if hi(v1) < hi(v2)', function() {
        ABmax(10, 11, WORSE);
      });
    });

    describe('integration', function() {
      itAvsB('max', [0, 1], [10, 11], 'B', 'should decide on highest vars first A');
      itAvsB('max', [20, 30], [5, 8], 'A', 'should decide on highest vars first B');
      itAvsB('max', [9, 21], [10, 20], 'A', 'should base decision on highest hi, not highest lo');
    });
  });

  describe('by_size', function() {

    describe('unit', function() {
      // note: further tests should be unit tests on domain_size instead

      function ABsize(A, B, out) {
        let dsl = `
          : A [${A}]
          : B [${B}]
        `;
        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving
        let a = fdo.config.allVarNames.indexOf('A');
        let b = fdo.config.allVarNames.indexOf('B');

        expect(distribution_varByMinSize(fdo._space, fdo.config, a, b)).to.equal(out);
      }

      it('should return BETTER if size(v1) < size(v2)', function() {
        ABsize([5, 5], [11, 12], BETTER);
      });

      it('should return SAME if size(v1) = size(v2) with single range', function() {
        ABsize([11, 11], [8, 8], SAME);
      });

      it('should return SAME if size(v1) = size(v2) with multiple ranges', function() {
        ABsize([11, 11, 15, 19], [8, 10, 12, 14], SAME);
      });

      it('should return SAME if size(v1) = size(v2) with different range count', function() {
        ABsize([11, 11, 13, 14, 18, 19], [8, 10, 13, 14], SAME);
      });

      it('should return WORSE if size(v1) > size(v2)', function() {
        ABsize([11, 12], [11, 11], WORSE);
      });
    });

    describe('integration', function() {

      itAvsB('size', [0, 1], [10, 12], 'A', 'should decide on largest domain first A');
      itAvsB('size', [20, 30], [50, 55], 'B', 'should decide on largest domain first B');

      it('should count actual elements in the domain A', function() {

        // note: further tests should be unit tests on domain_size instead
        let dsl = `
          : A [30 100] # 71 elements
          : B [0 50 60 90] # 82 elements
          @custom var-strat size
          @custom targets (A B)
        `;
        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving

        let varName = distribution_getNextVarIndex(fdo._space, fdo.config);
        expect(varName).to.eql(fdo.config.allVarNames.indexOf('A'));
      });

      it('should count actual elements in the domain B', function() {

        // note: further tests should be unit tests on domain_size instead
        let dsl = `
          : A [[0, 5], [10, 15], [20, 25], [30, 35], [40, 45], [50, 55], [60, 65], [70, 75], [80, 100]] # 69 elements
          : B [[0, 10], [30, 40], [50, 60], [670, 700]] # 64 elements
          @custom var-strat size
          @custom targets (A B)
        `;

        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving

        let varName = distribution_getNextVarIndex(fdo._space, fdo.config);
        expect(varName).to.eql(fdo.config.allVarNames.indexOf('B'));
      });
    });
  });

  describe('by_list', function() {

    describe('unit', function() {

      function ABlist(A, B, order, out, inverted) {
        let dsl = `
          : A [${A}]
          : B [${B}]
          @custom var-strat ${inverted ? 'inverted' : ''} (${order})
          @custom targets (A B)
        `;

        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving
        let a = fdo.config.allVarNames.indexOf('A');
        let b = fdo.config.allVarNames.indexOf('B');

        expect(distribution_varByList(fdo._space, fdo.config, a, b, fdo.config.varStratConfig)).to.equal(out);
      }

      it('should return BETTER if the priority hash says A is higher than B', function() {
        ABlist([0, 0], [0, 0], ['A', 'B'], BETTER);
      });

      it('should return WORSE if the inverted priority hash says A is higher than B', function() {
        ABlist([0, 0], [0, 0], ['B', 'A'], WORSE);
      });

      it('should return WORSE if the inverted priority hash says A is lower than B', function() {
        ABlist([0, 0], [0, 0], ['A', 'B'], WORSE, true);
      });

      it('should return BETTER if the inverted priority hash says A is lower than B', function() {
        ABlist([0, 0], [0, 0], ['B', 'A'], BETTER, true);
      });

      it('should return BETTER if A is in the hash but B is not', function() {
        ABlist([0, 0], [0, 0], ['A'], BETTER);
      });

      it('should return WORSE if A is in the inverted hash but B is not', function() {
        ABlist([0, 0], [0, 0], ['A'], WORSE, true);
      });

      it('should return WORSE if B is in the hash but A is not', function() {
        ABlist([0, 0], [0, 0], ['B'], WORSE);
      });

      it('should return BETTER if B is in the inverted hash but A is not', function() {
        ABlist([0, 0], [0, 0], ['B'], BETTER, true);
      });

      it('should throw if A gets value 0 from the hash', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [A]: 0,
          },
        };

        let f = _ => distribution_varByList(space, config, A, B, nvconfig);
        expect(f).to.throw('SHOULD_NOT_USE_INDEX_ZERO');
      });

      it('should throw if B gets value 0 from the hash', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [B]: 0,
          },
        };

        let f = _ => distribution_varByList(space, config, A, B, nvconfig);
        expect(f).to.throw('SHOULD_NOT_USE_INDEX_ZERO');
      });

      function ABClist(A, B, out, inverted, noFallback) {
        let dsl = `
          : A [${A}]
          : B [${B}]
          : C [0 1]
          @custom var-strat ${inverted ? 'inverted' : ''} (C)
          ${noFallback ? '' : '@custom var-strat fallback size'}
          @custom targets (A B C)
        `;

        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving
        let a = fdo.config.allVarNames.indexOf('A');
        let b = fdo.config.allVarNames.indexOf('B');

        expect(distribution_varByList(fdo._space, fdo.config, a, b, fdo.config.varStratConfig)).to.equal(out);
      }

      it('should return SAME if neither A nor B is in the hash without fallback', function() {
        ABClist([0, 0], [0, 0], SAME, false, true);
      });

      it('should return SAME if neither A nor B is in the inverted hash without fallback', function() {
        ABClist([0, 0], [0, 0], SAME, true, true);
      });

      it('should return BETTER if neither is in the list and fallback is size with A smaller', function() {
        ABClist([0, 0], [0, 10], BETTER, false);
      });

      it('should return SAME if neither is in the list and fallback is size with A same', function() {
        ABClist([0, 0], [10, 10], SAME, false);
      });

      it('should return WORSE if neither is in the list and fallback is size with A bigger', function() {
        ABClist([0, 100], [10, 10], WORSE, false);
      });

      it('should return BETTER if neither is in the inverted list and fallback is size with A smaller', function() {
        ABClist([0, 0], [0, 10], BETTER, true);
      });

      it('should return SAME if neither is in the inverted list and fallback is size with A same', function() {
        ABClist([0, 0], [10, 10], SAME, true);
      });

      it('should return WORSE if neither is in the inverted list and fallback is size with A bigger', function() {
        ABClist([0, 100], [10, 10], WORSE, true);
      });
    });

    describe('integration', function() {

      it('should solve vars in the explicit order of the list A', function() {
        let dsl = `
          : A *
          : B *
          @custom var-strat list (A B)
          @custom targets (A B)
        `;

        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving

        let varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

        expect(varIndex).to.eql(fdo.config.allVarNames.indexOf('A'));
      });

      it('should solve vars in the explicit order of the list B', function() {
        let dsl = `
          : A *
          : B *
          @custom var-strat list (B A)
          @custom targets (A B)
        `;

        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving

        let varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

        expect(varIndex).to.eql(fdo.config.allVarNames.indexOf('B'));
      });

      it('should not crash if a var is not on the list or when list is empty', function() {
        let dsl = `
          : A *
          : B *
          : C 1
          @custom var-strat list (C)
          @custom targets (A B C)
        `;

        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving

        let varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

        expect(varIndex).to.eql(fdo.config.allVarNames.indexOf('A'));
      });

      function unlistedTest(desc, targetNames, expectingName) {
        let dsl = `
          : A *
          : B *
          : C *
          @custom var-strat list (A C)
          @custom targets (${targetNames}) # otherwise nothing happens
        `;

        let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving

        let varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

        expect(varIndex, desc).to.eql(fdo.config.allVarNames.indexOf(expectingName));
      }

      it('should assume unlisted vars come after listed vars', function() {
        unlistedTest('A and C should go before B', ['A', 'B', 'C'], 'A');
        unlistedTest('A should go before B', ['A', 'B'], 'A');
        unlistedTest('C should go before B', ['B', 'C'], 'C');
        unlistedTest('B is only one left', ['B'], 'B');
      });

      describe('fallback with dud list', function() {

        it('should first apply the list prio if possible', function() {
          let dsl = `
            : A [0 20]
            : B [0 10]
            : C [0 10]
            @custom targets (A B C)
            @custom var-strat list (C)
            @custom var-strat fallback max
          `;

          let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving
          let varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

          expect(varIndex).to.eql(fdo.config.allVarNames.indexOf('C'));
        });

        it('should select the largest A', function() {
          let dsl = `
            : A [0 20]
            : B [0 10]
            : C 10
            @custom targets (A B C)
            @custom var-strat list (C)
            @custom var-strat fallback max
          `;

          let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving
          let varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

          expect(varIndex).to.eql(fdo.config.allVarNames.indexOf('A'));
        });

        it('should select the largest B', function() {
          let dsl = `
            : A [0 10]
            : B [0 20]
            : C 10
            @custom targets (A B C)
            @custom var-strat list (C)
            @custom var-strat fallback max
          `;

          let fdo = FDO.solve(dsl, {returnFdo: true, _nosolve: true}); // will prepare but not actually start solving
          let varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

          expect(varIndex).to.eql(fdo.config.allVarNames.indexOf('B'));
        });
      });
    });
  });
});
