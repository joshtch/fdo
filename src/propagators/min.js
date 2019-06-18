import {
  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
  LOG_FLAG_PROPSTEPS,
  TRACE,
  domain__debug,
  domain_isEmpty,
  domain_intersection,
  domain_minus,
} from 'fdlib';

/**
 * Min as in minus. Only updates the result domain.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 */
function propagator_minStep(space, config, varIndex1, varIndex2, varIndex3) {
  ASSERT(
    varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0,
    'expecting three vars',
    varIndex1,
    varIndex2,
    varIndex3
  );
  const domain1 = space.vardoms[varIndex1];
  const domain2 = space.vardoms[varIndex2];
  const domain3 = space.vardoms[varIndex3];

  // TODO: prune domain1 and domain2 like ring does, but here
  const nR = _propagator_minStep(domain1, domain2, domain3);
  space.vardoms[varIndex3] = nR;

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log =>
    log(
      'propagator_minStep; indexes:',
      varIndex1,
      varIndex2,
      varIndex3,
      'doms:',
      domain__debug(domain1),
      domain__debug(domain2),
      'was',
      domain__debug(domain3),
      'now',
      domain__debug(space.vardoms[varIndex3])
    )
  );
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
  ASSERT(
    domain_isEmpty(nR) || (ASSERT_NORDOM(nR, true, domain__debug) || true),
    'R can be empty'
  );
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function _propagator_minStep(domain1, domain2, domResult) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  const domain = domain_minus(domain1, domain2);
  if (!domain) {
    TRACE('_propagator_minStep resulted in empty domain');
    return domain;
  }

  return domain_intersection(domResult, domain);
}

export { propagator_minStep, _propagator_minStep };
