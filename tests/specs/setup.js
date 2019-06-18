// Set up verifier to work as intended
// the tests in fdv should run after this script

import { setSolver, setThrowStratMode } from 'fdv/verifier';
import FDO from '../../src/fdo';

setThrowStratMode(true); // FDO shouldnt pre-optimize so would always hit throw for these tests
setSolver((dsl, fdpOptions, fdoOptions) => FDO.solve(dsl, fdoOptions));
