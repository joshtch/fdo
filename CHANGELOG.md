# FDO, Finite Domain Only the Solver

Fork of [finitedomain](https://github.com/the-grid/finitedomain) (package `finitedomain`),
which is a fork of [FD.js](https://github.com/srikumarks/FD.js) (package `fdjs`).

## v0.1.0

Minor version bump: replace the ad-hoc packaging set-up with packaging through Node. 
Also replace Mocha+Chai+Jest with pure Jest API (achieved with substantial help from
[jest-codemods](https://www.npmjs.com/package/jest-codemods)).

Need to set up CI build for `fdlib` so we can use transpiled, minified version.


## v0.0.1

Initial release. Basically the finitedomain fork, plus a few small bug fixes and some more
syntax support, minus markov stuff and (non-dsl) api support.
