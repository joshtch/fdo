# FDO - Only the Solver

A finite domain [constraint solver](https://en.wikipedia.org/wiki/Constraint_logic_programming), forked from [finitedomain](https://github.com/the-grid/finitedomain), which in turn was originally based on [FD.js](https://github.com/srikumarks/FD.js/wiki/API).

This package only contains the solver, which only brute force solves the problem. No attempts at optimization is done here.

Part of the [fdq](https://github.com/qfox/fdq) package. See its description for a complete overview of this suite and how to run tests and all that.

## Installing

```
npm install fdo
```

## Usage

Find an A between 10 and 20 that are bigger than 14 and smaller than 17 and not 16. Contrived? Nah.

```es6
import FDO from 'fdo';

let solution = FDO.solve(`
  : A [10 20]
  A > 14
  A < 17
  A != 16
`);

console.log(solution); // -> {A: 15}
```

For the DSL syntax see the docs in [fdq](https://github.com/qfox/fdq).

## Tasks

There are a few grunt tasks and bash scripts hooked up to npm. This repo also uses git hooks for pre- and post commit hooks.

As a general rule, `./build` is used for any temporary output, including code coverage reports and temporary build files when producing a dist.

Then `./dist` only contains final builds (`./dist/fdo.dist.min.js` and for some tasks `./dist/fdo.js`).

Note that both `./build` and `./dist` are cleared at the start of almost every (grunt) task.

(These tasks obviously require an `npm install`)

### Grunt tasks:

- `grunt clean`: removes `./dist` and `./build`
- `grunt build`: a direct alias for `dist`
- `grunt dist`: lint, test, build, and minify to produce a real dist build
- `grunt distq`: create a dist but skip linting, testing, and code coverage. Also produces a copy in `./dist/fdp.js`
- `grunt distbug`: creates a build without removing test artifacts or minification. In case you need proper stack traces in other projects.
- `grunt distheat`: creates a dist but instead of minification as the last step it beautifies. Used for [HeatFiler](https://qfox.github.io/heatfiler/src/index.html), a count based heatmap profiler. Copies to `fdp.js`.
- `grunt coverage`: runs all tests in the code coverage tool
- `grunt test`: runs linting and all tests
- `grunt testq`: runs tests without linting
- `grunt testtb`: testq but fail fast
- `grunt watch:q`: runs `distq` whenever a file changes
- `grunt watch:h`: runs `distheat` whenever a file changes
- `grunt watch:b`: runs `distbug` whenever a file changes
- `grunt watch:t`: runs `testq` whenever a file changes
- `grunt watch:tb`: runs `testtb` whenever a file changes

### Bash / npm scripts:

- `npm run lint`: run eslint with dist config (slightly stricter than dev). Exits non-zero if it fails.
- `npm run lintdev`: run eslint with dev config (allows `console.log`, `debugger`, etc). No non-zero exit for failures.
- `npm run lintfix`: runs eslint in the fix mode
