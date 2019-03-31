import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_dom_nums,
  fixt_dom_range,
  fixt_dom_solved,
} from 'fdlib/tests/lib/domain.fixt';

import {
  SUB,
  SUP,
} from 'fdlib/src/constants';
import {
  ASSERT_SET_LOG,
  LOG_FLAG_PROPSTEPS,
  LOG_FLAG_NONE,
} from 'fdlib/src/assert';

import {
  config_create,
  config_addVarDomain,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';
import propagator_minStep from '../../../src/propagators/min';
import {
  _propagator_minStep,
} from '../../../src/propagators/min';

describe('fdo/propagators/min.spec', () => {

  test('should prevent this regression', () => {
    let A = fixt_dom_nums(1);
    let B = fixt_dom_nums(1);
    let C = fixt_dom_range(0, 1);

    let S = _propagator_minStep(A, B, C);

    expect(S).toEqual(fixt_dom_solved(0));
  });

  describe('with LOG', () => {

    beforeAll(function() {
      ASSERT_SET_LOG(LOG_FLAG_PROPSTEPS);
    });

    test('should improve test coverage by enabling logging', () => {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(SUB, SUP));
      config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 300]));
      config_addVarDomain(config, 'C', fixt_arrdom_range(SUB, SUP));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');
      let C = config.allVarNames.indexOf('C');

      propagator_minStep(space, config, A, B, C);

      expect(true).toBe(true);
    });

    afterAll(function() {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});
