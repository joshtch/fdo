import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
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

import { propagator_mulStep } from '../../../src/propagators/mul';

describe('fdo/propagators/mul.spec', () => {
  // In general after call v3 = v1 * v2

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

      propagator_mulStep(space, config, A, B, C);

      expect(true).toBe(true);
    });

    afterAll(() => {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });

  describe('propagator_mulStep', () => {
    test('should exist', () => {
      expect(typeof propagator_mulStep).toBe('function');
    });
  });

  // TODO...
});
