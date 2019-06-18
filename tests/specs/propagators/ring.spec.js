import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_dom_empty,
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
  domain_minus,
  domain_plus,
} from 'fdlib';

import { config_addVarDomain, config_create } from '../../../src/config';
import { space_createRoot, space_initFromConfig } from '../../../src/space';
import {
  propagator_ringStepBare,
  _propagator_ringStepBare,
} from '../../../src/propagators/ring';

describe('fdo/propagators/ring.spec', () => {
  test('should prevent this regression', () => {
    const A = fixt_dom_nums(1);
    const B = fixt_dom_nums(1);
    const C = fixt_dom_range(0, 1);

    const S = _propagator_ringStepBare(A, B, C, domain_minus, 'min');

    expect(S).toEqual(fixt_dom_solved(0));
  });

  test('should add two numbers', () => {
    const A = fixt_dom_nums(1);
    const B = fixt_dom_nums(1);
    const C = fixt_dom_range(0, 10);

    const S = _propagator_ringStepBare(A, B, C, domain_plus, 'plus');

    expect(S).toEqual(fixt_dom_solved(2));
  });

  test('should reject if result is not in result domain', () => {
    const A = fixt_dom_nums(1);
    const B = fixt_dom_nums(1);
    const C = fixt_dom_range(0, 1);

    const S = _propagator_ringStepBare(A, B, C, domain_plus, 'plus');

    expect(S).toEqual(fixt_dom_empty());
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

      propagator_ringStepBare(space, config, A, B, C, 'plus', domain_plus);

      expect(true).toBe(true);
    });

    afterAll(() => {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});
