/*
The functions in this file are supposed to determine the next
value while solving a Space. The functions are supposed to
return the new domain for some given var index. If there's no
new choice left it should return undefined to signify the end.
*/

import {
  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
  LOG_FLAG_CHOICE,
} from 'fdlib/src/assert';

import {
  NO_SUCH_VALUE,
} from 'fdlib/src/constants';

import {
  domain__debug,
  domain_containsValue,
  domain_createValue,
  domain_createRange,
  domain_getFirstIntersectingValue,
  domain_intersection,
  domain_isSolved,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_removeValue,
} from 'fdlib/src/domain';

import {
  THROW,
} from 'fdlib/src/helpers';

import distribution_markovSampleNextFromDomain from './markov';

import {
  markov_createLegend,
  markov_createProbVector,
} from '../markov';

const FIRST_CHOICE = 0;
const SECOND_CHOICE = 1;
const THIRD_CHOICE = 2;
const NO_CHOICE = undefined;

function distribute_getNextDomainForVar(space, config, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(space.vardoms[varIndex] && !domain_isSolved(space.vardoms[varIndex]), 'CALLSITE_SHOULD_PREVENT_DETERMINED'); // TODO: test

  let valueStrategy = config.valueStratName;

  // each var can override the value distributor
  let configVarDistOptions = config.varDistOptions;
  let varName = config.allVarNames[varIndex];
  ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  let valueDistributorName = configVarDistOptions[varName] && configVarDistOptions[varName].valtype;
  if (valueDistributorName) valueStrategy = valueDistributorName;

  let D = (typeof valueStrategy === 'function')
    ? valueStrategy(space, varIndex, choiceIndex)
    : _distribute_getNextDomainForVar(valueStrategy, space, config, varIndex, choiceIndex);
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribute_getNextDomainForVar; index', varIndex, 'is now', domain__debug(D)));
  return D;
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
  }

  THROW('unknown next var func', stratName);
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
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribution_valueByList', varIndex, choiceIndex));
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  let varName = config.allVarNames[varIndex];
  ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  let configVarDistOptions = config.varDistOptions;
  ASSERT(configVarDistOptions, 'space should have config.varDistOptions');
  ASSERT(configVarDistOptions[varName], 'there should be distribution options available for every var', varName);
  ASSERT(configVarDistOptions[varName].list, 'there should be a distribution list available for every var', varName);
  let varDistOptions = configVarDistOptions[varName];
  let listSource = varDistOptions.list;

  let fallbackName = '';
  if (varDistOptions.fallback) {
    fallbackName = varDistOptions.fallback.valtype;
    ASSERT(fallbackName, 'should have a fallback type');
    ASSERT(fallbackName !== 'list', 'prevent recursion loops');
  }

  let list = listSource;
  if (typeof listSource === 'function') {
    // Note: callback should return the actual list
    list = listSource(space, varName, choiceIndex);
  }

  switch (choiceIndex) {
    case FIRST_CHOICE:
      let nextValue = domain_getFirstIntersectingValue(domain, list);
      if (nextValue === NO_SUCH_VALUE) {
        return _distribute_getNextDomainForVar(fallbackName || 'naive', space, config, varIndex, FIRST_CHOICE);
      } else {
        space._lastChosenValue = nextValue;
      }
      return domain_createValue(nextValue);

    case SECOND_CHOICE:
      if (space._lastChosenValue >= 0) {
        return domain_removeValue(domain, space._lastChosenValue);
      }
      return _distribute_getNextDomainForVar(fallbackName || 'naive', space, config, varIndex, SECOND_CHOICE);
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
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
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribution_valueByMin', varIndex, choiceIndex));
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      let minValue = domain_min(domain);
      space._lastChosenValue = minValue;
      return domain_createValue(minValue);

    case SECOND_CHOICE:
      // Cannot lead to empty domain because lo can only be SUP if
      // domain was solved and we assert it wasn't.
      ASSERT(space._lastChosenValue >= 0, 'first choice should set this property and it should at least be 0', space._lastChosenValue);
      return domain_removeValue(domain, space._lastChosenValue);
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
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
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribution_valueByMax', varIndex, choiceIndex));
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      let maxValue = domain_max(domain);
      space._lastChosenValue = maxValue;
      return domain_createValue(maxValue);

    case SECOND_CHOICE:
      // Cannot lead to empty domain because hi can only be SUB if
      // domain was solved and we assert it wasn't.

      ASSERT(space._lastChosenValue > 0, 'first choice should set this property and it should at least be 1', space._lastChosenValue);
      return domain_removeValue(domain, space._lastChosenValue);
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
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
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribution_valueByMid', varIndex, choiceIndex));
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      let middle = domain_middleElement(domain);
      space._lastChosenValue = middle;
      return domain_createValue(middle);

    case SECOND_CHOICE:
      ASSERT(space._lastChosenValue >= 0, 'first choice should set this property and it should at least be 0', space._lastChosenValue);
      return domain_removeValue(domain, space._lastChosenValue);
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
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
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribution_valueBySplitMin', varIndex, choiceIndex));
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  let max = domain_max(domain);

  switch (choiceIndex) {
    case FIRST_CHOICE: {
      // TOFIX: can do this more optimal if coding it out explicitly
      let min = domain_min(domain);
      let mmhalf = min + Math.floor((max - min) / 2);
      space._lastChosenValue = mmhalf;

      // Note: domain is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      return domain_intersection(domain, domain_createRange(min, mmhalf));
    }

    case SECOND_CHOICE: {
      ASSERT(space._lastChosenValue >= 0, 'first choice should set this property and it should at least be 0', space._lastChosenValue);
      // Note: domain is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      return domain_intersection(domain, domain_createRange(space._lastChosenValue + 1, max));
    }
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
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
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribution_valueBySplitMax', varIndex, choiceIndex));
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  let min = domain_min(domain);

  switch (choiceIndex) {
    case FIRST_CHOICE: {
      // TOFIX: can do this more optimal if coding it out explicitly
      let max = domain_max(domain);
      let mmhalf = min + Math.floor((max - min) / 2);
      space._lastChosenValue = mmhalf;

      // Note: domain is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      return domain_intersection(domain, domain_createRange(mmhalf + 1, max));
    }

    case SECOND_CHOICE: {
      ASSERT(space._lastChosenValue >= 0, 'first choice should set this property and it should at least be 0', space._lastChosenValue);
      // Note: domain is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      return domain_intersection(domain, domain_createRange(min, space._lastChosenValue));
    }
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
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
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribution_valueByMinMaxCycle', varIndex, choiceIndex));
  if (_isEven(varIndex)) {
    return distribution_valueByMin(space, varIndex, choiceIndex);
  } else {
    return distribution_valueByMax(space, varIndex, choiceIndex);
  }
}

/**
 * @param {number} n
 * @returns {boolean}
 */
function _isEven(n) { return n % 2 === 0; }

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
  ASSERT_LOG(LOG_FLAG_CHOICE, log => log('distribution_valueByMarkov', varIndex, choiceIndex));
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NORDOM(domain);
  ASSERT(domain && !domain_isSolved(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE: {
      // THIS IS AN EXPENSIVE STEP!

      let varName = config.allVarNames[varIndex];
      ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
      let configVarDistOptions = config.varDistOptions;
      ASSERT(configVarDistOptions, 'space should have config.varDistOptions');
      let distOptions = configVarDistOptions[varName];
      ASSERT(distOptions, 'markov vars should have  distribution options');
      let expandVectorsWith = distOptions.expandVectorsWith;
      ASSERT(distOptions.matrix, 'there should be a matrix available for every var');
      ASSERT(distOptions.legend || (typeof expandVectorsWith === 'number' && expandVectorsWith >= 0), 'every var should have a legend or expandVectorsWith set');

      let random = distOptions.random || config._defaultRng;
      ASSERT(typeof random === 'function', 'RNG_SHOULD_BE_FUNCTION');

      // note: expandVectorsWith can be 0, so check with null
      let values = markov_createLegend(typeof expandVectorsWith === 'number', distOptions.legend, domain);
      let valueCount = values.length;
      if (!valueCount) {
        return NO_CHOICE;
      }

      let probabilities = markov_createProbVector(space, distOptions.matrix, expandVectorsWith, valueCount);
      let value = distribution_markovSampleNextFromDomain(domain, probabilities, values, random);
      if (value == null) {
        return NO_CHOICE;
      }

      ASSERT(domain_containsValue(domain, value), 'markov picks a value from the existing domain so no need for a constrain below');
      space._lastChosenValue = value;

      return domain_createValue(value);
    }

    case SECOND_CHOICE: {
      let lastValue = space._lastChosenValue;
      ASSERT(typeof lastValue === 'number', 'should have cached previous value');

      let newDomain = domain_removeValue(domain, lastValue);
      ASSERT(domain, 'domain cannot be empty because only one value was removed and the domain is asserted to be not solved above');
      ASSERT_NORDOM(newDomain, true, domain__debug);
      return newDomain;
    }
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
}

export default distribute_getNextDomainForVar;
export {
  FIRST_CHOICE,
  SECOND_CHOICE,
  THIRD_CHOICE,
  NO_CHOICE,

  // for testing:
  distribution_valueByList,
  distribution_valueByMarkov,
  distribution_valueByMax,
  distribution_valueByMid,
  distribution_valueByMin,
  distribution_valueByMinMaxCycle,
  distribution_valueBySplitMax,
  distribution_valueBySplitMin,
  _distribute_getNextDomainForVar,
};
