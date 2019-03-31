import {
  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
  LOG_FLAG_PROPSTEPS,
  domain__debug,
  domain_mul,
  domain_intersection,
} from 'fdlib';

/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 */
function propagator_mulStep(space, config, varIndex1, varIndex2, varIndex3) {
  ASSERT(
    varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0,
    'expecting three vars',
    varIndex1,
    varIndex2,
    varIndex3
  );
  const { vardoms } = space;
  const domain1 = vardoms[varIndex1];
  const domain2 = vardoms[varIndex2];
  const domain3 = vardoms[varIndex3];

  space.vardoms[varIndex3] = _propagator_mulStep(domain1, domain2, domain3);

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log =>
    log(
      'propagator_mulStep; indexes:',
      varIndex1,
      varIndex2,
      varIndex3,
      'doms:',
      domain__debug(domain1),
      'mul',
      domain__debug(domain2),
      'was',
      domain__debug(domain3),
      'now',
      domain__debug(vardoms[varIndex3])
    )
  );
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex3], true, domain__debug);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function _propagator_mulStep(domain1, domain2, domResult) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  const domain = domain_mul(domain1, domain2);

  return domain_intersection(domResult, domain);
}

export { propagator_mulStep };
