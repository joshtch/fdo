// set up verifier to work as intended
// the tests in fdv should run after this script

import FDO from '../../src/index';
import {
  setSolver,
  setThrowStratMode,
} from 'fdv/verifier';

setThrowStratMode(true); // FDO shouldnt pre-optimize so would always hit throw for these tests
setSolver((dsl, fdpOptions, fdoOptions) => FDO.solve(dsl, fdoOptions));
