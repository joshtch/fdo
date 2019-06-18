import FDO from '../../../src/fdo';

describe('fdo/solver.mid.spec', () => {
  test('should do base case', () => {
    const solution = FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat mid
    `);

    expect(solution.A).toBe(50); // Or 49 or something
  });
});
