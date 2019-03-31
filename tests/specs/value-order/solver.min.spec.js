import FDO from '../../../src/index';

describe('fdo/solver.min.spec', () => {

  test('should do base case', () => {
    let solution = FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat min
    `);

    expect(solution.A).toBe(1); // (kind of the default strat)
  });
});
