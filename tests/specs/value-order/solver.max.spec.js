import FDO from '../../../src/fdo';

describe('fdo/solver.max.spec', () => {
  test('should do base case', () => {
    const solution = FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat max
    `);

    expect(solution.A).toBe(99); // Not 1.
  });
});
