import {
  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
  LOG_FLAG_PROPSTEPS,
  domain__debug,
  domain_createEmpty,
  domain_isSolved,
  domain_min,
} from 'fdlib';

import { markov_createLegend, markov_createProbVector } from '../markov';

/**
 * Markov uses a special system for trying values. The domain doesn't
 * govern the list of possible values, only acts as a mask for the
 * current node in the search tree (-> space). But since FD will work
 * based on this domain anyways we will need this extra step to verify
 * whether a solved var is solved to a valid value in current context.
 *
 * Every markov variable should have a propagator. Perhaps later
 * there can be one markov propagator that checks all markov vars.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex
 */
function propagator_markovStepBare(space, config, varIndex) {
  // THIS IS VERY EXPENSIVE IF expandVectorsWith IS ENABLED

  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  const domain = space.vardoms[varIndex];

  ASSERT_NORDOM(domain);
  ASSERT(domain, 'SHOULD_NOT_BE_REJECTED');

  if (!domain_isSolved(domain)) {
    ASSERT_LOG(LOG_FLAG_PROPSTEPS, log =>
      log(
        'propagator_markovStepBare; indexes:',
        varIndex,
        'was solved:',
        domain__debug(domain)
      )
    );
    return;
  }

  const value = domain_min(domain); // Note: solved so lo=hi=value

  const configVarDistOptions = config.varDistOptions;
  const distributeOptions = configVarDistOptions[config.allVarNames[varIndex]];

  ASSERT(
    distributeOptions,
    'var should have a config',
    varIndex,
    distributeOptions && JSON.stringify(configVarDistOptions)
  );
  ASSERT(
    distributeOptions.valtype === 'markov',
    'var should be a markov var',
    distributeOptions.valtype
  );

  const { expandVectorsWith } = distributeOptions;
  ASSERT(
    distributeOptions.matrix,
    'there should be a matrix available for every var'
  );
  ASSERT(
    distributeOptions.legend || expandVectorsWith !== null,
    'every var should have a legend or expandVectorsWith set'
  );

  // Note: expandVectorsWith can be 0, so check with null
  const values = markov_createLegend(
    expandVectorsWith !== null,
    distributeOptions.legend,
    domain
  ); // TODO: domain is a value, can this be optimized? is that worth the effort? (profile this)
  const probabilities = markov_createProbVector(
    space,
    distributeOptions.matrix,
    expandVectorsWith,
    values.length
  );

  const pos = values.indexOf(value);
  if (pos < 0 || pos >= probabilities.length || probabilities[pos] === 0) {
    space.vardoms[varIndex] = domain_createEmpty();
  }

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log =>
    log(
      'propagator_markovStepBare; indexes:',
      varIndex,
      'was:',
      domain__debug(domain),
      'became:',
      domain__debug(space.vardoms[varIndex])
    )
  );
  ASSERT_NORDOM(space.vardoms[varIndex], true, domain__debug);
}

export { propagator_markovStepBare };
