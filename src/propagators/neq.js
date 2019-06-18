import {
  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
  LOG_FLAG_PROPSTEPS,
  NO_SUCH_VALUE,
  domain__debug,
  domain_createEmpty,
  domain_getValue,
  domain_removeValue,
} from 'fdlib';

/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 */
function propagator_neqStepBare(space, config, varIndex1, varIndex2) {
  ASSERT(space && space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  const { vardoms } = space;
  const domain1 = vardoms[varIndex1];
  const domain2 = vardoms[varIndex2];

  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  // Remove solved value from the other domain. confirm neither rejects over it.
  let value = domain_getValue(domain1);
  if (value === NO_SUCH_VALUE) {
    // Domain1 is not solved, remove domain2 from domain1 if domain2 is solved
    value = domain_getValue(domain2);
    if (value !== NO_SUCH_VALUE) {
      vardoms[varIndex1] = domain_removeValue(domain1, value);
    }
  } else if (domain1 === domain2) {
    vardoms[varIndex1] = domain_createEmpty();
    vardoms[varIndex2] = domain_createEmpty();
  } else {
    vardoms[varIndex2] = domain_removeValue(domain2, value);
  }

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log =>
    log(
      'propagator_neqStepBare; indexes:',
      varIndex1,
      varIndex2,
      'doms:',
      domain__debug(domain1),
      'neq',
      domain__debug(domain2),
      '->',
      domain__debug(vardoms[varIndex1]),
      domain__debug(vardoms[varIndex2])
    )
  );
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
}

/**
 * Neq will only reject if both domains are solved and equal.
 * This is a read-only check.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_neqStepWouldReject(domain1, domain2) {
  const value = domain_getValue(domain1);
  const result = value !== NO_SUCH_VALUE && value === domain_getValue(domain2);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log =>
    log(
      'propagator_neqStepWouldReject;',
      domain__debug(domain1),
      '===',
      domain__debug(domain2),
      '->',
      result
    )
  );
  return result;
}

export { propagator_neqStepBare, propagator_neqStepWouldReject };
