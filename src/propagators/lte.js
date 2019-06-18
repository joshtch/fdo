import {
  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
  LOG_FLAG_PROPSTEPS,
  domain__debug,
  domain_max,
  domain_min,
  domain_removeGte,
  domain_removeLte,
} from 'fdlib';

/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @returns {$fd_changeState}
 */
function propagator_lteStepBare(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  const domain1 = space.vardoms[varIndex1];
  const domain2 = space.vardoms[varIndex2];

  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  const lo1 = domain_min(domain1);
  const hi2 = domain_max(domain2);

  space.vardoms[varIndex1] = domain_removeGte(domain1, hi2 + 1);
  space.vardoms[varIndex2] = domain_removeLte(domain2, lo1 - 1);

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log =>
    log(
      'propagator_ltStepBare; indexes:',
      varIndex1,
      varIndex2,
      ', from:',
      domain__debug(domain1),
      '<=',
      domain__debug(domain2),
      ', to:',
      domain__debug(space.vardoms[varIndex1]),
      '<=',
      domain__debug(space.vardoms[varIndex2])
    )
  );
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
}

function propagator_gteStepBare(space, config, varIndex1, varIndex2) {
  return propagator_lteStepBare(space, config, varIndex2, varIndex1);
}

/**
 * Lte would reject if all elements in the left var are bigger than the
 * right var. And since everything is CSIS, we only have to check the
 * lo bound of left to the high bound of right for that answer.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_lteStepWouldReject(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');

  const result = domain_min(domain1) > domain_max(domain2);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log =>
    log(
      'propagator_lteStepWouldReject;',
      domain__debug(domain1),
      '>?',
      domain__debug(domain2),
      '=>',
      domain_min(domain1),
      '>?',
      domain_max(domain2),
      '->',
      result
    )
  );
  return result;
}

/**
 * Reverse of propagator_lteStepWouldReject
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_gteStepWouldReject(domain1, domain2) {
  return propagator_lteStepWouldReject(domain2, domain1);
}

export {
  propagator_gteStepBare,
  propagator_gteStepWouldReject,
  propagator_lteStepBare,
  propagator_lteStepWouldReject,
};
