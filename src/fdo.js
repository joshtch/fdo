import {
  ASSERT,
  ASSERT_ARRDOM,
  ASSERT_LOG,
  ASSERT_VARDOMS_SLOW,
  LOG_FLAG_SOLUTIONS,
  LOG_MAX,
  LOG_MIN,
  LOG_NONE,
  LOG_SOLVES,
  LOG_STATS,
  SUB,
  SUP,
  domain__debug,
  domain_anyToSmallest,
  domain_createEmpty,
  domain_fromListToArrdom,
  domain_isEmpty,
  INSPECT,
  THROW,
  getTerm,
  setTerm,
  trie_get,
} from 'fdlib';

import {
  config_addConstraint,
  config_addVarAnonConstant,
  config_addVarDomain,
  config_create,
  config_init,
  config_setOption,
} from './config';

import { exporter, exporter_encodeVarName } from './exporter';

import { importer } from './importer';

import { search_depthFirst } from './search';

import {
  space_createFromConfig,
  space_solution,
  space_toConfig,
} from './space';

/**
 * Finite Domain brute force solver Only
 * No input-problem optimizations applied, will try to solve the problem as is.
 *
 * @type {FDO}
 */
class FDO {
  /**
   * @param {Object} options = {}
   * @property {string} [options.distribute='naive']
   * @property {Object} [options.searchDefaults]
   * @property {$config} [options.config=config_create()]
   * @property {boolean} [options.exportBare]
   * @property {number} [options.logging=LOG_NONE]
   * @property {Object} [options.logger=console] An object like `console` that can override some of its methods
   */
  constructor(options = {}) {
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

    ASSERT(
      options._class !== '$config',
      'config should be passed on in a config property of options'
    );

    if (options.config) {
      this.config = options.config;
      const { config } = this;
      if (config.initialDomains) {
        const { initialDomains } = config;
        for (let i = 0, len = initialDomains.length; i < len; ++i) {
          let domain = initialDomains[i];
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
      more: false,
    };

    this._prepared = false;
  }

  /**
   * Returns an anonymous var with given value as lo/hi for the domain
   *
   * @param {number} num
   * @returns {string}
   */
  num(num) {
    if (typeof num !== 'number') {
      THROW(`FDO#num: expecting a number, got ${num} (a ${typeof num})`);
    }

    if (isNaN(num)) {
      THROW('FDO#num: expecting a number, got NaN');
    }

    const varIndex = config_addVarAnonConstant(this.config, num);
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += ': __' + varIndex + '__ = ' + num + '\n';
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
  decl(varName, domainOrValue, distributionOptions, _allowEmpty, _override) {
    if (varName === '') THROW('Var name can not be the empty string');
    ASSERT(
      varName === undefined || typeof varName === 'string',
      'var name should be undefined or a string'
    );
    ASSERT(
      distributionOptions === undefined ||
        typeof distributionOptions === 'object',
      'options must be omitted or an object'
    );

    const arrdom =
      typeof domainOrValue === 'number'
        ? [domainOrValue, domainOrValue]
        : domainOrValue || [SUB, SUP];
    ASSERT_ARRDOM(arrdom);

    if (arrdom.length === 0 && !_allowEmpty) THROW('EMPTY_DOMAIN_NOT_ALLOWED');
    const varIndex = config_addVarDomain(
      this.config,
      varName || true,
      arrdom,
      _allowEmpty,
      _override
    );
    varName = this.config.allVarNames[varIndex];

    if (distributionOptions) {
      if (distributionOptions.distribute)
        THROW('Use `valtype` to set the value distribution strategy');
      config_setOption(
        this.config,
        'varValueStrat',
        distributionOptions,
        varName
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          ': ' + exporter_encodeVarName(varName) + ' = [' + arrdom + ']';
        if (distributionOptions && distributionOptions.valtype === 'markov') {
          this.exported += ' @markov';
          if (distributionOptions.matrix) {
            this.exported += ' matrix(' + distributionOptions.matrix + ')';
          }

          if (distributionOptions.expandVectorsWith !== undefined) {
            this.exported +=
              ' expand(' + distributionOptions.expandVectorsWith + ')';
          }

          if (distributionOptions.legend) {
            this.exported += ' legend(' + distributionOptions.legend + ')';
          }
        }

        this.exported +=
          ' # options=' + JSON.stringify(distributionOptions) + '\n';
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
  decls(varNames, domainOrValue, options) {
    for (let i = 0, n = varNames.length; i < n; ++i) {
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
  declRange(varName, lo, hi, options) {
    ASSERT(typeof lo === 'number', 'LO_SHOULD_BE_NUMBER');
    ASSERT(typeof hi === 'number', 'HI_SHOULD_BE_NUMBER');
    ASSERT(
      typeof options === 'object' || options === undefined,
      'EXPECTING_OPTIONS_OR_NOTHING'
    );

    return this.decl(varName, [lo, hi], options);
  }

  // Arithmetic Propagators

  plus(A, B, C) {
    const R = config_addConstraint(this.config, 'plus', [A, B, C]);
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' + ' +
          exporter_encodeVarName(B) +
          ' # plus, result var was: ' +
          C +
          '\n';
      }
    }

    return R;
  }

  minus(A, B, C) {
    const R = config_addConstraint(this.config, 'min', [A, B, C]);
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' - ' +
          exporter_encodeVarName(B) +
          ' # min, result var was: ' +
          C +
          '\n';
      }
    }

    return R;
  }

  mul(A, B, C) {
    const R = config_addConstraint(this.config, 'ring-mul', [A, B, C]);
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' * ' +
          exporter_encodeVarName(B) +
          ' # ringmul, result var was: ' +
          C +
          '\n';
      }
    }

    return R;
  }

  div(A, B, C) {
    const R = config_addConstraint(this.config, 'ring-div', [A, B, C]);
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' / ' +
          exporter_encodeVarName(B) +
          ' # ringdiv, result var was: ' +
          C +
          '\n';
      }
    }

    return R;
  }

  sum(A, C) {
    const R = config_addConstraint(this.config, 'sum', A, C);
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = sum(' +
          A.map(exporter_encodeVarName) +
          ') # result var was: ' +
          C +
          '\n';
      }
    }

    return R;
  }

  product(A, C) {
    const R = config_addConstraint(this.config, 'product', A, C);
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = product(' +
          A.map(exporter_encodeVarName) +
          ') # result var was: ' +
          C +
          '\n';
      }
    }

    return R;
  }

  // TODO
  // times_plus    k1*v1 + k2*v2
  // wsum          ∑ k*v
  // scale         k*v

  // (In)equality Propagators
  // only first expression can be array

  distinct(A) {
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported += 'distinct(' + A.map(exporter_encodeVarName) + ')\n';
      }
    }

    config_addConstraint(this.config, 'distinct', A);
  }

  eq(e1, e2) {
    if (Array.isArray(e1)) {
      for (let i = 0, n = e1.length; i < n; ++i) {
        this.eq(e1[i], e2);
      }
    } else if (Array.isArray(e2)) {
      for (let i = 0, n = e2.length; i < n; ++i) {
        this.eq(e1, e2[i]);
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        if (this.GENERATE_BARE_DSL) {
          this.exported +=
            exporter_encodeVarName(e1) +
            ' == ' +
            exporter_encodeVarName(e2) +
            '\n';
        }
      }

      config_addConstraint(this.config, 'eq', [e1, e2]);
    }
  }

  neq(e1, e2) {
    if (Array.isArray(e1)) {
      for (let i = 0, n = e1.length; i < n; ++i) {
        this.neq(e1[i], e2);
      }
    } else if (Array.isArray(e2)) {
      for (let i = 0, n = e2.length; i < n; ++i) {
        this.neq(e1, e2[i]);
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        if (this.GENERATE_BARE_DSL) {
          this.exported +=
            exporter_encodeVarName(e1) +
            ' != ' +
            exporter_encodeVarName(e2) +
            '\n';
        }
      }

      config_addConstraint(this.config, 'neq', [e1, e2]);
    }
  }

  gte(A, B) {
    ASSERT(!Array.isArray(A), 'NOT_ACCEPTING_ARRAYS');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(A) + ' >= ' + exporter_encodeVarName(B) + '\n';
      }
    }

    config_addConstraint(this.config, 'gte', [A, B]);
  }

  lte(A, B) {
    ASSERT(!Array.isArray(A), 'NOT_ACCEPTING_ARRAYS');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(A) + ' <= ' + exporter_encodeVarName(B) + '\n';
      }
    }

    config_addConstraint(this.config, 'lte', [A, B]);
  }

  gt(A, B) {
    ASSERT(!Array.isArray(A), 'NOT_ACCEPTING_ARRAYS');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(A) + ' > ' + exporter_encodeVarName(B) + '\n';
      }
    }

    config_addConstraint(this.config, 'gt', [A, B]);
  }

  lt(A, B) {
    ASSERT(!Array.isArray(A), 'NOT_ACCEPTING_ARRAYS');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(A) + ' < ' + exporter_encodeVarName(B) + '\n';
      }
    }

    config_addConstraint(this.config, 'lt', [A, B]);
  }

  isNeq(A, B, C) {
    const R = config_addConstraint(this.config, 'reifier', [A, B, C], 'neq');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' !=? ' +
          exporter_encodeVarName(B) +
          '\n';
      }
    }

    return R;
  }

  isEq(A, B, C) {
    const R = config_addConstraint(this.config, 'reifier', [A, B, C], 'eq');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' ==? ' +
          exporter_encodeVarName(B) +
          '\n';
      }
    }

    return R;
  }

  isGte(A, B, C) {
    const R = config_addConstraint(this.config, 'reifier', [A, B, C], 'gte');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' >=? ' +
          exporter_encodeVarName(B) +
          '\n';
      }
    }

    return R;
  }

  isLte(A, B, C) {
    const R = config_addConstraint(this.config, 'reifier', [A, B, C], 'lte');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' <=? ' +
          exporter_encodeVarName(B) +
          '\n';
      }
    }

    return R;
  }

  isGt(A, B, C) {
    const R = config_addConstraint(this.config, 'reifier', [A, B, C], 'gt');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' >? ' +
          exporter_encodeVarName(B) +
          '\n';
      }
    }

    return R;
  }

  isLt(A, B, C) {
    const R = config_addConstraint(this.config, 'reifier', [A, B, C], 'lt');
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported +=
          exporter_encodeVarName(R) +
          ' = ' +
          exporter_encodeVarName(A) +
          ' <? ' +
          exporter_encodeVarName(B) +
          '\n';
      }
    }

    return R;
  }

  // Various rest

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
  solve(options = {}) {
    if (options.log) this.logging = options.log;
    const log = this.logging;
    const { max = 1000 } = options;

    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        getTerm().log(
          '## bare export:\n' + this.exported + '## end of exported\n'
        );
      }
    }

    this._prepare(options, log);
    let dbgCallback;
    if (
      options._tostring ||
      options._debug ||
      options._debugConfig ||
      options._debugSpace ||
      options._debugSolver
    ) {
      dbgCallback = epoch => {
        if ((options._debugDelay | 0) >= epoch) {
          if (options._tostring) getTerm().log(exporter(this.config));
          if (options._debug) this._debugLegible();
          if (options._debugConfig) this._debugConfig();
          if (process.env.NODE_ENV !== 'production') {
            if (options._debugSpace)
              getTerm().log('## _debugSpace:\n', INSPECT(this._space));
          }

          if (options._debugSolver) this._debugSolver();
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
  _prepare(options = {}, log) {
    ASSERT(
      log === undefined || (log >= LOG_MIN && log <= LOG_MAX),
      'log level should be a valid value or be undefined (in tests)'
    );
    if (log >= LOG_STATS) {
      getTerm().log('      - FD Preparing...');
      getTerm().time('      - FD Prepare Time');
    }

    this._prepareConfig(options, log);

    // Create the root node of the search tree (each node is a Space)
    const rootSpace = space_createFromConfig(this.config);

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
  _prepareConfig(options, log) {
    ASSERT(
      log === undefined || (log >= LOG_MIN && log <= LOG_MAX),
      'log level should be a valid value or be undefined (in tests)'
    );

    const { config } = this;
    ASSERT_VARDOMS_SLOW(config.initialDomains, domain__debug);

    if (options.vars && options.vars !== 'all') {
      config_setOption(config, 'targeted_var_names', options.vars);
    }

    if (options.beforeSpace)
      config_setOption(config, 'beforeSpace', options.beforeSpace);
    if (options.afterSpace)
      config_setOption(config, 'afterSpace', options.afterSpace);

    config_init(config);
  }

  /**
   * Run the solver. You should call @_prepare before calling this function.
   *
   * @param {number} max Hard stop the solver when this many solutions have been found
   * @param {number} log One of the LOG_* constants
   * @param {Function} [dbgCallback] Call after each epoch until it returns false, then stop calling it.
   */
  _run(max, log, dbgCallback) {
    ASSERT(typeof max === 'number', 'max should be a number', max);
    ASSERT(
      log >= LOG_MIN && log <= LOG_MAX,
      'log level should be a valid value'
    );

    ASSERT(this._prepared, 'must run #prepare before #run');
    this._prepared = false;

    const { state } = this;
    ASSERT(state);

    let term;
    if (log >= LOG_STATS) {
      term = getTerm();
      term.log(`      - FD Var Count: ${this.config.allVarNames.length}`);
      term.log(
        `      - FD Targeted: ${
          this.config.targetedVars === 'all'
            ? 'all'
            : this.config.targetedVars.length
        }`
      );
      term.log(
        `      - FD Constraint Count: ${this.config.allConstraints.length}`
      );
      term.log(
        `      - FD Propagator Count: ${this.config._propagators.length}`
      );
      term.log('      - FD Solving...');
      term.time('      - FD Solving Time');
    }

    let alreadyRejected = false;
    const { vardoms } = state.space;
    for (let i = 0, n = vardoms.length; i < n; ++i) {
      if (domain_isEmpty(vardoms[i])) {
        alreadyRejected = true;
        if (log >= LOG_STATS) {
          term.log(
            '      - FD: rejected without propagation (' +
              this.config.allVarNames[i] +
              ' is empty)'
          );
        }

        break;
      }
    }

    let solvedSpaces;
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
        term.log(
          `      - FD debug stats: called propagate(): ${
            this.config._propagates > 0
              ? this.config._propagates + 'x'
              : 'never! Finished by only using precomputations.'
          }`
        );
      }

      term.log(`      - FD Solutions: ${solvedSpaces.length}`);
    }

    solver_getSolutions(solvedSpaces, this.config, this.solutions, log);
  }

  hasVar(varName) {
    return trie_get(this.config._varNamesTrie, varName) >= 0;
  }

  /**
   * Sets the value distribution options for a var after declaring it.
   *
   * @param {string} varName
   * @param {Object} options
   */
  setValueDistributionFor(varName, options) {
    ASSERT(typeof varName === 'string', 'var name should be a string', varName);
    ASSERT(
      typeof options === 'object',
      'value strat options should be an object'
    );

    config_setOption(this.config, 'varValueStrat', options, varName);
    if (process.env.NODE_ENV !== 'production') {
      if (this.GENERATE_BARE_DSL) {
        this.exported =
          this.exported.replace(
            new RegExp('^(: ' + exporter_encodeVarName(varName) + ' =.*)', 'm'),
            '$1 # markov (set below): ' + JSON.stringify(options)
          ) +
          '@custom set-valdist ' +
          exporter_encodeVarName(varName) +
          ' ' +
          JSON.stringify(options) +
          '\n';
      }
    }
  }

  /**
   * @returns {FDO}
   */
  branch_from_current_solution() {
    // Get the _solved_ space, convert to config,
    // use new config as base for new solver
    const solvedConfig = space_toConfig(this.state.space, this.config);
    return new FDO({ config: solvedConfig });
  }

  _debugLegible() {
    const WITH_INDEX = true;
    const clone = JSON.parse(JSON.stringify(this.config)); // Prefer this over config_clone, just in case.
    const names = clone.allVarNames;
    const targeted = clone.targetedVars;
    const constraints = clone.allConstraints;
    const domains = clone.initialDomains;
    const propagators = clone._propagators;

    for (const key in clone) {
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

    const term = getTerm();
    term.log('\n## _debug:\n');
    term.log('- config:');
    term.log(INSPECT(clone));
    term.log('- vars (' + names.length + '):');
    term.log(
      names
        .map(
          (name, index) =>
            `${WITH_INDEX ? index : ''}: ${domain__debug(domains[index])} ${
              name === String(index) ? '' : ' // ' + name
            }`
        )
        .join('\n')
    );
    if (targeted !== 'all') {
      term.log(
        '- targeted vars (' + targeted.length + '): ' + targeted.join(', ')
      );
    }

    term.log(
      '- constraints (' +
        constraints.length +
        ' -> ' +
        propagators.length +
        '):'
    );
    term.log(
      constraints
        .map((c, index) => {
          if (c.param === undefined) {
            return `${WITH_INDEX ? index : ''}: ${c.name}(${
              c.varIndexes
            })      --->  ${c.varIndexes
              .map(index => domain__debug(domains[index]))
              .join(',  ')}`;
          }

          if (c.name === 'reifier') {
            return `${WITH_INDEX ? index : ''}: ${c.name}[${c.param}](${
              c.varIndexes
            })      --->  ${domain__debug(domains[c.varIndexes[0]])} ${
              c.param
            } ${domain__debug(domains[c.varIndexes[1]])} = ${domain__debug(
              domains[c.varIndexes[2]]
            )}`;
          }

          return `${WITH_INDEX ? index : ''}: ${c.name}(${c.varIndexes}) = ${
            c.param
          }      --->  ${c.varIndexes
            .map(index => domain__debug(domains[index]))
            .join(',  ')} -> ${domain__debug(domains[c.param])}`;
        })
        .join('\n')
    );
    term.log('##/\n');
  }

  _debugSolver() {
    const term = getTerm();
    term.log('## _debugSolver:\n');

    const { config } = this;
    // Term.log('# Config:');
    // term.log(INSPECT(_clone(config)));

    const names = config.allVarNames;
    term.log('# Variables (' + names.length + 'x):');
    term.log('  index name domain toArr');
    for (let varIndex = 0; varIndex < names.length; ++varIndex) {
      term.log(
        '  ',
        varIndex,
        ':',
        names[varIndex],
        ':',
        domain__debug(config.initialDomains[varIndex])
      );
    }

    const constraints = config.allConstraints;
    term.log('# Constraints (' + constraints.length + 'x):');
    term.log('  index name vars param');
    for (let i = 0; i < constraints.length; ++i) {
      term.log(
        '  ',
        i,
        ':',
        constraints[i].name,
        ':',
        constraints[i].varIndexes.join(','),
        ':',
        constraints[i].param
      );
    }

    const propagators = config._propagators;
    term.log('# Propagators (' + propagators.length + 'x):');
    term.log('  index name vars args');
    for (let i = 0; i < propagators.length; ++i) {
      term.log(
        '  ',
        i,
        ':',
        propagators[i].name +
          (propagators[i].name === 'reified'
            ? '(' + propagators[i].arg3 + ')'
            : ''),
        ':',
        propagators[i].index1,
        propagators[i].index2,
        propagators[i].index3,
        '->',
        domain__debug(config.initialDomains[propagators[i].index1]),
        domain__debug(config.initialDomains[propagators[i].index2]),
        domain__debug(config.initialDomains[propagators[i].index3])
      );
    }

    term.log('##');
  }

  _debugConfig() {
    const config = _clone(this.config);
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
  imp(s, _debug) {
    // Term.log('##x## FDO.imp(...)');
    // term.log(s);
    // term.log('##y##');

    if (this.logging) {
      getTerm().log('      - FD Importing DSL; ' + s.length + ' bytes');
      getTerm().time('      - FD Import Time:');
    }

    const solver = importer(s, this, _debug);
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
  exp(space, usePropagators, minimal, withDomainComments) {
    return exporter(
      this.config,
      space.vardoms,
      usePropagators,
      minimal,
      withDomainComments
    );
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
  static domainFromList(list) {
    return domain_fromListToArrdom(list);
  }

  /**
   * Expose the internal terminal (console)
   *
   * @returns {Object} Unless overridden, this is the console global. Otherwise an object with al least the same methods as console
   */
  static getTerm() {
    return getTerm();
  }

  /**
   * Set the terminal object (console by default)
   *
   * @param {Object} term An object that overrides one or more methods on `console`
   */
  static setTerm(term) {
    return setTerm(term);
  }

  static dsl() {
    THROW('FDO.dsl: use FDO.solve()');
  }

  static imp() {
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
  static solve(dsl, options = {}, _debug) {
    if (!options.max) options.max = 1;
    const fdo = new FDO(options).imp(dsl, _debug);
    const s = fdo.solve(options);
    if (options.returnFdo) return fdo;
    if (fdo.config.aborted) return 'aborted';
    if (s.length === 0) return 'rejected';
    if (options.max !== 1) return s;
    return s[0];
  }
}

/**
 * Deep clone given object for debugging purposes (only)
 * Revise if used for anything concrete
 *
 * @param {*} value
 * @returns {*}
 */
function _clone(value) {
  switch (typeof value) {
    case 'object': {
      if (!value) return null;
      if (Array.isArray(value)) {
        return value.map(v => _clone(v));
      }

      const obj = {};
      for (const [key, val] of Object.entries(value)) {
        obj[key] = _clone(val);
      }

      return obj;
    }

    case 'function': {
      const fobj = {
        __THIS_IS_A_FUNCTION: 1,
        __source: value.toString(),
      };
      for (const [key, val] of Object.entries(value)) {
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
  const list = [];
  while (state.more && list.length < max) {
    search_depthFirst(state, config, dbgCallback);
    if (state.status !== 'end') {
      list.push(state.space);
      ASSERT_LOG(LOG_FLAG_SOLUTIONS, log =>
        log(' ## Found solution:', space_solution(state.space, config))
      );
    }
  }

  return list;
}

function solver_getSolutions(solvedSpaces, config, solutions, log) {
  ASSERT(
    Array.isArray(solutions),
    'solutions target object should be an array'
  );
  if (log >= LOG_STATS) {
    getTerm().time('      - FD Solution Construction Time');
  }

  for (let i = 0; i < solvedSpaces.length; ++i) {
    const solution = space_solution(solvedSpaces[i], config);
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
