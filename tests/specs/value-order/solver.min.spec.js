import FDO from '../../../src/fdo';

describe('fdo/solver.min.spec', () => {
  test('should do base case', () => {
    const solution = FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat min
    `);

    expect(solution.A).toBe(1); // (kind of the default strat)
  });
});
