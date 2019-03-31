import FDO from '../../../src/index';

describe('fdo/solver.max.spec', () => {

  test('should do base case', () => {
    let solution = FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat max
    `);

    expect(solution.A).toBe(99); // not 1.
  });
});
