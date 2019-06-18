// This is an export function for config
// it converts a $config to a DSL string
// see /docs/dsl.txt for syntax
// see importer.js to parse this DSL

import { THROW, getTerm, domain_getValue, domain_toArr, trie_get } from 'fdlib';

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
function exporter(
  config,
  vardoms,
  usePropagators,
  minimal,
  withDomainComments,
  realName
) {
  // TOFIX: the alias stuff needs to be unique. currently exports from presolver clash with names generated here.
  realName = true;
  // TODO: dont export contants that are not bound to constraints and not targeted explicitly
  // TODO: deal export->import better wrt anonymous vars
  const var_dist_options = config.varDistOptions;
  const domains = vardoms || config.initialDomains;
  const varNames = config.allVarNames;

  const indexToString = realName
    ? index => exporter_encodeVarName(varNames[index])
    : minimal
    ? exporter_varstrShort
    : exporter_varstrNum;

  const vars = varNames.map((varName, varIndex) => {
    const domain = exporter_domstr(domains[varIndex]);
    let s = ': ' + indexToString(varIndex) + ' = ' + domain;
    const overrides = var_dist_options[varName];
    if (
      overrides &&
      (overrides.valtype !== 'list' ||
        (overrides.list && overrides.list.length > 0))
    ) {
      s += ' @' + overrides.valtype;
      switch (overrides.valtype) {
        case 'markov':
          if ('expandVectorsWith' in overrides)
            s += 'expand(' + (overrides.expandVectorsWith || 0) + ')';
          if ('legend' in overrides)
            s += ' legend(' + overrides.legend.join(' ') + ')';
          if ('matrix' in overrides)
            s +=
              ' matrix(' +
              JSON.stringify(overrides.matrix).replace(/"/g, '') +
              ')';
          break;

        case 'list':
          if (typeof overrides.list === 'function') s += ' prio(???func???)';
          else s += ' prio(' + overrides.list.join(' ') + ')';
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
          getTerm().warn(
            'Unknown value strategy override: ' + overrides.valtype
          );
          s += ' @? ' + JSON.stringify(overrides);
      }
    }

    if (!realName && varName !== String(varIndex))
      s += String(' # ' + exporter_encodeVarName(varName));
    return s;
  });

  const constraints = usePropagators
    ? []
    : config.allConstraints
        .map(constraint => {
          const indexes = constraint.varIndexes;

          // Create var names for each index, unless solved, in that case use solved value as literal
          const aliases = indexes.map(indexToString);
          indexes.forEach((varIndex, i) => {
            const v = domain_getValue(domains[varIndex]);
            if (v >= 0) aliases[i] = v;
          });

          // Do same for param if it's an index
          let paramName = '';
          if (typeof constraint.param === 'number') {
            const paramV = domain_getValue(domains[constraint.param]);
            if (paramV >= 0) paramName = paramV;
            else paramName = indexToString(constraint.param);
          }

          let s = '';
          let comment = '';
          let op;
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

              s +=
                aliases[2] + ' = ' + aliases[0] + ' ' + op + '? ' + aliases[1];
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

          let t = s;
          // If a constraint has no vars, ignore it.
          // note: this assumes those constraints are not contradictions
          if (
            s.indexOf(realName ? "'" : '$') < 0 ||
            (constraint.name === 'distinct' && aliases.length <= 1) ||
            ((constraint.name === 'product' || constraint.name === 'sum') &&
              aliases.length === 0)
          ) {
            if (!minimal) {
              comment +=
                (comment ? ', ' : ' # ') +
                'dropped; constraint already solved (' +
                s +
                ') (' +
                indexes.map(indexToString) +
                ', ' +
                indexToString(constraint.param) +
                ')';
            }

            s = '';
          }

          if (!minimal || withDomainComments) {
            // This is more for easier debugging...
            aliases.forEach((alias, i) => {
              if (typeof alias === 'string')
                t = t.replace(alias, exporter_domstr(domains[indexes[i]]));
            });
            if (
              typeof constraint.param === 'number' &&
              typeof paramName === 'string'
            )
              t = t.replace(
                paramName,
                exporter_domstr(domains[constraint.param])
              );

            if (s || !minimal) {
              // S += ' '.repeat(Math.max(0, 30 - s.length))
              for (let i = Math.max(0, 30 - s.length); i >= 0; --i) s += ' ';
              s += '      # ' + t;
            }

            s += comment;
          }

          return s;
        })
        .filter(s => Boolean(s));

  const propagators = usePropagators
    ? config._propagators
        .map(propagator => {
          const varIndex1 = propagator.index1;
          const varIndex2 = propagator.index2;
          const varIndex3 = propagator.index3;

          const v1 = varIndex1 >= 0 ? domain_getValue(domains[varIndex1]) : -1;
          const name1 =
            v1 >= 0 ? v1 : varIndex1 < 0 ? undefined : indexToString(varIndex1);
          const v2 = varIndex2 >= 0 ? domain_getValue(domains[varIndex2]) : -1;
          const name2 =
            v2 >= 0 ? v2 : varIndex2 < 0 ? undefined : indexToString(varIndex2);
          const v3 = varIndex3 >= 0 ? domain_getValue(domains[varIndex3]) : -1;
          const name3 =
            v3 >= 0 ? v3 : varIndex3 < 0 ? undefined : indexToString(varIndex3);

          let s = '';
          let comment = '';
          let op;
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

          let t = s;

          // If a propagator has no vars, ignore it.
          // note: this assumes those constraints are not contradictions
          if (s.indexOf('$') < 0) {
            if (!minimal)
              comment +=
                (comment ? ', ' : ' # ') +
                'dropped; constraint already solved (' +
                s +
                ')';
            s = '';
          }

          if (!minimal) {
            // This is more for easier debugging...

            if (typeof name1 === 'string')
              t = t.replace(name1, exporter_domstr(domains[varIndex1]));
            if (typeof name2 === 'string')
              t = t.replace(name2, exporter_domstr(domains[varIndex2]));
            if (typeof name3 === 'string')
              t = t.replace(name3, exporter_domstr(domains[varIndex3]));

            s +=
              ' '.repeat(Math.max(0, 30 - s.length)) + '      # initial: ' + t;
            s += comment;
          }

          return s;
        })
        .filter(s => Boolean(s))
    : [];

  return [
    '## constraint problem export',
    '@custom var-strat = ' + JSON.stringify(config.varStratConfig), // TODO
    '@custom val-strat = ' + config.valueStratName,
    vars.join('\n') || '# no vars',
    constraints.join('\n') || propagators.join('\n') || '# no constraints',
    '@custom targets ' +
      (config.targetedVars === 'all'
        ? ' = all'
        : '(' +
          config.targetedVars
            .map(varName =>
              indexToString(trie_get(config._varNamesTrie, varName))
            )
            .join(' ') +
          ')'),
    '## end of export',
  ].join('\n\n');
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
  let name = varIndex.toString(36);
  if (name[0] < 'a') name = '$' + name; // This is a little lazy but whatever
  return name;
}

function exporter_domstr(domain) {
  // Represent domains as pairs, a single pair as [lo hi] and multiple as [[lo hi] [lo hi]]
  let arrdom = domain_toArr(domain);
  if (arrdom.length === 2 && arrdom[0] === arrdom[1]) return String(arrdom[0]);
  if (arrdom.length > 2) {
    const dom = [];
    for (let i = 0, n = arrdom.length; i < n; i += 2) {
      dom.push('[' + arrdom[i] + ' ' + arrdom[i + 1] + ']');
    }

    arrdom = dom;
  }

  return '[' + arrdom.join(' ') + ']';
}

export { exporter, exporter_encodeVarName };
