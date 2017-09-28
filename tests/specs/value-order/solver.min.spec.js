import expect from '../../../../fdlib/tests/lib/mocha_proxy.fixt';

import FDO from '../../../src/fdo';

describe('fdo/solver.min.spec', function() {

  it('should do base case', function() {
    let solution = FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat min
    `);

    expect(solution.A).to.eql(1); // (kind of the default strat)
  });
});
