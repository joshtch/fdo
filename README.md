# FDO - Only the Solver

A finite domain [constraint
solver](https://en.wikipedia.org/wiki/Constraint_logic_programming), forked from
[finitedomain](https://github.com/the-grid/finitedomain), which in turn was originally based on
[FD.js](https://github.com/srikumarks/FD.js/wiki/API).

This package only contains the solver, which brute force solves the problem. No attempts
at optimization are done here.

Part of the [fdq](https://github.com/pvdz/fdq) package. See its description for a complete
overview of this suite and how to run tests and all that.

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

For the DSL syntax see the docs in [fdq](https://github.com/pvdz/fdq).

## Tasks

The npm package provides a CommonJS build (`/lib`) for use in Node.js, and with bundlers
like Webpack and Browserify. It also includes an ES module build (`/es`) that works well
with Rollup and Webpack2's tree-shaking.

(These tasks obviously require an `npm install`)

### Builds

 -  `npm run build:commonjs`: Build CommonJS to `/lib` in the project root.

 -  `npm run build:esm`: Same as previous, but for ES module build to `/es`.

 -  `npm run build:umd`: Ditto for UMD build to `/dist/fdo.min.js`.

 -  `npm run build`: Run all of the above builds.

### Bash / npm scripts:

 - `npm run lint`: Lint project files.

 - `npm run format:check`: Check JavaScript and Markdown for style and report problems
   to `stdout`.

 - `npm run format`: Check coding style as in `format:check` and automatically apply fixes
   where possible.

 - `npm run coverage`: Show a breakdown of test suite code coverage.

 - `npm run test`: Run all tests once.

 - `npm run test:update`: Run all tests once, updating snapshots as needed.

 - `npm run test:watch`: Run tests whenever files are modified.

