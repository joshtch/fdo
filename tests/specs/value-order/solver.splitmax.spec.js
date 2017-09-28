import expect from '../../../../fdlib/tests/lib/mocha_proxy.fixt';

import FDO from '../../../src/fdo';

describe('fdo/solver.splitmax.spec', function() {

  it('process values by divide and conquer, high split first', function() {
    expect(FDO.solve(`
      : A [1 99]
      : B 0
      A > B

      @custom val-strat splitMax
    `).A).to.eql(99);
  });
});
