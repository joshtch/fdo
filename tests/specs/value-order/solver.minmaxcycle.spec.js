import expect from '../../../../fdlib/tests/lib/mocha_proxy.fixt';
import {
  stripAnonVarsFromArrays,
} from '../../../../fdlib/tests/lib/domain.fixt';

import FDO from '../../../src/fdo';

describe('fdo/solver.minmaxcycle.spec', function() {

  it('should process values by alternating between picking the lowest and highest value', function() {
    let dsl = `
      : V1 [1 4]
      : V2 [1 4]
      V1 > 0
      V2 > 0

      @custom val-strat minMaxCycle
    `;

    let solutions = FDO.solve(dsl, {max: 17});

    // algo starts with 'min'
    // v1 is first so it gets 'min'
    // v2 is second so it gets 'max'
    // on backtracking, v1 remains low and v2 remains 'max'
    // as a result, v1 should go from 1 to 4 and v2 from 4 to 1
    expect(stripAnonVarsFromArrays(solutions)).to.eql([
      {V1: 1, V2: 4},
      {V1: 1, V2: 3},
      {V1: 1, V2: 2},
      {V1: 1, V2: 1},
      {V1: 2, V2: 4},
      {V1: 2, V2: 3},
      {V1: 2, V2: 2},
      {V1: 2, V2: 1},
      {V1: 3, V2: 4},
      {V1: 3, V2: 3},
      {V1: 3, V2: 2},
      {V1: 3, V2: 1},
      {V1: 4, V2: 4},
      {V1: 4, V2: 3},
      {V1: 4, V2: 2},
      {V1: 4, V2: 1},
    ]);
  });
});
