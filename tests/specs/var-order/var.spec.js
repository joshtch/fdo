import {
  distribution_getNextVarIndex,
  BETTER,
  SAME,
  WORSE,
  distribution_varByMin,
  distribution_varByMax,
  distribution_varByMinSize,
  distribution_varByList,
} from '../../../src/distribution/var';
import FDO from '../../../src/fdo';
import { config_addVarRange, config_create } from '../../../src/config';
import { space_createRoot, space_initFromConfig } from '../../../src/space';

describe('fdo/distribution/var.spec', () => {
  describe('distribution_var_by_throw', () => {
    test('should throw', () => {
      expect(_ => {
        distribution_getNextVarIndex({}, { varStratConfig: { type: 'throw' } });
      }).toThrow('Throwing an error because var-strat requests it');
    });

    test('should throw for unknown var strats', () => {
      expect(_ => {
        distribution_getNextVarIndex(
          {},
          { varStratConfig: { type: 'unknown' } }
        );
      }).toThrow('unknown next var func');
      expect(_ => {
        distribution_getNextVarIndex({}, { varStratConfig: { type: 'crap' } });
      }).toThrow('unknown next var func');
      expect(_ => {
        distribution_getNextVarIndex({}, { varStratConfig: { type: 'nope' } });
      }).toThrow('unknown next var func');
      expect(_ => {
        distribution_getNextVarIndex(
          {},
          { varStratConfig: { type: 'anything' } }
        );
      }).toThrow('unknown next var func');
    });
  });

  function itAvsB(type, range_a, range_b, out, desc) {
    let { stack } = new Error('from'); // Mocha wont tell us which line called itAvsB :(
    if (stack && stack.slice)
      stack = stack.slice(0, stack.indexOf('._compile')) + ' ...'; // Dont need the whole thing

    test(`itAvsB: ${desc}; type: ${type}, rangeA: ${range_a}, rangeB: ${range_b}, out: ${out}`, () => {
      const dsl = `
          : A [${range_a}]
          : B [${range_b}]
          @custom var-strat ${type}
          @custom targets (A B)
        `;

      const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving

      const varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

      // Stack
      expect(varIndex).toBe(fdo.config.allVarNames.indexOf(out));
    });
  }

  describe('by_min', () => {
    describe('unit', () => {
      function ABmin(A, B, out) {
        const dsl = `
          : A ${A}
          : B ${B}
        `;
        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving
        const a = fdo.config.allVarNames.indexOf('A');
        const b = fdo.config.allVarNames.indexOf('B');

        expect(distribution_varByMin(fdo._space, fdo.config, a, b)).toBe(out);
      }

      test('should return BETTER if lo(v1) < lo(v2)', () => {
        ABmin(10, 11, BETTER);
      });

      test('should return SAME if lo(v1) = lo(v2)', () => {
        ABmin(11, 11, SAME);
      });

      test('should return WORSE if lo(v1) > lo(v2)', () => {
        ABmin(12, 11, WORSE);
      });
    });

    describe('integration', () => {
      itAvsB(
        'min',
        [0, 1],
        [10, 11],
        'A',
        'should decide on lowest vars first A'
      );
      itAvsB(
        'min',
        [20, 30],
        [5, 8],
        'B',
        'should decide on lowest vars first B'
      );
      itAvsB(
        'min',
        [9, 21],
        [10, 20],
        'A',
        'should base decision on lowest lo, not lowest hi'
      );
    });
  });

  describe('by_max', () => {
    describe('unit', () => {
      function ABmax(A, B, out) {
        const dsl = `
          : A ${A}
          : B ${B}
        `;
        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving
        const a = fdo.config.allVarNames.indexOf('A');
        const b = fdo.config.allVarNames.indexOf('B');

        expect(distribution_varByMax(fdo._space, fdo.config, a, b)).toBe(out);
      }

      test('should return BETTER if hi(v1) > hi(v2)', () => {
        ABmax(12, 11, BETTER);
      });

      test('should return SAME if hi(v1) = hi(v2)', () => {
        ABmax(11, 11, SAME);
      });

      test('should return WORSE if hi(v1) < hi(v2)', () => {
        ABmax(10, 11, WORSE);
      });
    });

    describe('integration', () => {
      itAvsB(
        'max',
        [0, 1],
        [10, 11],
        'B',
        'should decide on highest vars first A'
      );
      itAvsB(
        'max',
        [20, 30],
        [5, 8],
        'A',
        'should decide on highest vars first B'
      );
      itAvsB(
        'max',
        [9, 21],
        [10, 20],
        'A',
        'should base decision on highest hi, not highest lo'
      );
    });
  });

  describe('by_size', () => {
    describe('unit', () => {
      // Note: further tests should be unit tests on domain_size instead

      function ABsize(A, B, out) {
        const dsl = `
          : A [${A}]
          : B [${B}]
        `;
        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving
        const a = fdo.config.allVarNames.indexOf('A');
        const b = fdo.config.allVarNames.indexOf('B');

        expect(distribution_varByMinSize(fdo._space, fdo.config, a, b)).toBe(
          out
        );
      }

      test('should return BETTER if size(v1) < size(v2)', () => {
        ABsize([5, 5], [11, 12], BETTER);
      });

      test('should return SAME if size(v1) = size(v2) with single range', () => {
        ABsize([11, 11], [8, 8], SAME);
      });

      test('should return SAME if size(v1) = size(v2) with multiple ranges', () => {
        ABsize([11, 11, 15, 19], [8, 10, 12, 14], SAME);
      });

      test('should return SAME if size(v1) = size(v2) with different range count', () => {
        ABsize([11, 11, 13, 14, 18, 19], [8, 10, 13, 14], SAME);
      });

      test('should return WORSE if size(v1) > size(v2)', () => {
        ABsize([11, 12], [11, 11], WORSE);
      });
    });

    describe('integration', () => {
      itAvsB(
        'size',
        [0, 1],
        [10, 12],
        'A',
        'should decide on largest domain first A'
      );
      itAvsB(
        'size',
        [20, 30],
        [50, 55],
        'B',
        'should decide on largest domain first B'
      );

      test('should count actual elements in the domain A', () => {
        // Note: further tests should be unit tests on domain_size instead
        const dsl = `
          : A [30 100] # 71 elements
          : B [0 50 60 90] # 82 elements
          @custom var-strat size
          @custom targets (A B)
        `;
        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving

        const varName = distribution_getNextVarIndex(fdo._space, fdo.config);
        expect(varName).toEqual(fdo.config.allVarNames.indexOf('A'));
      });

      test('should count actual elements in the domain B', () => {
        // Note: further tests should be unit tests on domain_size instead
        const dsl = `
          : A [[0, 5], [10, 15], [20, 25], [30, 35], [40, 45], [50, 55], [60, 65], [70, 75], [80, 100]] # 69 elements
          : B [[0, 10], [30, 40], [50, 60], [670, 700]] # 64 elements
          @custom var-strat size
          @custom targets (A B)
        `;

        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving

        const varName = distribution_getNextVarIndex(fdo._space, fdo.config);
        expect(varName).toEqual(fdo.config.allVarNames.indexOf('B'));
      });
    });
  });

  describe('by_list', () => {
    describe('unit', () => {
      function ABlist(A, B, order, out, inverted) {
        const dsl = `
          : A [${A}]
          : B [${B}]
          @custom var-strat ${inverted ? 'inverted' : ''} (${order})
          @custom targets (A B)
        `;

        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving
        const a = fdo.config.allVarNames.indexOf('A');
        const b = fdo.config.allVarNames.indexOf('B');

        expect(
          distribution_varByList(
            fdo._space,
            fdo.config,
            a,
            b,
            fdo.config.varStratConfig
          )
        ).toBe(out);
      }

      test('should return BETTER if the priority hash says A is higher than B', () => {
        ABlist([0, 0], [0, 0], ['A', 'B'], BETTER);
      });

      test('should return WORSE if the inverted priority hash says A is higher than B', () => {
        ABlist([0, 0], [0, 0], ['B', 'A'], WORSE);
      });

      test('should return WORSE if the inverted priority hash says A is lower than B', () => {
        ABlist([0, 0], [0, 0], ['A', 'B'], WORSE, true);
      });

      test('should return BETTER if the inverted priority hash says A is lower than B', () => {
        ABlist([0, 0], [0, 0], ['B', 'A'], BETTER, true);
      });

      test('should return BETTER if A is in the hash but B is not', () => {
        ABlist([0, 0], [0, 0], ['A'], BETTER);
      });

      test('should return WORSE if A is in the inverted hash but B is not', () => {
        ABlist([0, 0], [0, 0], ['A'], WORSE, true);
      });

      test('should return WORSE if B is in the hash but A is not', () => {
        ABlist([0, 0], [0, 0], ['B'], WORSE);
      });

      test('should return BETTER if B is in the inverted hash but A is not', () => {
        ABlist([0, 0], [0, 0], ['B'], BETTER, true);
      });

      test('should throw if A gets value 0 from the hash', () => {
        const config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        const space = space_createRoot();
        space_initFromConfig(space, config);
        const A = config.allVarNames.indexOf('A');
        const B = config.allVarNames.indexOf('B');

        const nvconfig = {
          _priorityByIndex: {
            [A]: 0,
          },
        };

        const f = _ => {
          distribution_varByList(space, config, A, B, nvconfig);
        };

        expect(f).toThrow('SHOULD_NOT_USE_INDEX_ZERO');
      });

      test('should throw if B gets value 0 from the hash', () => {
        const config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        const space = space_createRoot();
        space_initFromConfig(space, config);
        const A = config.allVarNames.indexOf('A');
        const B = config.allVarNames.indexOf('B');

        const nvconfig = {
          _priorityByIndex: {
            [B]: 0,
          },
        };

        const f = _ => {
          distribution_varByList(space, config, A, B, nvconfig);
        };

        expect(f).toThrow('SHOULD_NOT_USE_INDEX_ZERO');
      });

      function ABClist(A, B, out, inverted, noFallback) {
        const dsl = `
          : A [${A}]
          : B [${B}]
          : C [0 1]
          @custom var-strat ${inverted ? 'inverted' : ''} (C)
          ${noFallback ? '' : '@custom var-strat fallback size'}
          @custom targets (A B C)
        `;

        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving
        const a = fdo.config.allVarNames.indexOf('A');
        const b = fdo.config.allVarNames.indexOf('B');

        expect(
          distribution_varByList(
            fdo._space,
            fdo.config,
            a,
            b,
            fdo.config.varStratConfig
          )
        ).toBe(out);
      }

      test('should return SAME if neither A nor B is in the hash without fallback', () => {
        ABClist([0, 0], [0, 0], SAME, false, true);
      });

      test('should return SAME if neither A nor B is in the inverted hash without fallback', () => {
        ABClist([0, 0], [0, 0], SAME, true, true);
      });

      test('should return BETTER if neither is in the list and fallback is size with A smaller', () => {
        ABClist([0, 0], [0, 10], BETTER, false);
      });

      test('should return SAME if neither is in the list and fallback is size with A same', () => {
        ABClist([0, 0], [10, 10], SAME, false);
      });

      test('should return WORSE if neither is in the list and fallback is size with A bigger', () => {
        ABClist([0, 100], [10, 10], WORSE, false);
      });

      test('should return BETTER if neither is in the inverted list and fallback is size with A smaller', () => {
        ABClist([0, 0], [0, 10], BETTER, true);
      });

      test('should return SAME if neither is in the inverted list and fallback is size with A same', () => {
        ABClist([0, 0], [10, 10], SAME, true);
      });

      test('should return WORSE if neither is in the inverted list and fallback is size with A bigger', () => {
        ABClist([0, 100], [10, 10], WORSE, true);
      });
    });

    describe('integration', () => {
      test('should solve vars in the explicit order of the list A', () => {
        const dsl = `
          : A *
          : B *
          @custom var-strat list (A B)
          @custom targets (A B)
        `;

        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving

        const varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

        expect(varIndex).toEqual(fdo.config.allVarNames.indexOf('A'));
      });

      test('should solve vars in the explicit order of the list B', () => {
        const dsl = `
          : A *
          : B *
          @custom var-strat list (B A)
          @custom targets (A B)
        `;

        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving

        const varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

        expect(varIndex).toEqual(fdo.config.allVarNames.indexOf('B'));
      });

      test('should not crash if a var is not on the list or when list is empty', () => {
        const dsl = `
            : A *
            : B *
            : C 1
            @custom var-strat list (C)
            @custom targets (A B C)
          `;

        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving

        const varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

        expect(varIndex).toEqual(fdo.config.allVarNames.indexOf('A'));
      });

      function unlistedTest(desc, targetNames, expectingName) {
        const dsl = `
          : A *
          : B *
          : C *
          @custom var-strat list (A C)
          @custom targets (${targetNames}) # otherwise nothing happens
        `;

        const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving

        const varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

        // Desc
        expect(varIndex).toEqual(fdo.config.allVarNames.indexOf(expectingName));
      }

      test('should assume unlisted vars come after listed vars', () => {
        unlistedTest('A and C should go before B', ['A', 'B', 'C'], 'A');
        unlistedTest('A should go before B', ['A', 'B'], 'A');
        unlistedTest('C should go before B', ['B', 'C'], 'C');
        unlistedTest('B is only one left', ['B'], 'B');
      });

      describe('fallback with dud list', () => {
        test('should first apply the list prio if possible', () => {
          const dsl = `
            : A [0 20]
            : B [0 10]
            : C [0 10]
            @custom targets (A B C)
            @custom var-strat list (C)
            @custom var-strat fallback max
          `;

          const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving
          const varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

          expect(varIndex).toEqual(fdo.config.allVarNames.indexOf('C'));
        });

        test('should select the largest A', () => {
          const dsl = `
            : A [0 20]
            : B [0 10]
            : C 10
            @custom targets (A B C)
            @custom var-strat list (C)
            @custom var-strat fallback max
          `;

          const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving
          const varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

          expect(varIndex).toEqual(fdo.config.allVarNames.indexOf('A'));
        });

        test('should select the largest B', () => {
          const dsl = `
            : A [0 10]
            : B [0 20]
            : C 10
            @custom targets (A B C)
            @custom var-strat list (C)
            @custom var-strat fallback max
          `;

          const fdo = FDO.solve(dsl, { returnFdo: true, _nosolve: true }); // Will prepare but not actually start solving
          const varIndex = distribution_getNextVarIndex(fdo._space, fdo.config);

          expect(varIndex).toEqual(fdo.config.allVarNames.indexOf('B'));
        });
      });
    });
  });
});
