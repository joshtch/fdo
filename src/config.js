// Config for a search tree where each node is a Space
// TOFIX: may want to rename this to "tree-state" or something; it's not just config

// Note: all domains in this class should be array based!
// This prevents leaking the small domain artifact outside of the library.

import {
  SUB,
  SUP,

  ASSERT,
  ASSERT_NORDOM,
  ASSERT_VARDOMS_SLOW,
  getTerm,
  INSPECT,
  THROW,
} from '../../fdlib/src/helpers';
import {
  TRIE_KEY_NOT_FOUND,

  trie_add,
  trie_create,
  trie_get,
  trie_has,
} from '../../fdlib/src/trie';
import {
  propagator_addDistinct,
  propagator_addDiv,
  propagator_addEq,
  propagator_addGt,
  propagator_addGte,
  propagator_addLt,
  propagator_addLte,
  propagator_addMarkov,
  propagator_addMul,
  propagator_addNeq,
  propagator_addPlus,
  propagator_addMin,
  propagator_addProduct,
  propagator_addReified,
  propagator_addRingMul,
  propagator_addSum,
} from './propagator';
import {
  NOT_FOUND,

  domain__debug,
  domain_createRange,
  domain_getValue,
  domain_max,
  domain_min,
  domain_isSolved,
  domain_toSmallest,
  domain_anyToSmallest,
} from '../../fdlib/src/domain';
import {
  constraint_create,
} from './constraint';
import distribution_getDefaults from './distribution/defaults';

// BODY_START

/**
 * @returns {$config}
 */
function config_create() {
  let config = {
    _class: '$config',
    // names of all vars in this search tree
    allVarNames: [],
    // doing `indexOf` for 5000+ names is _not_ fast. so use a trie
    _varNamesTrie: trie_create(),

    varStratConfig: config_createVarStratConfig(),
    valueStratName: 'min',
    targetedVars: 'all',
    varDistOptions: {},
    beforeSpace: undefined,
    afterSpace: undefined,

    // this is for the rng stuff in this library. in due time all calls
    // should happen through this function. and it should be initialized
    // with the rngCode string for exportability. this would be required
    // for webworkers and DSL imports which can't have functions. tests
    // can initialize it to something static, prod can use a seeded rng.
    rngCode: '', // string. Function(rngCode) should return a callable rng
    _defaultRng: undefined, // Function. if not exist at init time it'll be `rngCode ? Function(rngCode) : Math.random`

    // the propagators are generated from the constraints when a space
    // is created from this config. constraints are more higher level.
    allConstraints: [],

    constantCache: {}, // <value:varIndex>, generally anonymous vars but pretty much first come first serve
    initialDomains: [], // $nordom[] : initial domains for each var, maps 1:1 to allVarNames

    _propagators: [], // initialized later
    _varToPropagators: [], // initialized later
    _constrainedAway: [], // list of var names that were constrained but whose constraint was optimized away. they will still be "targeted" if target is all. TODO: fix all tests that depend on this and eliminate this. it is a hack.

    _constraintHash: {}, // every constraint is logged here (note: for results only the actual constraints are stored). if it has a result, the value is the result var _name_. otherwise just `true` if it exists and `false` if it was optimized away.
  };

  ASSERT(!void (config._propagates = 0), 'number of propagate() calls');

  return config;
}

function config_clone(config, newDomains) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let {
    varStratConfig,
    valueStratName,
    targetedVars,
    varDistOptions,
    constantCache,
    allVarNames,
    allConstraints,
    initialDomains,
    _propagators,
    _varToPropagators,
    _constrainedAway,
  } = config;

  let clone = {
    _class: '$config',
    _varNamesTrie: trie_create(allVarNames), // just create a new trie with (should be) the same names

    varStratConfig,
    valueStratName,
    targetedVars: targetedVars instanceof Array ? targetedVars.slice(0) : targetedVars,
    varDistOptions: JSON.parse(JSON.stringify(varDistOptions)),  // TOFIX: clone this more efficiently

    rngCode: config.rngCode,
    _defaultRng: config.rngCode ? undefined : config._defaultRng,

    constantCache, // is by reference ok?

    allVarNames: allVarNames.slice(0),
    allConstraints: allConstraints.slice(0),
    initialDomains: newDomains ? newDomains.map(domain_toSmallest) : initialDomains, // <varName:domain>

    _propagators: _propagators && _propagators.slice(0), // in case it is initialized
    _varToPropagators: _varToPropagators && _varToPropagators.slice(0), // inited elsewhere
    _constrainedAway: _constrainedAway && _constrainedAway.slice(0), // list of var names that were constrained but whose constraint was optimized away. they will still be "targeted" if target is all. TODO: fix all tests that depend on this and eliminate this. it is a hack.

    // not sure what to do with this in the clone...
    _constraintHash: {},
  };

  ASSERT(!void (clone._propagates = 0), 'number of propagate() calls');

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

  let domain = domain_createRange(lo, hi);
  return _config_addVar(config, varName, domain);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, anon)
 * @param {$arrdom} domain Small domain format not allowed here. this func is intended to be called from FDO, which only accepts arrdoms
 * @returns {number} varIndex
 */
function config_addVarDomain(config, varName, domain, _allowEmpty, _override) {
  ASSERT(domain instanceof Array, 'DOMAIN_MUST_BE_ARRAY_HERE');

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

  let domain = domain_createRange(value, value);

  return _config_addVar(config, varName, domain);
}

/**
 * @param {$config} config
 * @param {string|true} varName If true, the varname will be the same as the index it gets on allVarNames
 * @param {$nordom} domain
 * @returns {number} varIndex
 */
function _config_addVar(config, varName, domain, _allowEmpty, _override = false) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(_allowEmpty || domain, 'NON_EMPTY_DOMAIN');
  ASSERT(_allowEmpty || domain_min(domain) >= SUB, 'domain lo should be >= SUB', domain);
  ASSERT(_allowEmpty || domain_max(domain) <= SUP, 'domain hi should be <= SUP', domain);

  if (_override) {
    ASSERT(trie_has(config._varNamesTrie, varName), 'Assuming var exists when explicitly overriding');
    let index = trie_get(config._varNamesTrie, varName);
    ASSERT(index >= 0, 'should exist');
    ASSERT_NORDOM(domain, true, domain__debug);
    config.initialDomains[index] = domain;
    return;
  }

  let allVarNames = config.allVarNames;
  let varIndex = allVarNames.length;

  if (varName === true) {
    varName = '__' + String(varIndex) + '__';
  } else {
    if (typeof varName !== 'string') THROW('Var names should be a string or anonymous, was: ' + JSON.stringify(varName));
    if (!varName) THROW('Var name cannot be empty string');
    if (String(parseInt(varName, 10)) === varName) THROW('Don\'t use numbers as var names (' + varName + ')');
  }

  // note: 100 is an arbitrary number but since large sets are probably
  // automated it's very unlikely we'll need this check in those cases
  if (varIndex < 100) {
    if (trie_has(config._varNamesTrie, varName)) THROW('Var name already part of this config. Probably a bug?', varName);
  }

  let solvedTo = domain_getValue(domain);
  if (solvedTo !== NOT_FOUND && !config.constantCache[solvedTo]) config.constantCache[solvedTo] = varIndex;

  ASSERT_NORDOM(domain, true, domain__debug);
  config.initialDomains[varIndex] = domain;
  config.allVarNames.push(varName);
  trie_add(config._varNamesTrie, varName, varIndex);

  return varIndex;
}

/**
 * Initialize the config of this space according to certain presets
 *
 * @param {$config} config
 * @param {string} varName
 */
function config_setDefaults(config, varName) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  let defs = distribution_getDefaults(varName);
  for (let key in defs) config_setOption(config, key, defs[key]);
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
    type: (obj && obj.type) || 'naive',
    priorityByName: obj && obj.priorityByName,
    _priorityByIndex: undefined,
    inverted: !!(obj && obj.inverted),
    fallback: obj && obj.fallback,
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

  let fallback = false;
  switch (optionName) {
    case 'varStrategyFallback':
      fallback = true;
      // fall-through
    case 'varStrategy':
      if (typeof optionValue === 'function') THROW('functions no longer supported', optionValue);
      if (typeof optionValue === 'string') THROW('strings should be passed on as {type:value}', optionValue);
      if (typeof optionValue !== 'object') THROW('varStrategy should be object', optionValue);
      if (optionValue.name) THROW('name should be type');
      if (optionValue.dist_name) THROW('dist_name should be type');
      ASSERT(!optionTarget, 'optionTarget is not used for varStrategy (this is not "per-var strat")');
      let vsc = config_createVarStratConfig(optionValue);
      if (fallback) {
        let rvsc = config.varStratConfig;
        ASSERT(rvsc, 'there must be an existing config to add a fallback');
        while (rvsc.fallback) rvsc = rvsc.fallback;
        rvsc.fallback = vsc;
      } else {
        config.varStratConfig = vsc;
        while (vsc.fallback) {
          vsc.fallback = config_createVarStratConfig(vsc.fallback);
          vsc = vsc.fallback;
        }
      }
      break;

    case 'valueStrategy':
      // determine how the next value of a variable is picked when creating a new space
      config.valueStratName = optionValue;
      break;

    case 'targeted_var_names':
      if (!optionValue || !optionValue.length) THROW('ONLY_USE_WITH_SOME_TARGET_VARS'); // omit otherwise to target all
      // which vars must be solved for this space to be solved
      // string: 'all'
      // string[]: list of vars that must be solved
      // function: callback to return list of names to be solved
      config.targetedVars = optionValue;
      break;

    case 'varStratOverrides':
      // An object which defines a value distributor per variable
      // which overrides the globally set value distributor.
      // See Bvar#distributeOptions (in multiverse)

      for (let key in optionValue) {
        config_setOption(config, 'varValueStrat', optionValue[key], key);
      }
      break;

    case 'varValueStrat':
      // override all the specific strategy parameters for one variable
      ASSERT(typeof optionTarget === 'string', 'expecting a name');
      if (!config.varDistOptions) config.varDistOptions = {};
      ASSERT(!config.varDistOptions[optionTarget], 'should not be known yet');
      config.varDistOptions[optionTarget] = optionValue;

      if (optionValue.valtype === 'markov') {
        let matrix = optionValue.matrix;
        if (!matrix) {
          if (optionValue.expandVectorsWith) {
            matrix = optionValue.matrix = [{vector: []}];
          } else {
            THROW('FDO: markov var missing distribution (needs matrix or expandVectorsWith)');
          }
        }

        for (let i = 0, n = matrix.length; i < n; ++i) {
          let row = matrix[i];
          if (row.boolean) THROW('row.boolean was deprecated in favor of row.boolVarName');
          if (row.booleanId !== undefined) THROW('row.booleanId is no longer used, please use row.boolVarName');
          let boolFuncOrName = row.boolVarName;
          if (typeof boolFuncOrName === 'function') {
            boolFuncOrName = boolFuncOrName(optionValue);
          }
          if (boolFuncOrName) {
            if (typeof boolFuncOrName !== 'string') {
              THROW('row.boolVarName, if it exists, should be the name of a var or a func that returns that name, was/got: ' + boolFuncOrName + ' (' + typeof boolFuncOrName + ')');
            }
            // store the var index
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

    case 'var': return THROW('REMOVED. Replace `var` with `varStrategy`');
    case 'val': return THROW('REMOVED. Replace `var` with `valueStrategy`');

    case 'rng':
      // sets the default rng for this solve. a string should be raw js
      // code, number will be a static return value, a function is used
      // as is. the resulting function should return a value `0<=v<1`
      if (typeof optionValue === 'string') {
        config.rngCode = optionValue;
      } else if (typeof optionValue === 'number') {
        config.rngCode = 'return ' + optionValue + ';'; // dont use arrow function. i dont think this passes through babel.
      } else {
        ASSERT(typeof optionValue === 'function', 'rng should be a preferably a string and otherwise a function');
        config._defaultRng = optionValue;
      }
      break;

    default: THROW('unknown option');
  }
}

/**
 * This function should be removed once we can update mv
 *
 * @deprecated in favor of config_setOption
 * @param {$config} config
 * @param {Object} options
 * @property {Object} [options.varStrategy]
 * @property {string} [options.varStrategy.name]
 * @property {string[]} [options.varStrategy.list] Only if name=list
 * @property {string[]} [options.varStrategy.priorityByName] Only if name=list
 * @property {boolean} [options.varStrategy.inverted] Only if name=list
 * @property {Object} [options.varStrategy.fallback] Same struct as options.varStrategy (recursive)
 * @property {Function} [options.beforeSpace] To be called before each Space propagation
 * @property {Function} [options.afterSpace] To be called after each Space propagation
 */
function config_setOptions(config, options) {
  if (!options) return;

  if (options.varStrategy) config_setOption(config, 'varStrategy', options.varStrategy);
  if (options.valueStrategy) config_setOption(config, 'valueStrategy', options.valueStrategy);
  if (options.targeted_var_names) config_setOption(config, 'targeted_var_names', options.targeted_var_names);
  if (options.varStratOverrides) config_setOption(config, 'varStratOverrides', options.varStratOverrides);
  if (options.varStratOverride) {
    getTerm().warn('deprecated "varStratOverride" in favor of "varValueStrat"');
    config_setOption(config, 'varValueStrat', options.varStratOverride, options.varStratOverrideName);
  }
  if (options.varValueStrat) config_setOption(config, 'varValueStrat', options.varValueStrat, options.varStratOverrideName);
  if (options.beforeSpace) config_setOption(config, 'beforeSpace', options.beforeSpace);
  if (options.afterSpace) config_setOption(config, 'afterSpace', options.afterSpace);
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
  let hash = new Array(config.allVarNames.length);
  let propagators = config._propagators;
  let initialDomains = config.initialDomains;
  for (let propagatorIndex = 0, plen = propagators.length; propagatorIndex < plen; ++propagatorIndex) {
    let propagator = propagators[propagatorIndex];
    _config_addVarConditionally(propagator.index1, initialDomains, hash, propagatorIndex);
    if (propagator.index2 >= 0) _config_addVarConditionally(propagator.index2, initialDomains, hash, propagatorIndex);
    if (propagator.index3 >= 0) _config_addVarConditionally(propagator.index3, initialDomains, hash, propagatorIndex);
  }
  config._varToPropagators = hash;
}
function _config_addVarConditionally(varIndex, initialDomains, hash, propagatorIndex) {
  // (at some point this could be a strings, or array, or whatever)
  ASSERT(typeof varIndex === 'number', 'must be number');
  // dont bother adding props on unsolved vars because they can't affect
  // anything anymore. seems to prevent about 10% in our case so worth it.
  let domain = initialDomains[varIndex];
  ASSERT_NORDOM(domain, true, domain__debug);
  if (!domain_isSolved(domain)) {
    if (!hash[varIndex]) hash[varIndex] = [propagatorIndex];
    else if (hash[varIndex].indexOf(propagatorIndex) < 0) hash[varIndex].push(propagatorIndex);
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
  // should return a new var name for most props
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(varNames.every(e => typeof e === 'string' || typeof e === 'number' || e === undefined), 'all var names should be strings or numbers or undefined', varNames);

  let inputConstraintKeyOp = name;
  let resultVarName;

  let anonIsBool = false;
  switch (name) { /* eslint no-fallthrough: "off" */
    case 'reifier':
      anonIsBool = true;
      inputConstraintKeyOp = param;
      // fall-through
    case 'plus':
    case 'min':
    case 'ring-mul':
    case 'ring-div':
    case 'mul':
      ASSERT(varNames.length === 3, 'MISSING_RESULT_VAR'); // note that the third value may still be "undefined"
      // fall-through
    case 'sum':
    case 'product': {
      let sumOrProduct = name === 'product' || name === 'sum';

      resultVarName = sumOrProduct ? param : varNames[2];
      let resultVarIndex;

      if (resultVarName === undefined) {
        if (anonIsBool) resultVarIndex = config_addVarAnonRange(config, 0, 1);
        else resultVarIndex = config_addVarAnonNothing(config);
        resultVarName = config.allVarNames[resultVarIndex];
      } else if (typeof resultVarName === 'number') {
        resultVarIndex = config_addVarAnonConstant(config, resultVarName);
        resultVarName = config.allVarNames[resultVarIndex];
      } else if (typeof resultVarName !== 'string') {
        THROW(`expecting result var name to be absent or a number or string: \`${resultVarName}\``);
      } else {
        resultVarIndex = trie_get(config._varNamesTrie, resultVarName);
        if (resultVarIndex < 0) THROW('Vars must be defined before using them (' + resultVarName + ')');
      }

      if (sumOrProduct) param = resultVarIndex;
      else varNames[2] = resultVarName;

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
      THROW(`UNKNOWN_PROPAGATOR ${name}`);
  }

  // note: if param is a var constant then that case is already resolved above
  config_compileConstants(config, varNames);

  if (config_dedupeConstraint(config, inputConstraintKeyOp + '|' + varNames.join(','), resultVarName)) return resultVarName;

  let varIndexes = config_varNamesToIndexes(config, varNames);

  let constraint = constraint_create(name, varIndexes, param);
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
  for (let i = 0, n = varNames.length; i < n; ++i) {
    if (typeof varNames[i] === 'number') {
      let varIndex = config_addVarAnonConstant(config, varNames[i]);
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
  let varIndexes = [];
  for (let i = 0, n = varNames.length; i < n; ++i) {
    let varName = varNames[i];
    ASSERT(typeof varName === 'string', 'var names should be strings here', varName, i, varNames);
    let varIndex = trie_get(config._varNamesTrie, varName);
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
  if (!config._constraintHash) config._constraintHash = {}; // can happen for imported configs that are extended or smt
  let haveConstraint = config._constraintHash[constraintUI];
  if (haveConstraint === true) {
    if (resultVarName !== undefined) {
      throw new Error('How is this possible?'); // either a constraint-with-value gets a result var, or it's a constraint-sans-value
    }
    return true;
  }
  if (haveConstraint !== undefined) {
    ASSERT(typeof haveConstraint === 'string', 'if not true or undefined, it should be a string');
    ASSERT(resultVarName && typeof resultVarName === 'string', 'if it was recorded as a constraint-with-value then it should have a result var now as well');
    // the constraint exists and had a result. map that result to this result for equivalent results.
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
  let constraints = config.allConstraints;
  config._propagators = [];
  for (let i = 0, n = constraints.length; i < n; ++i) {
    let constraint = constraints[i];
    if (constraint.varNames) {
      getTerm().warn('saw constraint.varNames, converting to varIndexes, log out result and update test accordingly');
      constraint.varIndexes = constraint.varNames.map(name => trie_get(config._varNamesTrie, name));
      let p = constraint.param;
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
  ASSERT(varIndexes instanceof Array, 'INDEXES_SHOULD_BE_ARRAY', JSON.stringify(_constraint));

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
  let varDistOptions = config.varDistOptions;
  for (let varName in varDistOptions) {
    let varIndex = trie_get(config._varNamesTrie, varName);
    if (varIndex < 0) THROW('Found markov var options for an unknown var name (name=' + varName + ')');
    let options = varDistOptions[varName];
    if (options && options.valtype === 'markov') {
      return propagator_addMarkov(config, varIndex);
    }
  }
}

function config_populateVarStrategyListHash(config) {
  let vsc = config.varStratConfig;
  while (vsc) {
    if (vsc.priorityByName) {
      let obj = {};
      let list = vsc.priorityByName;
      for (let i = 0, len = list.length; i < len; ++i) {
        let varIndex = trie_get(config._varNamesTrie, list[i]);
        ASSERT(varIndex !== TRIE_KEY_NOT_FOUND, 'VARS_IN_PRIO_LIST_SHOULD_BE_KNOWN_NOW');
        obj[varIndex] = len - i; // never 0, offset at 1. higher value is higher prio
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
  }

  // Generate the default rng ("Random Number Generator") to use in stuff like markov
  // We prefer the rngCode because that way we can serialize the config (required for stuff like webworkers)
  if (!config._defaultRng) config._defaultRng = config.rngCode ? Function(config.rngCode) : Math.random; /* eslint no-new-func: "off" */

  ASSERT_VARDOMS_SLOW(config.initialDomains, domain__debug);
  config_generatePropagators(config);
  config_generateMarkovs(config);
  config_populateVarPropHash(config);
  config_populateVarStrategyListHash(config);
  ASSERT_VARDOMS_SLOW(config.initialDomains, domain__debug);

  ASSERT(config._varToPropagators, 'should have generated hash');
}

// BODY_STOP

export {
  config_addConstraint,
  config_addPropagator,
  config_addVarAnonConstant,
  config_addVarAnonNothing,
  config_addVarAnonRange,
  config_addVarConstant,
  config_addVarDomain,
  config_addVarNothing,
  config_addVarRange,
  config_clone,
  config_create,
  config_createVarStratConfig,
  config_generatePropagators,
  config_init,
  config_populateVarPropHash,
  config_setDefaults,
  config_setOption,
  config_setOptions,

  // testing
  _config_addVar,
};
