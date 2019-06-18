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
  ASSERT_SET_LOG,
  LOG_FLAG_PROPSTEPS,
  LOG_FLAG_NONE,
} from 'fdlib';

import { config_create, config_addVarDomain } from '../../../src/config';
import { space_createRoot, space_initFromConfig } from '../../../src/space';
import {
  propagator_minStep,
  _propagator_minStep,
} from '../../../src/propagators/min';

describe('fdo/propagators/min.spec', () => {
  test('should prevent this regression', () => {
    const A = fixt_dom_nums(1);
    const B = fixt_dom_nums(1);
    const C = fixt_dom_range(0, 1);

    const S = _propagator_minStep(A, B, C);

    expect(S).toEqual(fixt_dom_solved(0));
  });

  describe('with LOG', () => {
    beforeAll(() => {
      ASSERT_SET_LOG(LOG_FLAG_PROPSTEPS);
    });

    test('should improve test coverage by enabling logging', () => {
      const config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(SUB, SUP));
      config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 300]));
      config_addVarDomain(config, 'C', fixt_arrdom_range(SUB, SUP));
      const space = space_createRoot();
      space_initFromConfig(space, config);

      const A = config.allVarNames.indexOf('A');
      const B = config.allVarNames.indexOf('B');
      const C = config.allVarNames.indexOf('C');

      propagator_minStep(space, config, A, B, C);

      expect(true).toBe(true);
    });

    afterAll(() => {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});
