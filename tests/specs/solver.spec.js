import {
  setSolver,
  verify,
} from 'fdv/verifier';

import {
  SUB,
  SUP,
} from 'fdlib';
import {
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
} from 'fdlib';

import {
  domain_arrToSmallest,
} from 'fdlib';

import FDO from '../../src/fdo';
import {
  config_setOption,
} from '../../src/config';

describe('fdo/solver.spec', () => {

  describe('FDO.solve()', () => {

    test('should work', () => {
      expect(_ => { FDO.solve(`
        : A [0 10]
        : B [0 10]
        A != B
      `) }).not.toThrowError();
    });
  });

  describe('api', () => {

    describe('fdo.num', () => {

      test('num(false)', () => {
        let fdo = new FDO();

        expect(_ => { fdo.num(false) }).toThrowError('FDO#num: expecting a number, got false (a boolean)');
      });

      test('num(true)', () => {
        let fdo = new FDO();

        expect(_ => { fdo.num(true) }).toThrowError('FDO#num: expecting a number, got true (a boolean)');
      });

      test('num(0)', () => {
        let fdo = new FDO();
        let name = fdo.num(0);

        expect(typeof name).toBe('string');
      });

      test('num(10)', () => {
        let fdo = new FDO();
        let name = fdo.num(10);

        expect(typeof name).toBe('string');
      });

      test('should throw for undefined', () => {
        let fdo = new FDO();

        expect(_ => { fdo.num(undefined) }).toThrowError('FDO#num: expecting a number, got undefined (a undefined)');
      });

      test('should throw for null', () => {
        let fdo = new FDO();

        expect(_ => { fdo.num(null) }).toThrowError('FDO#num: expecting a number, got null (a object)');
      });

      test('should throw for NaN', () => {
        let fdo = new FDO();

        expect(_ => { fdo.num(NaN) }).toThrowError('FDO#num: expecting a number, got NaN');
      });
    });

    describe('fdo.decl', () => {

      test('should work', () => {
        let fdo = new FDO();

        expect(fdo.decl('foo')).toBe('foo');
      });

      test('should accept a flat array for domain', () => {
        let fdo = new FDO();
        fdo.decl('foo', [0, 10, 20, 30]); // dont use fixtures because small domain

        expect(fdo.config.initialDomains[fdo.config.allVarNames.indexOf('foo')]).toEqual(domain_arrToSmallest([0, 10, 20, 30]));
      });

      test('should no longer accept a legacy nested array for domain', () => {
        let fdo = new FDO();

        expect(_ => { fdo.decl('foo', [[0, 10], [20, 30]]) }).toThrowError('SHOULD_BE_GTE 0');
      });

      describe('legacy', () => {

        test('should throw for bad legacy domain ', () => {
          let fdo = new FDO();

          expect(_ => { fdo.decl('foo', [[0]]) }).toThrowError('SHOULD_CONTAIN_RANGES');
        });

        test('should throw for bad legacy domain with multiple ranges', () => {
          let fdo = new FDO();

          expect(_ => { fdo.decl('foo', [[0], [20, 30]]) }).toThrowError('SHOULD_BE_LTE 100000000');
        });
      });

      test('should throw for domains with numbers <SUB', () => {
        let fdo = new FDO();

        expect(_ => { fdo.decl('foo', [SUB - 2, SUB - 1]) }).toThrowError('SHOULD_BE_GTE');
      });

      test('should throw for domains with numbers >SUP', () => {
        let fdo = new FDO();

        expect(_ => { fdo.decl('foo', [SUP + 1, SUP + 2]) }).toThrowError('SHOULD_BE_LTE');
      });

      test('should throw for domains with NaNs', () => {
        let fdo = new FDO();
        expect(_ => { fdo.decl('foo', [0, NaN]) }).toThrowError('SHOULD_BE_LTE');

        let fdo2 = new FDO();
        expect(_ => { fdo2.decl('foo', [NaN, 1]) }).toThrowError('SHOULD_BE_GTE');

        let fdo3 = new FDO();
        expect(_ => { fdo3.decl('foo', [NaN, NaN]) }).toThrowError('SHOULD_BE_GTE');
      });

      test('should throw for domains with inverted range', () => {
        let fdo = new FDO();

        expect(_ => { fdo.decl('foo', [2, 1]) }).toThrowError('NON_EMPTY_DOMAIN');
      });

      test('should throw for legacy domains with inverted range', () => {
        let fdo = new FDO();

        expect(_ => { fdo.decl('foo', [[2, 1]]) }).toThrowError('SHOULD_CONTAIN_RANGES');
      });

      test('should throw for domains with garbage', () => {
        let fdo = new FDO();

        expect(_ => { fdo.decl('foo', [{}, {}]) }).toThrowError('SHOULD_BE_GTE 0');
      });

      test('should throw for legacy domains with garbage', () => {
        let fdo = new FDO();

        expect(_ => { fdo.decl('foo', [[{}]]) }).toThrowError('SHOULD_CONTAIN_RANGES');
      });

      test('should throw for domains with one number', () => {
        let fdo = new FDO();

        expect(_ => { fdo.decl('foo', [1]) }).toThrowError('SHOULD_CONTAIN_RANGES');
      });
    });

    describe('fdo.plus', () => {

      test('should work without result var', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.plus('A', 'B')).toBe('string');
      });

      test('should work with a result var', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.plus('A', 'B', 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.plus(1, 'B', 'C')).toBe('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.plus('A', 2, 'C')).toBe('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.plus('A', 'B', 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => { fdo3.plus(['A', 'B'], {}) }).toThrowError('all var names should be strings or numbers or undefined');
      });

      test('should always return the result var name', () => {
        let fdo3 = new FDO();
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
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.minus('A', 'B')).toBe('string');
      });

      test('should work with a result var', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.minus('A', 'B', 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.minus(1, 'B', 'C')).toBe('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.minus('A', 2, 'C')).toBe('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.minus('A', 'B', 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => { fdo3.minus(['A', 'B'], {}) }).toThrowError('all var names should be strings or numbers or undefined');
      });

      test('should always return the result var name', () => {
        let fdo3 = new FDO();
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
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.mul('A', 'B')).toBe('string');
      });

      test('should work with a result var', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.mul('A', 'B', 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.mul(1, 'B', 'C')).toBe('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.mul('A', 2, 'C')).toBe('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.mul('A', 'B', 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => { fdo3.mul(['A', 'B'], {}) }).toThrowError('all var names should be strings or numbers or undefined');
      });

      test('should always return the result var name', () => {
        let fdo3 = new FDO();
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
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.div('A', 'B')).toBe('string');
      });

      test('should work with a result var', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.div('A', 'B', 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.div(1, 'B', 'C')).toBe('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.div('A', 2, 'C')).toBe('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.div('A', 'B', 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => { fdo3.div(['A', 'B'], {}) }).toThrowError('all var names should be strings or numbers or undefined');
      });

      test('should always return the result var name', () => {
        let fdo3 = new FDO();
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
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.product(['A', 'B'])).toBe('string');
      });

      test('should work with a result var', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.product(['A', 'B'], 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions', () => {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.product([1, 'B'], 'C')).toBe('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.product(['A', 2], 'C')).toBe('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.product(['A', 'B'], 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => { fdo3.product(['A', 'B'], {}) }).toThrowError('expecting result var name to be absent or a number or string:');
      });

      test('should always return the result var name', () => {
        let fdo3 = new FDO();
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
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(typeof fdo.sum(['A', 'B'])).toBe('string');
      });

      test('should work with a result var', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.sum(['A', 'B'], 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions; 1', () => {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.sum([1, 'B'], 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions; 2', () => {
        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.sum(['A', 2], 'C')).toBe('C');
      });

      test('should accept numbers on either of the three positions; 3', () => {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(typeof fdo3.sum(['A', 'B'], 3)).toBe('string');
      });

      test('should throw for bad result name', () => {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => { fdo3.sum(['A', 'B'], {}) }).toThrowError('expecting result var name to be absent or a number or string:');
      });

      test('should always return the result var name, regardless', () => {
        let fdo3 = new FDO();
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
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        fdo.decl('D', 100);
        fdo.decl('E', 100);
        expect(fdo.distinct(['A', 'B', 'C', 'D'], 'E')).toBeUndefined();
      });

      test('accept zero vars', () => {
        let fdo = new FDO();
        expect(_ => { fdo.distinct([]) }).not.toThrowError();
      });

      test('accept one var', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        expect(fdo.distinct(['A'])).toBeUndefined();
      });

      test('accept two vars', () => {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.distinct(['A', 'B'])).toBeUndefined();
      });
    });

    describe('fdo comparison with .eq and .neq', () => {

      function alias(method) {
        test('should work', () => {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method]('A', 'B')).toBeUndefined(); // returns v1
        });

        test('should work with a number left', () => {
          let fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo[method](1, 'B')).toEqual(undefined);
        });

        test('should work with a number right', () => {
          let fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo[method]('A', 2)).toEqual(undefined);
        });

        test('should work with an empty array left', () => {
          let fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo[method]([], 'B')).toBeUndefined(); // returns v2!
        });

        test('should work with an empty array right', () => {
          let fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo[method]('A', [])).toBeUndefined(); // returns v2!
        });

        test('should work with an empty array left and right', () => {
          let fdo = new FDO();
          expect(fdo[method]([], [])).toBeUndefined(); // returns v2!
        });

        test('should work with an array of one element left', () => {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method](['A'], 'B')).toBeUndefined();
        });

        test('should work with an array of one element right', () => {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method]('A', ['B'])).toBeUndefined();
        });

        test('should work with an array of multiple elements left', () => {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(fdo[method](['A', 'C', 'D'], 'B')).toBeUndefined();
        });

        test('should work with an array of multiple elements right', () => {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(fdo[method]('B', ['A', 'C', 'D'])).toBeUndefined();
        });

        test(
          'should work with an array of multiple elements on both sides',
          () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            fdo.decl('C', 100);
            fdo.decl('D', 100);
            expect(fdo[method](['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D'])).toBeUndefined();
          }
        );
      }

      alias('eq');
      alias('neq');
    });

    describe('fdo relative comparisons', () => {

      function alias(method) {
        describe('method [' + method + ']', () => {

          test('should work', () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            expect(fdo[method]('A', 'B')).toBeUndefined();
          });

          test('should work with a number left', () => {
            let fdo = new FDO();
            fdo.decl('B', 100);
            expect(fdo[method](1, 'B')).toBeUndefined(); // if we change anonymous var naming, this'll break
          });

          test('should work with a number right', () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            expect(fdo[method]('A', 2)).toBeUndefined(); // if we change anonymous var naming, this'll break
          });
          test('should not work with an empty array', () => {
            let fdo = new FDO();
            fdo.decl('B', 100);
            expect(_ => { fdo[method]([], 'B') }).toThrowError('NOT_ACCEPTING_ARRAYS');
          });

          test('should work with an array of one element', () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            expect(_ => { fdo[method](['A'], 'B') }).toThrowError('NOT_ACCEPTING_ARRAYS');
          });

          test('should work with an array of multiple elements', () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            fdo.decl('C', 100);
            fdo.decl('D', 100);
            expect(_ => { fdo[method](['A', 'C', 'D'], 'B') }).toThrowError('NOT_ACCEPTING_ARRAYS');
          });
        });
      }

      alias('gte');
      alias('gt');
      alias('lte');
      alias('lt');
    });

    describe('fdo reifiers', () => {

      function alias(method) {
        describe('method = ' + method, () => {

          test('should work:' + method, () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            expect(typeof fdo[method]('A', 'B')).toBe('string');
          });

          test('should work with a number left: ' + method, () => {
            let fdo = new FDO();
            fdo.decl('B', 100);
            expect(typeof fdo[method](1, 'B')).toBe('string');
          });

          test('should work with a number right: ' + method, () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            expect(typeof fdo[method]('A', 2)).toBe('string');
          });

          test('should accept a result name: ' + method, () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            fdo.decl('C', 100);
            expect(fdo[method]('A', 'B', 'C')).toBe('C');
          });

          test('should accept a result number: ' + method, () => {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 1);
            expect(typeof fdo[method]('A', 'B', 1)).toBe('string');
          });

          test('should throw for bad result name', () => {
            let fdo3 = new FDO();
            fdo3.decl('A', 100);
            fdo3.decl('B', 100);
            expect(_ => { fdo3[method](['A', 'B'], {}) }).toThrowError('all var names should be strings or numbers or undefined');
          });

          test('should always return the result var name', () => {
            let fdo3 = new FDO();
            fdo3.decl('A', 100);
            fdo3.decl('B', 100);
            fdo3.decl('C', 100);

            expect(typeof fdo3[method]('A', 'B')).toBe('string');
            expect(typeof fdo3[method](1, 'B')).toBe('string');
            expect(typeof fdo3[method]('A', 1)).toBe('string');
            expect(typeof fdo3[method](1, 2)).toBe('string');

            expect(fdo3[method]('A', 'B', 'C')).toBe('C');
            expect(fdo3[method](1, 'B', 'C')).toBe('C');
            expect(fdo3[method]('A', 2, 'C')).toBe('C');
            expect(fdo3[method](1, 2, 'C')).toBe('C');

            expect(typeof fdo3[method]('A', 'B', 3)).toBe('string');
            expect(typeof fdo3[method](1, 'B', 3)).toBe('string');
            expect(typeof fdo3[method]('A', 2, 3)).toBe('string');
            expect(typeof fdo3[method](1, 2, 3)).toBe('string');
          });
        });
      }

      alias('isNeq');
      alias('isEq');
      alias('isGt');
      alias('isGte');
      alias('isLt');
      alias('isLte');
    });

    describe('fdo.solve', () => {

      test('should solve a trivial case when targeted', () => {
        let fdo = new FDO({});
        fdo.declRange('A', 1, 2);

        expect(fdo.solve({vars: ['A']})).toEqual([{A: 1}, {A: 2}]);
      });

      test('should solve a trivial case when not targeted', () => {
        let fdo = new FDO({});
        fdo.declRange('A', 1, 2);

        expect(fdo.solve()).toEqual([{A: [1, 2]}]);
      });

      function forLevel(level) {
        test('should accept all log levels (' + level + ')', () => {
          let fdo = new FDO();

          expect(fdo.solve({log: level})).toEqual([{}]);
        });

        test('should accept all dbg levels (' + level + ')', () => {
          let fdo = new FDO();

          expect(fdo.solve({dbg: level})).toEqual([{}]);
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
        let fdo = new FDO();

        fdo._prepare({});
        expect(true).toBe(true);
      });

      test('should not require options object', () => {
        let fdo = new FDO();

        fdo._prepare();
        expect(true).toBe(true);
      });
    });

    describe('FDO.domainFromList', () => {

      test('should map to domainFromList', () => {
        expect(FDO.domainFromList([1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 15, 118])).toEqual([1, 2, 4, 5, 7, 7, 9, 13, 15, 15, 118, 118]);
      });

      test('should always return an array even for small domains', () => {
        expect(FDO.domainFromList([1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 15])).toEqual([1, 2, 4, 5, 7, 7, 9, 13, 15, 15]);
      });
    });
  });

  describe('targeting values', () => {

    test('should support a function comparator', () => {
      let fdo = new FDO();
      fdo.decl('a', [0, 100]);
      fdo.decl('b', [0, 100]);
      fdo.neq('a', 'b');

      let called = false;
      config_setOption(fdo.config, 'valueStrategy', (space, varIndex, choiceIndex) => {
        called = true;
        expect(space._class).toBe('$space');
        expect(typeof varIndex).toBe('number');
        expect(typeof choiceIndex).toBe('number');
      });

      fdo.solve({max: 1});

      // the callback should be called at least once
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
      let dsl = `
        : A [2 5]
        : B [2 2 4 5]
        : C [1 5]
        A < B
        C < A
      `;

      let solver = new FDO().imp(dsl);
      solver.solve({max: 1});
      // should not solve C yet because only A and B
      //expect(countSolutions(solver), 'solve count 1').to.eql(5); // C started with 5 values and is unconstrained
      expect(solver.solutions).toEqual([{A: 2, B: 4, C: 1}]);

      // need to either improve on this or ditch it entirely
      let solver2 = solver.branch_from_current_solution();
      // add a new constraint to the space and solve it
      solver2.lt('C', 'A');

      solver2.solve({
        vars: ['A', 'B', 'C'],
        max: 1,
        test: 1,
      });

      // now C is constrained as well so all vars have one possible value
      //expect(countSolutions(solver2), 'solve count 2').to.eql(1);
      expect(solver2.solutions[0].C < solver2.solutions[0].B).toBe(true);
      expect(solver2.solutions).toEqual([{A: 2, B: 4, C: 1}]);
    });
  });
});
