import FDO from '../../../src/index';

describe('fdo/solver.mid.spec', () => {

  test('should do base case', () => {
    let solution = FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat mid
    `);

    expect(solution.A).toBe(50); // or 49 or something
  });
});
