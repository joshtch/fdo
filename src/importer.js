// This is an import function for config
// it converts a DSL string to a $config
// see /docs/dsl.txt for syntax
// see exporter.js to convert a config to this DSL

import { SUB, SUP, getTerm } from 'fdlib';

import { config_setOption } from './config';

import FDO from './fdo';

/**
 * @param {string} str
 * @param {FDO} [solver]
 * @param {boolean} [_debug] Log out entire input with error token on fail?
 * @returns {FDO}
 */
function importer(str, solver, _debug) {
  if (!solver) solver = new FDO();

  let pointer = 0;
  const len = str.length;

  while (!isEof()) parseStatement();

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
    if (read() !== c)
      THROW(
        'Expected ' +
          (desc ? desc + ' ' : '') +
          '`' +
          c +
          '`, found `' +
          read() +
          '`'
      );
    skip();
  }

  function skipWhitespaces() {
    while (pointer < len && isWhitespace(read())) skip();
  }

  function skipWhites() {
    while (!isEof()) {
      const c = read();
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
      const c = read();
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
    const c = read();
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

    let nameNames = parseIdentifier();
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

    const domain = parseDomain();
    skipWhitespaces();

    const mod = parseModifier();
    expectEol();

    if (typeof nameNames === 'string') {
      solver.decl(nameNames, domain, mod, true);
    } else {
      nameNames.forEach(name => solver.decl(name, domain, mod, true));
    }
  }

  function parseIdentifier() {
    if (read() === "'") return parseQuotedIdentifier();
    return parseUnquotedIdentifier();
  }

  function parseQuotedIdentifier() {
    is("'", 'start of Quoted identifier');

    const start = pointer;
    let c = read();
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
    const start = pointer;
    if (read() >= '0' && read() <= '9')
      THROW('Unquoted ident cant start with number');
    while (!isEof() && isValidUnquotedIdentChar(read())) skip();
    if (start === pointer)
      THROW('Expected to parse identifier, found none [' + read() + ']');
    return str.slice(start, pointer);
  }

  function isValidUnquotedIdentChar(c) {
    // Meh. i syntactically dont care about unicode chars so if you want to use them i wont stop you here
    return (
      (c >= 'a' && c <= 'z') ||
      (c >= 'A' && c <= 'Z') ||
      (c >= '0' && c <= '9') ||
      c === '_' ||
      c === '$' ||
      c === '-' ||
      c > '~'
    );
  }

  function parseDomain() {
    // []
    // [lo hi]
    // [[lo hi] [lo hi] ..]
    // *
    // 25
    // (comma's optional and ignored)

    const c = read();

    let domain;
    switch (c) {
      case '[':
        is('[', 'domain start');
        skipWhitespaces();

        domain = [];

        if (read() === '[') {
          do {
            skip();
            skipWhitespaces();
            const lo = parseNumber();
            skipWhitespaces();
            if (read() === ',') {
              skip();
              skipWhitespaces();
            }

            const hi = parseNumber();
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
            const lo = parseNumber();
            skipWhitespaces();
            if (read() === ',') {
              skip();
              skipWhitespaces();
            }

            const hi = parseNumber();
            skipWhitespaces();

            domain.push(lo, hi);

            if (read() === ',') {
              skip();
              skipWhitespaces();
            }
          } while (read() !== ']');
        }

        is(']', 'domain-end');
        if (domain.length === 0)
          THROW('Empty domain [] in dsl, this problem will always reject');
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
      case '9': {
        const v = parseNumber();
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

    const mod = {};

    const start = pointer;
    while (read() >= 'a' && read() <= 'z') skip();
    const stratName = str.slice(start, pointer);

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
    if (str.slice(pointer, pointer + 5) !== 'prio(')
      THROW('Expecting the priorities to follow the `@list`');
    pointer += 5;
    mod.list = parseNumList();
    is(')', 'list end');
  }

  function parseMarkov(mod) {
    for (;;) {
      skipWhitespaces();
      if (str.slice(pointer, pointer + 7) === 'matrix(') {
        // TOFIX: there is no validation here. apply stricter and safe matrix parsing
        const matrix = str.slice(
          pointer + 7,
          (pointer = str.indexOf(')', pointer))
        );
        const code = 'return ' + matrix;
        const func = new Function(code); /* eslint no-new-func: "off" */
        mod.matrix = func();
        if (pointer === -1)
          THROW('The matrix must be closed by a `)` but did not find any');
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
    while (!isEof() && !isNewline(read())) skip();
    if (!isEof()) skip();
  }

  function parseUndefConstraint() {
    // Parse a constraint that does not return a value itself

    // first try to parse single value constraints without value like markov() and distinct()
    if (parseUexpr()) return;

    // So the first value must be a value returning expr
    const A = parseVexpr(); // Returns a var name or a constant value

    skipWhitespaces();
    const cop = parseCop();
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
        solver.eq(
          solver.plus(solver.isEq(A, 0), solver.isEq(parseVexpr(), 0)),
          1
        );
        break;

      case '!^':
        // Xor means A and B both solve to zero or both to non-zero
        // (A==?0)==(B==?0)
        solver.eq(
          solver.isEq(A, solver.num(0)),
          solver.isEq(parseVexpr(), solver.num(0))
        );
        break;

      case '->': {
        // I think this could be implemented in various ways
        // A -> B     =>    ((A !=? 0) <= (B !=? 0)) & ((B ==? 0) <= (A ==? 0))
        // (if A is nonzero then B must be nonzero, otherwise B can be anything. But also if B is zero then
        // A must be zero and otherwise A can be anything. They must both hold to simulate an implication.)
        const B = parseVexpr();
        // (A !=? 0) <= (B !=? 0))
        solver.lte(
          solver.isNeq(A, solver.num(0)),
          solver.isNeq(B, solver.num(0))
        );
        // (B ==? 0) <= (A ==? 0)
        solver.lte(
          solver.isEq(B, solver.num(0)),
          solver.isEq(A, solver.num(0))
        );
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

    const freshVar = typeof C === 'string' && !solver.hasVar(C);
    if (freshVar) C = solver.decl(C);

    const A = parseVexpr(C, freshVar);
    skipWhitespaces();
    const c = read();
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
    const rop = parseRop();
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
        if (rop !== undefined)
          THROW('Expecting right paren or rop, got: `' + rop + '`');
        return A;
    }
  }

  function parseCop() {
    let c = read();
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
    const a = read();
    switch (a) {
      case '=': {
        skip();
        const b = read();
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
    if (str.slice(pointer, pointer + 4) === 'all(') parseAll();
    else if (str.slice(pointer, pointer + 9) === 'distinct(') parseDistinct(9);
    else if (str.slice(pointer, pointer + 5) === 'diff(') parseDistinct(5);
    else if (str.slice(pointer, pointer + 5) === 'nall(') parseNall();
    else if (str.slice(pointer, pointer + 5) === 'none(') parseNone();
    else if (str.slice(pointer, pointer + 5) === 'same(') parseSame();
    else if (str.slice(pointer, pointer + 5) === 'some(') parseSome();
    else if (str.slice(pointer, pointer + 5) === 'xnor(') parseXnor();
    else return false;

    return true;
  }

  function parseVexpList() {
    const list = [];
    skipWhitespaces();
    while (!isEof() && read() !== ')') {
      const v = parseVexpr();
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

    const c = read();
    let v;
    if (c === '(') v = parseGrouping();
    else if (c === '[') {
      const d = parseDomain();
      if (d[0] === d[1] && d.length === 2) v = d[0];
      else v = solver.decl(undefined, d);
    } else if (c >= '0' && c <= '9') {
      v = parseNumber();
    } else {
      const ident = parseIdentifier();
      const d = read();
      if (ident === 'sum' && d === '(') {
        v = parseSum(resultVar);
      } else if (ident === 'product' && d === '(') {
        v = parseProduct(resultVar);
      } else if (ident === 'all' && d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsAll(resultVar);
      } else if (ident === 'diff' && d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsDiff(resultVar);
      } else if (ident === 'nall' && d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsNall(resultVar);
      } else if (ident === 'none' && d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsNone(resultVar);
      } else if (ident === 'same' && d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsSame(resultVar);
      } else if (ident === 'some' && d === '?' && (skip(), read() === '(')) {
        if (freshVar) solver.decl(resultVar, [0, 1], undefined, false, true);
        v = parseIsSome(resultVar);
      } else if (d === '?') {
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
    const A = parseVexpr();
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

    const C = parseAssignRest(A);
    skipWhitespaces();
    is(')', 'group closer');
    return C;
  }

  function parseNumber() {
    const start = pointer;
    while (read() >= '0' && read() <= '9') skip();
    if (start === pointer) {
      THROW(
        'Expecting to parse a number but did not find any digits [' +
          start +
          ',' +
          pointer +
          '][' +
          read() +
          ']'
      );
    }

    return parseInt(str.slice(start, pointer), 10);
  }

  function parseAll() {
    pointer += 4;
    skipWhitespaces();
    const refs = parseVexpList();
    // R can only be 0 if (at least) one of the args is zero. so by removing
    // 0 from R's domain we require all args nonzero. cheap hack.
    const r = solver.product(refs, solver.decl(undefined, [1, SUP]));
    skipWhitespaces();
    is(')', 'ALL closer');
    return r;
  }

  function parseDistinct(delta) {
    pointer += delta;
    skipWhitespaces();
    const vals = parseVexpList();
    if (vals.length === 0) THROW('Expecting at least one expression');
    solver.distinct(vals);
    skipWhitespaces();
    is(')', 'distinct call closer');
    expectEol();
  }

  function parseSum(result) {
    is('(', 'sum call opener');
    skipWhitespaces();
    const refs = parseVexpList();
    const r = solver.sum(refs, result);
    skipWhitespaces();
    is(')', 'sum closer');
    return r;
  }

  function parseProduct(result) {
    is('(', 'product call opener');
    skipWhitespaces();
    const refs = parseVexpList();
    const r = solver.product(refs, result);
    skipWhitespaces();
    is(')', 'product closer');
    return r;
  }

  function parseIsAll(result) {
    is('(', 'isall call opener');
    skipWhitespaces();
    const refs = parseVexpList();

    const r = compileIsall(result, refs);
    skipWhitespaces();
    is(')', 'isall closer');
    return r;
  }

  function compileIsall(result, args) {
    // R = all?(A B C ...)   ->   X = A * B * C * ..., R = X !=? 0

    const x = solver.decl(); // Anon var [sub,sup]
    solver.product(args, x);
    return solver.isNeq(x, solver.num(0), result);
  }

  function parseIsDiff(result) {
    is('(', 'isdiff call opener');
    skipWhitespaces();
    const refs = parseVexpList();

    // R = diff?(A B C ...)
    // =>
    // x e args, y e args, x!=y
    // =>
    // Rxy = dom(x) !=? dom(y)
    // c = sum(Rxy ...)
    // R = c ==? argCount

    const reifs = [];

    for (let i = 0; i < refs.length; ++i) {
      const indexA = refs[i];
      for (let j = i + 1; j < refs.length; ++j) {
        const indexB = refs[j];
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
    const refs = parseVexpList();
    const r = compileIsnall(result, refs);
    skipWhitespaces();
    is(')', 'isnall closer');
    return r;
  }

  function compileIsnall(result, args) {
    // R = nall?(A B C ...)   ->   X = A * B * C * ..., R = X ==? 0

    const x = solver.decl(); // Anon var [sub,sup]
    solver.product(args, x);
    return solver.isEq(x, solver.num(0), result);
  }

  function parseIsNone(result) {
    is('(', 'isnone call opener');
    skipWhitespaces();
    const refs = parseVexpList();
    const r = compileIsnone(result, refs);
    skipWhitespaces();
    is(')', 'isnone closer');
    return r;
  }

  function compileIsnone(result, args) {
    // R = none?(A B C ...)   ->   X = sum(A B C ...), R = X ==? 0

    const x = solver.decl(); // Anon var [sub,sup]
    solver.sum(args, x);
    return solver.isEq(x, solver.num(0), result);
  }

  function parseIsSame(result) {
    is('(', 'issame call opener');
    skipWhitespaces();
    const refs = parseVexpList();

    // R = same?(A B C ...)   ->   A==?B,B==?C,C==?..., sum(reifs) === reifs.length

    const reifs = [];
    for (let i = 1; i < refs.length; ++i) {
      const r = solver.decl(undefined, [0, 1]);
      solver.isEq(refs[i - 1], refs[i], r);
      reifs.push(r);
    }

    const x = solver.decl(); // Anon var [sub,sup]
    solver.sum(reifs, x);

    const r = solver.isEq(x, solver.num(reifs.length), result);

    skipWhitespaces();
    is(')', 'issame closer');
    return r;
  }

  function parseIsSome(result) {
    is('(', 'issome call opener');
    skipWhitespaces();
    const refs = parseVexpList();
    const r = compileIssome(result, refs);
    skipWhitespaces();
    is(')', 'issome closer');
    return r;
  }

  function compileIssome(result, args) {
    // R = some?(A B C ...)   ->   X = sum(A B C ...), R = X !=? 0

    const x = solver.decl(); // Anon var [sub,sup]
    solver.sum(args, x);
    return solver.isNeq(x, solver.num(0), result);
  }

  function parseNall() {
    pointer += 5;
    skipWhitespaces();
    const refs = parseVexpList();
    // TODO: could also sum reifiers but i think this is way more efficient. for the time being.
    solver.product(refs, solver.num(0));
    skipWhitespaces();
    is(')', 'nall closer');
    expectEol();
  }

  function parseNone() {
    pointer += 5;
    skipWhitespaces();
    const refs = parseVexpList();
    solver.sum(refs, solver.num(0)); // Lazy way out but should resolve immediately anyways
    skipWhitespaces();
    is(')', 'none closer');
    expectEol();
  }

  function parseSame() {
    pointer += 5;
    skipWhitespaces();
    const refs = parseVexpList();
    for (let i = 1; i < refs.length; ++i) {
      solver.eq(refs[i - 1], refs[i]);
    }

    skipWhitespaces();
    is(')', 'same closer');
    expectEol();
  }

  function parseSome() {
    pointer += 5;
    skipWhitespaces();
    const refs = parseVexpList();
    solver.sum(refs, solver.decl(undefined, [1, SUP]));
    skipWhitespaces();
    is(')', 'some closer');
    expectEol();
  }

  function parseXnor() {
    pointer += 5;
    skipWhitespaces();
    const refs = parseVexpList();
    skipWhitespaces();
    is(')', 'xnor() closer');
    expectEol();

    // Xnor(A B C)
    // =>
    // x=X+B+C                  (if x is 0, all the args were zero: "none")
    // y=X*B*C                  (if y is not 0, none of the args were zero: "all")
    // (x==0) + (y!=0) == 1     (must all be zero or all be nonzero)

    const x = solver.decl(); // Anon var [sub,sup]
    const y = solver.decl(); // Anon var [sub,sup]
    solver.sum(refs, x);
    solver.product(refs, y);
    solver.plus(solver.isEq(x, 0), solver.isNeq(y, 0), 1);
  }

  function parseNumstr() {
    const start = pointer;
    while (read() >= '0' && read() <= '9') skip();
    return str.slice(start, pointer);
  }

  function parseNumList() {
    const nums = [];

    skipWhitespaces();
    let numstr = parseNumstr();
    while (numstr) {
      nums.push(parseInt(numstr, 10));
      skipWhitespaces();
      if (read() === ',') {
        ++pointer;
        skipWhitespaces();
      }

      numstr = parseNumstr();
    }

    if (nums.length === 0)
      THROW('Expected to parse a list of at least some numbers but found none');
    return nums;
  }

  function parseIdentList() {
    const idents = [];

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
      const ident = parseIdentifier();
      idents.push(ident);
    }

    if (idents.length === 0)
      THROW(
        'Expected to parse a list of at least some identifiers but found none'
      );
    return idents;
  }

  function readLine() {
    let line = '';
    while (!isEof() && !isNewline(read())) {
      line += read();
      skip();
    }

    return line;
  }

  function parseAtRule() {
    is('@');
    // Mostly temporary hacks while the dsl stabilizes...

    if (str.slice(pointer, pointer + 6) === 'custom') {
      pointer += 6;
      skipWhitespaces();
      const ident = parseIdentifier();
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
        case 'set-valdist': {
          skipWhitespaces();
          const target = parseIdentifier();
          const config = parseRestCustom();
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
          if (atEol()) THROW('Expected to parse some var values');
          // ignore. it's a presolver debug tool
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

    let fallback = false;
    if (read() === 'f') {
      // Inverted
      const ident = parseIdentifier();
      if (ident !== 'fallback') THROW('Expecting `fallback` here');
      fallback = true;
      skipWhitespaces();
    }

    let inverted = false;
    if (read() === 'i') {
      // Inverted
      const ident = parseIdentifier();
      if (ident !== 'inverted') THROW('Expecting `inverted` here');
      inverted = true;
      skipWhitespaces();
    }

    if (read() === 'l' || read() === '(') {
      if (read() === 'l') {
        // List (optional keyword)
        if (parseIdentifier() !== 'list')
          THROW(
            'Unexpected ident after `inverted` (only expecting `list` or the list)'
          );
        skipWhitespaces();
      }

      is('(');
      const priorityByName = parseIdentList();
      if (priorityByName.length > 0)
        config_setOption(
          solver.config,
          fallback ? 'varStrategyFallback' : 'varStrategy',
          { type: 'list', inverted, priorityByName }
        );
      else
        config_setOption(
          solver.config,
          fallback ? 'varStrategyFallback' : 'varStrategy',
          { type: 'naive' }
        );
      skipWhitespaces();
      is(')');
    } else {
      if (read() === '=') {
        skip();
        skipWhitespaces();
      }

      if (inverted)
        THROW('The `inverted` keyword is only valid for a prio list');
      // Parse ident and use that as the vardist
      const ident = parseIdentifier();
      if (ident === 'list')
        THROW('Use a grouped list of idents for vardist=list');
      if (
        ident !== 'naive' &&
        ident !== 'size' &&
        ident !== 'min' &&
        ident !== 'max' &&
        ident !== 'throw'
      )
        THROW('Unknown var dist [' + ident + ']');
      config_setOption(
        solver.config,
        fallback ? 'varStrategyFallback' : 'varStrategy',
        { type: ident }
      );
    }
  }

  function parseValStrat() {
    const name = parseIdentifier();
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
      const idents = parseIdentList();
      if (idents.length > 0) solver.config.targetedVars = idents;
      is(')');
    }
  }

  function THROW(msg) {
    if (_debug) {
      getTerm().log(
        str.slice(0, pointer) +
          '##|PARSER_IS_HERE[' +
          msg +
          ']|##' +
          str.slice(pointer)
      );
    }

    msg =
      'Importer parser error: ' +
      msg +
      ', source at #|#: `' +
      str.slice(Math.max(0, pointer - 70), pointer) +
      '#|#' +
      str.slice(pointer, Math.min(str.length, pointer + 70)) +
      '`';
    throw new Error(msg);
  }
}

export { importer };
