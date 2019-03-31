import {
  stripAnonVarsFromArrays,
} from 'fdlib/tests/lib/domain.fixt';
import {
  countSolutions,
} from 'fdlib/tests/lib/lib';

import FDO from '../../../src/index';

describe('fdo/distribution/distribute.spec', () => {

  describe('override value distribution strategy per var', () => {

    describe('with array', () => {

      test('v1=min, v2=max', () => {

        let solver = new FDO({});
        solver.declRange('V1', 121, 124, {
          valtype: 'min',
        });
        solver.declRange('V2', 121, 124, {
          valtype: 'max',
        });
        solver.gt('V1', 120);
        solver.gt('V2', 120);

        let solutions = solver.solve();
        // all solutions
        expect(solutions.length).toBe(16);

        // (basically V1 solves lo to hi, V2 goes hi to lo)
        expect(stripAnonVarsFromArrays(solutions)).toEqual([
          {V1: 121, V2: 124},
          {V1: 121, V2: 123},
          {V1: 121, V2: 122},
          {V1: 121, V2: 121},
          {V1: 122, V2: 124},
          {V1: 122, V2: 123},
          {V1: 122, V2: 122},
          {V1: 122, V2: 121},
          {V1: 123, V2: 124},
          {V1: 123, V2: 123},
          {V1: 123, V2: 122},
          {V1: 123, V2: 121},
          {V1: 124, V2: 124},
          {V1: 124, V2: 123},
          {V1: 124, V2: 122},
          {V1: 124, V2: 121},
        ]);
      });

      test('v1=min, v2=max (regression)', () => {

        // regression: when domains include 0, should still lead to same result

        let solver = new FDO({});
        solver.declRange('V1', 120, 124, {
          valtype: 'min',
        });
        solver.declRange('V2', 120, 124, {
          valtype: 'max',
        });
        solver.gt('V1', 120);
        solver.gt('V2', 120);

        let solutions = solver.solve();
        // all solutions
        expect(solutions.length).toBe(16);

        // (basically V1 solves lo to hi, V2 goes hi to lo)
        expect(stripAnonVarsFromArrays(solutions)).toEqual([
          {V1: 121, V2: 124},
          {V1: 121, V2: 123},
          {V1: 121, V2: 122},
          {V1: 121, V2: 121},
          {V1: 122, V2: 124},
          {V1: 122, V2: 123},
          {V1: 122, V2: 122},
          {V1: 122, V2: 121},
          {V1: 123, V2: 124},
          {V1: 123, V2: 123},
          {V1: 123, V2: 122},
          {V1: 123, V2: 121},
          {V1: 124, V2: 124},
          {V1: 124, V2: 123},
          {V1: 124, V2: 122},
          {V1: 124, V2: 121},
        ]);
      });

      test('should pick a random() value in markov', () => {

        // note: this is pretty much the same as the previous min/max test except it uses
        // markov for it but it mimics min/max because we fixate the random() outcome

        let solver = new FDO({});
        solver.declRange('V1', 120, 124, {
          valtype: 'markov',
          legend: [121, 122, 123, 124],
          random() { return 0; }, // always take the first element
          matrix: [
            {vector: [1, 1, 1, 1]},
          ],
        });
        solver.declRange('V2', 120, 124, {
          valtype: 'markov',
          legend: [121, 122, 123, 124],
          random() { return 1 - 1e-5; }, // always take the last element
          matrix: [
            {vector: [1, 1, 1, 1]},
          ],
        });
        solver.gt('V1', 120);
        solver.gt('V2', 120);

        let solutions = solver.solve();
        // all solutions
        expect(solutions.length).toBe(16);
        expect(stripAnonVarsFromArrays(solutions)).toEqual([
          {V1: 121, V2: 124},
          {V1: 121, V2: 123},
          {V1: 121, V2: 122},
          {V1: 121, V2: 121},
          {V1: 122, V2: 124},
          {V1: 122, V2: 123},
          {V1: 122, V2: 122},
          {V1: 122, V2: 121},
          {V1: 123, V2: 124},
          {V1: 123, V2: 123},
          {V1: 123, V2: 122},
          {V1: 123, V2: 121},
          {V1: 124, V2: 124},
          {V1: 124, V2: 123},
          {V1: 124, V2: 122},
          {V1: 124, V2: 121},
        ]);
      });
    });

    describe('with numbers', () => {

      test('v1=min, v2=max', () => {

        let solver = new FDO({});
        solver.declRange('V1', 1, 4, {
          valtype: 'min',
        });
        solver.declRange('V2', 1, 4, {
          valtype: 'max',
        });
        solver.gt('V1', 0);
        solver.gt('V2', 0);

        let solutions = solver.solve();
        expect(countSolutions(solver)).toBe(16);

        // (basically V1 solves lo to hi, V2 goes hi to lo)
        expect(stripAnonVarsFromArrays(solutions)).toEqual([
          {V1: 1, V2: 4},
          {V1: 1, V2: 3},
          {V1: 1, V2: 2},
          {V1: 1, V2: 1},
          {V1: 2, V2: 4},
          {V1: 2, V2: 3},
          {V1: 2, V2: 2},
          {V1: 2, V2: 1},
          {V1: 3, V2: 4},
          {V1: 3, V2: 3},
          {V1: 3, V2: 2},
          {V1: 3, V2: 1},
          {V1: 4, V2: 4},
          {V1: 4, V2: 3},
          {V1: 4, V2: 2},
          {V1: 4, V2: 1},
        ]);
      });

      test('v1=min, v2=max (regression)', () => {

        // regression: when domains include 0, should still lead to same result

        let solver = new FDO({});
        solver.declRange('V1', 0, 4, {
          valtype: 'min',
        });
        solver.declRange('V2', 0, 4, {
          valtype: 'max',
        });
        solver.gt('V1', 0);
        solver.gt('V2', 0);

        let solutions = solver.solve();
        expect(countSolutions(solver)).toBe(16);

        // (basically V1 solves lo to hi, V2 goes hi to lo)
        expect(stripAnonVarsFromArrays(solutions)).toEqual([
          {V1: 1, V2: 4},
          {V1: 1, V2: 3},
          {V1: 1, V2: 2},
          {V1: 1, V2: 1},
          {V1: 2, V2: 4},
          {V1: 2, V2: 3},
          {V1: 2, V2: 2},
          {V1: 2, V2: 1},
          {V1: 3, V2: 4},
          {V1: 3, V2: 3},
          {V1: 3, V2: 2},
          {V1: 3, V2: 1},
          {V1: 4, V2: 4},
          {V1: 4, V2: 3},
          {V1: 4, V2: 2},
          {V1: 4, V2: 1},
        ]);
      });

      test('should pick a random() value in markov', () => {

        // note: this is pretty much the same as the previous min/max test except it uses
        // markov for it but it mimics min/max because we fixate the random() outcome

        let solver = new FDO({});
        solver.declRange('V1', 0, 4, {
          valtype: 'markov',
          legend: [1, 2, 3, 4],
          random() { return 0; }, // always take the first element
          matrix: [
            {vector: [1, 1, 1, 1]},
          ],
        });
        solver.declRange('V2', 0, 4, {
          valtype: 'markov',
          legend: [1, 2, 3, 4],
          random() { return 1 - 1e-5; }, // always take the last element
          matrix: [
            {vector: [1, 1, 1, 1]},
          ],
        });
        solver.gt('V1', 0);
        solver.gt('V2', 0);

        let solutions = solver.solve();
        expect(countSolutions(solver)).toBe(16);
        expect(stripAnonVarsFromArrays(solutions)).toEqual([
          {V1: 1, V2: 4},
          {V1: 1, V2: 3},
          {V1: 1, V2: 2},
          {V1: 1, V2: 1},
          {V1: 2, V2: 4},
          {V1: 2, V2: 3},
          {V1: 2, V2: 2},
          {V1: 2, V2: 1},
          {V1: 3, V2: 4},
          {V1: 3, V2: 3},
          {V1: 3, V2: 2},
          {V1: 3, V2: 1},
          {V1: 4, V2: 4},
          {V1: 4, V2: 3},
          {V1: 4, V2: 2},
          {V1: 4, V2: 1},
        ]);
      });
    });
  });
});
