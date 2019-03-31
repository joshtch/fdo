import FDO from '../../../src/fdo';

describe('fdo/solver.splitmax.spec', () => {

  test('process values by divide and conquer, low split first', () => {
    expect(FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat splitMin
    `).A).toBe(1);
  });
});
