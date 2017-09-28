import { ASSERT, domain_intersection, ASSERT_LOG, LOG_FLAG_PROPSTEPS, domain__debug, ASSERT_NORDOM, domain_divby, domain_toList, THROW, domain_getValue, domain_isSolved, domain_min, domain_createEmpty, domain_isEmpty, domain_minus, TRACE, domain_mul, domain_isZero, domain_hasNoZero, domain_removeValue, domain_removeGtUnsafe, domain_plus, domain_invMul, domain_max, domain_removeGte, domain_removeLte, domain_sharesNoElements, NO_SUCH_VALUE, domain_anyToSmallest, trie_create, domain_toSmallest, domain_createRange, SUB, SUP, trie_has, trie_get, NOT_FOUND, trie_add, TRIE_KEY_NOT_FOUND, ASSERT_VARDOMS_SLOW, getTerm, INSPECT, domain_toArr, domain_toStr, TRIE_EMPTY, trie_getNum, trie_addNum, TRIE_NODE_SIZE, domain_size, domain_containsValue, LOG_FLAG_CHOICE, domain_getFirstIntersectingValue, domain_createValue, domain_middleElement, LOG_FLAG_SEARCH, ASSERT_ARRDOM, LOG_MIN, LOG_MAX, LOG_STATS, domain_fromListToArrdom, setTerm, LOG_FLAG_SOLUTIONS, LOG_SOLVES, LOG_NONE } from 'fdlib';

// A constraint acts as a abstract model in Config from which
// propagators are generated once a space is created. Constraints
// tend to be more concise and reflect the original intent, whereas
// propagators are low level. One constraint can generate multiple
// propagators to do its work, like how sum(A,B,C) breaks down to
// plus(plus(A,B), C) which in turn breaks down to 2x three propagators
// for the plus.
function constraint_create(name, varIndexes, param) {
  return {
    _class: '$constraint',
    name: name,
    varIndexes: varIndexes,
    param: param
  };
}

/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 * @returns {$fd_changeState}
 */

function propagator_divStep(space, config, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  var domain1 = space.vardoms[varIndex1];
  var domain2 = space.vardoms[varIndex2];
  var domain3 = space.vardoms[varIndex3];
  space.vardoms[varIndex3] = _propagator_divStep(domain1, domain2, domain3);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_divStep; indexes:', varIndex1, varIndex2, varIndex3, 'doms:', domain__debug(domain1), 'div', domain__debug(domain2), 'was', domain__debug(domain3), 'now', domain__debug(space.vardoms[varIndex3]));
  });
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex3], true, domain__debug);
}
/**
 * @param {$nordom} domain1
 * @param {$nordom} domain2
 * @param {$nordom} domResult
 * @returns {$nordom}
 */


function _propagator_divStep(domain1, domain2, domResult) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT_NORDOM(domResult);
  ASSERT(domain1 && domain2 && domResult, 'SHOULD_NOT_BE_REJECTED');
  var domain = domain_divby(domain1, domain2);
  return domain_intersection(domResult, domain);
}

// Markov helper functions
/**
 * If a row has no boolean condition, return it.
 * If the boolean condition of a row is 1, return it.
 * If no row meets these conditions, return the last row.
 *
 * @param {$space} space
 * @param {?} matrix
 * @returns {*}
 */

function markov_getNextRowToSolve(space, matrix) {
  var vardoms = space.vardoms;
  var row;

  for (var i = 0; i < matrix.length; i++) {
    row = matrix[i];
    var boolDomain = vardoms[row._boolVarIndex];

    if (boolDomain === undefined || domain_getValue(boolDomain) === 1) {
      break;
    }
  }

  return row;
}

function markov_createLegend(merge, inputLegend, domain) {
  if (merge) {
    return markov_mergeDomainAndLegend(inputLegend, domain);
  }

  return inputLegend;
}

function markov_mergeDomainAndLegend(inputLegend, domain) {
  var legend;

  if (inputLegend) {
    legend = inputLegend.slice(0);
  } else {
    legend = [];
  }

  var listed = domain_toList(domain);

  for (var i = 0; i < listed.length; ++i) {
    var val = listed[i];

    if (legend.indexOf(val) < 0) {
      legend.push(val);
    }
  }

  return legend;
}

function markov_createProbVector(space, matrix, expandVectorsWith, valueCount) {
  var row = markov_getNextRowToSolve(space, matrix);
  var probVector = row.vector;

  if (expandVectorsWith !== null) {
    // Could be 0
    probVector = probVector ? probVector.slice(0) : [];
    var delta = valueCount - probVector.length;

    if (delta > 0) {
      for (var i = 0; i < delta; ++i) {
        probVector.push(expandVectorsWith);
      }
    }

    return probVector;
  }

  if (!probVector || probVector.length !== valueCount) {
    THROW('E_EACH_MARKOV_VAR_MUST_HAVE_PROB_VECTOR_OR_ENABLE_EXPAND_VECTORS');
  }

  return probVector;
}

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
  var domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain, 'SHOULD_NOT_BE_REJECTED');

  if (!domain_isSolved(domain)) {
    ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
      return log('propagator_markovStepBare; indexes:', varIndex, 'was solved:', domain__debug(domain));
    });
    return;
  }

  var value = domain_min(domain); // Note: solved so lo=hi=value

  var configVarDistOptions = config.varDistOptions;
  var distributeOptions = configVarDistOptions[config.allVarNames[varIndex]];
  ASSERT(distributeOptions, 'var should have a config', varIndex, distributeOptions && JSON.stringify(configVarDistOptions));
  ASSERT(distributeOptions.valtype === 'markov', 'var should be a markov var', distributeOptions.valtype);
  var expandVectorsWith = distributeOptions.expandVectorsWith;
  ASSERT(distributeOptions.matrix, 'there should be a matrix available for every var');
  ASSERT(distributeOptions.legend || expandVectorsWith !== null, 'every var should have a legend or expandVectorsWith set'); // Note: expandVectorsWith can be 0, so check with null

  var values = markov_createLegend(expandVectorsWith !== null, distributeOptions.legend, domain); // TODO: domain is a value, can this be optimized? is that worth the effort? (profile this)

  var probabilities = markov_createProbVector(space, distributeOptions.matrix, expandVectorsWith, values.length);
  var pos = values.indexOf(value);

  if (pos < 0 || pos >= probabilities.length || probabilities[pos] === 0) {
    space.vardoms[varIndex] = domain_createEmpty();
  }

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_markovStepBare; indexes:', varIndex, 'was:', domain__debug(domain), 'became:', domain__debug(space.vardoms[varIndex]));
  });
  ASSERT_NORDOM(space.vardoms[varIndex], true, domain__debug);
}

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
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  var domain1 = space.vardoms[varIndex1];
  var domain2 = space.vardoms[varIndex2];
  var domain3 = space.vardoms[varIndex3]; // TODO: prune domain1 and domain2 like ring does, but here

  var nR = _propagator_minStep(domain1, domain2, domain3);

  space.vardoms[varIndex3] = nR;
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_minStep; indexes:', varIndex1, varIndex2, varIndex3, 'doms:', domain__debug(domain1), domain__debug(domain2), 'was', domain__debug(domain3), 'now', domain__debug(space.vardoms[varIndex3]));
  });
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
  ASSERT(domain_isEmpty(nR) || ASSERT_NORDOM(nR, true, domain__debug) || true, 'R can be empty');
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
  var domain = domain_minus(domain1, domain2);

  if (!domain) {
    TRACE('_propagator_minStep resulted in empty domain');
    return domain;
  }

  return domain_intersection(domResult, domain);
}

/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 */

function propagator_mulStep(space, config, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  var vardoms = space.vardoms;
  var domain1 = vardoms[varIndex1];
  var domain2 = vardoms[varIndex2];
  var domain3 = vardoms[varIndex3];
  space.vardoms[varIndex3] = _propagator_mulStep(domain1, domain2, domain3);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_mulStep; indexes:', varIndex1, varIndex2, varIndex3, 'doms:', domain__debug(domain1), 'mul', domain__debug(domain2), 'was', domain__debug(domain3), 'now', domain__debug(vardoms[varIndex3]));
  });
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
  var domain = domain_mul(domain1, domain2);
  return domain_intersection(domResult, domain);
}

/**
 * A boolean variable that represents whether a comparison
 * condition between two variables currently holds or not.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 * @param {Function} opFunc like propagator_ltStepBare
 * @param {Function} nopFunc opposite of opFunc like propagator_gtStepBare
 * @param {string} opName
 * @param {string} invOpName
 * @param {Function} opRejectChecker
 * @param {Function} nopRejectChecker
 */

function propagator_reifiedStepBare(space, config, leftVarIndex, rightVarIndex, resultVarIndex, opFunc, nopFunc, opName, invOpName, opRejectChecker, nopRejectChecker) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof leftVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof rightVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof resultVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_STRING');
  ASSERT(typeof invOpName === 'string', 'NOP_SHOULD_BE_STRING');
  var vardoms = space.vardoms;
  var domResult = vardoms[resultVarIndex];
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_reifiedStepBare before; op:', opName, ', indexes:', resultVarIndex, '=', leftVarIndex, opName + '?', rightVarIndex, ', doms:', domain__debug(vardoms[resultVarIndex]), '=', domain__debug(vardoms[leftVarIndex]), opName + '?', domain__debug(vardoms[rightVarIndex]));
  }); // The result var is either ZERO (reified constraint must not hold) or NONZERO (reified constraint must hold)
  // the actual nonzero value, if any, is irrelevant

  if (domain_isZero(domResult)) {
    nopFunc(space, config, leftVarIndex, rightVarIndex);
  } else if (domain_hasNoZero(domResult)) {
    opFunc(space, config, leftVarIndex, rightVarIndex);
  } else {
    var domain1 = vardoms[leftVarIndex];
    var domain2 = vardoms[rightVarIndex];
    ASSERT_NORDOM(domain1);
    ASSERT_NORDOM(domain2);
    ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');
    ASSERT(!domain_isZero(domResult) && !domain_hasNoZero(domResult), 'result should be booly now');

    if (nopRejectChecker(domain1, domain2)) {
      ASSERT(!opRejectChecker(domain1, domain2), 'with non-empty domains op and nop cant BOTH reject');
      vardoms[resultVarIndex] = domain_removeValue(domResult, 0);
      opFunc(space, config, leftVarIndex, rightVarIndex);
    } else if (opRejectChecker(domain1, domain2)) {
      vardoms[resultVarIndex] = domain_removeGtUnsafe(domResult, 0);
      nopFunc(space, config, leftVarIndex, rightVarIndex);
    }
  }

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_reifiedStepBare after; doms:', domain__debug(vardoms[resultVarIndex]), '=', domain__debug(vardoms[leftVarIndex]), opName + '?', domain__debug(vardoms[rightVarIndex]));
  });
  ASSERT_NORDOM(space.vardoms[leftVarIndex], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[rightVarIndex], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[resultVarIndex], true, domain__debug);
}

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
  var vardoms = space.vardoms;
  var domain1 = vardoms[varIndex1];
  var domain2 = vardoms[varIndex2];
  var domain3 = vardoms[varIndex3];
  ASSERT(opName === 'plus' && opFunc === domain_plus || opName === 'min' && opFunc === domain_minus || opName === 'mul' && opFunc === domain_mul || opName === 'div' && opFunc === domain_invMul, 'should get proper opfunc');
  space.vardoms[varIndex3] = _propagator_ringStepBare(domain1, domain2, domain3, opFunc, opName);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_ringStepBare; op:', opName, 'indexes:', varIndex3, '=', varIndex1, {
      u: '+',
      n: '-',
      l: '*',
      v: '/'
    }[opName[2]], varIndex2, ', names:', config.allVarNames[varIndex3], '=', config.allVarNames[varIndex1], {
      u: '+',
      n: '-',
      l: '*',
      v: '/'
    }[opName[2]], config.allVarNames[varIndex2]);
  });
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log(' - doms before:', domain__debug(domain3), '=', domain__debug(domain1), {
      u: '+',
      n: '-',
      l: '*',
      v: '/'
    }[opName[2]], domain__debug(domain2));
  });
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log(' - doms after :', domain__debug(vardoms[varIndex3]), '=', domain__debug(vardoms[varIndex1]), {
      u: '+',
      n: '-',
      l: '*',
      v: '/'
    }[opName[2]], domain__debug(vardoms[varIndex2]));
  });
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
  var domain = opFunc(domain1, domain2);
  return domain_intersection(domainResult, domain);
}

/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 */

function propagator_ltStepBare(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  var domain1 = space.vardoms[varIndex1];
  var domain2 = space.vardoms[varIndex2];
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');
  var lo1 = domain_min(domain1);
  var hi2 = domain_max(domain2);
  space.vardoms[varIndex1] = domain_removeGte(domain1, hi2);
  space.vardoms[varIndex2] = domain_removeLte(domain2, lo1);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_ltStepBare; indexes:', varIndex1, varIndex2, ', from:', domain__debug(domain1), '<', domain__debug(domain2), ', to:', domain__debug(space.vardoms[varIndex1]), '<', domain__debug(space.vardoms[varIndex2]));
  });
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
}

function propagator_gtStepBare(space, config, varIndex1, varIndex2) {
  return propagator_ltStepBare(space, config, varIndex2, varIndex1);
}
/**
 * Lt would reject if all elements in the left var are bigger or equal to
 * the right var. And since everything is CSIS, we only have to check the
 * lo bound of left to the high bound of right for that answer.
 * Read-only check
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */


function propagator_ltStepWouldReject(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');
  var result = domain_min(domain1) >= domain_max(domain2);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_ltStepWouldReject;', domain__debug(domain1), '>=?', domain__debug(domain2), '=>', domain_min(domain1), '>=?', domain_max(domain2), '->', result);
  });
  return result;
}
/**
 * Reverse of propagator_ltStepWouldReject
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */


function propagator_gtStepWouldReject(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');
  return propagator_ltStepWouldReject(domain2, domain1);
}

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
  var domain1 = space.vardoms[varIndex1];
  var domain2 = space.vardoms[varIndex2];
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');
  var lo1 = domain_min(domain1);
  var hi2 = domain_max(domain2);
  space.vardoms[varIndex1] = domain_removeGte(domain1, hi2 + 1);
  space.vardoms[varIndex2] = domain_removeLte(domain2, lo1 - 1);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_ltStepBare; indexes:', varIndex1, varIndex2, ', from:', domain__debug(domain1), '<=', domain__debug(domain2), ', to:', domain__debug(space.vardoms[varIndex1]), '<=', domain__debug(space.vardoms[varIndex2]));
  });
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
  var result = domain_min(domain1) > domain_max(domain2);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_lteStepWouldReject;', domain__debug(domain1), '>?', domain__debug(domain2), '=>', domain_min(domain1), '>?', domain_max(domain2), '->', result);
  });
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

/**
 * This eq propagator looks a lot different from neq because in
 * eq we can prune early all values that are not covered by both.
 * Any value that is not covered by both can not be a valid solution
 * that holds this constraint. In neq that's different and we can
 * only start pruning once at least one var has a solution.
 * Basically eq is much more efficient compared to neq because we
 * can potentially skip a lot of values early.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @returns {$fd_changeState}
 */

function propagator_eqStepBare(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  var vardoms = space.vardoms;
  var domain1 = vardoms[varIndex1];
  var domain2 = vardoms[varIndex2];
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');
  var result = domain_intersection(domain1, domain2);
  vardoms[varIndex1] = result;
  vardoms[varIndex2] = result;
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_eqStepBare; indexes:', varIndex1, varIndex2, 'doms:', domain__debug(domain1), 'eq', domain__debug(domain2), '->', domain__debug(result));
  });
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
}
/**
 * The eq step would reject if there all elements in one domain
 * do not occur in the other domain. Because then there's no
 * valid option to make sure A=B holds. So search for such value
 * or return false.
 * Read only check
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */


function propagator_eqStepWouldReject(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');
  var result = domain_sharesNoElements(domain1, domain2);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_eqStepWouldReject;', domain__debug(domain1), '!==', domain__debug(domain2), '->', result);
  });
  return result;
}

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
  var vardoms = space.vardoms;
  var domain1 = vardoms[varIndex1];
  var domain2 = vardoms[varIndex2];
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED'); // Remove solved value from the other domain. confirm neither rejects over it.

  var value = domain_getValue(domain1);

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

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_neqStepBare; indexes:', varIndex1, varIndex2, 'doms:', domain__debug(domain1), 'neq', domain__debug(domain2), '->', domain__debug(vardoms[varIndex1]), domain__debug(vardoms[varIndex2]));
  });
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
  var value = domain_getValue(domain1);
  var result = value !== NO_SUCH_VALUE && value === domain_getValue(domain2);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('propagator_neqStepWouldReject;', domain__debug(domain1), '===', domain__debug(domain2), '->', result);
  });
  return result;
}

/**
 * @param {string} name
 * @param {Function} stepper
 * @param {number} index1
 * @param {number} [index2=-1]
 * @param {number} [index3=-1]
 * @param {string} [arg1='']
 * @param {string} [arg2='']
 * @param {string} [arg3='']
 * @param {string} [arg4='']
 * @param {string} [arg5='']
 * @param {string} [arg6='']
 * @returns {$propagator}
 */

function propagator_create(name, stepper, index1, index2, index3, arg1, arg2, arg3, arg4, arg5, arg6) {
  if (index1 === void 0) {
    index1 = -1;
  }

  if (index2 === void 0) {
    index2 = -1;
  }

  if (index3 === void 0) {
    index3 = -1;
  }

  if (arg1 === void 0) {
    arg1 = '';
  }

  if (arg2 === void 0) {
    arg2 = '';
  }

  if (arg3 === void 0) {
    arg3 = '';
  }

  if (arg4 === void 0) {
    arg4 = '';
  }

  if (arg5 === void 0) {
    arg5 = '';
  }

  if (arg6 === void 0) {
    arg6 = '';
  }

  return {
    _class: '$propagator',
    name: name,
    stepper: stepper,
    index1: index1,
    index2: index2,
    index3: index3,
    arg1: arg1,
    arg2: arg2,
    arg3: arg3,
    arg4: arg4,
    arg5: arg5,
    arg6: arg6
  };
}
/**
 * Adds propagators which reify the given operator application
 * to the given boolean variable.
 *
 * `opname` is a string giving the name of the comparison
 * operator to reify. Currently, 'eq', 'neq', 'lt', 'lte', 'gt' and 'gte'
 * are supported.
 *
 * `leftVarIndex` and `rightVarIndex` are the arguments accepted
 * by the comparison operator.
 *
 * `resultVarIndex` is the name of the boolean variable to which to
 * reify the comparison operator. Note that this boolean
 * variable must already have been declared. If this argument
 * is omitted from the call, then the `reified` function can
 * be used in "functional style" and will return the name of
 * the reified boolean variable which you can pass to other
 * propagator creator functions.
 *
 * @param {$config} config
 * @param {string} opname
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 */


function propagator_addReified(config, opname, leftVarIndex, rightVarIndex, resultVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof opname === 'string', 'OP_SHOULD_BE_STRING');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  ASSERT(typeof resultVarIndex === 'number' && resultVarIndex >= 0, 'RESULT_VAR_SHOULD_BE_VALID_INDEX', resultVarIndex);
  var nopName;
  var opFunc;
  var nopFunc;
  var opRejectChecker;
  var nopRejectChecker;

  switch (opname) {
    case 'eq':
      {
        nopName = 'neq';
        opFunc = propagator_eqStepBare;
        nopFunc = propagator_neqStepBare;
        opRejectChecker = propagator_eqStepWouldReject;
        nopRejectChecker = propagator_neqStepWouldReject;
        break;
      }

    case 'neq':
      {
        nopName = 'eq';
        opFunc = propagator_neqStepBare;
        nopFunc = propagator_eqStepBare;
        opRejectChecker = propagator_neqStepWouldReject;
        nopRejectChecker = propagator_eqStepWouldReject;
        break;
      }

    case 'lt':
      opFunc = propagator_ltStepBare;
      opRejectChecker = propagator_ltStepWouldReject;
      nopName = 'gte';
      nopFunc = propagator_gteStepBare;
      nopRejectChecker = propagator_gteStepWouldReject;
      break;

    case 'lte':
      opFunc = propagator_lteStepBare;
      opRejectChecker = propagator_lteStepWouldReject;
      nopName = 'gt';
      nopFunc = propagator_gtStepBare;
      nopRejectChecker = propagator_gtStepWouldReject;
      break;

    case 'gt':
      return propagator_addReified(config, 'lt', rightVarIndex, leftVarIndex, resultVarIndex);

    case 'gte':
      return propagator_addReified(config, 'lte', rightVarIndex, leftVarIndex, resultVarIndex);

    default:
      THROW('UNKNOWN_REIFIED_OP');
  }

  config_addPropagator(config, propagator_create('reified', propagator_reifiedStepBare, leftVarIndex, rightVarIndex, resultVarIndex, opFunc, nopFunc, opname, nopName, opRejectChecker, nopRejectChecker));
}
/**
 * Domain equality propagator. Creates the propagator
 * in given config.
 * Can pass in vars or numbers that become anonymous
 * vars. Must at least pass in one var because the
 * propagator would be useless otherwise.
 *
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 */


function propagator_addEq(config, leftVarIndex, rightVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  config_addPropagator(config, propagator_create('eq', propagator_eqStepBare, leftVarIndex, rightVarIndex));
}
/**
 * Less than propagator. See general propagator nores
 * for fdeq which also apply to this one.
 *
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 */


function propagator_addLt(config, leftVarIndex, rightVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  config_addPropagator(config, propagator_create('lt', propagator_ltStepBare, leftVarIndex, rightVarIndex));
}
/**
 * Greater than propagator.
 *
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 */


function propagator_addGt(config, leftVarIndex, rightVarIndex) {
  // _swap_ v1 and v2 because: a>b is b<a
  propagator_addLt(config, rightVarIndex, leftVarIndex);
}
/**
 * Less than or equal to propagator.
 *
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 */


function propagator_addLte(config, leftVarIndex, rightVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  config_addPropagator(config, propagator_create('lte', propagator_lteStepBare, leftVarIndex, rightVarIndex));
}
/**
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 */


function propagator_addMul(config, leftVarIndex, rightVarIndex, resultVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  ASSERT(typeof resultVarIndex === 'number' && resultVarIndex >= 0, 'RESULT_VAR_SHOULD_BE_VALID_INDEX', resultVarIndex);
  config_addPropagator(config, propagator_create('mul', propagator_mulStep, leftVarIndex, rightVarIndex, resultVarIndex));
}
/**
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 */


function propagator_addDiv(config, leftVarIndex, rightVarIndex, resultVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  ASSERT(typeof resultVarIndex === 'number' && resultVarIndex >= 0, 'RESULT_VAR_SHOULD_BE_VALID_INDEX', resultVarIndex);
  config_addPropagator(config, propagator_create('div', propagator_divStep, leftVarIndex, rightVarIndex, resultVarIndex));
}
/**
 * Greater than or equal to.
 *
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 */


function propagator_addGte(config, leftVarIndex, rightVarIndex) {
  // _swap_ v1 and v2 because: a>=b is b<=a
  propagator_addLte(config, rightVarIndex, leftVarIndex);
}
/**
 * Ensures that the two variables take on different values.
 *
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 */


function propagator_addNeq(config, leftVarIndex, rightVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  config_addPropagator(config, propagator_create('neq', propagator_neqStepBare, leftVarIndex, rightVarIndex));
}
/**
 * Takes an arbitrary number of FD variables and adds propagators that
 * ensure that they are pairwise distinct.
 *
 * @param {$config} config
 * @param {number[]} varIndexes
 */


function propagator_addDistinct(config, varIndexes) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  for (var i = 0; i < varIndexes.length; i++) {
    var varIndex = varIndexes[i];

    for (var j = 0; j < i; ++j) {
      propagator_addNeq(config, varIndex, varIndexes[j]);
    }
  }
}
/**
 * @param {$config} config
 * @param {string} targetOpName
 * @param {string} invOpName
 * @param {Function} opFunc
 * @param {Function} nopFunc
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 */


function propagator_addRingPlusOrMul(config, targetOpName, invOpName, opFunc, nopFunc, leftVarIndex, rightVarIndex, resultVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof targetOpName === 'string', 'OP_SHOULD_BE_STRING');
  ASSERT(typeof invOpName === 'string', 'INV_OP_SHOULD_BE_STRING');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  ASSERT(typeof resultVarIndex === 'number' && resultVarIndex >= 0, 'RESULT_VAR_SHOULD_BE_VALID_INDEX', resultVarIndex);
  propagator_addRing(config, leftVarIndex, rightVarIndex, resultVarIndex, targetOpName, opFunc);
  propagator_addRing(config, resultVarIndex, rightVarIndex, leftVarIndex, invOpName, nopFunc);
  propagator_addRing(config, resultVarIndex, leftVarIndex, rightVarIndex, invOpName, nopFunc);
}
/**
 * @param {$config} config
 * @param {string} A
 * @param {string} B
 * @param {string} C
 * @param {string} opName
 * @param {Function} opFunc
 */


function propagator_addRing(config, A, B, C, opName, opFunc) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof A === 'number' && A >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', A);
  ASSERT(typeof B === 'number' && B >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', B);
  ASSERT(typeof C === 'number' && C >= 0, 'RESULT_VAR_SHOULD_BE_VALID_INDEX', C);
  config_addPropagator(config, propagator_create('ring', propagator_ringStepBare, A, B, C, opName, opFunc));
}
/**
 * Bidirectional addition propagator.
 *
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 */


function propagator_addPlus(config, leftVarIndex, rightVarIndex, resultVarIndex) {
  propagator_addRingPlusOrMul(config, 'plus', 'min', domain_plus, domain_minus, leftVarIndex, rightVarIndex, resultVarIndex);
}
/**
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 */


function propagator_addMin(config, leftVarIndex, rightVarIndex, resultVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof leftVarIndex === 'number' && leftVarIndex >= 0, 'LEFT_VAR_SHOULD_BE_VALID_INDEX', leftVarIndex);
  ASSERT(typeof rightVarIndex === 'number' && rightVarIndex >= 0, 'RIGHT_VAR_SHOULD_BE_VALID_INDEX', rightVarIndex);
  ASSERT(typeof resultVarIndex === 'number' && resultVarIndex >= 0, 'RESULT_VAR_SHOULD_BE_VALID_INDEX', resultVarIndex);
  config_addPropagator(config, propagator_create('min', propagator_minStep, leftVarIndex, rightVarIndex, resultVarIndex));
}
/**
 * Bidirectional multiplication propagator.
 *
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 */


function propagator_addRingMul(config, leftVarIndex, rightVarIndex, resultVarIndex) {
  propagator_addRingPlusOrMul(config, 'mul', 'div', domain_mul, domain_invMul, leftVarIndex, rightVarIndex, resultVarIndex);
}
/**
 * Sum of N domains = resultVar
 * Creates as many anonymous varIndexes as necessary.
 *
 * @param {$config} config
 * @param {number[]} varIndexes
 * @param {number} resultVarIndex
 */


function propagator_addSum(config, varIndexes, resultVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(Array.isArray(varIndexes), 'varIndexes should be an array of var names', varIndexes);
  ASSERT(typeof resultVarIndex === 'number' && resultVarIndex >= 0, 'RESULT_VAR_SHOULD_BE_VALID_INDEX', typeof resultVarIndex, resultVarIndex);
  var len = varIndexes.length;

  switch (len) {
    case 0:
      THROW('SUM_REQUIRES_VARS');
      return undefined;

    case 1:
      propagator_addEq(config, resultVarIndex, varIndexes[0]);
      return undefined;

    case 2:
      propagator_addPlus(config, varIndexes[0], varIndexes[1], resultVarIndex);
      return undefined;

    default:
      break;
  } // "divide and conquer" ugh. feels like there is a better way to do this


  ASSERT(len > 2, 'expecting at least 3 elements in the list...', varIndexes);
  var t1;
  var n = Math.floor(varIndexes.length / 2);

  if (n > 1) {
    t1 = config_addVarAnonNothing(config);
    propagator_addSum(config, varIndexes.slice(0, n), t1);
  } else {
    t1 = varIndexes[0];
  }

  var t2 = config_addVarAnonNothing(config);
  propagator_addSum(config, varIndexes.slice(n), t2);
  propagator_addPlus(config, t1, t2, resultVarIndex);
}
/**
 * Product of N varIndexes = resultVar.
 * Create as many anonymous varIndexes as necessary.
 *
 * @param {$config} config
 * @param {number[]} varIndexes
 * @param {number} resultVarIndex
 */


function propagator_addProduct(config, varIndexes, resultVarIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(Array.isArray(varIndexes), 'varIndexes should be an array of var names', varIndexes);
  ASSERT(typeof resultVarIndex === 'number' && resultVarIndex >= 0, 'RESULT_VAR_SHOULD_BE_VALID_INDEX', resultVarIndex);

  switch (varIndexes.length) {
    case 0:
      THROW('PRODUCT_REQUIRES_VARS');
      return undefined;

    case 1:
      // Note: by putting the result var first we get
      // the var name back for it in case it's a number
      propagator_addEq(config, resultVarIndex, varIndexes[0]);
      return undefined;

    case 2:
      propagator_addRingMul(config, varIndexes[0], varIndexes[1], resultVarIndex);
      return undefined;

    default:
      break;
  }

  var n = Math.floor(varIndexes.length / 2);
  var t1;

  if (n > 1) {
    t1 = config_addVarAnonNothing(config);
    propagator_addProduct(config, varIndexes.slice(0, n), t1);
  } else {
    t1 = varIndexes[0];
  }

  var t2 = config_addVarAnonNothing(config);
  propagator_addProduct(config, varIndexes.slice(n), t2);
  propagator_addRingMul(config, t1, t2, resultVarIndex);
}
/**
 * @param {$config} config
 * @param {number} varIndex
 */


function propagator_addMarkov(config, varIndex) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varIndex === 'number' && varIndex >= 0, 'VAR_SHOULD_BE_VALID_INDEX', varIndex);
  config_addPropagator(config, propagator_create('markov', propagator_markovStepBare, varIndex));
}

// Config for a search tree where each node is a Space
/**
 * @returns {$config}
 */

function config_create() {
  var config = {
    _class: '$config',
    // Names of all vars in this search tree
    allVarNames: [],
    // Doing `indexOf` for 5000+ names is _not_ fast. so use a trie
    _varNamesTrie: trie_create(),
    varStratConfig: config_createVarStratConfig(),
    valueStratName: 'min',
    targetedVars: 'all',
    varDistOptions: {},
    beforeSpace: undefined,
    afterSpace: undefined,
    // This is for the rng stuff in this library. in due time all calls
    // should happen through this function. and it should be initialized
    // with the rngCode string for exportability. this would be required
    // for webworkers and DSL imports which can't have functions. tests
    // can initialize it to something static, prod can use a seeded rng.
    rngCode: '',
    // String. Function(rngCode) should return a callable rng
    _defaultRng: undefined,
    // Function. if not exist at init time it'll be `rngCode ? Function(rngCode) : Math.random`
    // the propagators are generated from the constraints when a space
    // is created from this config. constraints are more higher level.
    allConstraints: [],
    constantCache: {},
    // <value:varIndex>, generally anonymous vars but pretty much first come first serve
    initialDomains: [],
    // $nordom[] : initial domains for each var, maps 1:1 to allVarNames
    _propagators: [],
    // Initialized later
    _varToPropagators: [],
    // Initialized later
    _constrainedAway: [],
    // List of var names that were constrained but whose constraint was optimized away. they will still be "targeted" if target is all. TODO: fix all tests that depend on this and eliminate this. it is a hack.
    _constraintHash: {} // Every constraint is logged here (note: for results only the actual constraints are stored). if it has a result, the value is the result var _name_. otherwise just `true` if it exists and `false` if it was optimized away.

  };

  if (process.env.NODE_ENV !== 'production') {
    config._propagates = 0;
  }

  return config;
}

function config_clone(config, newDomains) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  var varStratConfig = config.varStratConfig,
      valueStratName = config.valueStratName,
      targetedVars = config.targetedVars,
      varDistOptions = config.varDistOptions,
      constantCache = config.constantCache,
      allVarNames = config.allVarNames,
      allConstraints = config.allConstraints,
      initialDomains = config.initialDomains,
      _propagators = config._propagators,
      _varToPropagators = config._varToPropagators,
      _constrainedAway = config._constrainedAway;
  var clone = {
    _class: '$config',
    _varNamesTrie: trie_create(allVarNames),
    // Just create a new trie with (should be) the same names
    varStratConfig: varStratConfig,
    valueStratName: valueStratName,
    targetedVars: Array.isArray(targetedVars) ? targetedVars.slice(0) : targetedVars,
    varDistOptions: JSON.parse(JSON.stringify(varDistOptions)),
    // TOFIX: clone this more efficiently
    rngCode: config.rngCode,
    _defaultRng: config.rngCode ? undefined : config._defaultRng,
    constantCache: constantCache,
    // Is by reference ok?
    allVarNames: allVarNames.slice(0),
    allConstraints: allConstraints.slice(0),
    initialDomains: newDomains ? newDomains.map(domain_toSmallest) : initialDomains,
    // <varName:domain>
    _propagators: _propagators && _propagators.slice(0),
    // In case it is initialized
    _varToPropagators: _varToPropagators && _varToPropagators.slice(0),
    // Inited elsewhere
    _constrainedAway: _constrainedAway && _constrainedAway.slice(0),
    // List of var names that were constrained but whose constraint was optimized away. they will still be "targeted" if target is all. TODO: fix all tests that depend on this and eliminate this. it is a hack.
    // not sure what to do with this in the clone...
    _constraintHash: {}
  };

  if (process.env.NODE_ENV !== 'production') {
    clone._propagates = 0;
  }

  return clone;
}
/**
 * Add an anonymous var with max allowed range
 *
 * @param {$config} config
 * @returns {number} varIndex
 */


function config_addVarAnonNothing(config) {
  return config_addVarNothing(config, true);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, is anonymous)
 * @returns {number} varIndex
 */


function config_addVarNothing(config, varName) {
  return _config_addVar(config, varName, domain_createRange(SUB, SUP));
}
/**
 * @param {$config} config
 * @param {number} lo
 * @param {number} hi
 * @returns {number} varIndex
 */


function config_addVarAnonRange(config, lo, hi) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof lo === 'number', 'A_LO_MUST_BE_NUMBER');
  ASSERT(typeof hi === 'number', 'A_HI_MUST_BE_NUMBER');
  if (lo === hi) return config_addVarAnonConstant(config, lo);
  return config_addVarRange(config, true, lo, hi);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, is anonymous)
 * @param {number} lo
 * @param {number} hi
 * @returns {number} varIndex
 */


function config_addVarRange(config, varName, lo, hi) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varName === 'string' || varName === true, 'A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  ASSERT(typeof lo === 'number', 'A_LO_MUST_BE_NUMBER');
  ASSERT(typeof hi === 'number', 'A_HI_MUST_BE_NUMBER');
  ASSERT(lo <= hi, 'A_RANGES_SHOULD_ASCEND');
  var domain = domain_createRange(lo, hi);
  return _config_addVar(config, varName, domain);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, anon)
 * @param {$arrdom} domain Small domain format not allowed here. this func is intended to be called from FDO, which only accepts arrdoms
 * @returns {number} varIndex
 */


function config_addVarDomain(config, varName, domain, _allowEmpty, _override) {
  ASSERT(Array.isArray(domain), 'DOMAIN_MUST_BE_ARRAY_HERE');
  return _config_addVar(config, varName, domain_anyToSmallest(domain), _allowEmpty, _override);
}
/**
 * @param {$config} config
 * @param {number} value
 * @returns {number} varIndex
 */


function config_addVarAnonConstant(config, value) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');

  if (config.constantCache[value] !== undefined) {
    return config.constantCache[value];
  }

  return config_addVarConstant(config, true, value);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (True means anon)
 * @param {number} value
 * @returns {number} varIndex
 */


function config_addVarConstant(config, varName, value) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varName === 'string' || varName === true, 'varName must be a string or true for anon');
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');
  var domain = domain_createRange(value, value);
  return _config_addVar(config, varName, domain);
}
/**
 * @param {$config} config
 * @param {string|true} varName If true, the varname will be the same as the index it gets on allVarNames
 * @param {$nordom} domain
 * @returns {number} varIndex
 */


function _config_addVar(config, varName, domain, _allowEmpty, _override) {
  if (_override === void 0) {
    _override = false;
  }

  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(_allowEmpty || domain, 'NON_EMPTY_DOMAIN');
  ASSERT(_allowEmpty || domain_min(domain) >= SUB, 'domain lo should be >= SUB', domain);
  ASSERT(_allowEmpty || domain_max(domain) <= SUP, 'domain hi should be <= SUP', domain);

  if (_override) {
    ASSERT(trie_has(config._varNamesTrie, varName), 'Assuming var exists when explicitly overriding');
    var index = trie_get(config._varNamesTrie, varName);
    ASSERT(index >= 0, 'should exist');
    ASSERT_NORDOM(domain, true, domain__debug);
    config.initialDomains[index] = domain;
    return;
  }

  var allVarNames = config.allVarNames;
  var varIndex = allVarNames.length;

  if (varName === true) {
    varName = '__' + String(varIndex) + '__';
  } else {
    if (typeof varName !== 'string') THROW('Var names should be a string or anonymous, was: ' + JSON.stringify(varName));
    if (!varName) THROW('Var name cannot be empty string');
    if (String(parseInt(varName, 10)) === varName) THROW("Don't use numbers as var names (" + varName + ')');
  } // Note: 100 is an arbitrary number but since large sets are probably
  // automated it's very unlikely we'll need this check in those cases


  if (varIndex < 100) {
    if (trie_has(config._varNamesTrie, varName)) THROW('Var name already part of this config. Probably a bug?', varName);
  }

  var solvedTo = domain_getValue(domain);
  if (solvedTo !== NOT_FOUND && !config.constantCache[solvedTo]) config.constantCache[solvedTo] = varIndex;
  ASSERT_NORDOM(domain, true, domain__debug);
  config.initialDomains[varIndex] = domain;
  config.allVarNames.push(varName);
  trie_add(config._varNamesTrie, varName, varIndex);
  return varIndex;
}
/**
 * Create a config object for the var distribution
 *
 * @param {Object} obj
 * @property {string} [obj.type] Map to the internal names for var distribution strategies
 * @property {string} [obj.priorityByName] An ordered list of var names to prioritize. Names not in the list go implicitly and unordered last.
 * @property {boolean} [obj.inverted] Should the list be interpreted inverted? Unmentioned names still go last, regardless.
 * @property {Object} [obj.fallback] Same struct as obj. If current strategy is inconclusive it can fallback to another strategy.
 * @returns {$var_strat_config}
 */


function config_createVarStratConfig(obj) {
  /**
   * @typedef {$var_strat_config}
   */
  return {
    _class: '$var_strat_config',
    type: obj && obj.type || 'naive',
    priorityByName: obj && obj.priorityByName,
    _priorityByIndex: undefined,
    inverted: Boolean(obj && obj.inverted),
    fallback: obj && obj.fallback
  };
}
/**
 * Configure an option for the solver
 *
 * @param {$config} config
 * @param {string} optionName
 * @param {*} optionValue
 * @param {string} [optionTarget] For certain options, this is the target var name
 */


function config_setOption(config, optionName, optionValue, optionTarget) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof optionName === 'string', 'option name is a string');
  ASSERT(optionValue !== undefined, 'should get a value');
  ASSERT(optionTarget === undefined || typeof optionTarget === 'string', 'the optional name is a string');

  if (optionName === 'varStratOverride') {
    THROW('deprecated, should be wiped internally');
  }

  var fallback = false;

  switch (optionName) {
    case 'varStrategyFallback':
      fallback = true;
    // Fall-through

    case 'varStrategy':
      {
        if (typeof optionValue === 'function') THROW('functions no longer supported', optionValue);
        if (typeof optionValue === 'string') THROW('strings should be passed on as {type:value}', optionValue);
        if (typeof optionValue !== 'object') THROW('varStrategy should be object', optionValue);
        if (optionValue.name) THROW('name should be type');
        if (optionValue.dist_name) THROW('dist_name should be type');
        ASSERT(!optionTarget, 'optionTarget is not used for varStrategy (this is not "per-var strat")');
        var vsc = config_createVarStratConfig(optionValue);

        if (fallback) {
          var rvsc = config.varStratConfig;
          ASSERT(rvsc, 'there must be an existing config to add a fallback');

          while (rvsc.fallback) {
            rvsc = rvsc.fallback;
          }

          rvsc.fallback = vsc;
        } else {
          config.varStratConfig = vsc;

          while (vsc.fallback) {
            vsc.fallback = config_createVarStratConfig(vsc.fallback);
            vsc = vsc.fallback;
          }
        }

        break;
      }

    case 'valueStrategy':
      // Determine how the next value of a variable is picked when creating a new space
      config.valueStratName = optionValue;
      break;

    case 'targeted_var_names':
      if (!optionValue || optionValue.length === 0) {
        THROW('ONLY_USE_WITH_SOME_TARGET_VARS'); // Omit otherwise to target all
      } // Which vars must be solved for this space to be solved
      // string: 'all'
      // string[]: list of vars that must be solved
      // function: callback to return list of names to be solved


      config.targetedVars = optionValue;
      break;

    case 'varStratOverrides':
      // An object which defines a value distributor per variable
      // which overrides the globally set value distributor.
      // See Bvar#distributeOptions (in multiverse)
      for (var _i2 = 0, _Object$entries2 = Object.entries(optionValue); _i2 < _Object$entries2.length; _i2++) {
        var _Object$entries2$_i = _Object$entries2[_i2],
            key = _Object$entries2$_i[0],
            value = _Object$entries2$_i[1];
        config_setOption(config, 'varValueStrat', value, key);
      }

      break;

    case 'varValueStrat':
      // Override all the specific strategy parameters for one variable
      ASSERT(typeof optionTarget === 'string', 'expecting a name');
      if (!config.varDistOptions) config.varDistOptions = {};
      ASSERT(!config.varDistOptions[optionTarget], 'should not be known yet');
      config.varDistOptions[optionTarget] = optionValue;

      if (optionValue.valtype === 'markov') {
        var matrix = optionValue.matrix;

        if (!matrix) {
          if (optionValue.expandVectorsWith) {
            optionValue.matrix = [{
              vector: []
            }];
            matrix = optionValue.matrix;
          } else {
            THROW('FDO: markov var missing distribution (needs matrix or expandVectorsWith)');
          }
        }

        for (var _iterator = matrix, _isArray = Array.isArray(_iterator), _i3 = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
          var _ref;

          if (_isArray) {
            if (_i3 >= _iterator.length) break;
            _ref = _iterator[_i3++];
          } else {
            _i3 = _iterator.next();
            if (_i3.done) break;
            _ref = _i3.value;
          }

          var row = _ref;
          if (row.boolean) THROW('row.boolean was deprecated in favor of row.boolVarName');
          if (row.booleanId !== undefined) THROW('row.booleanId is no longer used, please use row.boolVarName');
          var boolFuncOrName = row.boolVarName;

          if (typeof boolFuncOrName === 'function') {
            boolFuncOrName = boolFuncOrName(optionValue);
          }

          if (boolFuncOrName) {
            if (typeof boolFuncOrName !== 'string') {
              THROW('row.boolVarName, if it exists, should be the name of a var or a func that returns that name, was/got: ' + boolFuncOrName + ' (' + typeof boolFuncOrName + ')');
            } // Store the var index


            row._boolVarIndex = trie_get(config._varNamesTrie, boolFuncOrName);
          }
        }
      }

      break;
    // Hooks called before and after propagating each space.
    // The callback receives the targeted Space object.
    // If it returns truthy it immediately aborts the search entirely.
    // (Can be used for timeout, inspection, or manual selection)

    case 'beforeSpace':
      config.beforeSpace = optionValue;
      break;

    case 'afterSpace':
      config.afterSpace = optionValue;
      break;

    case 'var':
      return THROW('REMOVED. Replace `var` with `varStrategy`');

    case 'val':
      return THROW('REMOVED. Replace `var` with `valueStrategy`');

    case 'rng':
      // Sets the default rng for this solve. a string should be raw js
      // code, number will be a static return value, a function is used
      // as is. the resulting function should return a value `0<=v<1`
      if (typeof optionValue === 'string') {
        config.rngCode = optionValue;
      } else if (typeof optionValue === 'number') {
        config.rngCode = 'return ' + optionValue + ';'; // Dont use arrow function. i dont think this passes through babel.
      } else {
        ASSERT(typeof optionValue === 'function', 'rng should be a preferably a string and otherwise a function');
        config._defaultRng = optionValue;
      }

      break;

    default:
      THROW('unknown option');
  }
}
/**
 * @param {$config} config
 * @param {$propagator} propagator
 */


function config_addPropagator(config, propagator) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(propagator._class === '$propagator', 'EXPECTING_PROPAGATOR');

  config._propagators.push(propagator);
}
/**
 * Creates a mapping from a varIndex to a set of propagatorIndexes
 * These propagators are the ones that use the varIndex
 * This is useful for quickly determining which propagators
 * need to be stepped while propagating them.
 *
 * @param {$config} config
 */


function config_populateVarPropHash(config) {
  var hash = new Array(config.allVarNames.length);
  var propagators = config._propagators;
  var initialDomains = config.initialDomains;

  for (var propagatorIndex = 0, plen = propagators.length; propagatorIndex < plen; ++propagatorIndex) {
    var propagator = propagators[propagatorIndex];

    _config_addVarConditionally(propagator.index1, initialDomains, hash, propagatorIndex);

    if (propagator.index2 >= 0) _config_addVarConditionally(propagator.index2, initialDomains, hash, propagatorIndex);
    if (propagator.index3 >= 0) _config_addVarConditionally(propagator.index3, initialDomains, hash, propagatorIndex);
  }

  config._varToPropagators = hash;
}

function _config_addVarConditionally(varIndex, initialDomains, hash, propagatorIndex) {
  // (at some point this could be a strings, or array, or whatever)
  ASSERT(typeof varIndex === 'number', 'must be number'); // Dont bother adding props on unsolved vars because they can't affect
  // anything anymore. seems to prevent about 10% in our case so worth it.

  var domain = initialDomains[varIndex];
  ASSERT_NORDOM(domain, true, domain__debug);

  if (!domain_isSolved(domain)) {
    if (!hash[varIndex]) hash[varIndex] = [propagatorIndex];else if (hash[varIndex].indexOf(propagatorIndex) < 0) hash[varIndex].push(propagatorIndex);
  }
}
/**
 * Create a constraint. If the constraint has a result var it
 * will return (only) the variable name that ends up being
 * used (anonymous or not).
 *
 * In some edge cases the constraint can be resolved immediately.
 * There are two ways a constraint can resolve: solved or reject.
 * A solved constraint is omitted and if there is a result var it
 * will become a constant that is set to the outcome of the
 * constraint. If rejected the constraint will still be added and
 * will immediately reject the search once it starts.
 *
 * Due to constant optimization and mapping the result var name
 * may differ from the input var name. In that case both names
 * should map to the same var index internally. Only constraints
 * with a result var have a return value here.
 *
 * @param {$config} config
 * @param {string} name Type of constraint (hardcoded values)
 * @param {<string,number,undefined>[]} varNames All the argument var names for target constraint
 * @param {string} [param] The result var name for certain. With reifiers param is the actual constraint to reflect.
 * @returns {string|undefined} Actual result vars only, undefined otherwise. See desc above.
 */


function config_addConstraint(config, name, varNames, param) {
  // Should return a new var name for most props
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(varNames.every(function (e) {
    return typeof e === 'string' || typeof e === 'number' || e === undefined;
  }), 'all var names should be strings or numbers or undefined', varNames);
  var inputConstraintKeyOp = name;
  var resultVarName;
  var anonIsBool = false;

  switch (name
  /* eslint no-fallthrough: "off" */
  ) {
    case 'reifier':
      anonIsBool = true;
      inputConstraintKeyOp = param;
    // Fall-through

    case 'plus':
    case 'min':
    case 'ring-mul':
    case 'ring-div':
    case 'mul':
      ASSERT(varNames.length === 3, 'MISSING_RESULT_VAR');
    // Note that the third value may still be "undefined"
    // fall-through

    case 'sum':
    case 'product':
      {
        var sumOrProduct = name === 'product' || name === 'sum';
        resultVarName = sumOrProduct ? param : varNames[2];
        var resultVarIndex;

        if (resultVarName === undefined) {
          if (anonIsBool) resultVarIndex = config_addVarAnonRange(config, 0, 1);else resultVarIndex = config_addVarAnonNothing(config);
          resultVarName = config.allVarNames[resultVarIndex];
        } else if (typeof resultVarName === 'number') {
          resultVarIndex = config_addVarAnonConstant(config, resultVarName);
          resultVarName = config.allVarNames[resultVarIndex];
        } else if (typeof resultVarName === 'string') {
          resultVarIndex = trie_get(config._varNamesTrie, resultVarName);
          if (resultVarIndex < 0) THROW('Vars must be defined before using them (' + resultVarName + ')');
        } else {
          THROW("expecting result var name to be absent or a number or string: `" + resultVarName + "`");
        }

        if (sumOrProduct) param = resultVarIndex;else varNames[2] = resultVarName;
        break;
      }

    case 'distinct':
    case 'eq':
    case 'neq':
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte':
      break;

    default:
      THROW("UNKNOWN_PROPAGATOR " + name);
  } // Note: if param is a var constant then that case is already resolved above


  config_compileConstants(config, varNames);
  if (config_dedupeConstraint(config, inputConstraintKeyOp + '|' + varNames.join(','), resultVarName)) return resultVarName;
  var varIndexes = config_varNamesToIndexes(config, varNames);
  var constraint = constraint_create(name, varIndexes, param);
  config.allConstraints.push(constraint);
  return resultVarName;
}
/**
 * Go through the list of var names and create an anonymous var for
 * each value that is actually a number rather than a string.
 * Replaces the values inline.
 *
 * @param {$config} config
 * @param {string|number} varNames
 */


function config_compileConstants(config, varNames) {
  for (var i = 0, n = varNames.length; i < n; ++i) {
    if (typeof varNames[i] === 'number') {
      var varIndex = config_addVarAnonConstant(config, varNames[i]);
      varNames[i] = config.allVarNames[varIndex];
    }
  }
}
/**
 * Convert a list of var names to a list of their indexes
 *
 * @param {$config} config
 * @param {string[]} varNames
 * @returns {number[]}
 */


function config_varNamesToIndexes(config, varNames) {
  var varIndexes = [];

  for (var i = 0, n = varNames.length; i < n; ++i) {
    var varName = varNames[i];
    ASSERT(typeof varName === 'string', 'var names should be strings here', varName, i, varNames);
    var varIndex = trie_get(config._varNamesTrie, varName);
    if (varIndex === TRIE_KEY_NOT_FOUND) THROW('CONSTRAINT_VARS_SHOULD_BE_DECLARED', 'name=', varName, 'index=', i, 'names=', varNames);
    varIndexes[i] = varIndex;
  }

  return varIndexes;
}
/**
 * Check whether we already know a given constraint (represented by a unique string).
 * If we don't, add the string to the cache with the expected result name, if any.
 *
 * @param config
 * @param constraintUI
 * @param resultVarName
 * @returns {boolean}
 */


function config_dedupeConstraint(config, constraintUI, resultVarName) {
  if (!config._constraintHash) config._constraintHash = {}; // Can happen for imported configs that are extended or smt

  var haveConstraint = config._constraintHash[constraintUI];

  if (haveConstraint === true) {
    if (resultVarName !== undefined) {
      throw new Error('How is this possible?'); // Either a constraint-with-value gets a result var, or it's a constraint-sans-value
    }

    return true;
  }

  if (haveConstraint !== undefined) {
    ASSERT(typeof haveConstraint === 'string', 'if not true or undefined, it should be a string');
    ASSERT(resultVarName && typeof resultVarName === 'string', 'if it was recorded as a constraint-with-value then it should have a result var now as well'); // The constraint exists and had a result. map that result to this result for equivalent results.

    config_addConstraint(config, 'eq', [resultVarName, haveConstraint]); // _could_ also be optimized away ;)

    return true;
  }

  config._constraintHash[constraintUI] = resultVarName || true;
  return false;
}
/**
 * Generate all propagators from the constraints in given config
 * Puts these back into the same config.
 *
 * @param {$config} config
 */


function config_generatePropagators(config) {
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  var allConstraints = config.allConstraints;
  config._propagators = [];

  for (var _iterator2 = allConstraints, _isArray2 = Array.isArray(_iterator2), _i4 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
    var _ref2;

    if (_isArray2) {
      if (_i4 >= _iterator2.length) break;
      _ref2 = _iterator2[_i4++];
    } else {
      _i4 = _iterator2.next();
      if (_i4.done) break;
      _ref2 = _i4.value;
    }

    var constraint = _ref2;

    if (constraint.varNames) {
      getTerm().warn('saw constraint.varNames, converting to varIndexes, log out result and update test accordingly');
      constraint.varIndexes = constraint.varNames.map(function (name) {
        return trie_get(config._varNamesTrie, name);
      });
      var p = constraint.param;
      delete constraint.param;
      delete constraint.varNames;
      constraint.param = p;
    }

    if (constraint.varIndexes[1] === -1) throw new Error('nope? ' + INSPECT(constraint));
    config_generatePropagator(config, constraint.name, constraint.varIndexes, constraint.param, constraint);
  }
}
/**
 * @param {$config} config
 * @param {string} name
 * @param {number[]} varIndexes
 * @param {string|undefined} param Depends on the prop; reifier=op name, product/sum=result var
 */


function config_generatePropagator(config, name, varIndexes, param, _constraint) {
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof name === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(Array.isArray(varIndexes), 'INDEXES_SHOULD_BE_ARRAY', JSON.stringify(_constraint));

  switch (name) {
    case 'plus':
      return propagator_addPlus(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'min':
      return propagator_addMin(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'ring-mul':
      return propagator_addRingMul(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'ring-div':
      return propagator_addDiv(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'mul':
      return propagator_addMul(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'sum':
      return propagator_addSum(config, varIndexes.slice(0), param);

    case 'product':
      return propagator_addProduct(config, varIndexes.slice(0), param);

    case 'distinct':
      return propagator_addDistinct(config, varIndexes.slice(0));

    case 'reifier':
      return propagator_addReified(config, param, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'neq':
      return propagator_addNeq(config, varIndexes[0], varIndexes[1]);

    case 'eq':
      return propagator_addEq(config, varIndexes[0], varIndexes[1]);

    case 'gte':
      return propagator_addGte(config, varIndexes[0], varIndexes[1]);

    case 'lte':
      return propagator_addLte(config, varIndexes[0], varIndexes[1]);

    case 'gt':
      return propagator_addGt(config, varIndexes[0], varIndexes[1]);

    case 'lt':
      return propagator_addLt(config, varIndexes[0], varIndexes[1]);

    default:
      THROW('UNEXPECTED_NAME: ' + name);
  }
}

function config_generateMarkovs(config) {
  var varDistOptions = config.varDistOptions;

  for (var _i5 = 0, _Object$keys = Object.keys(varDistOptions); _i5 < _Object$keys.length; _i5++) {
    var varName = _Object$keys[_i5];
    var varIndex = trie_get(config._varNamesTrie, varName);
    if (varIndex < 0) THROW('Found markov var options for an unknown var name (name=' + varName + ')');
    var options = varDistOptions[varName];

    if (options && options.valtype === 'markov') {
      return propagator_addMarkov(config, varIndex);
    }
  }
}

function config_populateVarStrategyListHash(config) {
  var vsc = config.varStratConfig;

  while (vsc) {
    if (vsc.priorityByName) {
      var obj = {};
      var list = vsc.priorityByName;

      for (var i = 0, len = list.length; i < len; ++i) {
        var varIndex = trie_get(config._varNamesTrie, list[i]);
        ASSERT(varIndex !== TRIE_KEY_NOT_FOUND, 'VARS_IN_PRIO_LIST_SHOULD_BE_KNOWN_NOW');
        obj[varIndex] = len - i; // Never 0, offset at 1. higher value is higher prio
      }

      vsc._priorityByIndex = obj;
    }

    vsc = vsc.fallback;
  }
}
/**
 * At the start of a search, populate this config with the dynamic data
 *
 * @param {$config} config
 */


function config_init(config) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  if (!config._varNamesTrie) {
    config._varNamesTrie = trie_create(config.allVarNames);
  } // Generate the default rng ("Random Number Generator") to use in stuff like markov
  // We prefer the rngCode because that way we can serialize the config (required for stuff like webworkers)


  if (!config._defaultRng) config._defaultRng = config.rngCode ? new Function(config.rngCode) : Math.random;
  /* eslint no-new-func: "off" */

  ASSERT_VARDOMS_SLOW(config.initialDomains, domain__debug);
  config_generatePropagators(config);
  config_generateMarkovs(config);
  config_populateVarPropHash(config);
  config_populateVarStrategyListHash(config);
  ASSERT_VARDOMS_SLOW(config.initialDomains, domain__debug);
  ASSERT(config._varToPropagators, 'should have generated hash');
}

// This is an export function for config
/**
 * Export a given config with optional target domains
 * (initial domains otherwise) to special DSL string.
 * The resulting string should be usable with the
 * importer to create a new solver with same state.
 * This function only omits constraints when they only
 * consist of constants. Optimization should occur elsewhere.
 *
 * @param {$config} config
 * @param {$domain[]} [vardoms] If not given then config.initialDomains are used
 * @param {boolean} [usePropagators] Output the low-level propagators instead of the higher level constraints
 * @param {boolean} [minimal] Omit comments, use short var names, reduce whitespace where possible. etc
 * @param {boolean} [withDomainComments] Put the input domains behind each constraint even if minimal=true
 * @param {boolean} [realName] Use the original var names?
 * @returns {string}
 */

function exporter(config, vardoms, usePropagators, minimal, withDomainComments, realName) {
  // TOFIX: the alias stuff needs to be unique. currently exports from presolver clash with names generated here.
  realName = true; // TODO: dont export contants that are not bound to constraints and not targeted explicitly
  // TODO: deal export->import better wrt anonymous vars

  var var_dist_options = config.varDistOptions;
  var domains = vardoms || config.initialDomains;
  var varNames = config.allVarNames;
  var indexToString = realName ? function (index) {
    return exporter_encodeVarName(varNames[index]);
  } : minimal ? exporter_varstrShort : exporter_varstrNum;
  var vars = varNames.map(function (varName, varIndex) {
    var domain = exporter_domstr(domains[varIndex]);
    var s = ': ' + indexToString(varIndex) + ' = ' + domain;
    var overrides = var_dist_options[varName];

    if (overrides && (overrides.valtype !== 'list' || overrides.list && overrides.list.length > 0)) {
      s += ' @' + overrides.valtype;

      switch (overrides.valtype) {
        case 'markov':
          if ('expandVectorsWith' in overrides) s += 'expand(' + (overrides.expandVectorsWith || 0) + ')';
          if ('legend' in overrides) s += ' legend(' + overrides.legend.join(' ') + ')';
          if ('matrix' in overrides) s += ' matrix(' + JSON.stringify(overrides.matrix).replace(/"/g, '') + ')';
          break;

        case 'list':
          if (typeof overrides.list === 'function') s += ' prio(???func???)';else s += ' prio(' + overrides.list.join(' ') + ')';
          break;

        case 'max':
        case 'mid':
        case 'min':
        case 'minMaxCycle':
        case 'naive':
        case 'splitMax':
        case 'splitMin':
          break;

        default:
          getTerm().warn('Unknown value strategy override: ' + overrides.valtype);
          s += ' @? ' + JSON.stringify(overrides);
      }
    }

    if (!realName && varName !== String(varIndex)) s += String(' # ' + exporter_encodeVarName(varName));
    return s;
  });
  var constraints = usePropagators ? [] : config.allConstraints.map(function (constraint) {
    var indexes = constraint.varIndexes; // Create var names for each index, unless solved, in that case use solved value as literal

    var aliases = indexes.map(indexToString);
    indexes.forEach(function (varIndex, i) {
      var v = domain_getValue(domains[varIndex]);
      if (v >= 0) aliases[i] = v;
    }); // Do same for param if it's an index

    var paramName = '';

    if (typeof constraint.param === 'number') {
      var paramV = domain_getValue(domains[constraint.param]);
      if (paramV >= 0) paramName = paramV;else paramName = indexToString(constraint.param);
    }

    var s = '';
    var comment = '';
    var op;

    switch (constraint.name) {
      case 'reifier':
        switch (constraint.param) {
          case 'eq':
            op = '==';
            break;

          case 'neq':
            op = '!=';
            break;

          case 'lt':
            op = '<';
            break;

          case 'lte':
            op = '<=';
            break;

          case 'gt':
            op = '>';
            break;

          case 'gte':
            op = '>=';
            break;

          default:
            THROW('what dis param: ' + op);
        }

        s += aliases[2] + ' = ' + aliases[0] + ' ' + op + '? ' + aliases[1];
        break;

      case 'plus':
        s += aliases[2] + ' = ' + aliases[0] + ' + ' + aliases[1];
        break;

      case 'min':
        s += aliases[2] + ' = ' + aliases[0] + ' - ' + aliases[1];
        break;

      case 'ring-mul':
        s += aliases[2] + ' = ' + aliases[0] + ' * ' + aliases[1];
        break;

      case 'ring-div':
        s += aliases[2] + ' = ' + aliases[0] + ' / ' + aliases[1];
        break;

      case 'mul':
        s += aliases[2] + ' = ' + aliases[0] + ' * ' + aliases[1];
        break;

      case 'sum':
        s += paramName + ' = sum(' + aliases.join(' ') + ')';
        break;

      case 'product':
        s += paramName + ' = product(' + aliases.join(' ') + ')';
        break;

      case 'markov':
        s += '# markov(' + aliases + ')';
        break;

      case 'distinct':
        s += 'distinct(' + aliases + ')';
        break;

      case 'eq':
        s += aliases[0] + ' == ' + aliases[1];
        break;

      case 'neq':
        s += aliases[0] + ' != ' + aliases[1];
        break;

      case 'lt':
        s += aliases[0] + ' < ' + aliases[1];
        break;

      case 'lte':
        s += aliases[0] + ' <= ' + aliases[1];
        break;

      case 'gt':
        s += aliases[0] + ' > ' + aliases[1];
        break;

      case 'gte':
        s += aliases[0] + ' >= ' + aliases[1];
        break;

      default:
        getTerm().warn('unknown constraint: ' + constraint.name);
        s += 'unknown = ' + JSON.stringify(constraint);
    }

    var t = s; // If a constraint has no vars, ignore it.
    // note: this assumes those constraints are not contradictions

    if (s.indexOf(realName ? "'" : '$') < 0 || constraint.name === 'distinct' && aliases.length <= 1 || (constraint.name === 'product' || constraint.name === 'sum') && aliases.length === 0) {
      if (!minimal) {
        comment += (comment ? ', ' : ' # ') + 'dropped; constraint already solved (' + s + ') (' + indexes.map(indexToString) + ', ' + indexToString(constraint.param) + ')';
      }

      s = '';
    }

    if (!minimal || withDomainComments) {
      // This is more for easier debugging...
      aliases.forEach(function (alias, i) {
        if (typeof alias === 'string') t = t.replace(alias, exporter_domstr(domains[indexes[i]]));
      });
      if (typeof constraint.param === 'number' && typeof paramName === 'string') t = t.replace(paramName, exporter_domstr(domains[constraint.param]));

      if (s || !minimal) {
        // S += ' '.repeat(Math.max(0, 30 - s.length))
        for (var i = Math.max(0, 30 - s.length); i >= 0; --i) {
          s += ' ';
        }

        s += '      # ' + t;
      }

      s += comment;
    }

    return s;
  }).filter(function (s) {
    return Boolean(s);
  });
  var propagators = usePropagators ? config._propagators.map(function (propagator) {
    var varIndex1 = propagator.index1;
    var varIndex2 = propagator.index2;
    var varIndex3 = propagator.index3;
    var v1 = varIndex1 >= 0 ? domain_getValue(domains[varIndex1]) : -1;
    var name1 = v1 >= 0 ? v1 : varIndex1 < 0 ? undefined : indexToString(varIndex1);
    var v2 = varIndex2 >= 0 ? domain_getValue(domains[varIndex2]) : -1;
    var name2 = v2 >= 0 ? v2 : varIndex2 < 0 ? undefined : indexToString(varIndex2);
    var v3 = varIndex3 >= 0 ? domain_getValue(domains[varIndex3]) : -1;
    var name3 = v3 >= 0 ? v3 : varIndex3 < 0 ? undefined : indexToString(varIndex3);
    var s = '';
    var comment = '';
    var op;

    switch (propagator.name) {
      case 'reified':
        switch (propagator.arg3) {
          case 'eq':
            op = '==';
            break;

          case 'neq':
            op = '!=';
            break;

          case 'lt':
            op = '<';
            break;

          case 'lte':
            op = '<=';
            break;

          case 'gt':
            op = '>';
            break;

          case 'gte':
            op = '>=';
            break;

          default:
            THROW('what dis param: ' + op);
        }

        s += name3 + ' = ' + name1 + ' ' + op + '? ' + name2;
        break;

      case 'eq':
        s += name1 + ' == ' + name2;
        break;

      case 'lt':
        s += name1 + ' < ' + name2;
        break;

      case 'lte':
        s += name1 + ' <= ' + name2;
        break;

      case 'mul':
        s += name3 + ' = ' + name1 + ' * ' + name2;
        break;

      case 'div':
        s += name3 + ' = ' + name1 + ' / ' + name2;
        break;

      case 'neq':
        s += name1 + ' != ' + name2;
        break;

      case 'min':
        s += name3 + ' = ' + name1 + ' - ' + name2;
        break;

      case 'ring':
        switch (propagator.arg1) {
          case 'plus':
            s += name3 + ' = ' + name1 + ' + ' + name2;
            break;

          case 'min':
            s += name3 + ' = ' + name1 + ' - ' + name2;
            break;

          case 'ring-mul':
            s += name3 + ' = ' + name1 + ' * ' + name2;
            break;

          case 'ring-div':
            s += name3 + ' = ' + name1 + ' / ' + name2;
            break;

          default:
            throw new Error('Unexpected ring op:' + propagator.arg1);
        }

        break;

      case 'markov':
        // ignore. the var @markov modifier should cause this. it's not a real constraint.
        return '';

      default:
        getTerm().warn('unknown propagator: ' + propagator.name);
        s += 'unknown = ' + JSON.stringify(propagator);
    }

    var t = s; // If a propagator has no vars, ignore it.
    // note: this assumes those constraints are not contradictions

    if (s.indexOf('$') < 0) {
      if (!minimal) comment += (comment ? ', ' : ' # ') + 'dropped; constraint already solved (' + s + ')';
      s = '';
    }

    if (!minimal) {
      // This is more for easier debugging...
      if (typeof name1 === 'string') t = t.replace(name1, exporter_domstr(domains[varIndex1]));
      if (typeof name2 === 'string') t = t.replace(name2, exporter_domstr(domains[varIndex2]));
      if (typeof name3 === 'string') t = t.replace(name3, exporter_domstr(domains[varIndex3]));
      s += ' '.repeat(Math.max(0, 30 - s.length)) + '      # initial: ' + t;
      s += comment;
    }

    return s;
  }).filter(function (s) {
    return Boolean(s);
  }) : [];
  return ['## constraint problem export', '@custom var-strat = ' + JSON.stringify(config.varStratConfig), // TODO
  '@custom val-strat = ' + config.valueStratName, vars.join('\n') || '# no vars', constraints.join('\n') || propagators.join('\n') || '# no constraints', '@custom targets ' + (config.targetedVars === 'all' ? ' = all' : '(' + config.targetedVars.map(function (varName) {
    return indexToString(trie_get(config._varNamesTrie, varName));
  }).join(' ') + ')'), '## end of export'].join('\n\n');
}

function exporter_encodeVarName(varName) {
  if (typeof varName === 'number') return varName; // Constant

  return "'" + varName + "'"; // "quoted var names" can contain any char.
}

function exporter_varstrNum(varIndex) {
  // Note: we put a `$` behind it so that we can search-n-replace for `$1` without matching `$100`
  return '$' + varIndex + '$';
}

function exporter_varstrShort(varIndex) {
  // Take care not to start the name with a number
  // note: .toString(36) uses a special (standard) base 36 encoding; 0-9a-z to represent 0-35
  var name = varIndex.toString(36);
  if (name[0] < 'a') name = '$' + name; // This is a little lazy but whatever

  return name;
}

function exporter_domstr(domain) {
  // Represent domains as pairs, a single pair as [lo hi] and multiple as [[lo hi] [lo hi]]
  var arrdom = domain_toArr(domain);
  if (arrdom.length === 2 && arrdom[0] === arrdom[1]) return String(arrdom[0]);

  if (arrdom.length > 2) {
    var dom = [];

    for (var i = 0, n = arrdom.length; i < n; i += 2) {
      dom.push('[' + arrdom[i] + ' ' + arrdom[i + 1] + ']');
    }

    arrdom = dom;
  }

  return '[' + arrdom.join(' ') + ']';
}

// This is an import function for config
/**
 * @param {string} str
 * @param {FDO} [solver]
 * @param {boolean} [_debug] Log out entire input with error token on fail?
 * @returns {FDO}
 */

function importer(str, solver, _debug) {
  if (!solver) solver = new FDO();
  var pointer = 0;
  var len = str.length;

  while (!isEof()) {
    parseStatement();
  }

  return solver;

  function read() {
    return str[pointer];
  }

  function readD(delta) {
    return str[pointer + delta];
  }

  function skip() {
    ++pointer;
  }

  function is(c, desc) {
    if (read() !== c) THROW('Expected ' + (desc ? desc + ' ' : '') + '`' + c + '`, found `' + read() + '`');
    skip();
  }

  function skipWhitespaces() {
    while (pointer < len && isWhitespace(read())) {
      skip();
    }
  }

  function skipWhites() {
    while (!isEof()) {
      var c = read();

      if (isWhite(c)) {
        skip();
      } else if (isComment(c)) {
        skipComment();
      } else {
        break;
      }
    }
  }

  function isWhitespace(s) {
    return s === ' ' || s === '\t';
  }

  function isNewline(s) {
    return s === '\n' || s === '\r';
  }

  function isComment(s) {
    return s === '#';
  }

  function isWhite(s) {
    return isWhitespace(s) || isNewline(s);
  }

  function expectEol() {
    skipWhitespaces();

    if (pointer < len) {
      var c = read();

      if (c === '#') {
        skipComment();
      } else if (isNewline(c)) {
        skip();
      } else {
        THROW('Expected EOL but got `' + read() + '`');
      }
    }
  }

  function atEol() {
    if (pointer >= len) return true;
    var c = read();
    return c === '#' || isNewline(c);
  }

  function isEof() {
    return pointer >= len;
  }

  function parseStatement() {
    // Either:
    // - start with colon: var decl
    // - start with hash: line comment
    // - empty: empty
    // - otherwise: constraint
    skipWhites();

    switch (read()) {
      case ':':
        return parseVar();

      case '#':
        return skipComment();

      case '@':
        return parseAtRule();

      default:
        if (!isEof()) return parseUndefConstraint();
    }
  }

  function parseVar() {
    skip(); // Is(':')

    skipWhitespaces();
    var nameNames = parseIdentifier();
    skipWhitespaces();

    if (read() === ',') {
      nameNames = [nameNames];

      do {
        skip();
        skipWhitespaces();
        nameNames.push(parseIdentifier());
        skipWhitespaces();
      } while (!isEof() && read() === ',');
    }

    if (read() === '=') {
      skip();
      skipWhitespaces();
    }

    var domain = parseDomain();
    skipWhitespaces();
    var mod = parseModifier();
    expectEol();

    if (typeof nameNames === 'string') {
      solver.decl(nameNames, domain, mod, true);
    } else {
      nameNames.forEach(function (name) {
        return solver.decl(name, domain, mod, true);
      });
    }
  }

  function parseIdentifier() {
    if (read() === "'") return parseQuotedIdentifier();
    return parseUnquotedIdentifier();
  }

  function parseQuotedIdentifier() {
    is("'", 'start of Quoted identifier');
    var start = pointer;
    var c = read();

    while (!isEof() && !isNewline(c) && c !== "'") {
      skip();
      c = read();
    }

    if (isEof()) THROW('Quoted identifier must be closed');
    if (start === pointer) THROW('Expected to parse identifier, found none');
    is("'", 'end of Quoted identifier');
    return str.slice(start, pointer - 1); // Return unquoted ident
  }

  function parseUnquotedIdentifier() {
    // Anything terminated by whitespace
    var start = pointer;
    if (read() >= '0' && read() <= '9') THROW('Unquoted ident cant start with number');

    while (!isEof() && isValidUnquotedIdentChar(read())) {
      skip();
    }

    if (start === pointer) THROW('Expected to parse identifier, found none [' + read() + ']');
    return str.slice(start, pointer);
  }

  function isValidUnquotedIdentChar(c) {
    // Meh. i syntactically dont care about unicode chars so if you want to use them i wont stop you here
    return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c === '_' || c === '$' || c === '-' || c > '~';
  }

  function parseDomain() {
    // []
    // [lo hi]
    // [[lo hi] [lo hi] ..]
    // *
    // 25
    // (comma's optional and ignored)
    var c = read();
    var domain;

    switch (c) {
      case '[':
        is('[', 'domain start');
        skipWhitespaces();
        domain = [];

        if (read() === '[') {
          do {
            skip();
            skipWhitespaces();
            var lo = parseNumber();
            skipWhitespaces();

            if (read() === ',') {
              skip();
              skipWhitespaces();
            }

            var hi = parseNumber();
            skipWhitespaces();
            is(']', 'range-end');
            skipWhitespaces();
            domain.push(lo, hi);

            if (read() === ',') {
              skip();
              skipWhitespaces();
            }
          } while (read() === '[');
        } else if (read() !== ']') {
          do {
            skipWhitespaces();

            var _lo = parseNumber();

            skipWhitespaces();

            if (read() === ',') {
              skip();
              skipWhitespaces();
            }

            var _hi = parseNumber();

            skipWhitespaces();
            domain.push(_lo, _hi);

            if (read() === ',') {
              skip();
              skipWhitespaces();
            }
          } while (read() !== ']');
        }

        is(']', 'domain-end');
        if (domain.length === 0) THROW('Empty domain [] in dsl, this problem will always reject');
        return domain;

      case '*':
        skip();
        return [SUB, SUP];

      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        {
          var v = parseNumber();
          skipWhitespaces();
          return [v, v];
        }

      default:
        THROW('Expecting valid domain start, found `' + c + '`');
    }
  }

  function parseModifier() {
    if (read() !== '@') return;
    skip();
    var mod = {};
    var start = pointer;

    while (read() >= 'a' && read() <= 'z') {
      skip();
    }

    var stratName = str.slice(start, pointer);

    switch (stratName) {
      case 'list':
        parseList(mod);
        break;

      case 'markov':
        parseMarkov(mod);
        break;

      case 'max':
      case 'mid':
      case 'min':
      case 'naive':
        break;

      case 'minMaxCycle':
      case 'splitMax':
      case 'splitMin':
      default:
        THROW('implement me (var mod) [`' + stratName + '`]');
    }

    mod.valtype = stratName;
    return mod;
  }

  function parseList(mod) {
    skipWhitespaces();
    if (str.slice(pointer, pointer + 5) !== 'prio(') THROW('Expecting the priorities to follow the `@list`');
    pointer += 5;
    mod.list = parseNumList();
    is(')', 'list end');
  }

  function parseMarkov(mod) {
    for (;;) {
      skipWhitespaces();

      if (str.slice(pointer, pointer + 7) === 'matrix(') {
        // TOFIX: there is no validation here. apply stricter and safe matrix parsing
        var matrix = str.slice(pointer + 7, pointer = str.indexOf(')', pointer));
        var code = 'return ' + matrix;
        var func = new Function(code);
        /* eslint no-new-func: "off" */

        mod.matrix = func();
        if (pointer === -1) THROW('The matrix must be closed by a `)` but did not find any');
      } else if (str.slice(pointer, pointer + 7) === 'legend(') {
        pointer += 7;
        mod.legend = parseNumList();
        skipWhitespaces();
        is(')', 'legend closer');
      } else if (str.slice(pointer, pointer + 7) === 'expand(') {
        pointer += 7;
        mod.expandVectorsWith = parseNumber();
        skipWhitespaces();
        is(')', 'expand closer');
      } else {
        break;
      }

      skip();
    }
  }

  function skipComment() {
    is('#', 'comment start'); // Is('#', 'comment hash');

    while (!isEof() && !isNewline(read())) {
      skip();
    }

    if (!isEof()) skip();
  }

  function parseUndefConstraint() {
    // Parse a constraint that does not return a value itself
    // first try to parse single value constraints without value like markov() and distinct()
    if (parseUexpr()) return; // So the first value must be a value returning expr

    var A = parseVexpr(); // Returns a var name or a constant value

    skipWhitespaces();
    var cop = parseCop();
    skipWhitespaces();

    switch (cop) {
      case '=':
        parseAssignment(A);
        break;

      case '==':
        solver.eq(A, parseVexpr());
        break;

      case '!=':
        solver.neq(A, parseVexpr());
        break;

      case '<':
        solver.lt(A, parseVexpr());
        break;

      case '<=':
        solver.lte(A, parseVexpr());
        break;

      case '>':
        solver.gt(A, parseVexpr());
        break;

      case '>=':
        solver.gte(A, parseVexpr());
        break;

      case '&':
        // Force A and B to non-zero (artifact)
        // (could easily be done at compile time)
        // for now we mul the args and force the result non-zero, this way neither arg can be zero
        // TODO: this could be made "safer" with more work; `(A/A)+(B/B) > 0` doesnt risk going oob, i think. and otherwise we could sum two ==?0 reifiers to equal 2. just relatively very expensive.
        solver.neq(solver.mul(A, parseVexpr()), solver.num(0));
        break;

      case '!&':
        // Nand is a nall with just two args...
        // it is the opposite from AND, and so is the implementation
        // (except since we can force to 0 instead of "nonzero" we can drop the eq wrapper)
        solver.mul(A, parseVexpr(), solver.num(0));
        break;

      case '|':
        // Force at least one of A and B to be non-zero (both is fine too)
        // if we add both args and check the result for non-zero then at least one arg must be non-zero
        solver.neq(solver.plus(A, parseVexpr()), solver.num(0));
        break;

      case '!|':
        // Unconditionally force A and B to zero
        solver.eq(A, solver.num(0));
        solver.eq(parseVexpr(), solver.num(0));
        break;

      case '^':
        // Force A zero and B nonzero or A nonzero and B zero (anything else rejects)
        // this is more tricky/expensive to implement than AND and OR...
        // x=A+B,x==A^x==B owait
        // (A==?0)+(B==?0)==1
        solver.eq(solver.plus(solver.isEq(A, 0), solver.isEq(parseVexpr(), 0)), 1);
        break;

      case '!^':
        // Xor means A and B both solve to zero or both to non-zero
        // (A==?0)==(B==?0)
        solver.eq(solver.isEq(A, solver.num(0)), solver.isEq(parseVexpr(), solver.num(0)));
        break;

      case '->':
        {
          // I think this could be implemented in various ways
          // A -> B     =>    ((A !=? 0) <= (B !=? 0)) & ((B ==? 0) <= (A ==? 0))
          // (if A is nonzero then B must be nonzero, otherwise B can be anything. But also if B is zero then
          // A must be zero and otherwise A can be anything. They must both hold to simulate an implication.)
          var B = parseVexpr(); // (A !=? 0) <= (B !=? 0))

          solver.lte(solver.isNeq(A, solver.num(0)), solver.isNeq(B, solver.num(0))); // (B ==? 0) <= (A ==? 0)

          solver.lte(solver.isEq(B, solver.num(0)), solver.isEq(A, solver.num(0)));
          break;
        }

      case '!->':
        // Force A to nonzero and B to zero
        solver.gt(A, solver.num(0));
        solver.eq(parseVexpr(), solver.num(0));
        break;

      default:
        if (cop) THROW('Unknown cop that starts with: [' + cop + ']');
    }

    expectEol();
  }

  function parseAssignment(C) {
    // Note: if FDO api changes this may return the wrong value...
    // it should always return the "result var" var name or constant
    // (that would be C, but C may be undefined here and created by FDO)
    var freshVar = typeof C === 'string' && !solver.hasVar(C);
    if (freshVar) C = solver.decl(C);
    var A = parseVexpr(C, freshVar);
    skipWhitespaces();
    var c = read();

    if (isEof() || isNewline(c) || isComment(c)) {
      // Any group without "top-level" op (`A=(B+C)`), or sum() etc
      // but also something like `x = 5` (which we cant detect here)
      // so just to make sure those cases dont fall through add an
      // extra eq. this should resolve immediately without change to
      // cases like `x = sum()`
      solver.eq(A, C);
      return A;
    }

    return parseAssignRest(A, C, freshVar);
  }

  function parseAssignRest(A, C, freshVar) {
    var rop = parseRop();
    skipWhitespaces();

    switch (rop) {
      case '==?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return solver.isEq(A, parseVexpr(), C);

      case '!=?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return solver.isNeq(A, parseVexpr(), C);

      case '<?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return solver.isLt(A, parseVexpr(), C);

      case '<=?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return solver.isLte(A, parseVexpr(), C);

      case '>?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return solver.isGt(A, parseVexpr(), C);

      case '>=?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return solver.isGte(A, parseVexpr(), C);

      case '|?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return compileIssome(C, [A, parseVexpr()]);

      case '!|?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return compileIsnone(C, [A, parseVexpr()]);

      case '&?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return compileIsall(C, [A, parseVexpr()]);

      case '!&?':
        if (freshVar) solver.decl(C, [0, 1], undefined, false, true);
        return compileIsnall(C, [A, parseVexpr()]);

      case '+':
        return solver.plus(A, parseVexpr(), C);

      case '-':
        return solver.minus(A, parseVexpr(), C);

      case '*':
        return solver.mul(A, parseVexpr(), C);

      case '/':
        return solver.div(A, parseVexpr(), C);

      default:
        if (rop !== undefined) THROW('Expecting right paren or rop, got: `' + rop + '`');
        return A;
    }
  }

  function parseCop() {
    var c = read();

    switch (c) {
      case '=':
        skip();

        if (read() === '=') {
          skip();
          return '==';
        }

        return '=';

      case '!':
        skip();
        c = read();

        if (c === '=') {
          skip();
          return '!=';
        }

        if (c === '&') {
          skip();
          return '!&';
        }

        if (c === '^') {
          skip();
          return '!^';
        }

        if (c === '|') {
          skip();
          return '!|';
        }

        if (c === '-' && readD(1) === '>') {
          skip();
          skip();
          return '!->';
        }

        return '!';

      case '<':
        skip();

        if (read() === '=') {
          skip();
          return '<=';
        }

        return '<';

      case '>':
        skip();

        if (read() === '=') {
          skip();
          return '>=';
        }

        return '>';

      case '&':
      case '|':
      case '^':
        skip();
        return c;

      case '#':
        THROW('Expected to parse a cop but found a comment instead');
        break;

      case '-':
        if (readD(1) === '>') {
          skip();
          skip();
          return '->';
        }

        break;

      default:
        break;
    }

    if (isEof()) THROW('Expected to parse a cop but reached eof instead');
    THROW('Unknown cop char: `' + c + '`');
  }

  function parseRop() {
    var a = read();

    switch (a) {
      case '=':
        {
          skip();
          var b = read();

          if (b === '=') {
            skip();
            is('?', 'reifier suffix');
            return '==?';
          }

          return '=';
        }

      case '!':
        skip();

        if (read() === '=') {
          is('=', 'middle part of !=? op');
          is('?', 'reifier suffix');
          return '!=?';
        }

        if (read() === '|') {
          is('|', 'middle part of !|? op');
          is('?', 'reifier suffix');
          return '!|?';
        }

        if (read() === '&') {
          is('&', 'middle part of !&? op');
          is('?', 'reifier suffix');
          return '!&?';
        }

        THROW('invalid rop char after ! [' + read() + ']');
        break;

      case '<':
        skip();

        if (read() === '=') {
          skip();
          is('?', 'reifier suffix');
          return '<=?';
        }

        is('?', 'reifier suffix');
        return '<?';

      case '>':
        skip();

        if (read() === '=') {
          skip();
          is('?', 'reifier suffix');
          return '>=?';
        }

        is('?', 'reifier suffix');
        return '>?';

      case '|':
        skip();
        is('?', 'reifier suffix');
        return '|?';

      case '&':
        skip();
        is('?', 'reifier suffix');
        return '&?';

      case '+':
      case '-':
      case '*':
      case '/':
        skip();
        return a;

      default:
        THROW('Expecting right paren or rop, got: `' + a + '`');
    }
  }

  function parseUexpr() {
    // It's not very efficient (we could parse an ident before and check that result here) but it'll work for now
    if (str.slice(pointer, pointer + 4) === 'all(') parseAll();else if (str.slice(pointer, pointer + 9) === 'distinct(') parseDistinct(9);else if (str.slice(pointer, pointer + 5) === 'diff(') parseDistinct(5);else if (str.slice(pointer, pointer + 5) === 'nall(') parseNall();else if (str.slice(pointer, pointer + 5) === 'none(') parseNone();else if (str.slice(pointer, pointer + 5) === 'same(') parseSame();else if (str.slice(pointer, pointer + 5) === 'some(') parseSome();else if (str.slice(pointer, pointer + 5) === 'xnor(') parseXnor();else return false;
    return true;
  }

  function parseVexpList() {
    var list = [];
    skipWhitespaces();

    while (!isEof() && read() !== ')') {
      var v = parseVexpr();
      list.push(v);
      skipWhitespaces();

      if (read() === ',') {
        skip();
        skipWhitespaces();
      }
    }

    return list;
  }

  function parseVexpr(resultVar, freshVar) {
    // Valcall, ident, number, group
    var c = read();
    var v;
    if (c === '(') v = parseGrouping();else if (c === '[') {
      var d = parseDomain();
      if (d[0] === d[1] && d.length === 2) v = d[0];else v = solver.decl(undefined, d);
    } else if (c >= '0' && c <= '9') {
      v = parseNumber();
    } else {
      var ident = parseIdentifier();

      var _d = read();

      if (ident === 'sum' && _d === '(') {
        v = parseSum(resultVar);
      } else if (ident === 'product' && _d === '(') {
        v = parseProduct(resultVar);
      } else if (ident === 'all' && _d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsAll(resultVar);
      } else if (ident === 'diff' && _d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsDiff(resultVar);
      } else if (ident === 'nall' && _d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsNall(resultVar);
      } else if (ident === 'none' && _d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsNone(resultVar);
      } else if (ident === 'same' && _d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsSame(resultVar);
      } else if (ident === 'some' && _d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsSome(resultVar);
      } else if (_d === '?') {
        THROW('Unknown reifier constraint func: [' + ident + ']');
      } else {
        v = ident;
      }
    }
    return v;
  }

  function parseGrouping() {
    is('(', 'group open');
    skipWhitespaces();
    var A = parseVexpr();
    skipWhitespaces();

    if (read() === '=') {
      if (read() !== '=') {
        parseAssignment(A);
        skipWhitespaces();
        is(')', 'group closer');
        return A;
      }
    }

    if (read() === ')') {
      // Just wrapping a vexpr is okay
      skip();
      return A;
    }

    var C = parseAssignRest(A);
    skipWhitespaces();
    is(')', 'group closer');
    return C;
  }

  function parseNumber() {
    var start = pointer;

    while (read() >= '0' && read() <= '9') {
      skip();
    }

    if (start === pointer) {
      THROW('Expecting to parse a number but did not find any digits [' + start + ',' + pointer + '][' + read() + ']');
    }

    return parseInt(str.slice(start, pointer), 10);
  }

  function parseAll() {
    pointer += 4;
    skipWhitespaces();
    var refs = parseVexpList(); // R can only be 0 if (at least) one of the args is zero. so by removing
    // 0 from R's domain we require all args nonzero. cheap hack.

    var r = solver.product(refs, solver.decl(undefined, [1, SUP]));
    skipWhitespaces();
    is(')', 'ALL closer');
    return r;
  }

  function parseDistinct(delta) {
    pointer += delta;
    skipWhitespaces();
    var vals = parseVexpList();
    if (vals.length === 0) THROW('Expecting at least one expression');
    solver.distinct(vals);
    skipWhitespaces();
    is(')', 'distinct call closer');
    expectEol();
  }

  function parseSum(result) {
    is('(', 'sum call opener');
    skipWhitespaces();
    var refs = parseVexpList();
    var r = solver.sum(refs, result);
    skipWhitespaces();
    is(')', 'sum closer');
    return r;
  }

  function parseProduct(result) {
    is('(', 'product call opener');
    skipWhitespaces();
    var refs = parseVexpList();
    var r = solver.product(refs, result);
    skipWhitespaces();
    is(')', 'product closer');
    return r;
  }

  function parseIsAll(result) {
    is('(', 'isall call opener');
    skipWhitespaces();
    var refs = parseVexpList();
    var r = compileIsall(result, refs);
    skipWhitespaces();
    is(')', 'isall closer');
    return r;
  }

  function compileIsall(result, args) {
    // R = all?(A B C ...)   ->   X = A * B * C * ..., R = X !=? 0
    var x = solver.decl(); // Anon var [sub,sup]

    solver.product(args, x);
    return solver.isNeq(x, solver.num(0), result);
  }

  function parseIsDiff(result) {
    is('(', 'isdiff call opener');
    skipWhitespaces();
    var refs = parseVexpList(); // R = diff?(A B C ...)
    // =>
    // x e args, y e args, x!=y
    // =>
    // Rxy = dom(x) !=? dom(y)
    // c = sum(Rxy ...)
    // R = c ==? argCount

    var reifs = [];

    for (var i = 0; i < refs.length; ++i) {
      var indexA = refs[i];

      for (var j = i + 1; j < refs.length; ++j) {
        var indexB = refs[j];
        reifs.push(solver.isNeq(indexA, indexB));
      }
    }

    solver.isEq(solver.sum(reifs), solver.num(reifs.length), result);
    skipWhitespaces();
    is(')', 'isdiff closer');
    return result;
  }

  function parseIsNall(result) {
    is('(', 'isnall call opener');
    skipWhitespaces();
    var refs = parseVexpList();
    var r = compileIsnall(result, refs);
    skipWhitespaces();
    is(')', 'isnall closer');
    return r;
  }

  function compileIsnall(result, args) {
    // R = nall?(A B C ...)   ->   X = A * B * C * ..., R = X ==? 0
    var x = solver.decl(); // Anon var [sub,sup]

    solver.product(args, x);
    return solver.isEq(x, solver.num(0), result);
  }

  function parseIsNone(result) {
    is('(', 'isnone call opener');
    skipWhitespaces();
    var refs = parseVexpList();
    var r = compileIsnone(result, refs);
    skipWhitespaces();
    is(')', 'isnone closer');
    return r;
  }

  function compileIsnone(result, args) {
    // R = none?(A B C ...)   ->   X = sum(A B C ...), R = X ==? 0
    var x = solver.decl(); // Anon var [sub,sup]

    solver.sum(args, x);
    return solver.isEq(x, solver.num(0), result);
  }

  function parseIsSame(result) {
    is('(', 'issame call opener');
    skipWhitespaces();
    var refs = parseVexpList(); // R = same?(A B C ...)   ->   A==?B,B==?C,C==?..., sum(reifs) === reifs.length

    var reifs = [];

    for (var i = 1; i < refs.length; ++i) {
      var _r = solver.decl(undefined, [0, 1]);

      solver.isEq(refs[i - 1], refs[i], _r);
      reifs.push(_r);
    }

    var x = solver.decl(); // Anon var [sub,sup]

    solver.sum(reifs, x);
    var r = solver.isEq(x, solver.num(reifs.length), result);
    skipWhitespaces();
    is(')', 'issame closer');
    return r;
  }

  function parseIsSome(result) {
    is('(', 'issome call opener');
    skipWhitespaces();
    var refs = parseVexpList();
    var r = compileIssome(result, refs);
    skipWhitespaces();
    is(')', 'issome closer');
    return r;
  }

  function compileIssome(result, args) {
    // R = some?(A B C ...)   ->   X = sum(A B C ...), R = X !=? 0
    var x = solver.decl(); // Anon var [sub,sup]

    solver.sum(args, x);
    return solver.isNeq(x, solver.num(0), result);
  }

  function parseNall() {
    pointer += 5;
    skipWhitespaces();
    var refs = parseVexpList(); // TODO: could also sum reifiers but i think this is way more efficient. for the time being.

    solver.product(refs, solver.num(0));
    skipWhitespaces();
    is(')', 'nall closer');
    expectEol();
  }

  function parseNone() {
    pointer += 5;
    skipWhitespaces();
    var refs = parseVexpList();
    solver.sum(refs, solver.num(0)); // Lazy way out but should resolve immediately anyways

    skipWhitespaces();
    is(')', 'none closer');
    expectEol();
  }

  function parseSame() {
    pointer += 5;
    skipWhitespaces();
    var refs = parseVexpList();

    for (var i = 1; i < refs.length; ++i) {
      solver.eq(refs[i - 1], refs[i]);
    }

    skipWhitespaces();
    is(')', 'same closer');
    expectEol();
  }

  function parseSome() {
    pointer += 5;
    skipWhitespaces();
    var refs = parseVexpList();
    solver.sum(refs, solver.decl(undefined, [1, SUP]));
    skipWhitespaces();
    is(')', 'some closer');
    expectEol();
  }

  function parseXnor() {
    pointer += 5;
    skipWhitespaces();
    var refs = parseVexpList();
    skipWhitespaces();
    is(')', 'xnor() closer');
    expectEol(); // Xnor(A B C)
    // =>
    // x=X+B+C                  (if x is 0, all the args were zero: "none")
    // y=X*B*C                  (if y is not 0, none of the args were zero: "all")
    // (x==0) + (y!=0) == 1     (must all be zero or all be nonzero)

    var x = solver.decl(); // Anon var [sub,sup]

    var y = solver.decl(); // Anon var [sub,sup]

    solver.sum(refs, x);
    solver.product(refs, y);
    solver.plus(solver.isEq(x, 0), solver.isNeq(y, 0), 1);
  }

  function parseNumstr() {
    var start = pointer;

    while (read() >= '0' && read() <= '9') {
      skip();
    }

    return str.slice(start, pointer);
  }

  function parseNumList() {
    var nums = [];
    skipWhitespaces();
    var numstr = parseNumstr();

    while (numstr) {
      nums.push(parseInt(numstr, 10));
      skipWhitespaces();

      if (read() === ',') {
        ++pointer;
        skipWhitespaces();
      }

      numstr = parseNumstr();
    }

    if (nums.length === 0) THROW('Expected to parse a list of at least some numbers but found none');
    return nums;
  }

  function parseIdentList() {
    var idents = [];

    for (;;) {
      skipWhitespaces();
      if (atEol()) THROW('Missing target char at eol/eof');
      if (read() === ')') break;

      if (read() === ',') {
        skip();
        skipWhitespaces();
        if (atEol()) THROW('Trailing comma not supported');
      }

      if (read() === ',') THROW('Double comma not supported');
      var ident = parseIdentifier();
      idents.push(ident);
    }

    if (idents.length === 0) THROW('Expected to parse a list of at least some identifiers but found none');
    return idents;
  }

  function readLine() {
    var line = '';

    while (!isEof() && !isNewline(read())) {
      line += read();
      skip();
    }

    return line;
  }

  function parseAtRule() {
    is('@'); // Mostly temporary hacks while the dsl stabilizes...

    if (str.slice(pointer, pointer + 6) === 'custom') {
      pointer += 6;
      skipWhitespaces();
      var ident = parseIdentifier();
      skipWhitespaces();

      if (read() === '=') {
        skip();
        skipWhitespaces();
        if (read() === '=') THROW('Unexpected double eq sign');
      }

      switch (ident) {
        case 'var-strat':
          parseVarStrat();
          break;

        case 'val-strat':
          parseValStrat();
          break;

        case 'set-valdist':
          {
            skipWhitespaces();
            var target = parseIdentifier();
            var config = parseRestCustom();
            solver.setValueDistributionFor(target, JSON.parse(config));
            break;
          }

        case 'targets':
          parseTargets();
          break;

        case 'nobool':
        case 'noleaf':
        case 'free':
          skipWhitespaces();
          if (read() === ',') THROW('Leading comma not supported');
          if (atEol()) THROW('Expected to parse some var values'); // ignore. it's a presolver debug tool

          readLine();
          break;

        default:
          THROW('Unsupported custom rule: ' + ident);
      }
    } else {
      THROW('Unknown atrule');
    }

    expectEol();
  }

  function parseVarStrat() {
    // @custom var-strat [fallback] [=] naive
    // @custom var-strat [fallback] [=] size
    // @custom var-strat [fallback] [=] min
    // @custom var-strat [fallback] [=] max
    // @custom var-strat [fallback] [=] throw
    // @custom var-strat [fallback] [inverted] [list] (a b c)
    skipWhitespaces();
    var fallback = false;

    if (read() === 'f') {
      // Inverted
      var ident = parseIdentifier();
      if (ident !== 'fallback') THROW('Expecting `fallback` here');
      fallback = true;
      skipWhitespaces();
    }

    var inverted = false;

    if (read() === 'i') {
      // Inverted
      var _ident = parseIdentifier();

      if (_ident !== 'inverted') THROW('Expecting `inverted` here');
      inverted = true;
      skipWhitespaces();
    }

    if (read() === 'l' || read() === '(') {
      if (read() === 'l') {
        // List (optional keyword)
        if (parseIdentifier() !== 'list') THROW('Unexpected ident after `inverted` (only expecting `list` or the list)');
        skipWhitespaces();
      }

      is('(');
      var priorityByName = parseIdentList();
      if (priorityByName.length > 0) config_setOption(solver.config, fallback ? 'varStrategyFallback' : 'varStrategy', {
        type: 'list',
        inverted: inverted,
        priorityByName: priorityByName
      });else config_setOption(solver.config, fallback ? 'varStrategyFallback' : 'varStrategy', {
        type: 'naive'
      });
      skipWhitespaces();
      is(')');
    } else {
      if (read() === '=') {
        skip();
        skipWhitespaces();
      }

      if (inverted) THROW('The `inverted` keyword is only valid for a prio list'); // Parse ident and use that as the vardist

      var _ident2 = parseIdentifier();

      if (_ident2 === 'list') THROW('Use a grouped list of idents for vardist=list');
      if (_ident2 !== 'naive' && _ident2 !== 'size' && _ident2 !== 'min' && _ident2 !== 'max' && _ident2 !== 'throw') THROW('Unknown var dist [' + _ident2 + ']');
      config_setOption(solver.config, fallback ? 'varStrategyFallback' : 'varStrategy', {
        type: _ident2
      });
    }
  }

  function parseValStrat() {
    var name = parseIdentifier();
    expectEol();
    solver.config.valueStratName = name;
  }

  function parseRestCustom() {
    skipWhitespaces();

    if (read() === '=') {
      skip();
      skipWhitespaces();
    }

    return readLine();
  }

  function parseTargets() {
    skipWhitespaces();

    if (str.slice(pointer, pointer + 3) === 'all') {
      pointer += 3;
      solver.config.targetedVars = 'all';
    } else {
      is('(', 'ONLY_USE_WITH_SOME_TARGET_VARS');
      skipWhitespaces();
      if (read() === ',') THROW('Leading comma not supported');
      var idents = parseIdentList();
      if (idents.length > 0) solver.config.targetedVars = idents;
      is(')');
    }
  }

  function THROW(msg) {
    if (_debug) {
      getTerm().log(str.slice(0, pointer) + '##|PARSER_IS_HERE[' + msg + ']|##' + str.slice(pointer));
    }

    msg = 'Importer parser error: ' + msg + ', source at #|#: `' + str.slice(Math.max(0, pointer - 70), pointer) + '#|#' + str.slice(pointer, Math.min(str.length, pointer + 70)) + '`';
    throw new Error(msg);
  }
}

var space_uid = 0;
/**
 * @returns {$space}
 */

function space_createRoot() {
  ASSERT(!(space_uid = 0));

  if (process.env.NODE_ENV !== 'production') {
    // Only for debugging
    var _depth = 0;
    var _child = 0;
    var _path = '';
    return space_createNew([], undefined, _depth, _child, _path);
  }

  return space_createNew([]);
}
/**
 * @param {$config} config
 * @returns {$space}
 */


function space_createFromConfig(config) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  var space = space_createRoot();
  space_initFromConfig(space, config);
  return space;
}
/**
 * Create a space node that is a child of given space node
 *
 * @param {$space} space
 * @returns {$space}
 */


function space_createClone(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  var vardomsCopy = space.vardoms.slice(0);

  var unsolvedVarIndexes = space._unsolved.slice(0);

  if (process.env.NODE_ENV !== 'production') {
    // Only for debugging
    var _depth = space._depth + 1;

    var _child = space._child_count++;

    var _path = space._path;
    return space_createNew(vardomsCopy, unsolvedVarIndexes, _depth, _child, _path);
  }

  return space_createNew(vardomsCopy, unsolvedVarIndexes);
}
/**
 * Create a new config with the configuration of the given Space
 * Basically clones its config but updates the `initialDomains` with fresh state
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {$space}
 */


function space_toConfig(space, config) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  var vardoms = space.vardoms;
  var allVarNames = config.allVarNames;
  var newDomains = [];

  for (var i = 0, n = allVarNames.length; i < n; i++) {
    var domain = vardoms[i];
    newDomains[i] = domain_toStr(domain);
  }

  return config_clone(config, undefined);
}
/**
 * Concept of a space that holds config, some named domains (referred to as "vars"), and some propagators
 *
 * @param {$domain[]} vardoms Maps 1:1 to config.allVarNames
 * @param {number[]|undefined} unsolvedVarIndexes
 * @param {number} _depth (Debugging only) How many parent nodes are there from this node?
 * @param {number} _child (Debugging only) How manieth child is this of the parent?
 * @param {string} _path (Debugging only) String of _child values from root to this node (should be unique per node and len=_depth+1)
 * @returns {$space}
 */


function space_createNew(vardoms, unsolvedVarIndexes, _depth, _child, _path) {
  ASSERT(typeof vardoms === 'object' && vardoms, 'vars should be an object', vardoms);
  var space = {
    _class: '$space',
    vardoms: vardoms,
    _unsolved: unsolvedVarIndexes,
    next_distribution_choice: 0,
    updatedVarIndex: -1,
    // The varIndex that was updated when creating this space (-1 for root)
    _lastChosenValue: -1 // Cache to prevent duplicate operations

  }; // Search graph metrics (debug only)

  if (process.env.NODE_ENV !== 'production') {
    space._depth = _depth;
    space._child = _child;
    space._child_count = 0;
    space._path = _path + _child;
    space._uid = ++space_uid;
  }

  return space;
}
/**
 * @param {$space} space
 * @param {$config} config
 */


function space_initFromConfig(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  space_generateVars(space, config); // Config must be initialized (generating propas may introduce fresh vars)

  space_initializeUnsolvedVars(space, config);
}
/**
 * Initialized the list of unsolved variables. These are either the explicitly
 * targeted variables, or any unsolved variables if none were explicitly targeted.
 *
 * @param {$space} space
 * @param {$config} config
 */


function space_initializeUnsolvedVars(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  var targetVarNames = config.targetedVars;
  var vardoms = space.vardoms;
  var unsolvedVarIndexes = [];
  space._unsolved = unsolvedVarIndexes;

  if (targetVarNames === 'all') {
    for (var varIndex = 0, n = vardoms.length; varIndex < n; ++varIndex) {
      if (!domain_isSolved(vardoms[varIndex])) {
        if (config._varToPropagators[varIndex] || config._constrainedAway && config._constrainedAway.indexOf(varIndex) >= 0) {
          unsolvedVarIndexes.push(varIndex);
        }
      }
    }
  } else {
    ASSERT(Array.isArray(targetVarNames), 'expecting targetVarNames to be an array or the string `all`', targetVarNames);
    ASSERT(targetVarNames.every(function (e) {
      return typeof e === 'string';
    }), 'you must target var names only, they must all be strings', targetVarNames);
    var varNamesTrie = config._varNamesTrie;

    for (var _iterator = targetVarNames, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var varName = _ref;
      space_addVarNameToUnsolved(varName, varNamesTrie, vardoms, unsolvedVarIndexes);
    }
  }
}
/**
 * @param {string} varName
 * @param {$trie} varNamesTrie
 * @param {$nordom[]} vardoms
 * @param {number[]} unsolvedVarIndexes
 */


function space_addVarNameToUnsolved(varName, varNamesTrie, vardoms, unsolvedVarIndexes) {
  var varIndex = trie_get(varNamesTrie, varName);
  if (varIndex === TRIE_KEY_NOT_FOUND) THROW('E_VARS_SHOULD_EXIST_NOW [' + varName + ']');

  if (!domain_isSolved(vardoms[varIndex])) {
    unsolvedVarIndexes.push(varIndex);
  }
}
/**
 * Run all the propagators until stability point.
 * Returns true if any propagator rejects.
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {boolean} when true, a propagator rejects and the (current path to a) solution is invalid
 */


function space_propagate(space, config) {
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('space_propagate()');
  });
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  if (process.env.NODE_ENV !== 'production') {
    config._propagates = (config._propagates | 0) + 1;
  }

  if (space_onBeforePropagate(space, config)) {
    return true;
  }

  var propagators = config._propagators; // "cycle" is one step, "epoch" all steps until stable (but not solved per se)
  // worst case all unsolved vars change. but in general it's about 30% so run with that

  var cells = Math.ceil(space._unsolved.length * TRIE_NODE_SIZE * 0.3);
  var changedTrie = trie_create(TRIE_EMPTY, cells); // Track changed vars per cycle in this epoch

  var cycles = 0;
  ASSERT(typeof cycles === 'number', 'cycles is a number?');
  ASSERT(changedTrie._class === '$trie', 'trie is a trie?');
  var changedVars = []; // In one cycle

  var minimal = 1;

  if (space.updatedVarIndex >= 0) {
    changedVars.push(space.updatedVarIndex);
  } else {
    // Very first cycle of first epoch of the search. all propagators must be visited at least once now.
    var rejected = space_propagateAll(space, config, propagators, changedVars, changedTrie, ++cycles);

    if (rejected) {
      return true;
    }
  }

  while (changedVars.length) {
    var newChangedVars = [];

    var _rejected = space_propagateChanges(space, config, propagators, minimal, changedVars, newChangedVars, changedTrie, ++cycles);

    if (_rejected) {
      return true;
    }

    changedVars = newChangedVars;
    minimal = 2; // See space_propagateChanges
  }

  if (space_onAfterPropagate(space, config)) {
    return true;
  }

  return false;
}

function space_propagateAll(space, config, propagators, changedVars, changedTrie, cycleIndex) {
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('space_propagateAll (' + propagators.length + ' propas have changed vars)');
  });

  for (var _iterator2 = propagators, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
    var _ref2;

    if (_isArray2) {
      if (_i2 >= _iterator2.length) break;
      _ref2 = _iterator2[_i2++];
    } else {
      _i2 = _iterator2.next();
      if (_i2.done) break;
      _ref2 = _i2.value;
    }

    var propagator = _ref2;
    var rejected = space_propagateStep(space, config, propagator, changedVars, changedTrie, cycleIndex);
    if (rejected) return true;
  }

  return false;
}

function space_propagateByIndexes(space, config, propagators, propagatorIndexes, changedVars, changedTrie, cycleIndex) {
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('space_propagateByIndexes (' + propagatorIndexes.length + ' propas have changed vars)');
  });

  var _loop = function _loop(i, n) {
    var propagatorIndex = propagatorIndexes[i];
    var propagator = propagators[propagatorIndex];
    ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
      return log(' - ', i + 1 + '/' + propagatorIndexes.length, '; prop index=', propagatorIndex, ', prop=', JSON.stringify(propagator).replace(/\n/g, '; '));
    });
    var rejected = space_propagateStep(space, config, propagator, changedVars, changedTrie, cycleIndex);

    if (rejected) {
      ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
        return log(' - ', i + 1 + '/' + propagatorIndexes.length, '; has rejected');
      });
      return {
        v: true
      };
    }
  };

  for (var i = 0, n = propagatorIndexes.length; i < n; i++) {
    var _ret = _loop(i);

    if (typeof _ret === "object") return _ret.v;
  }

  return false;
}

function space_propagateStep(space, config, propagator, changedVars, changedTrie, cycleIndex) {
  ASSERT(propagator._class === '$propagator', 'EXPECTING_PROPAGATOR');
  var vardoms = space.vardoms;
  var index1 = propagator.index1,
      index2 = propagator.index2,
      index3 = propagator.index3,
      stepper = propagator.stepper,
      arg1 = propagator.arg1,
      arg2 = propagator.arg2,
      arg3 = propagator.arg3,
      arg4 = propagator.arg4,
      arg5 = propagator.arg5,
      arg6 = propagator.arg6;
  ASSERT(index1 !== 'undefined', 'all props at least use the first var...');
  var domain1 = vardoms[index1];
  var domain2 = index2 !== undefined && vardoms[index2];
  var domain3 = index3 !== undefined && vardoms[index3];
  ASSERT_NORDOM(domain1, true, domain__debug);
  ASSERT(domain2 === undefined || ASSERT_NORDOM(domain2, true, domain__debug));
  ASSERT(domain3 === undefined || ASSERT_NORDOM(domain3, true, domain__debug));
  ASSERT(typeof stepper === 'function', 'stepper should be a func'); // TODO: if we can get a "solved" state here we can prevent an isSolved check later...

  stepper(space, config, index1, index2, index3, arg1, arg2, arg3, arg4, arg5, arg6);

  if (domain1 !== vardoms[index1]) {
    if (domain_isEmpty(vardoms[index1])) {
      return true; // Fail
    }

    space_recordChange(index1, changedTrie, changedVars, cycleIndex);
  }

  if (index2 !== undefined && domain2 !== vardoms[index2]) {
    if (domain_isEmpty(vardoms[index2])) {
      return true; // Fail
    }

    space_recordChange(index2, changedTrie, changedVars, cycleIndex);
  }

  if (index3 !== undefined && index3 !== -1 && domain3 !== vardoms[index3]) {
    if (domain_isEmpty(vardoms[index3])) {
      return true; // Fail
    }

    space_recordChange(index3, changedTrie, changedVars, cycleIndex);
  }

  return false;
}

function space_recordChange(varIndex, changedTrie, changedVars, cycleIndex) {
  if (typeof varIndex === 'number') {
    var status = trie_getNum(changedTrie, varIndex);

    if (status !== cycleIndex) {
      changedVars.push(varIndex);
      trie_addNum(changedTrie, varIndex, cycleIndex);
    }
  } else {
    ASSERT(Array.isArray(varIndex), 'index1 is always used');

    for (var _iterator3 = varIndex, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
      var _ref3;

      if (_isArray3) {
        if (_i3 >= _iterator3.length) break;
        _ref3 = _iterator3[_i3++];
      } else {
        _i3 = _iterator3.next();
        if (_i3.done) break;
        _ref3 = _i3.value;
      }

      var index = _ref3;
      space_recordChange(index, changedTrie, changedVars, cycleIndex);
    }
  }
}

function space_propagateChanges(space, config, allPropagators, minimal, targetVars, changedVars, changedTrie, cycleIndex) {
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
    return log('space_propagateChanges (' + targetVars.length + ' vars to check), var indexes;', targetVars.slice(0, 10) + (targetVars.length > 10 ? '... and ' + (targetVars.length - 10) + ' more' : ''));
  });
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  var varToPropagators = config._varToPropagators;

  var _loop2 = function _loop2(i, vlen) {
    var varIndex = targetVars[i];
    var propagatorIndexes = varToPropagators[varIndex];
    ASSERT_LOG(LOG_FLAG_PROPSTEPS, function (log) {
      return log(' - var ' + (i + 1) + '/' + targetVars.length, ', varIndex', targetVars[i], ', is part of', propagatorIndexes.length, 'propas;', propagatorIndexes);
    }); // Note: the first loop of propagate() should require all propagators affected, even if
    // it is just one. after that, if a var was updated that only has one propagator it can
    // only have been updated by that one propagator. however, this step is queueing up
    // propagators to check, again, since one of its vars changed. a propagator that runs
    // twice without other changes will change nothing. so we do it for the initial loop,
    // where the var is updated externally, after that the change can only occur from within
    // a propagator so we skip it.
    // ultimately a list of propagators should perform better but the indexOf negates that perf
    // (this doesn't affect a whole lot of vars... most of them touch multiple propas)

    if (propagatorIndexes && propagatorIndexes.length >= minimal) {
      var result = space_propagateByIndexes(space, config, allPropagators, propagatorIndexes, changedVars, changedTrie, cycleIndex);
      if (result) return {
        v: true
      }; // Rejected
    }
  };

  for (var i = 0, vlen = targetVars.length; i < vlen; i++) {
    var _ret2 = _loop2(i);

    if (typeof _ret2 === "object") return _ret2.v;
  }

  return false;
}
/**
 * @param {$space} space
 * @param {$config} config
 * @returns {boolean}
 */


function space_onBeforePropagate(space, config) {
  var callback = config.beforeSpace;

  if (callback && callback(space)) {
    config.aborted = true;
    return true;
  }

  return false;
}
/**
 * @param {$space} space
 * @param {$config} config
 * @returns {boolean}
 */


function space_onAfterPropagate(space, config) {
  var callback = config.afterSpace;

  if (callback && callback(space)) {
    config.aborted = true;
    return true;
  }

  return false;
}
/**
 * Returns true if this space is solved - i.e. when
 * all the vars in the space have a singleton domain.
 *
 * This is a *very* strong condition that might not need
 * to be satisfied for a space to be considered to be
 * solved. For example, the propagators may determine
 * ranges for all variables under which all conditions
 * are met and there would be no further need to enumerate
 * those solutions.
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {boolean}
 */


function space_updateUnsolvedVarList(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  var vardoms = space.vardoms;
  var unsolvedVarIndexes = space._unsolved;
  var m = 0;

  for (var _iterator4 = unsolvedVarIndexes, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
    var _ref4;

    if (_isArray4) {
      if (_i4 >= _iterator4.length) break;
      _ref4 = _iterator4[_i4++];
    } else {
      _i4 = _iterator4.next();
      if (_i4.done) break;
      _ref4 = _i4.value;
    }

    var varIndex = _ref4;
    var domain = vardoms[varIndex];

    if (!domain_isSolved(domain)) {
      unsolvedVarIndexes[m++] = varIndex;
    }
  }

  unsolvedVarIndexes.length = m;
  return m === 0; // 0 unsolved means we've solved it :)
}
/**
 * Returns an object whose field names are the var names
 * and whose values are the solved values. The space *must*
 * be already in a solved state for this to work.
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {Object}
 */


function space_solution(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  var allVarNames = config.allVarNames;
  var result = {};

  for (var varIndex = 0, n = allVarNames.length; varIndex < n; varIndex++) {
    var varName = allVarNames[varIndex];
    result[varName] = space_getVarSolveState(space, varIndex);
  }

  return result;
}
/**
 * Note: this is the (shared) second most called function of the library
 * (by a third of most, but still significantly more than the rest)
 *
 * @param {$space} space
 * @param {number} varIndex
 * @returns {number|number[]|boolean} The solve state for given var index, also put into result
 */


function space_getVarSolveState(space, varIndex) {
  ASSERT(typeof varIndex === 'number', 'VAR_SHOULD_BE_INDEX');
  var domain = space.vardoms[varIndex];

  if (domain_isEmpty(domain)) {
    return false;
  }

  var value = domain_getValue(domain);
  if (value !== NO_SUCH_VALUE) return value;
  return domain_toArr(domain);
}
/**
 * Initialize the vardoms array on the first space node.
 *
 * @param {$space} space
 * @param {$config} config
 */


function space_generateVars(space, config) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  var vardoms = space.vardoms;
  ASSERT(vardoms, 'expecting var domains');
  var initialDomains = config.initialDomains;
  ASSERT(initialDomains, 'config should have initial vars');
  var allVarNames = config.allVarNames;
  ASSERT(allVarNames, 'config should have a list of vars');

  for (var varIndex = 0, len = allVarNames.length; varIndex < len; varIndex++) {
    var domain = initialDomains[varIndex];
    ASSERT_NORDOM(domain, true, domain__debug);
    vardoms[varIndex] = domain_toSmallest(domain);
  }
}

var BETTER = 1;
var SAME = 2;
var WORSE = 3;
/**
 * Given a list of variables return the next var to consider based on the
 * current var distribution configuration and an optional filter condition.
 *
 * @param {$space} space
 * @param {$config} config
 * @return {number}
 */

function distribution_getNextVarIndex(space, config) {
  var varStratConfig = config.varStratConfig;
  var isBetterVarFunc = distribution_getFunc(varStratConfig.type);

  var varIndex = _distribution_varFindBest(space, config, isBetterVarFunc, varStratConfig);

  return varIndex;
}
/**
 * @param {string} distName
 * @returns {Function|undefined}
 */


function distribution_getFunc(distName) {
  switch (distName) {
    case 'naive':
      return null;

    case 'size':
      return distribution_varByMinSize;

    case 'min':
      return distribution_varByMin;

    case 'max':
      return distribution_varByMax;

    case 'markov':
      return distribution_varByMarkov;

    case 'list':
      return distribution_varByList;

    case 'throw':
      return THROW('Throwing an error because var-strat requests it');

    default:
      return THROW('unknown next var func', distName);
  }
}
/**
 * Return the best varIndex according to a fitness function
 *
 * @param {$space} space
 * @param {$config} config
 * @param {Function($space, currentIndex, bestIndex, Function)} [fitnessFunc] Given two var indexes returns true iif the first var is better than the second var
 * @param {Object} varStratConfig
 * @returns {number} The varIndex of the next var or NO_SUCH_VALUE
 */


function _distribution_varFindBest(space, config, fitnessFunc, varStratConfig) {
  var i = 0;
  var unsolvedVarIndexes = space._unsolved;
  ASSERT(unsolvedVarIndexes.length, 'there should be unsolved vars left to pick (caller should ensure this)');
  var bestVarIndex = unsolvedVarIndexes[i++];

  if (fitnessFunc) {
    for (var len = unsolvedVarIndexes.length; i < len; i++) {
      var varIndex = unsolvedVarIndexes[i];
      ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
      ASSERT(space.vardoms[varIndex] !== undefined, 'expecting each varIndex to have an domain', varIndex);

      if (BETTER === fitnessFunc(space, config, varIndex, bestVarIndex, varStratConfig)) {
        bestVarIndex = varIndex;
      }
    }
  }

  ASSERT(typeof bestVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(bestVarIndex >= 0, 'VAR_INDEX_SHOULD_BE_POSITIVE');
  return bestVarIndex;
} // #####
// preset fitness functions
// #####


function distribution_varByMinSize(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  var n = domain_size(space.vardoms[varIndex1]) - domain_size(space.vardoms[varIndex2]);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMin(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT_NORDOM(space.vardoms[varIndex1]);
  ASSERT_NORDOM(space.vardoms[varIndex2]);
  ASSERT(space.vardoms[varIndex1] && space.vardoms[varIndex2], 'EXPECTING_NON_EMPTY');
  var n = domain_min(space.vardoms[varIndex1]) - domain_min(space.vardoms[varIndex2]);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMax(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  var n = domain_max(space.vardoms[varIndex1]) - domain_max(space.vardoms[varIndex2]);
  if (n > 0) return BETTER;
  if (n < 0) return WORSE;
  return SAME;
}

function distribution_varByMarkov(space, config, varIndex1, varIndex2, varStratConfig) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  var distOptions = config.varDistOptions; // V1 is only, but if so always, better than v2 if v1 is a markov var

  var varName1 = config.allVarNames[varIndex1];
  ASSERT(typeof varName1 === 'string', 'VAR_NAME_SHOULD_BE_STRING');

  if (distOptions[varName1] && distOptions[varName1].valtype === 'markov') {
    return BETTER;
  }

  var varName2 = config.allVarNames[varIndex2];
  ASSERT(typeof varName2 === 'string', 'VAR_NAME_SHOULD_BE_STRING');

  if (distOptions[varName2] && distOptions[varName2].valtype === 'markov') {
    return WORSE;
  }

  return distribution_varFallback(space, config, varIndex1, varIndex2, varStratConfig.fallback);
}

function distribution_varByList(space, config, varIndex1, varIndex2, varStratConfig) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER'); // Note: config._priorityByIndex is compiled by FDO#prepare from given priorityByName
  // if in the list, lowest prio can be 1. if not in the list, prio will be undefined

  var hash = varStratConfig._priorityByIndex; // If v1 or v2 is not in the list they will end up as undefined

  var p1 = hash[varIndex1];
  var p2 = hash[varIndex2];
  ASSERT(p1 !== 0, 'SHOULD_NOT_USE_INDEX_ZERO');
  ASSERT(p2 !== 0, 'SHOULD_NOT_USE_INDEX_ZERO');

  if (!p1 && !p2) {
    // Neither has a priority
    return distribution_varFallback(space, config, varIndex1, varIndex2, varStratConfig.fallback);
  } // Invert this operation? ("deprioritizing").


  var inverted = varStratConfig.inverted; // If inverted being on the list makes it worse than not.

  if (!p2) {
    if (inverted) return WORSE;
    return BETTER;
  }

  if (!p1) {
    if (inverted) return BETTER;
    return WORSE;
  } // The higher the p, the higher the prio. (the input array is compiled that way)
  // if inverted then low p is higher prio


  if (p1 > p2) {
    if (inverted) return WORSE;
    return BETTER;
  }

  ASSERT(p1 < p2, 'A_CANNOT_GET_SAME_INDEX_FOR_DIFFERENT_NAME');
  if (inverted) return BETTER;
  return WORSE;
}

function distribution_varFallback(space, config, varIndex1, varIndex2, fallbackConfig) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  if (!fallbackConfig) {
    return SAME;
  }

  var distName = fallbackConfig.type;

  switch (distName) {
    case 'size':
      return distribution_varByMinSize(space, config, varIndex1, varIndex2);

    case 'min':
      return distribution_varByMin(space, config, varIndex1, varIndex2);

    case 'max':
      return distribution_varByMax(space, config, varIndex1, varIndex2);

    case 'markov':
      return distribution_varByMarkov(space, config, varIndex1, varIndex2, fallbackConfig);

    case 'list':
      return distribution_varByList(space, config, varIndex1, varIndex2, fallbackConfig);

    case 'throw':
      return THROW('nope');

    default:
      return THROW("Unknown var dist fallback name: " + distName);
  }
}

/*
Markov Distribution Helpers
======================================================================

Helpers for Markov-style probabilistic value & var distributions.

const markov = {
  legend: ['small', 'med', 'large'],
  matrix: [{
    vector: [.5, 1, 1],
    condition: function (S, varId) {
      var prev = S.readMatrix(varId, S.cursor() - 1)
      return S.isEqual(prev, 'small');
    },
  }, {
    vector: [1, 1, 1],
    condition: function () { return true; },
  },
  ],
};

const markov = {
  legend: ['small', 'med', 'large'],
  matrix: [{
    vector: [.5, 1, 1],
    condition: function (S, varId) {
      var prev = S.readMatrix(varId, S.cursor() - 1);
      var result = {
        value: S.isEqual(prev, 'small'),
        deps: ...,
      };
      return result;
    },
  }, {
    vector: [1, 1, 1],
    condition: function () { return true; },
  }],
};

Inhomogenous Markov chains [see](https://cw.fel.cvut.cz/wiki/_media/courses/a6m33bin/markov-chains-2.pdf)

in an inhomogeneous Markov model, we can have different distributions at different positions in the sequence

https://en.wikipedia.org/wiki/Markov_chain#Music

*/
/**
 * Given a domain, probability vector, value legend, and rng
 * function; return one of the values in the value legend
 * according to the outcome of the rng and considering the
 * prob weight of each value in the legend.
 * The rng should be normalized (returning values from 0 including
 * up to but not including 1), unless the argument says otherwise
 * (that is used for testing only, to get around rounding errors).
 *
 * @param {$domain} domain A regular domain. It's values only determine whether a legend value can be used, it may have values that can never be picked. It's only a filter mask.
 * @param {number[]} probVector List of probabilities, maps 1:1 to val_legend.
 * @param {number[]} valLegend List of values eligible for picking. Maps 1:1 to prob_vector. Only values in the current domain are actually eligible.
 * @param {Function} randomFunc
 * @param {boolean} [rngIsNormalized=true] Is 0<=rng()<1 or 0<=rng()<total_prob ? The latter is only used for testing to avoid rounding errors.
 * @return {number | undefined}
 */

function distribution_markovSampleNextFromDomain(domain, probVector, valLegend, randomFunc, rngIsNormalized) {
  if (rngIsNormalized === void 0) {
    rngIsNormalized = true;
  }

  ASSERT(Boolean(valLegend), 'A_SHOULD_HAVE_VAL_LEGEND');
  ASSERT(probVector.length <= valLegend.length, 'A_PROB_VECTOR_SIZE_SHOULD_BE_LTE_LEGEND'); // Make vector & legend for available values only

  var filteredLegend = [];
  var cumulativeFilteredProbVector = [];
  var totalProb = 0;

  for (var index = 0; index < probVector.length; index++) {
    var prob = probVector[index];

    if (prob > 0) {
      var value = valLegend[index];

      if (domain_containsValue(domain, value)) {
        totalProb += prob;
        cumulativeFilteredProbVector.push(totalProb);
        filteredLegend.push(value);
      }
    }
  } // No more values left to search


  if (cumulativeFilteredProbVector.length === 0) {
    return;
  } // Only one value left


  if (cumulativeFilteredProbVector.length === 1) {
    return filteredLegend[0];
  } // TOFIX: could set `cumulativeFilteredProbVector[cumulativeFilteredProbVector.length-1] = 1` here...


  return _distribution_markovRoll(randomFunc, totalProb, cumulativeFilteredProbVector, filteredLegend, rngIsNormalized);
}
/**
 * @private
 * @param {Function} rng A function ("random number generator"), which is usually normalized, but in tests may not be
 * @param {number} totalProb
 * @param {number[]} cumulativeProbVector Maps 1:1 to the value legend. `[prob0, prob0+prob1, prob0+prob1+prob2, etc]`
 * @param {number[]} valueLegend
 * @param {boolean} rngIsNormalized
 * @returns {number}
 */


function _distribution_markovRoll(rng, totalProb, cumulativeProbVector, valueLegend, rngIsNormalized) {
  var rngRoll = rng();
  var probVal = rngRoll;

  if (rngIsNormalized) {
    // 0 <= rng < 1
    // roll should yield; 0<=value<1
    ASSERT(rngRoll >= 0, 'RNG_SHOULD_BE_NORMALIZED');
    ASSERT(rngRoll < 1, 'RNG_SHOULD_BE_NORMALIZED');
    probVal = rngRoll * totalProb;
  } // Else 0 <= rng < totalProb (mostly to avoid precision problems in tests)


  var index = 0;

  for (var probVectorCount = cumulativeProbVector.length; index < probVectorCount; index++) {
    // Note: if first element is 0.1 and roll is 0.1 this will pick the
    // SECOND item. by design. so prob domains are `[x, y)`
    var prob = cumulativeProbVector[index];

    if (prob > probVal) {
      break;
    }
  }

  return valueLegend[index];
}

/*
The functions in this file are supposed to determine the next
value while solving a Space. The functions are supposed to
return the new domain for some given var index. If there's no
new choice left it should return undefined to signify the end.
*/
var FIRST_CHOICE = 0;
var SECOND_CHOICE = 1;
var THIRD_CHOICE = 2;
var NO_CHOICE = undefined;

function distribute_getNextDomainForVar(space, config, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(space.vardoms[varIndex] && !domain_isSolved(space.vardoms[varIndex]), 'CALLSITE_SHOULD_PREVENT_DETERMINED'); // TODO: test

  var valueStrategy = config.valueStratName; // Each var can override the value distributor

  var configVarDistOptions = config.varDistOptions;
  var varName = config.allVarNames[varIndex];
  ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  var valueDistributorName = configVarDistOptions[varName] && configVarDistOptions[varName].valtype;
  if (valueDistributorName) valueStrategy = valueDistributorName;
  var domain = typeof valueStrategy === 'function' ? valueStrategy(space, varIndex, choiceIndex) : _distribute_getNextDomainForVar(valueStrategy, space, config, varIndex, choiceIndex);
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribute_getNextDomainForVar; index', varIndex, 'is now', domain__debug(domain));
  });
  return domain;
}

function _distribute_getNextDomainForVar(stratName, space, config, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  switch (stratName) {
    case 'max':
      return distribution_valueByMax(space, varIndex, choiceIndex);

    case 'markov':
      return distribution_valueByMarkov(space, config, varIndex, choiceIndex);

    case 'mid':
      return distribution_valueByMid(space, varIndex, choiceIndex);

    case 'min':
    case 'naive':
      return distribution_valueByMin(space, varIndex, choiceIndex);

    case 'minMaxCycle':
      return distribution_valueByMinMaxCycle(space, varIndex, choiceIndex);

    case 'list':
      return distribution_valueByList(space, config, varIndex, choiceIndex);

    case 'splitMax':
      return distribution_valueBySplitMax(space, varIndex, choiceIndex);

    case 'splitMin':
      return distribution_valueBySplitMin(space, varIndex, choiceIndex);

    case 'throw':
      return THROW('Throwing an error because val-strat requests it');

    default:
      THROW('unknown next var func', stratName);
  }
}
/**
 * Attempt to solve by setting var domain to values in the order
 * given as a list. This may also be a function which should
 * return a new domain given the space, var index, and choice index.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain for this var index in the next space TOFIX: support small domains
 */


function distribution_valueByList(space, config, varIndex, choiceIndex) {
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribution_valueByList', varIndex, choiceIndex);
  });
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');
  var domain = space.vardoms[varIndex];
  var varName = config.allVarNames[varIndex];
  ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');
  var configVarDistOptions = config.varDistOptions;
  ASSERT(configVarDistOptions, 'space should have config.varDistOptions');
  ASSERT(configVarDistOptions[varName], 'there should be distribution options available for every var', varName);
  ASSERT(configVarDistOptions[varName].list, 'there should be a distribution list available for every var', varName);
  var varDistOptions = configVarDistOptions[varName];
  var listSource = varDistOptions.list;
  var fallbackName = '';

  if (varDistOptions.fallback) {
    fallbackName = varDistOptions.fallback.valtype;
    ASSERT(fallbackName, 'should have a fallback type');
    ASSERT(fallbackName !== 'list', 'prevent recursion loops');
  }

  var list = listSource;

  if (typeof listSource === 'function') {
    // Note: callback should return the actual list
    list = listSource(space, varName, choiceIndex);
  }

  switch (choiceIndex) {
    case FIRST_CHOICE:
      {
        var nextValue = domain_getFirstIntersectingValue(domain, list);

        if (nextValue === NO_SUCH_VALUE) {
          return _distribute_getNextDomainForVar(fallbackName || 'naive', space, config, varIndex, FIRST_CHOICE);
        }

        space._lastChosenValue = nextValue;
        return domain_createValue(nextValue);
      }

    case SECOND_CHOICE:
      if (space._lastChosenValue >= 0) {
        return domain_removeValue(domain, space._lastChosenValue);
      }

      return _distribute_getNextDomainForVar(fallbackName || 'naive', space, config, varIndex, SECOND_CHOICE);

    default:
      ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_THRICE');
      return NO_CHOICE;
  }
}
/**
 * Searches through a var's values from min to max.
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */


function distribution_valueByMin(space, varIndex, choiceIndex) {
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribution_valueByMin', varIndex, choiceIndex);
  });
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');
  var domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      {
        var minValue = domain_min(domain);
        space._lastChosenValue = minValue;
        return domain_createValue(minValue);
      }

    case SECOND_CHOICE:
      // Cannot lead to empty domain because lo can only be SUP if
      // domain was solved and we assert it wasn't.
      ASSERT(space._lastChosenValue >= 0, 'first choice should set this property and it should at least be 0', space._lastChosenValue);
      return domain_removeValue(domain, space._lastChosenValue);

    default:
      ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_THRICE');
      return NO_CHOICE;
  }
}
/**
 * Searches through a var's values from max to min.
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */


function distribution_valueByMax(space, varIndex, choiceIndex) {
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribution_valueByMax', varIndex, choiceIndex);
  });
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');
  var domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      {
        var maxValue = domain_max(domain);
        space._lastChosenValue = maxValue;
        return domain_createValue(maxValue);
      }

    case SECOND_CHOICE:
      // Cannot lead to empty domain because hi can only be SUB if
      // domain was solved and we assert it wasn't.
      ASSERT(space._lastChosenValue > 0, 'first choice should set this property and it should at least be 1', space._lastChosenValue);
      return domain_removeValue(domain, space._lastChosenValue);

    default:
      ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_THRICE');
      return NO_CHOICE;
  }
}
/**
 * Searches through a var's values by taking the middle value.
 * This version targets the value closest to `(max-min)/2`
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */


function distribution_valueByMid(space, varIndex, choiceIndex) {
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribution_valueByMid', varIndex, choiceIndex);
  });
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');
  var domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      {
        var middle = domain_middleElement(domain);
        space._lastChosenValue = middle;
        return domain_createValue(middle);
      }

    case SECOND_CHOICE:
      ASSERT(space._lastChosenValue >= 0, 'first choice should set this property and it should at least be 0', space._lastChosenValue);
      return domain_removeValue(domain, space._lastChosenValue);

    default:
      ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_THRICE');
      return NO_CHOICE;
  }
}
/**
 * Search a domain by splitting it up through the (max-min)/2 middle.
 * First simply tries the lower half, then tries the upper half.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */


function distribution_valueBySplitMin(space, varIndex, choiceIndex) {
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribution_valueBySplitMin', varIndex, choiceIndex);
  });
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');
  var domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');
  var max = domain_max(domain);

  switch (choiceIndex) {
    case FIRST_CHOICE:
      {
        // TOFIX: can do this more optimal if coding it out explicitly
        var min = domain_min(domain);
        var mmhalf = min + Math.floor((max - min) / 2);
        space._lastChosenValue = mmhalf; // Note: domain is not determined so the operation cannot fail
        // Note: this must do some form of intersect, though maybe not constrain

        return domain_intersection(domain, domain_createRange(min, mmhalf));
      }

    case SECOND_CHOICE:
      {
        ASSERT(space._lastChosenValue >= 0, 'first choice should set this property and it should at least be 0', space._lastChosenValue); // Note: domain is not determined so the operation cannot fail
        // Note: this must do some form of intersect, though maybe not constrain

        return domain_intersection(domain, domain_createRange(space._lastChosenValue + 1, max));
      }

    default:
      ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_THRICE');
      return NO_CHOICE;
  }
}
/**
 * Search a domain by splitting it up through the (max-min)/2 middle.
 * First simply tries the upper half, then tries the lower half.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */


function distribution_valueBySplitMax(space, varIndex, choiceIndex) {
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribution_valueBySplitMax', varIndex, choiceIndex);
  });
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');
  var domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');
  var min = domain_min(domain);

  switch (choiceIndex) {
    case FIRST_CHOICE:
      {
        // TOFIX: can do this more optimal if coding it out explicitly
        var max = domain_max(domain);
        var mmhalf = min + Math.floor((max - min) / 2);
        space._lastChosenValue = mmhalf; // Note: domain is not determined so the operation cannot fail
        // Note: this must do some form of intersect, though maybe not constrain

        return domain_intersection(domain, domain_createRange(mmhalf + 1, max));
      }

    case SECOND_CHOICE:
      {
        ASSERT(space._lastChosenValue >= 0, 'first choice should set this property and it should at least be 0', space._lastChosenValue); // Note: domain is not determined so the operation cannot fail
        // Note: this must do some form of intersect, though maybe not constrain

        return domain_intersection(domain, domain_createRange(min, space._lastChosenValue));
      }

    default:
      ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_THRICE');
      return NO_CHOICE;
  }
}
/**
 * Applies distribution_valueByMin and distribution_valueByMax alternatingly
 * depending on the position of the given var in the list of vars.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */


function distribution_valueByMinMaxCycle(space, varIndex, choiceIndex) {
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribution_valueByMinMaxCycle', varIndex, choiceIndex);
  });

  if (_isEven(varIndex)) {
    return distribution_valueByMin(space, varIndex, choiceIndex);
  }

  return distribution_valueByMax(space, varIndex, choiceIndex);
}
/**
 * @param {number} n
 * @returns {boolean}
 */


function _isEven(n) {
  return n % 2 === 0;
}
/**
 * Search a domain by applying a markov chain to determine an optimal value
 * checking path.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */


function distribution_valueByMarkov(space, config, varIndex, choiceIndex) {
  ASSERT_LOG(LOG_FLAG_CHOICE, function (log) {
    return log('distribution_valueByMarkov', varIndex, choiceIndex);
  });
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');
  var domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      {
        // THIS IS AN EXPENSIVE STEP!
        var varName = config.allVarNames[varIndex];
        ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
        var configVarDistOptions = config.varDistOptions;
        ASSERT(configVarDistOptions, 'space should have config.varDistOptions');
        var distOptions = configVarDistOptions[varName];
        ASSERT(distOptions, 'markov vars should have  distribution options');
        var expandVectorsWith = distOptions.expandVectorsWith;
        ASSERT(distOptions.matrix, 'there should be a matrix available for every var');
        ASSERT(distOptions.legend || typeof expandVectorsWith === 'number' && expandVectorsWith >= 0, 'every var should have a legend or expandVectorsWith set');
        var random = distOptions.random || config._defaultRng;
        ASSERT(typeof random === 'function', 'RNG_SHOULD_BE_FUNCTION'); // Note: expandVectorsWith can be 0, so check with null

        var values = markov_createLegend(typeof expandVectorsWith === 'number', distOptions.legend, domain);
        var valueCount = values.length;

        if (!valueCount) {
          return NO_CHOICE;
        }

        var probabilities = markov_createProbVector(space, distOptions.matrix, expandVectorsWith, valueCount);
        var value = distribution_markovSampleNextFromDomain(domain, probabilities, values, random);

        if (value === null) {
          return NO_CHOICE;
        }

        ASSERT(domain_containsValue(domain, value), 'markov picks a value from the existing domain so no need for a constrain below');
        space._lastChosenValue = value;
        return domain_createValue(value);
      }

    case SECOND_CHOICE:
      {
        var lastValue = space._lastChosenValue;
        ASSERT(typeof lastValue === 'number', 'should have cached previous value');
        var newDomain = domain_removeValue(domain, lastValue);
        ASSERT(domain, 'domain cannot be empty because only one value was removed and the domain is asserted to be not solved above');
        ASSERT_NORDOM(newDomain, true, domain__debug);
        return newDomain;
      }

    default:
      ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_THRICE');
      return NO_CHOICE;
  }
}

/**
 * Depth first search.
 *
 * Traverse the search space in DFS order and return the first (next) solution
 *
 * state.space must be the starting space. The object is used to store and
 * track continuation information from that point onwards.
 *
 * On return, state.status contains either 'solved' or 'end' to indicate
 * the status of the returned solution. Also state.more will be true if
 * the search can continue and there may be more solutions.
 *
 * @param {Object} state
 * @property {$space} state.space Root space if this is the start of searching
 * @property {boolean} [state.more] Are there spaces left to investigate after the last solve?
 * @property {$space[]} [state.stack]=[state,space] The search stack as initialized by this class
 * @property {string} [state.status] Set to 'solved' or 'end'
 * @param {$config} config
 * @param {Function} [dbgCallback] Call after each epoch until it returns false, then stop calling it.
 */

function search_depthFirst(state, config, dbgCallback) {
  var stack = state.stack;
  var epochs = 0; // The stack only contains stable spaces. the first space is not
  // stable so we propagate it first and before putting it on the stack.

  var isStart = !stack || stack.length === 0;

  if (isStart) {
    if (!stack) {
      state.stack = [];
      stack = state.stack;
    }

    var solved = search_depthFirstLoop(state.space, config, stack, state);
    if (dbgCallback && dbgCallback(++epochs)) dbgCallback = undefined;
    if (solved) return;
  }

  while (stack.length > 0 && !config.aborted) {
    ASSERT_LOG(LOG_FLAG_SEARCH, function (log) {
      return log('');
    });
    ASSERT_LOG(LOG_FLAG_SEARCH, function (log) {
      return log('');
    }); // Take the top space and generate the next offspring, if any

    var childSpace = search_createNextSpace(stack[stack.length - 1], config);

    if (childSpace) {
      // Stabilize the offspring and put it on the stack
      var _solved = search_depthFirstLoop(childSpace, config, stack, state);

      if (dbgCallback && dbgCallback(++epochs)) dbgCallback = undefined;
      if (_solved) return;
    } else {
      // Remove the space, it has no more children. this is a dead end.
      stack.pop();
    }
  } // There are no more spaces to explore and therefor no further solutions to be found.


  state.status = 'end';
  state.more = false;
}
/**
 * One search step of the given space
 *
 * @param {$space} space
 * @param {$config} config
 * @param {$space[]} stack
 * @param {Object} state See search_depthFirst
 * @returns {boolean}
 */


function search_depthFirstLoop(space, config, stack, state) {
  ASSERT_LOG(LOG_FLAG_SEARCH, function (log) {
    return log('search_depthFirstLoop; next space');
  });
  ASSERT_LOG(LOG_FLAG_SEARCH, function (log) {
    return log('  -', Math.min(10, space.vardoms.length) + '/' + space.vardoms.length, 'domains:', space.vardoms.slice(0, 10).map(domain__debug).join(', '));
  });
  ASSERT_LOG(LOG_FLAG_SEARCH, function (log) {
    return log('  - updated var index:', space.updatedVarIndex < 0 ? 'root space so check all' : space.updatedVarIndex);
  });
  var rejected = space_propagate(space, config);
  ASSERT_LOG(LOG_FLAG_SEARCH, function (log) {
    return log('search_depthFirstLoop; did space_propagate reject?', rejected);
  });

  if (rejected) {
    ASSERT_LOG(LOG_FLAG_SEARCH, function (log) {
      return log(' ##  REJECTED');
    });

    if (config.aborted) {
      ASSERT_LOG(LOG_FLAG_SEARCH, function (log) {
        return log(' ##  (ABORTED BY CALLBACK)');
      });
    }
  }

  return search_afterPropagation(rejected, space, config, stack, state);
}
/**
 * Process a propagated space and the result. If it rejects, discard the
 * space. If it passed, act accordingly. Otherwise determine whether the
 * space has children. If so queue them. Otherwise discard the space.
 *
 * @param {boolean} rejected Did the propagation end due to a rejection?
 * @param {$space} space
 * @param {$config} config
 * @param {$space[]} stack
 * @param {Object} state See search_depthFirst
 * @returns {boolean|undefined}
 */


function search_afterPropagation(rejected, space, config, stack, state) {
  if (rejected) {
    space.failed = true;
    return false;
  }

  var solved = space_updateUnsolvedVarList(space, config);

  if (solved) {
    _search_onSolve(state, space, stack);

    return true;
  } // Put on the stack so the next loop can branch off it


  stack.push(space);
  return undefined; // Neither solved nor rejected
}
/**
 * Create a new Space based on given Space which basically
 * serves as a child node in a search graph. The space is
 * cloned and in the clone one variable is restricted
 * slightly further. This clone is then returned.
 * This takes various search and distribution strategies
 * into account.
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {$space|undefined} a clone with small modification or nothing if this is an unsolved leaf node
 */


function search_createNextSpace(space, config) {
  var varIndex = distribution_getNextVarIndex(space, config);
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(varIndex >= 0, 'VAR_INDEX_SHOULD_BE_POSITIVE');

  if (varIndex !== NO_SUCH_VALUE) {
    var domain = space.vardoms[varIndex];

    if (!domain_isSolved(domain)) {
      var choice = space.next_distribution_choice++;
      var nextDomain = distribute_getNextDomainForVar(space, config, varIndex, choice);

      if (nextDomain) {
        var clone = space_createClone(space);
        clone.updatedVarIndex = varIndex;
        clone.vardoms[varIndex] = nextDomain;
        return clone;
      }
    }
  } // Space is an unsolved leaf node, return undefined

}
/**
 * When search finds a solution this function is called
 *
 * @param {Object} state The search state data
 * @param {Space} space The search node to fail
 * @param {Space[]} stack See state.stack
 */


function _search_onSolve(state, space, stack) {
  state.status = 'solved';
  state.space = space; // Is this so the solution can be read from it?

  state.more = stack.length > 0;
}

/**
 * Finite Domain brute force solver Only
 * No input-problem optimizations applied, will try to solve the problem as is.
 *
 * @type {FDO}
 */

var FDO =
/*#__PURE__*/
function () {
  /**
   * @param {Object} options = {}
   * @property {string} [options.distribute='naive']
   * @property {Object} [options.searchDefaults]
   * @property {$config} [options.config=config_create()]
   * @property {boolean} [options.exportBare]
   * @property {number} [options.logging=LOG_NONE]
   * @property {Object} [options.logger=console] An object like `console` that can override some of its methods
   */
  function FDO(options) {
    if (options === void 0) {
      options = {};
    }

    this._class = 'fdo';
    if (options.logger) setTerm(options.logger);
    this.logging = options.log || LOG_NONE;
    this.distribute = options.distribute || 'naive';

    if (process.env.NODE_ENV !== 'production') {
      if (options.exportBare !== undefined) {
        this.GENERATE_BARE_DSL = options.exportBare || false;
        this.exported = '';
      }
    }

    ASSERT(options._class !== '$config', 'config should be passed on in a config property of options');

    if (options.config) {
      this.config = options.config;
      var config = this.config;

      if (config.initialDomains) {
        var initialDomains = config.initialDomains;

        for (var i = 0, len = initialDomains.length; i < len; ++i) {
          var domain = initialDomains[i];
          if (domain.length === 0) domain = domain_createEmpty();
          initialDomains[i] = domain_anyToSmallest(domain);
        }
      }

      if (config._propagators) config._propagators = undefined; // Will be regenerated

      if (config._varToPropagators) config._varToPropagators = undefined; // Will be regenerated
    } else {
      this.config = config_create();
    }

    this.solutions = [];
    this.state = {
      space: null,
      more: false
    };
    this._prepared = false;
  }
  /**
   * Returns an anonymous var with given value as lo/hi for the domain
   *
   * @param {number} num
   * @returns {string}
   */


  var _proto = FDO.prototype;

  _proto.num = function num(_num) {
    if (typeof _num !== 'number') {
      THROW("FDO#num: expecting a number, got " + _num + " (a " + typeof _num + ")");
    }

    if (isNaN(_num)) {
      THROW('FDO#num: expecting a number, got NaN');
    }

    var varIndex = config_addVarAnonConstant(this.config, _num);

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += ': __' + varIndex + '__ = ' + _num + '\n';
      }
    }

    return this.config.allVarNames[varIndex];
  }
  /**
   * Declare a var with optional given domain or constant value and distribution options.
   *
   * @param {string} [varName] Optional, Note that you can use this.num() to declare a constant.
   * @param {$arrdom|number} [domainOrValue] Note: if number, it is a constant (so [domain,domain]) not a $numdom! If omitted it becomes [SUB, SUP]
   * @param {Object} [distributionOptions] Var distribution options. A defined non-object here will throw an error to prevent doing declRange
   * @param {boolean} [_allowEmpty=false] Temp (i hope) override for importer
   * @param {boolean} [_override=false] Explicitly override the initial domain for an already existing var (for importer)
   * @returns {string}
   */
  ;

  _proto.decl = function decl(varName, domainOrValue, distributionOptions, _allowEmpty, _override) {
    if (varName === '') THROW('Var name can not be the empty string');
    ASSERT(varName === undefined || typeof varName === 'string', 'var name should be undefined or a string');
    ASSERT(distributionOptions === undefined || typeof distributionOptions === 'object', 'options must be omitted or an object');
    var arrdom = typeof domainOrValue === 'number' ? [domainOrValue, domainOrValue] : domainOrValue || [SUB, SUP];
    ASSERT_ARRDOM(arrdom);
    if (arrdom.length === 0 && !_allowEmpty) THROW('EMPTY_DOMAIN_NOT_ALLOWED');
    var varIndex = config_addVarDomain(this.config, varName || true, arrdom, _allowEmpty, _override);
    varName = this.config.allVarNames[varIndex];

    if (distributionOptions) {
      if (distributionOptions.distribute) THROW('Use `valtype` to set the value distribution strategy');
      config_setOption(this.config, 'varValueStrat', distributionOptions, varName);
    }

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += ': ' + exporter_encodeVarName(varName) + ' = [' + arrdom + ']';

        if (distributionOptions && distributionOptions.valtype === 'markov') {
          this.exported += ' @markov';

          if (distributionOptions.matrix) {
            this.exported += ' matrix(' + distributionOptions.matrix + ')';
          }

          if (distributionOptions.expandVectorsWith !== undefined) {
            this.exported += ' expand(' + distributionOptions.expandVectorsWith + ')';
          }

          if (distributionOptions.legend) {
            this.exported += ' legend(' + distributionOptions.legend + ')';
          }
        }

        this.exported += ' # options=' + JSON.stringify(distributionOptions) + '\n';
      }
    }

    return varName;
  }
  /**
   * Declare multiple variables with the same domain/options
   *
   * @param {string[]} varNames
   * @param {$arrdom|number} [domainOrValue] Note: if number, it is a constant (so [domain,domain]) not a $numdom! If omitted it becomes [SUB, SUP]
   * @param {Object} [options] Var distribution options. A number here will throw an error to prevent doing declRange
   */
  ;

  _proto.decls = function decls(varNames, domainOrValue, options) {
    for (var i = 0, n = varNames.length; i < n; ++i) {
      this.decl(varNames[i], domainOrValue, options);
    }
  }
  /**
   * Declare a var with given range
   *
   * @param {string} varName
   * @param {number} lo Ensure SUB<=lo<=hi<=SUP
   * @param {number} hi Ensure SUB<=lo<=hi<=SUP
   * @param {Object} [options] Var distribution options
   */
  ;

  _proto.declRange = function declRange(varName, lo, hi, options) {
    ASSERT(typeof lo === 'number', 'LO_SHOULD_BE_NUMBER');
    ASSERT(typeof hi === 'number', 'HI_SHOULD_BE_NUMBER');
    ASSERT(typeof options === 'object' || options === undefined, 'EXPECTING_OPTIONS_OR_NOTHING');
    return this.decl(varName, [lo, hi], options);
  } // Arithmetic Propagators
  ;

  _proto.plus = function plus(A, B, C) {
    var R = config_addConstraint(this.config, 'plus', [A, B, C]);

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' + ' + exporter_encodeVarName(B) + ' # plus, result var was: ' + C + '\n';
      }
    }

    return R;
  };

  _proto.minus = function minus(A, B, C) {
    var R = config_addConstraint(this.config, 'min', [A, B, C]);

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' - ' + exporter_encodeVarName(B) + ' # min, result var was: ' + C + '\n';
      }
    }

    return R;
  };

  _proto.mul = function mul(A, B, C) {
    var R = config_addConstraint(this.config, 'ring-mul', [A, B, C]);

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' * ' + exporter_encodeVarName(B) + ' # ringmul, result var was: ' + C + '\n';
      }
    }

    return R;
  };

  _proto.div = function div(A, B, C) {
    var R = config_addConstraint(this.config, 'ring-div', [A, B, C]);

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' / ' + exporter_encodeVarName(B) + ' # ringdiv, result var was: ' + C + '\n';
      }
    }

    return R;
  };

  _proto.sum = function sum(A, C) {
    var R = config_addConstraint(this.config, 'sum', A, C);

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = sum(' + A.map(exporter_encodeVarName) + ') # result var was: ' + C + '\n';
      }
    }

    return R;
  };

  _proto.product = function product(A, C) {
    var R = config_addConstraint(this.config, 'product', A, C);

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = product(' + A.map(exporter_encodeVarName) + ') # result var was: ' + C + '\n';
      }
    }

    return R;
  } // TODO
  // times_plus    k1*v1 + k2*v2
  // wsum          ∑ k*v
  // scale         k*v
  // (In)equality Propagators
  // only first expression can be array
  ;

  _proto.distinct = function distinct(A) {
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += 'distinct(' + A.map(exporter_encodeVarName) + ')\n';
      }
    }

    config_addConstraint(this.config, 'distinct', A);
  };

  _proto.eq = function eq(e1, e2) {
    if (Array.isArray(e1)) {
      for (var i = 0, n = e1.length; i < n; ++i) {
        this.eq(e1[i], e2);
      }
    } else if (Array.isArray(e2)) {
      for (var _i = 0, _n = e2.length; _i < _n; ++_i) {
        this.eq(e1, e2[_i]);
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        if (this.GENERATE_BARE_DSL) {
          this.exported += exporter_encodeVarName(e1) + ' == ' + exporter_encodeVarName(e2) + '\n';
        }
      }

      config_addConstraint(this.config, 'eq', [e1, e2]);
    }
  };

  _proto.neq = function neq(e1, e2) {
    if (Array.isArray(e1)) {
      for (var i = 0, n = e1.length; i < n; ++i) {
        this.neq(e1[i], e2);
      }
    } else if (Array.isArray(e2)) {
      for (var _i2 = 0, _n2 = e2.length; _i2 < _n2; ++_i2) {
        this.neq(e1, e2[_i2]);
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        if (this.GENERATE_BARE_DSL) {
          this.exported += exporter_encodeVarName(e1) + ' != ' + exporter_encodeVarName(e2) + '\n';
        }
      }

      config_addConstraint(this.config, 'neq', [e1, e2]);
    }
  };

  _proto.gte = function gte(A, B) {
    ASSERT(!Array.isArray(A), 'NOT_ACCEPTING_ARRAYS');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(A) + ' >= ' + exporter_encodeVarName(B) + '\n';
      }
    }

    config_addConstraint(this.config, 'gte', [A, B]);
  };

  _proto.lte = function lte(A, B) {
    ASSERT(!Array.isArray(A), 'NOT_ACCEPTING_ARRAYS');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(A) + ' <= ' + exporter_encodeVarName(B) + '\n';
      }
    }

    config_addConstraint(this.config, 'lte', [A, B]);
  };

  _proto.gt = function gt(A, B) {
    ASSERT(!Array.isArray(A), 'NOT_ACCEPTING_ARRAYS');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(A) + ' > ' + exporter_encodeVarName(B) + '\n';
      }
    }

    config_addConstraint(this.config, 'gt', [A, B]);
  };

  _proto.lt = function lt(A, B) {
    ASSERT(!Array.isArray(A), 'NOT_ACCEPTING_ARRAYS');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(A) + ' < ' + exporter_encodeVarName(B) + '\n';
      }
    }

    config_addConstraint(this.config, 'lt', [A, B]);
  };

  _proto.isNeq = function isNeq(A, B, C) {
    var R = config_addConstraint(this.config, 'reifier', [A, B, C], 'neq');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' !=? ' + exporter_encodeVarName(B) + '\n';
      }
    }

    return R;
  };

  _proto.isEq = function isEq(A, B, C) {
    var R = config_addConstraint(this.config, 'reifier', [A, B, C], 'eq');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' ==? ' + exporter_encodeVarName(B) + '\n';
      }
    }

    return R;
  };

  _proto.isGte = function isGte(A, B, C) {
    var R = config_addConstraint(this.config, 'reifier', [A, B, C], 'gte');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' >=? ' + exporter_encodeVarName(B) + '\n';
      }
    }

    return R;
  };

  _proto.isLte = function isLte(A, B, C) {
    var R = config_addConstraint(this.config, 'reifier', [A, B, C], 'lte');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' <=? ' + exporter_encodeVarName(B) + '\n';
      }
    }

    return R;
  };

  _proto.isGt = function isGt(A, B, C) {
    var R = config_addConstraint(this.config, 'reifier', [A, B, C], 'gt');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' >? ' + exporter_encodeVarName(B) + '\n';
      }
    }

    return R;
  };

  _proto.isLt = function isLt(A, B, C) {
    var R = config_addConstraint(this.config, 'reifier', [A, B, C], 'lt');

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' <? ' + exporter_encodeVarName(B) + '\n';
      }
    }

    return R;
  } // Various rest

  /**
   * Solve this solver. It should be setup with all the constraints.
   *
   * @param {Object} options
   * @property {number} [options.max=1000]
   * @property {number} [options.log=this.logging] Logging level; one of: 0, 1 or 2 (see LOG_* constants)
   * @property {string|Array.<string|Bvar>} options.vars Target branch vars or var names to force solve. Defaults to all.
   * @property {string|Object} [options.distribute='naive'] Maps to FD.distribution.value, see config_setOptions
   * @property {boolean} [_debug] A more human readable print of the configuration for this solver
   * @property {boolean} [_debugConfig] Log out solver.config after prepare() but before run()
   * @property {boolean} [_debugSpace] Log out solver._space after prepare() but before run(). Only works in dev code (stripped from dist)
   * @property {boolean} [_debugSolver] Call solver._debugSolver() after prepare() but before run()
   * @property {boolean} [_tostring] Serialize the config into a DSL
   * @property {boolean} [_nosolve] Dont actually solve. Used for debugging when printing something but not interested in actually running.
   * @property {number} [_debugDelay=0] When debugging, how many propagate steps should the debugging wait? (0 is only preprocessing)
   * @returns {Object[]}
   */
  ;

  _proto.solve = function solve(options) {
    var _this = this;

    if (options === void 0) {
      options = {};
    }

    if (options.log) this.logging = options.log;
    var log = this.logging;
    var _options = options,
        _options$max = _options.max,
        max = _options$max === void 0 ? 1000 : _options$max;

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        getTerm().log('## bare export:\n' + this.exported + '## end of exported\n');
      }
    }

    this._prepare(options, log);

    var dbgCallback;

    if (options._tostring || options._debug || options._debugConfig || options._debugSpace || options._debugSolver) {
      dbgCallback = function dbgCallback(epoch) {
        if ((options._debugDelay | 0) >= epoch) {
          if (options._tostring) getTerm().log(exporter(_this.config));
          if (options._debug) _this._debugLegible();
          if (options._debugConfig) _this._debugConfig();

          if (process.env.NODE_ENV !== 'production') {
            if (options._debugSpace) getTerm().log('## _debugSpace:\n', INSPECT(_this._space));
          }

          if (options._debugSolver) _this._debugSolver();
          return true;
        }

        return false;
      };

      if (dbgCallback(0)) dbgCallback = undefined;
    }

    if (options._nosolve) return;

    this._run(max, log, dbgCallback);

    return this.solutions;
  }
  /**
   * Prepare internal configuration before actually solving
   * Collects one-time config data and sets up defaults
   *
   * @param {Object} [options={}] See @solve
   * @param {number} log One of the LOG_* constants
   */
  ;

  _proto._prepare = function _prepare(options, log) {
    if (options === void 0) {
      options = {};
    }

    ASSERT(log === undefined || log >= LOG_MIN && log <= LOG_MAX, 'log level should be a valid value or be undefined (in tests)');

    if (log >= LOG_STATS) {
      getTerm().log('      - FD Preparing...');

      getTerm().time('      - FD Prepare Time');
    }

    this._prepareConfig(options, log); // Create the root node of the search tree (each node is a Space)


    var rootSpace = space_createFromConfig(this.config);

    if (process.env.NODE_ENV !== 'production') {
      this._space = rootSpace; // Only exposed for easy access in tests, and so only available after .prepare()
    }

    this.state.space = rootSpace;
    this.state.more = true;
    this.state.stack = [];
    this._prepared = true;
    if (log >= LOG_STATS) getTerm().timeEnd('      - FD Prepare Time');
  }
  /**
   * Prepare the config side of things for a solve.
   * No space is created in this function (that's the point).
   *
   * @param {Object} options See _prepare
   * @param {number} log
   */
  ;

  _proto._prepareConfig = function _prepareConfig(options, log) {
    ASSERT(log === undefined || log >= LOG_MIN && log <= LOG_MAX, 'log level should be a valid value or be undefined (in tests)');
    var config = this.config;
    ASSERT_VARDOMS_SLOW(config.initialDomains, domain__debug);

    if (options.vars && options.vars !== 'all') {
      config_setOption(config, 'targeted_var_names', options.vars);
    }

    if (options.beforeSpace) config_setOption(config, 'beforeSpace', options.beforeSpace);
    if (options.afterSpace) config_setOption(config, 'afterSpace', options.afterSpace);
    config_init(config);
  }
  /**
   * Run the solver. You should call @_prepare before calling this function.
   *
   * @param {number} max Hard stop the solver when this many solutions have been found
   * @param {number} log One of the LOG_* constants
   * @param {Function} [dbgCallback] Call after each epoch until it returns false, then stop calling it.
   */
  ;

  _proto._run = function _run(max, log, dbgCallback) {
    ASSERT(typeof max === 'number', 'max should be a number', max);
    ASSERT(log >= LOG_MIN && log <= LOG_MAX, 'log level should be a valid value');
    ASSERT(this._prepared, 'must run #prepare before #run');
    this._prepared = false;
    var state = this.state;
    ASSERT(state);
    var term;

    if (log >= LOG_STATS) {
      term = getTerm();
      term.log("      - FD Var Count: " + this.config.allVarNames.length);
      term.log("      - FD Targeted: " + (this.config.targetedVars === 'all' ? 'all' : this.config.targetedVars.length));
      term.log("      - FD Constraint Count: " + this.config.allConstraints.length);
      term.log("      - FD Propagator Count: " + this.config._propagators.length);
      term.log('      - FD Solving...');
      term.time('      - FD Solving Time');
    }

    var alreadyRejected = false;
    var vardoms = state.space.vardoms;

    for (var i = 0, n = vardoms.length; i < n; ++i) {
      if (domain_isEmpty(vardoms[i])) {
        alreadyRejected = true;

        if (log >= LOG_STATS) {
          term.log('      - FD: rejected without propagation (' + this.config.allVarNames[i] + ' is empty)');
        }

        break;
      }
    }

    var solvedSpaces;

    if (alreadyRejected) {
      if (log >= LOG_STATS) {
        term.log('      - FD Input Problem Rejected Immediately');
      }

      solvedSpaces = [];
    } else {
      solvedSpaces = solver_runLoop(state, this.config, max, dbgCallback);
    }

    if (log >= LOG_STATS) {
      term.timeEnd('      - FD Solving Time');

      if (process.env.NODE_ENV !== 'production') {
        term.log("      - FD debug stats: called propagate(): " + (this.config._propagates > 0 ? this.config._propagates + 'x' : 'never! Finished by only using precomputations.'));
      }

      term.log("      - FD Solutions: " + solvedSpaces.length);
    }

    solver_getSolutions(solvedSpaces, this.config, this.solutions, log);
  };

  _proto.hasVar = function hasVar(varName) {
    return trie_get(this.config._varNamesTrie, varName) >= 0;
  }
  /**
   * Sets the value distribution options for a var after declaring it.
   *
   * @param {string} varName
   * @param {Object} options
   */
  ;

  _proto.setValueDistributionFor = function setValueDistributionFor(varName, options) {
    ASSERT(typeof varName === 'string', 'var name should be a string', varName);
    ASSERT(typeof options === 'object', 'value strat options should be an object');
    config_setOption(this.config, 'varValueStrat', options, varName);

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported = this.exported.replace(new RegExp('^(: ' + exporter_encodeVarName(varName) + ' =.*)', 'm'), '$1 # markov (set below): ' + JSON.stringify(options)) + '@custom set-valdist ' + exporter_encodeVarName(varName) + ' ' + JSON.stringify(options) + '\n';
      }
    }
  }
  /**
   * @returns {FDO}
   */
  ;

  _proto.branch_from_current_solution = function branch_from_current_solution() {
    // Get the _solved_ space, convert to config,
    // use new config as base for new solver
    var solvedConfig = space_toConfig(this.state.space, this.config);
    return new FDO({
      config: solvedConfig
    });
  };

  _proto._debugLegible = function _debugLegible() {
    var clone = JSON.parse(JSON.stringify(this.config)); // Prefer this over config_clone, just in case.

    var names = clone.allVarNames;
    var targeted = clone.targetedVars;
    var constraints = clone.allConstraints;
    var domains = clone.initialDomains;
    var propagators = clone._propagators;

    for (var key in clone) {
      // Underscored prefixed objects are generally auto-generated structs
      // we don't want to debug a 5mb buffer, one byte per line.
      if (key[0] === '_' && typeof clone[key] === 'object') {
        clone[key] = '<removed>';
      }
    }

    clone.allVarNames = '<removed>';
    clone.allConstraints = '<removed>';
    clone.initialDomains = '<removed>';
    clone.varDistOptions = '<removed>';
    if (targeted !== 'all') clone.targetedVars = '<removed>';

    var term = getTerm();

    term.log('\n## _debug:\n');
    term.log('- config:');
    term.log(INSPECT(clone));
    term.log('- vars (' + names.length + '):');
    term.log(names.map(function (name, index) {
      return (index) + ": " + domain__debug(domains[index]) + " " + (name === String(index) ? '' : ' // ' + name);
    }).join('\n'));

    if (targeted !== 'all') {
      term.log('- targeted vars (' + targeted.length + '): ' + targeted.join(', '));
    }

    term.log('- constraints (' + constraints.length + ' -> ' + propagators.length + '):');
    term.log(constraints.map(function (c, index) {
      if (c.param === undefined) {
        return (index) + ": " + c.name + "(" + c.varIndexes + ")      --->  " + c.varIndexes.map(function (index) {
          return domain__debug(domains[index]);
        }).join(',  ');
      }

      if (c.name === 'reifier') {
        return (index) + ": " + c.name + "[" + c.param + "](" + c.varIndexes + ")      --->  " + domain__debug(domains[c.varIndexes[0]]) + " " + c.param + " " + domain__debug(domains[c.varIndexes[1]]) + " = " + domain__debug(domains[c.varIndexes[2]]);
      }

      return (index) + ": " + c.name + "(" + c.varIndexes + ") = " + c.param + "      --->  " + c.varIndexes.map(function (index) {
        return domain__debug(domains[index]);
      }).join(',  ') + " -> " + domain__debug(domains[c.param]);
    }).join('\n'));
    term.log('##/\n');
  };

  _proto._debugSolver = function _debugSolver() {
    var term = getTerm();

    term.log('## _debugSolver:\n');
    var config = this.config; // Term.log('# Config:');
    // term.log(INSPECT(_clone(config)));

    var names = config.allVarNames;
    term.log('# Variables (' + names.length + 'x):');
    term.log('  index name domain toArr');

    for (var varIndex = 0; varIndex < names.length; ++varIndex) {
      term.log('  ', varIndex, ':', names[varIndex], ':', domain__debug(config.initialDomains[varIndex]));
    }

    var constraints = config.allConstraints;
    term.log('# Constraints (' + constraints.length + 'x):');
    term.log('  index name vars param');

    for (var i = 0; i < constraints.length; ++i) {
      term.log('  ', i, ':', constraints[i].name, ':', constraints[i].varIndexes.join(','), ':', constraints[i].param);
    }

    var propagators = config._propagators;
    term.log('# Propagators (' + propagators.length + 'x):');
    term.log('  index name vars args');

    for (var _i3 = 0; _i3 < propagators.length; ++_i3) {
      term.log('  ', _i3, ':', propagators[_i3].name + (propagators[_i3].name === 'reified' ? '(' + propagators[_i3].arg3 + ')' : ''), ':', propagators[_i3].index1, propagators[_i3].index2, propagators[_i3].index3, '->', domain__debug(config.initialDomains[propagators[_i3].index1]), domain__debug(config.initialDomains[propagators[_i3].index2]), domain__debug(config.initialDomains[propagators[_i3].index3]));
    }

    term.log('##');
  };

  _proto._debugConfig = function _debugConfig() {
    var config = _clone(this.config);

    config.initialDomains = config.initialDomains.map(domain__debug);

    getTerm().log('## _debugConfig:\n', INSPECT(config));
  }
  /**
   * Import from a dsl into this solver
   *
   * @param {string} s
   * @param {boolean} [_debug] Log out entire input with error token on fail?
   * @returns {FDO} this
   */
  ;

  _proto.imp = function imp(s, _debug) {
    // Term.log('##x## FDO.imp(...)');
    // term.log(s);
    // term.log('##y##');
    if (this.logging) {
      getTerm().log('      - FD Importing DSL; ' + s.length + ' bytes');

      getTerm().time('      - FD Import Time:');
    }

    var solver = importer(s, this, _debug);

    if (this.logging) {
      getTerm().timeEnd('      - FD Import Time:');
    }

    return solver;
  }
  /**
   * Export this config to a dsl. Optionally pass on a
   * space whose vardoms state to use for initialization.
   *
   * @param {$space} [space]
   * @param {boolean} [usePropagators]
   * @param {boolean} [minimal]
   * @param {boolean} [withDomainComments]
   * @returns {string}
   */
  ;

  _proto.exp = function exp(space, usePropagators, minimal, withDomainComments) {
    return exporter(this.config, space.vardoms, usePropagators, minimal, withDomainComments);
  }
  /**
   * Exposes internal method domain_fromList for subclass
   * (Used by PathSolver in a private project)
   * It will always create an array, never a "small domain"
   * (number that is bit-wise flags) because that should be
   * kept an internal fdq artifact.
   *
   * @param {number[]} list
   * @returns {$arrdom[]}
   */
  ;

  FDO.domainFromList = function domainFromList(list) {
    return domain_fromListToArrdom(list);
  }
  /**
   * Expose the internal terminal (console)
   *
   * @returns {Object} Unless overridden, this is the console global. Otherwise an object with al least the same methods as console
   */
  ;

  FDO.getTerm = function getTerm$1() {
    return getTerm();
  }
  /**
   * Set the terminal object (console by default)
   *
   * @param {Object} term An object that overrides one or more methods on `console`
   */
  ;

  FDO.setTerm = function setTerm$1(term) {
    return setTerm(term);
  };

  FDO.dsl = function dsl() {
    THROW('FDO.dsl: use FDO.solve()');
  };

  FDO.imp = function imp() {
    THROW('FDO.imp: use FDO.solve()');
  }
  /**
   * Shorthand for processing a dsl and returning the first solution, or a string describing reason for failure.
   *
   * @param {string} dsl
   * @param {Object} options Passed on to the FDO constructor
   * @param {boolean} [_debug] Log out entire input with error token on fail?
   * @returns {string|Object|Object[]|FDO} Will return all results if max explicitly not 1, returns FDO if options ask
   */
  ;

  FDO.solve = function solve(dsl, options, _debug) {
    if (options === void 0) {
      options = {};
    }

    if (!options.max) options.max = 1;
    var fdo = new FDO(options).imp(dsl, _debug);
    var s = fdo.solve(options);
    if (options.returnFdo) return fdo;
    if (fdo.config.aborted) return 'aborted';
    if (s.length === 0) return 'rejected';
    if (options.max !== 1) return s;
    return s[0];
  };

  return FDO;
}();
/**
 * Deep clone given object for debugging purposes (only)
 * Revise if used for anything concrete
 *
 * @param {*} value
 * @returns {*}
 */


function _clone(value) {
  switch (typeof value) {
    case 'object':
      {
        if (!value) return null;

        if (Array.isArray(value)) {
          return value.map(function (v) {
            return _clone(v);
          });
        }

        var obj = {};

        for (var _i4 = 0, _Object$entries = Object.entries(value); _i4 < _Object$entries.length; _i4++) {
          var _Object$entries$_i = _Object$entries[_i4],
              key = _Object$entries$_i[0],
              val = _Object$entries$_i[1];
          obj[key] = _clone(val);
        }

        return obj;
      }

    case 'function':
      {
        var fobj = {
          __THIS_IS_A_FUNCTION: 1,
          __source: value.toString()
        };

        for (var _i5 = 0, _Object$entries2 = Object.entries(value); _i5 < _Object$entries2.length; _i5++) {
          var _Object$entries2$_i = _Object$entries2[_i5],
              key = _Object$entries2$_i[0],
              val = _Object$entries2$_i[1];
          fobj[key] = _clone(val);
        }

        return fobj;
      }

    case 'string':
    case 'number':
    case 'boolean':
    case 'undefined':
      return value;

    default:
      THROW('config value what?', value);
  }
}
/**
 * This is the core search loop. Supports multiple solves although you
 * probably only need one solution. Won't return more solutions than max.
 *
 * @param {Object} state
 * @param {$config} config
 * @param {number} max Stop after finding this many solutions
 * @param {Function} [dbgCallback] Call after each epoch until it returns false, then stop calling it.
 * @returns {$space[]} All solved spaces that were found (until max or end was reached)
 */


function solver_runLoop(state, config, max, dbgCallback) {
  var list = [];

  while (state.more && list.length < max) {
    search_depthFirst(state, config, dbgCallback);

    if (state.status !== 'end') {
      list.push(state.space);
      ASSERT_LOG(LOG_FLAG_SOLUTIONS, function (log) {
        return log(' ## Found solution:', space_solution(state.space, config));
      });
    }
  }

  return list;
}

function solver_getSolutions(solvedSpaces, config, solutions, log) {
  ASSERT(Array.isArray(solutions), 'solutions target object should be an array');

  if (log >= LOG_STATS) {
    getTerm().time('      - FD Solution Construction Time');
  }

  for (var i = 0; i < solvedSpaces.length; ++i) {
    var solution = space_solution(solvedSpaces[i], config);
    solutions.push(solution);

    if (log >= LOG_SOLVES) {
      getTerm().log('      - FD solution() ::::::::::::::::::::::::::::');

      getTerm().log(JSON.stringify(solution));

      getTerm().log('                      ::::::::::::::::::::::::::::');
    }
  }

  if (log >= LOG_STATS) {
    getTerm().timeEnd('      - FD Solution Construction Time');
  }
}

export default FDO;
