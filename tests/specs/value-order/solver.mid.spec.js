import expect from '../../../../fdlib/tests/lib/mocha_proxy.fixt';

import FDO from '../../../src/fdo';

describe('fdo/solver.mid.spec', function() {

  it('should do base case', function() {
    let solution = FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat mid
    `);

    expect(solution.A).to.eql(50); // or 49 or something
  });
});
