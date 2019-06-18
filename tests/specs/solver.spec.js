import { setSolver, verify } from 'fdv/verifier';

import {
  SUB,
  SUP,
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
  domain_arrToSmallest,
} from 'fdlib';

import FDO from '../../src/fdo';
import { config_setOption } from '../../src/config';

describe('fdo/solver.spec', () => {
  describe('FDO.solve()', () => {
    test('should work', () => {
      expect(_ => {
        FDO.solve(`
        : A [0 10]
        : B [0 10]
        A != B
      `);
      }).not.toThrow();
    });
  });

  describe('api', () => {
    describe('fdo.num', () => {
      test('num(false)', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.num(false);
        }).toThrow('FDO#num: expecting a number, got false (a boolean)');
      });

      test('num(true)', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.num(true);
        }).toThrow('FDO#num: expecting a number, got true (a boolean)');
      });

      test('num(0)', () => {
        const fdo = new FDO();
        const name = fdo.num(0);

        expect(typeof name).toBe('string');
      });

      test('num(10)', () => {
        const fdo = new FDO();
        const name = fdo.num(10);

        expect(typeof name).toBe('string');
      });

      test('should throw for undefined', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.num(undefined);
        }).toThrow('FDO#num: expecting a number, got undefined (a undefined)');
      });

      test('should throw for null', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.num(null);
        }).toThrow('FDO#num: expecting a number, got null (a object)');
      });

      test('should throw for NaN', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.num(NaN);
        }).toThrow('FDO#num: expecting a number, got NaN');
      });
    });

    describe('fdo.decl', () => {
      test('should work', () => {
        const fdo = new FDO();

        expect(fdo.decl('foo')).toBe('foo');
      });

      test('should accept a flat array for domain', () => {
        const fdo = new FDO();
        fdo.decl('foo', [0, 10, 20, 30]); // Dont use fixtures because small domain

        expect(
          fdo.config.initialDomains[fdo.config.allVarNames.indexOf('foo')]
        ).toEqual(domain_arrToSmallest([0, 10, 20, 30]));
      });

      test('should no longer accept a legacy nested array for domain', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.decl('foo', [[0, 10], [20, 30]]);
        }).toThrow('SHOULD_BE_GTE 0');
      });

      describe('legacy', () => {
        test('should throw for bad legacy domain ', () => {
          const fdo = new FDO();

          expect(_ => {
            fdo.decl('foo', [[0]]);
          }).toThrow('SHOULD_CONTAIN_RANGES');
        });

        test('should throw for bad legacy domain with multiple ranges', () => {
          const fdo = new FDO();

          expect(_ => {
            fdo.decl('foo', [[0], [20, 30]]);
          }).toThrow('SHOULD_BE_LTE 100000000');
        });
      });

      test('should throw for domains with numbers <SUB', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.decl('foo', [SUB - 2, SUB - 1]);
        }).toThrow('SHOULD_BE_GTE');
      });

      test('should throw for domains with numbers >SUP', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.decl('foo', [SUP + 1, SUP + 2]);
        }).toThrow('SHOULD_BE_LTE');
      });

      test('should throw for domains with NaNs', () => {
        const fdo = new FDO();
        expect(_ => {
          fdo.decl('foo', [0, NaN]);
        }).toThrow('SHOULD_BE_LTE');

        const fdo2 = new FDO();
        expect(_ => {
          fdo2.decl('foo', [NaN, 1]);
        }).toThrow('SHOULD_BE_GTE');

        const fdo3 = new FDO();
        expect(_ => {
          fdo3.decl('foo', [NaN, NaN]);
        }).toThrow('SHOULD_BE_GTE');
      });

      test('should throw for domains with inverted range', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.decl('foo', [2, 1]);
        }).toThrow('NON_EMPTY_DOMAIN');
      });

      test('should throw for legacy domains with inverted range', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.decl('foo', [[2, 1]]);
        }).toThrow('SHOULD_CONTAIN_RANGES');
      });

      test('should throw for domains with garbage', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.decl('foo', [{}, {}]);
        }).toThrow('SHOULD_BE_GTE 0');
      });

      test('should throw for legacy domains with garbage', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.decl('foo', [[{}]]);
        }).toThrow('SHOULD_CONTAIN_RANGES');
      });

      test('should throw for domains with one number', () => {
        const fdo = new FDO();

        expect(_ => {
          fdo.decl('foo', [1]);
        }).toThrow('SHOULD_CONTAIN_RANGES');
      });
    });

    describe('fdo.plus', () => {
      test('should work without result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.plus('A', 'B')).toBe('string');
      });

      test('should work with a result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.plus('A', 'B', 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        const fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.plus(1, 'B', 'C')).toBe('C');

        const fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.plus('A', 2, 'C')).toBe('C');

        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.plus('A', 'B', 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => {
          fdo3.plus(['A', 'B'], {});
        }).toThrow('all var names should be strings or numbers or undefined');
      });

      test('should always return the result var name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(typeof fdo3.plus('A', 'B')).toBe('string');
        expect(typeof fdo3.plus(1, 'B')).toBe('string');
        expect(typeof fdo3.plus('A', 1)).toBe('string');
        expect(typeof fdo3.plus(1, 2)).toBe('string');

        expect(fdo3.plus('A', 'B', 'C')).toBe('C');
        expect(fdo3.plus(1, 'B', 'C')).toBe('C');
        expect(fdo3.plus('A', 2, 'C')).toBe('C');
        expect(fdo3.plus(1, 2, 'C')).toBe('C');

        expect(typeof fdo3.plus('A', 'B', 3)).toBe('string');
        expect(typeof fdo3.plus(1, 'B', 3)).toBe('string');
        expect(typeof fdo3.plus('A', 2, 3)).toBe('string');
        expect(typeof fdo3.plus(1, 2, 3)).toBe('string');
      });
    });

    describe('fdo.minus', () => {
      test('should work without result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.minus('A', 'B')).toBe('string');
      });

      test('should work with a result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.minus('A', 'B', 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        const fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.minus(1, 'B', 'C')).toBe('C');

        const fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.minus('A', 2, 'C')).toBe('C');

        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.minus('A', 'B', 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => {
          fdo3.minus(['A', 'B'], {});
        }).toThrow('all var names should be strings or numbers or undefined');
      });

      test('should always return the result var name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(typeof fdo3.minus('A', 'B')).toBe('string');
        expect(typeof fdo3.minus(1, 'B')).toBe('string');
        expect(typeof fdo3.minus('A', 1)).toBe('string');
        expect(typeof fdo3.minus(1, 2)).toBe('string');

        expect(fdo3.minus('A', 'B', 'C')).toBe('C');
        expect(fdo3.minus(1, 'B', 'C')).toBe('C');
        expect(fdo3.minus('A', 2, 'C')).toBe('C');
        expect(fdo3.minus(1, 2, 'C')).toBe('C');

        expect(typeof fdo3.minus('A', 'B', 3)).toBe('string');
        expect(typeof fdo3.minus(1, 'B', 3)).toBe('string');
        expect(typeof fdo3.minus('A', 2, 3)).toBe('string');
        expect(typeof fdo3.minus(1, 2, 3)).toBe('string');
      });
    });

    describe('fdo.mul', () => {
      test('should work without result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.mul('A', 'B')).toBe('string');
      });

      test('should work with a result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.mul('A', 'B', 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        const fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.mul(1, 'B', 'C')).toBe('C');

        const fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.mul('A', 2, 'C')).toBe('C');

        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.mul('A', 'B', 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => {
          fdo3.mul(['A', 'B'], {});
        }).toThrow('all var names should be strings or numbers or undefined');
      });

      test('should always return the result var name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(typeof fdo3.mul('A', 'B')).toBe('string');
        expect(typeof fdo3.mul(1, 'B')).toBe('string');
        expect(typeof fdo3.mul('A', 1)).toBe('string');
        expect(typeof fdo3.mul(1, 2)).toBe('string');

        expect(fdo3.mul('A', 'B', 'C')).toBe('C');
        expect(fdo3.mul(1, 'B', 'C')).toBe('C');
        expect(fdo3.mul('A', 2, 'C')).toBe('C');
        expect(fdo3.mul(1, 2, 'C')).toBe('C');

        expect(typeof fdo3.mul('A', 'B', 3)).toBe('string');
        expect(typeof fdo3.mul(1, 'B', 3)).toBe('string');
        expect(typeof fdo3.mul('A', 2, 3)).toBe('string');
        expect(typeof fdo3.mul(1, 2, 3)).toBe('string');
      });
    });

    describe('fdo.div', () => {
      test('should work without result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.div('A', 'B')).toBe('string');
      });

      test('should work with a result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.div('A', 'B', 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        const fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.div(1, 'B', 'C')).toBe('C');

        const fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.div('A', 2, 'C')).toBe('C');

        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.div('A', 'B', 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => {
          fdo3.div(['A', 'B'], {});
        }).toThrow('all var names should be strings or numbers or undefined');
      });

      test('should always return the result var name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(typeof fdo3.div('A', 'B')).toBe('string');
        expect(typeof fdo3.div(1, 'B')).toBe('string');
        expect(typeof fdo3.div('A', 1)).toBe('string');
        expect(typeof fdo3.div(1, 2)).toBe('string');

        expect(fdo3.div('A', 'B', 'C')).toBe('C');
        expect(fdo3.div(1, 'B', 'C')).toBe('C');
        expect(fdo3.div('A', 2, 'C')).toBe('C');
        expect(fdo3.div(1, 2, 'C')).toBe('C');

        expect(typeof fdo3.div('A', 'B', 3)).toBe('string');
        expect(typeof fdo3.div(1, 'B', 3)).toBe('string');
        expect(typeof fdo3.div('A', 2, 3)).toBe('string');
        expect(typeof fdo3.div(1, 2, 3)).toBe('string');
      });
    });

    describe('fdo.product', () => {
      test('should work without result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.product(['A', 'B'])).toBe('string');
      });

      test('should work with a result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.product(['A', 'B'], 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        const fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.product([1, 'B'], 'C')).toBe('C');

        const fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.product(['A', 2], 'C')).toBe('C');

        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.product(['A', 'B'], 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => {
          fdo3.product(['A', 'B'], {});
        }).toThrow(
          'expecting result var name to be absent or a number or string:'
        );
      });

      test('should always return the result var name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(typeof fdo3.product(['A', 'B'])).toBe('string');
        expect(typeof fdo3.product([1, 'B'])).toBe('string');
        expect(typeof fdo3.product(['A', 1])).toBe('string');
        expect(typeof fdo3.product([1, 2])).toBe('string');

        expect(fdo3.product(['A', 'B'], 'C')).toBe('C');
        expect(fdo3.product([1, 'B'], 'C')).toBe('C');
        expect(fdo3.product(['A', 2], 'C')).toBe('C');
        expect(fdo3.product([1, 2], 'C')).toBe('C');

        expect(typeof fdo3.product(['A', 'B'], 3)).toBe('string');
        expect(typeof fdo3.product([1, 'B'], 3)).toBe('string');
        expect(typeof fdo3.product(['A', 2], 3)).toBe('string');
        expect(typeof fdo3.product([1, 2], 3)).toBe('string');
      });
    });

    describe('fdo.sum', () => {
      test('should work without result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.sum(['A', 'B'])).toBe('string');
      });

      test('should work with a result var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.sum(['A', 'B'], 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions; 1', () => {
        const fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.sum([1, 'B'], 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions; 2', () => {
        const fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.sum(['A', 2], 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions; 3', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.sum(['A', 'B'], 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => {
          fdo3.sum(['A', 'B'], {});
        }).toThrow(
          'expecting result var name to be absent or a number or string:'
        );
      });

      test('should always return the result var name, regardless', () => {
        const fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(typeof fdo3.sum(['A', 'B'])).toBe('string');
        expect(typeof fdo3.sum([1, 'B'])).toBe('string');
        expect(typeof fdo3.sum(['A', 1])).toBe('string');
        expect(typeof fdo3.sum([1, 2])).toBe('string');

        expect(fdo3.sum(['A', 'B'], 'C')).toBe('C');
        expect(fdo3.sum([1, 'B'], 'C')).toBe('C');
        expect(fdo3.sum(['A', 2], 'C')).toBe('C');
        expect(fdo3.sum([1, 2], 'C')).toBe('C');

        expect(typeof fdo3.sum(['A', 'B'], 3)).toBe('string');
        expect(typeof fdo3.sum([1, 'B'], 3)).toBe('string');
        expect(typeof fdo3.sum(['A', 2], 3)).toBe('string');
        expect(typeof fdo3.sum([1, 2], 3)).toBe('string');
      });
    });

    describe('fdo.distinct', () => {
      test('should work', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        fdo.decl('D', 100);
        fdo.decl('E', 100);
        expect(fdo.distinct(['A', 'B', 'C', 'D'], 'E')).toBeUndefined();
      });

      test('accept zero vars', () => {
        const fdo = new FDO();
        expect(_ => {
          fdo.distinct([]);
        }).not.toThrow();
      });

      test('accept one var', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        expect(fdo.distinct(['A'])).toBeUndefined();
      });

      test('accept two vars', () => {
        const fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.distinct(['A', 'B'])).toBeUndefined();
      });
    });

    describe('fdo comparison with .eq and .neq', () => {
      function alias(method) {
        test('should work', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method]('A', 'B')).toBeUndefined(); // Returns v1
        });

        test('should work with a number left', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo[method](1, 'B')).toEqual(undefined);
        });

        test('should work with a number right', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo[method]('A', 2)).toEqual(undefined);
        });

        test('should work with an empty array left', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo[method]([], 'B')).toBeUndefined(); // Returns v2!
        });

        test('should work with an empty array right', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo[method]('A', [])).toBeUndefined(); // Returns v2!
        });

        test('should work with an empty array left and right', () => {
          const fdo = new FDO();
          expect(fdo[method]([], [])).toBeUndefined(); // Returns v2!
        });

        test('should work with an array of one element left', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method](['A'], 'B')).toBeUndefined();
        });

        test('should work with an array of one element right', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method]('A', ['B'])).toBeUndefined();
        });

        test('should work with an array of multiple elements left', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(fdo[method](['A', 'C', 'D'], 'B')).toBeUndefined();
        });

        test('should work with an array of multiple elements right', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(fdo[method]('B', ['A', 'C', 'D'])).toBeUndefined();
        });

        test('should work with an array of multiple elements on both sides', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(
            fdo[method](['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D'])
          ).toBeUndefined();
        });
      }

      alias('eq');
      alias('neq');
    });

    describe('fdo relative comparisons', () => {
      describe('method [gte]', () => {
        test('should work', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo.gte('A', 'B')).toBeUndefined();
        });

        test('should work with a number left', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo.gte(1, 'B')).toBeUndefined(); // If we change anonymous var naming, this'll break
        });

        test('should work with a number right', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo.gte('A', 2)).toBeUndefined(); // If we change anonymous var naming, this'll break
        });

        test('should not work with an empty array', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(_ => {
            fdo.gte([], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });

        test('should work with an array of one element', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(_ => {
            fdo.gte(['A'], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });

        test('should work with an array of multiple elements', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(_ => {
            fdo.gte(['A', 'C', 'D'], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });
      });

      describe('method [gt]', () => {
        test('should work', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo.gt('A', 'B')).toBeUndefined();
        });

        test('should work with a number left', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo.gt(1, 'B')).toBeUndefined(); // If we change anonymous var naming, this'll break
        });

        test('should work with a number right', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo.gt('A', 2)).toBeUndefined(); // If we change anonymous var naming, this'll break
        });

        test('should not work with an empty array', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(_ => {
            fdo.gt([], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });

        test('should work with an array of one element', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(_ => {
            fdo.gt(['A'], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });

        test('should work with an array of multiple elements', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(_ => {
            fdo.gt(['A', 'C', 'D'], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });
      });

      describe('method [lte]', () => {
        test('should work', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo.lte('A', 'B')).toBeUndefined();
        });

        test('should work with a number left', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo.lte(1, 'B')).toBeUndefined(); // If we change anonymous var naming, this'll break
        });

        test('should work with a number right', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo.lte('A', 2)).toBeUndefined(); // If we change anonymous var naming, this'll break
        });

        test('should not work with an empty array', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(_ => {
            fdo.lte([], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });

        test('should work with an array of one element', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(_ => {
            fdo.lte(['A'], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });

        test('should work with an array of multiple elements', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(_ => {
            fdo.lte(['A', 'C', 'D'], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });
      });

      describe('method [lt]', () => {
        test('should work', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo.lt('A', 'B')).toBeUndefined();
        });

        test('should work with a number left', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo.lt(1, 'B')).toBeUndefined(); // If we change anonymous var naming, this'll break
        });

        test('should work with a number right', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo.lt('A', 2)).toBeUndefined(); // If we change anonymous var naming, this'll break
        });

        test('should not work with an empty array', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(_ => {
            fdo.lt([], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });

        test('should work with an array of one element', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(_ => {
            fdo.lt(['A'], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });

        test('should work with an array of multiple elements', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(_ => {
            fdo.lt(['A', 'C', 'D'], 'B');
          }).toThrow('NOT_ACCEPTING_ARRAYS');
        });
      });
    });

    describe('fdo reifiers', () => {
      describe('method = isNeq', () => {
        test('should work: isNeq', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(typeof fdo.isNeq('A', 'B')).toBe('string');
        });

        test('should work with a number left: isNeq', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(typeof fdo.isNeq(1, 'B')).toBe('string');
        });

        test('should work with a number right: isNeq', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(typeof fdo.isNeq('A', 2)).toBe('string');
        });

        test('should accept a result name: isNeq', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          expect(fdo.isNeq('A', 'B', 'C')).toBe('C');
        });

        test('should accept a result number: isNeq', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 1);
          expect(typeof fdo.isNeq('A', 'B', 1)).toBe('string');
        });

        test('should throw for bad result name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          expect(_ => {
            fdo3.isNeq(['A', 'B'], {});
          }).toThrow('all var names should be strings or numbers or undefined');
        });

        test('should always return the result var name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          fdo3.decl('C', 100);

          expect(typeof fdo3.isNeq('A', 'B')).toBe('string');
          expect(typeof fdo3.isNeq(1, 'B')).toBe('string');
          expect(typeof fdo3.isNeq('A', 1)).toBe('string');
          expect(typeof fdo3.isNeq(1, 2)).toBe('string');

          expect(fdo3.isNeq('A', 'B', 'C')).toBe('C');
          expect(fdo3.isNeq(1, 'B', 'C')).toBe('C');
          expect(fdo3.isNeq('A', 2, 'C')).toBe('C');
          expect(fdo3.isNeq(1, 2, 'C')).toBe('C');

          expect(typeof fdo3.isNeq('A', 'B', 3)).toBe('string');
          expect(typeof fdo3.isNeq(1, 'B', 3)).toBe('string');
          expect(typeof fdo3.isNeq('A', 2, 3)).toBe('string');
          expect(typeof fdo3.isNeq(1, 2, 3)).toBe('string');
        });
      });

      describe('method = isEq', () => {
        test('should work: isEq', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(typeof fdo.isEq('A', 'B')).toBe('string');
        });

        test('should work with a number left: isEq', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(typeof fdo.isEq(1, 'B')).toBe('string');
        });

        test('should work with a number right: isEq', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(typeof fdo.isEq('A', 2)).toBe('string');
        });

        test('should accept a result name: isEq', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          expect(fdo.isEq('A', 'B', 'C')).toBe('C');
        });

        test('should accept a result number: isEq', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 1);
          expect(typeof fdo.isEq('A', 'B', 1)).toBe('string');
        });

        test('should throw for bad result name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          expect(_ => {
            fdo3.isEq(['A', 'B'], {});
          }).toThrow('all var names should be strings or numbers or undefined');
        });

        test('should always return the result var name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          fdo3.decl('C', 100);

          expect(typeof fdo3.isEq('A', 'B')).toBe('string');
          expect(typeof fdo3.isEq(1, 'B')).toBe('string');
          expect(typeof fdo3.isEq('A', 1)).toBe('string');
          expect(typeof fdo3.isEq(1, 2)).toBe('string');

          expect(fdo3.isEq('A', 'B', 'C')).toBe('C');
          expect(fdo3.isEq(1, 'B', 'C')).toBe('C');
          expect(fdo3.isEq('A', 2, 'C')).toBe('C');
          expect(fdo3.isEq(1, 2, 'C')).toBe('C');

          expect(typeof fdo3.isEq('A', 'B', 3)).toBe('string');
          expect(typeof fdo3.isEq(1, 'B', 3)).toBe('string');
          expect(typeof fdo3.isEq('A', 2, 3)).toBe('string');
          expect(typeof fdo3.isEq(1, 2, 3)).toBe('string');
        });
      });

      describe('method = isGt', () => {
        test('should work: isGt', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(typeof fdo.isGt('A', 'B')).toBe('string');
        });

        test('should work with a number left: isGt', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(typeof fdo.isGt(1, 'B')).toBe('string');
        });

        test('should work with a number right: isGt', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(typeof fdo.isGt('A', 2)).toBe('string');
        });

        test('should accept a result name: isGt', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          expect(fdo.isGt('A', 'B', 'C')).toBe('C');
        });

        test('should accept a result number: isGt', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 1);
          expect(typeof fdo.isGt('A', 'B', 1)).toBe('string');
        });

        test('should throw for bad result name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          expect(_ => {
            fdo3.isGt(['A', 'B'], {});
          }).toThrow('all var names should be strings or numbers or undefined');
        });

        test('should always return the result var name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          fdo3.decl('C', 100);

          expect(typeof fdo3.isGt('A', 'B')).toBe('string');
          expect(typeof fdo3.isGt(1, 'B')).toBe('string');
          expect(typeof fdo3.isGt('A', 1)).toBe('string');
          expect(typeof fdo3.isGt(1, 2)).toBe('string');

          expect(fdo3.isGt('A', 'B', 'C')).toBe('C');
          expect(fdo3.isGt(1, 'B', 'C')).toBe('C');
          expect(fdo3.isGt('A', 2, 'C')).toBe('C');
          expect(fdo3.isGt(1, 2, 'C')).toBe('C');

          expect(typeof fdo3.isGt('A', 'B', 3)).toBe('string');
          expect(typeof fdo3.isGt(1, 'B', 3)).toBe('string');
          expect(typeof fdo3.isGt('A', 2, 3)).toBe('string');
          expect(typeof fdo3.isGt(1, 2, 3)).toBe('string');
        });
      });

      describe('method = isGte', () => {
        test('should work: isGte', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(typeof fdo.isGte('A', 'B')).toBe('string');
        });

        test('should work with a number left: isGte', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(typeof fdo.isGte(1, 'B')).toBe('string');
        });

        test('should work with a number right: isGte', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(typeof fdo.isGte('A', 2)).toBe('string');
        });

        test('should accept a result name: isGte', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          expect(fdo.isGte('A', 'B', 'C')).toBe('C');
        });

        test('should accept a result number: isGte', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 1);
          expect(typeof fdo.isGte('A', 'B', 1)).toBe('string');
        });

        test('should throw for bad result name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          expect(_ => {
            fdo3.isGte(['A', 'B'], {});
          }).toThrow('all var names should be strings or numbers or undefined');
        });

        test('should always return the result var name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          fdo3.decl('C', 100);

          expect(typeof fdo3.isGte('A', 'B')).toBe('string');
          expect(typeof fdo3.isGte(1, 'B')).toBe('string');
          expect(typeof fdo3.isGte('A', 1)).toBe('string');
          expect(typeof fdo3.isGte(1, 2)).toBe('string');

          expect(fdo3.isGte('A', 'B', 'C')).toBe('C');
          expect(fdo3.isGte(1, 'B', 'C')).toBe('C');
          expect(fdo3.isGte('A', 2, 'C')).toBe('C');
          expect(fdo3.isGte(1, 2, 'C')).toBe('C');

          expect(typeof fdo3.isGte('A', 'B', 3)).toBe('string');
          expect(typeof fdo3.isGte(1, 'B', 3)).toBe('string');
          expect(typeof fdo3.isGte('A', 2, 3)).toBe('string');
          expect(typeof fdo3.isGte(1, 2, 3)).toBe('string');
        });
      });

      describe('method = isLt', () => {
        test('should work: isLt', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(typeof fdo.isLt('A', 'B')).toBe('string');
        });

        test('should work with a number left: isLt', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(typeof fdo.isLt(1, 'B')).toBe('string');
        });

        test('should work with a number right: isLt', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(typeof fdo.isLt('A', 2)).toBe('string');
        });

        test('should accept a result name: isLt', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          expect(fdo.isLt('A', 'B', 'C')).toBe('C');
        });

        test('should accept a result number: isLt', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 1);
          expect(typeof fdo.isLt('A', 'B', 1)).toBe('string');
        });

        test('should throw for bad result name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          expect(_ => {
            fdo3.isLt(['A', 'B'], {});
          }).toThrow('all var names should be strings or numbers or undefined');
        });

        test('should always return the result var name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          fdo3.decl('C', 100);

          expect(typeof fdo3.isLt('A', 'B')).toBe('string');
          expect(typeof fdo3.isLt(1, 'B')).toBe('string');
          expect(typeof fdo3.isLt('A', 1)).toBe('string');
          expect(typeof fdo3.isLt(1, 2)).toBe('string');

          expect(fdo3.isLt('A', 'B', 'C')).toBe('C');
          expect(fdo3.isLt(1, 'B', 'C')).toBe('C');
          expect(fdo3.isLt('A', 2, 'C')).toBe('C');
          expect(fdo3.isLt(1, 2, 'C')).toBe('C');

          expect(typeof fdo3.isLt('A', 'B', 3)).toBe('string');
          expect(typeof fdo3.isLt(1, 'B', 3)).toBe('string');
          expect(typeof fdo3.isLt('A', 2, 3)).toBe('string');
          expect(typeof fdo3.isLt(1, 2, 3)).toBe('string');
        });
      });

      describe('method = isLte', () => {
        test('should work: isLte', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(typeof fdo.isLte('A', 'B')).toBe('string');
        });

        test('should work with a number left: isLte', () => {
          const fdo = new FDO();
          fdo.decl('B', 100);
          expect(typeof fdo.isLte(1, 'B')).toBe('string');
        });

        test('should work with a number right: isLte', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          expect(typeof fdo.isLte('A', 2)).toBe('string');
        });

        test('should accept a result name: isLte', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          expect(fdo.isLte('A', 'B', 'C')).toBe('C');
        });

        test('should accept a result number: isLte', () => {
          const fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 1);
          expect(typeof fdo.isLte('A', 'B', 1)).toBe('string');
        });

        test('should throw for bad result name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          expect(_ => {
            fdo3.isLte(['A', 'B'], {});
          }).toThrow('all var names should be strings or numbers or undefined');
        });

        test('should always return the result var name', () => {
          const fdo3 = new FDO();
          fdo3.decl('A', 100);
          fdo3.decl('B', 100);
          fdo3.decl('C', 100);

          expect(typeof fdo3.isLte('A', 'B')).toBe('string');
          expect(typeof fdo3.isLte(1, 'B')).toBe('string');
          expect(typeof fdo3.isLte('A', 1)).toBe('string');
          expect(typeof fdo3.isLte(1, 2)).toBe('string');

          expect(fdo3.isLte('A', 'B', 'C')).toBe('C');
          expect(fdo3.isLte(1, 'B', 'C')).toBe('C');
          expect(fdo3.isLte('A', 2, 'C')).toBe('C');
          expect(fdo3.isLte(1, 2, 'C')).toBe('C');

          expect(typeof fdo3.isLte('A', 'B', 3)).toBe('string');
          expect(typeof fdo3.isLte(1, 'B', 3)).toBe('string');
          expect(typeof fdo3.isLte('A', 2, 3)).toBe('string');
          expect(typeof fdo3.isLte(1, 2, 3)).toBe('string');
        });
      });
    });

    describe('fdo.solve', () => {
      test('should solve a trivial case when targeted', () => {
        const fdo = new FDO({});
        fdo.declRange('A', 1, 2);

        expect(fdo.solve({ vars: ['A'] })).toEqual([{ A: 1 }, { A: 2 }]);
      });

      test('should solve a trivial case when not targeted', () => {
        const fdo = new FDO({});
        fdo.declRange('A', 1, 2);

        expect(fdo.solve()).toEqual([{ A: [1, 2] }]);
      });

      function forLevel(level) {
        test('should accept all log levels (' + level + ')', () => {
          const fdo = new FDO();

          expect(fdo.solve({ log: level })).toEqual([{}]);
        });

        test('should accept all dbg levels (' + level + ')', () => {
          const fdo = new FDO();

          expect(fdo.solve({ dbg: level })).toEqual([{}]);
        });
      }

      forLevel(undefined);
      forLevel(null);
      forLevel(false);
      forLevel(true);
      forLevel(LOG_NONE);
      forLevel(LOG_STATS);
      forLevel(LOG_SOLVES);
      forLevel(LOG_MAX);
      forLevel(LOG_MIN);
    });

    describe('fdo._prepare', () => {
      test('should prepare for war', () => {
        const fdo = new FDO();

        fdo._prepare({});
        expect(true).toBe(true);
      });

      test('should not require options object', () => {
        const fdo = new FDO();

        fdo._prepare();
        expect(true).toBe(true);
      });
    });

    describe('FDO.domainFromList', () => {
      test('should map to domainFromList', () => {
        expect(
          FDO.domainFromList([1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 15, 118])
        ).toEqual([1, 2, 4, 5, 7, 7, 9, 13, 15, 15, 118, 118]);
      });

      test('should always return an array even for small domains', () => {
        expect(
          FDO.domainFromList([1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 15])
        ).toEqual([1, 2, 4, 5, 7, 7, 9, 13, 15, 15]);
      });
    });
  });

  describe('targeting values', () => {
    test('should support a function comparator', () => {
      const fdo = new FDO();
      fdo.decl('a', [0, 100]);
      fdo.decl('b', [0, 100]);
      fdo.neq('a', 'b');

      let called = false;
      config_setOption(
        fdo.config,
        'valueStrategy',
        (space, varIndex, choiceIndex) => {
          called = true;
          expect(space._class).toBe('$space');
          expect(typeof varIndex).toBe('number');
          expect(typeof choiceIndex).toBe('number');
        }
      );

      fdo.solve({ max: 1 });

      // The callback should be called at least once
      expect(called).toBe(true);
    });
  });

  describe('continue solved space', () => {
    test('should solve this in one go', () => {
      setSolver(FDO.solve);
      verify(`
        : A [2 5]
        : B [2 2 4 5]
        : C [1 5]
        A < B
        C < A
      `);
    });

    test('should be able to continue a solution with extra vars', () => {
      const dsl = `
        : A [2 5]
        : B [2 2 4 5]
        : C [1 5]
        A < B
        C < A
      `;

      const solver = new FDO().imp(dsl);
      solver.solve({ max: 1 });
      // Should not solve C yet because only A and B
      // expect(countSolutions(solver), 'solve count 1').to.eql(5); // C started with 5 values and is unconstrained
      expect(solver.solutions).toEqual([{ A: 2, B: 4, C: 1 }]);

      // Need to either improve on this or ditch it entirely
      const solver2 = solver.branch_from_current_solution();
      // Add a new constraint to the space and solve it
      solver2.lt('C', 'A');

      solver2.solve({
        vars: ['A', 'B', 'C'],
        max: 1,
        test: 1,
      });

      // Now C is constrained as well so all vars have one possible value
      // expect(countSolutions(solver2), 'solve count 2').to.eql(1);
      expect(solver2.solutions[0].C < solver2.solutions[0].B).toBe(true);
      expect(solver2.solutions).toEqual([{ A: 2, B: 4, C: 1 }]);
    });
  });
});
