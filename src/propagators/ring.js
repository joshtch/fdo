import {
  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,

  LOG_FLAG_PROPSTEPS,
} from 'fdlib/src/assert';

import {
  domain__debug,
  domain_invMul,
  domain_intersection,
  domain_minus,
  domain_mul,
  domain_plus,
} from 'fdlib/src/domain';

/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 * @param {string} opName
 * @param {Function} opFunc
 */
function propagator_ringStepBare(space, config, varIndex1, varIndex2, varIndex3, opName, opFunc) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_STRING');
  let vardoms = space.vardoms;
  let domain1 = vardoms[varIndex1];
  let domain2 = vardoms[varIndex2];
  let domain3 = vardoms[varIndex3];

  ASSERT(opName === 'plus' ? opFunc === domain_plus : opName === 'min' ? opFunc === domain_minus : opName === 'mul' ? opFunc === domain_mul : (opName === 'div' && opFunc === domain_invMul), 'should get proper opfunc');

  space.vardoms[varIndex3] = _propagator_ringStepBare(domain1, domain2, domain3, opFunc, opName);

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_ringStepBare; op:', opName, 'indexes:', varIndex3, '=', varIndex1, {u: '+', n: '-', l: '*', v: '/'}[opName[2]], varIndex2, ', names:', config.allVarNames[varIndex3], '=', config.allVarNames[varIndex1], {u: '+', n: '-', l: '*', v: '/'}[opName[2]], config.allVarNames[varIndex2]));
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log(' - doms before:', domain__debug(domain3), '=', domain__debug(domain1), {u: '+', n: '-', l: '*', v: '/'}[opName[2]], domain__debug(domain2)));
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log(' - doms after :', domain__debug(vardoms[varIndex3]), '=', domain__debug(vardoms[varIndex1]), {u: '+', n: '-', l: '*', v: '/'}[opName[2]], domain__debug(vardoms[varIndex2])));

  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex3], true, domain__debug);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domainResult
 * @param {Function} opFunc
 * @param {string} opName For debugging only, the canonical name of opFunc
 * @returns {$domain}
 */
function _propagator_ringStepBare(domain1, domain2, domainResult, opFunc, opName) {
  ASSERT(typeof opFunc === 'function', 'EXPECTING_FUNC_TO_BE:', opName);
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = opFunc(domain1, domain2);

  return domain_intersection(domainResult, domain);
}

export {
  propagator_ringStepBare,
  _propagator_ringStepBare, // testing
};
export default propagator_ringStepBare;
