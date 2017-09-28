import expect from '../../../fdlib/tests/lib/mocha_proxy.fixt';
import {
  verify,
} from '../../../fdv/verifier';

import {
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
  SUB,
  SUP,
} from '../../../fdlib/src/helpers';
import {
  domain_arrToSmallest,
} from '../../../fdlib/src/domain';

import FDO from '../../src/fdo';
import {
  config_setOption,
} from '../../src/config';

describe('fdo/solver.spec', function() {

  describe('FDO.solve()', function() {

    it('should work', function() {
      expect(_ => FDO.solve(`
        : A [0 10]
        : B [0 10]
        A != B
      `)).not.to.throw();
    });
  });

  describe('api', function() {

    describe('fdo.num', function() {

      it('num(false)', function() {
        let fdo = new FDO();

        expect(_ => fdo.num(false)).to.throw('FDO#num: expecting a number, got false (a boolean)');
      });

      it('num(true)', function() {
        let fdo = new FDO();

        expect(_ => fdo.num(true)).to.throw('FDO#num: expecting a number, got true (a boolean)');
      });

      it('num(0)', function() {
        let fdo = new FDO();
        let name = fdo.num(0);

        expect(name).to.be.a('string');
      });

      it('num(10)', function() {
        let fdo = new FDO();
        let name = fdo.num(10);

        expect(name).to.be.a('string');
      });

      it('should throw for undefined', function() {
        let fdo = new FDO();

        expect(_ => fdo.num(undefined)).to.throw('FDO#num: expecting a number, got undefined (a undefined)');
      });

      it('should throw for null', function() {
        let fdo = new FDO();

        expect(_ => fdo.num(null)).to.throw('FDO#num: expecting a number, got null (a object)');
      });

      it('should throw for NaN', function() {
        let fdo = new FDO();

        expect(_ => fdo.num(NaN)).to.throw('FDO#num: expecting a number, got NaN');
      });
    });

    describe('fdo.decl', function() {

      it('should work', function() {
        let fdo = new FDO();

        expect(fdo.decl('foo')).to.equal('foo');
      });

      it('should accept a flat array for domain', function() {
        let fdo = new FDO();
        fdo.decl('foo', [0, 10, 20, 30]); // dont use fixtures because small domain

        expect(fdo.config.initialDomains[fdo.config.allVarNames.indexOf('foo')]).to.eql(domain_arrToSmallest([0, 10, 20, 30]));
      });

      it('should no longer accept a legacy nested array for domain', function() {
        let fdo = new FDO();

        expect(_ => fdo.decl('foo', [[0, 10], [20, 30]])).to.throw('SHOULD_BE_GTE 0');
      });

      describe('legacy', function() {

        it('should throw for bad legacy domain ', function() {
          let fdo = new FDO();

          expect(_ => fdo.decl('foo', [[0]])).to.throw('SHOULD_CONTAIN_RANGES');
        });

        it('should throw for bad legacy domain with multiple ranges', function() {
          let fdo = new FDO();

          expect(_ => fdo.decl('foo', [[0], [20, 30]])).to.throw('SHOULD_BE_LTE 100000000');
        });
      });

      it('should throw for domains with numbers <SUB', function() {
        let fdo = new FDO();

        expect(_ => fdo.decl('foo', [SUB - 2, SUB - 1])).to.throw('SHOULD_BE_GTE');
      });

      it('should throw for domains with numbers >SUP', function() {
        let fdo = new FDO();

        expect(_ => fdo.decl('foo', [SUP + 1, SUP + 2])).to.throw('SHOULD_BE_LTE');
      });

      it('should throw for domains with NaNs', function() {
        let fdo = new FDO();
        expect(_ => fdo.decl('foo', [0, NaN])).to.throw('SHOULD_BE_LTE');

        let fdo2 = new FDO();
        expect(_ => fdo2.decl('foo', [NaN, 1])).to.throw('SHOULD_BE_GTE');

        let fdo3 = new FDO();
        expect(_ => fdo3.decl('foo', [NaN, NaN])).to.throw('SHOULD_BE_GTE');
      });

      it('should throw for domains with inverted range', function() {
        let fdo = new FDO();

        expect(_ => fdo.decl('foo', [2, 1])).to.throw('NON_EMPTY_DOMAIN');
      });

      it('should throw for legacy domains with inverted range', function() {
        let fdo = new FDO();

        expect(_ => fdo.decl('foo', [[2, 1]])).to.throw('SHOULD_CONTAIN_RANGES');
      });

      it('should throw for domains with garbage', function() {
        let fdo = new FDO();

        expect(_ => fdo.decl('foo', [{}, {}])).to.throw('SHOULD_BE_GTE 0');
      });

      it('should throw for legacy domains with garbage', function() {
        let fdo = new FDO();

        expect(_ => fdo.decl('foo', [[{}]])).to.throw('SHOULD_CONTAIN_RANGES');
      });

      it('should throw for domains with one number', function() {
        let fdo = new FDO();

        expect(_ => fdo.decl('foo', [1])).to.throw('SHOULD_CONTAIN_RANGES');
      });
    });

    describe('fdo.plus', function() {

      it('should work without result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.plus('A', 'B')).to.be.a('string');
      });

      it('should work with a result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.plus('A', 'B', 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions', function() {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.plus(1, 'B', 'C')).to.equal('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.plus('A', 2, 'C')).to.equal('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(fdo3.plus('A', 'B', 3)).to.be.a('string');
      });

      it('should throw for bad result name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => fdo3.plus(['A', 'B'], {})).to.throw('all var names should be strings or numbers or undefined');
      });

      it('should always return the result var name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(fdo3.plus('A', 'B')).to.be.a('string');
        expect(fdo3.plus(1, 'B')).to.be.a('string');
        expect(fdo3.plus('A', 1)).to.be.a('string');
        expect(fdo3.plus(1, 2)).to.be.a('string');

        expect(fdo3.plus('A', 'B', 'C')).to.eql('C');
        expect(fdo3.plus(1, 'B', 'C')).to.eql('C');
        expect(fdo3.plus('A', 2, 'C')).to.eql('C');
        expect(fdo3.plus(1, 2, 'C')).to.eql('C');

        expect(fdo3.plus('A', 'B', 3)).to.be.a('string');
        expect(fdo3.plus(1, 'B', 3)).to.be.a('string');
        expect(fdo3.plus('A', 2, 3)).to.be.a('string');
        expect(fdo3.plus(1, 2, 3)).to.be.a('string');
      });
    });

    describe('fdo.minus', function() {

      it('should work without result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.minus('A', 'B')).to.be.a('string');
      });

      it('should work with a result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.minus('A', 'B', 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions', function() {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.minus(1, 'B', 'C')).to.equal('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.minus('A', 2, 'C')).to.equal('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(fdo3.minus('A', 'B', 3)).to.be.a('string');
      });

      it('should throw for bad result name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => fdo3.minus(['A', 'B'], {})).to.throw('all var names should be strings or numbers or undefined');
      });

      it('should always return the result var name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(fdo3.minus('A', 'B')).to.be.a('string');
        expect(fdo3.minus(1, 'B')).to.be.a('string');
        expect(fdo3.minus('A', 1)).to.be.a('string');
        expect(fdo3.minus(1, 2)).to.be.a('string');

        expect(fdo3.minus('A', 'B', 'C')).to.eql('C');
        expect(fdo3.minus(1, 'B', 'C')).to.eql('C');
        expect(fdo3.minus('A', 2, 'C')).to.eql('C');
        expect(fdo3.minus(1, 2, 'C')).to.eql('C');

        expect(fdo3.minus('A', 'B', 3)).to.be.a('string');
        expect(fdo3.minus(1, 'B', 3)).to.be.a('string');
        expect(fdo3.minus('A', 2, 3)).to.be.a('string');
        expect(fdo3.minus(1, 2, 3)).to.be.a('string');
      });
    });

    describe('fdo.mul', function() {

      it('should work without result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.mul('A', 'B')).to.be.a('string');
      });

      it('should work with a result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.mul('A', 'B', 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions', function() {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.mul(1, 'B', 'C')).to.equal('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.mul('A', 2, 'C')).to.equal('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(fdo3.mul('A', 'B', 3)).to.be.a('string');
      });

      it('should throw for bad result name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => fdo3.mul(['A', 'B'], {})).to.throw('all var names should be strings or numbers or undefined');
      });

      it('should always return the result var name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(fdo3.mul('A', 'B')).to.be.a('string');
        expect(fdo3.mul(1, 'B')).to.be.a('string');
        expect(fdo3.mul('A', 1)).to.be.a('string');
        expect(fdo3.mul(1, 2)).to.be.a('string');

        expect(fdo3.mul('A', 'B', 'C')).to.eql('C');
        expect(fdo3.mul(1, 'B', 'C')).to.eql('C');
        expect(fdo3.mul('A', 2, 'C')).to.eql('C');
        expect(fdo3.mul(1, 2, 'C')).to.eql('C');

        expect(fdo3.mul('A', 'B', 3)).to.be.a('string');
        expect(fdo3.mul(1, 'B', 3)).to.be.a('string');
        expect(fdo3.mul('A', 2, 3)).to.be.a('string');
        expect(fdo3.mul(1, 2, 3)).to.be.a('string');
      });
    });

    describe('fdo.div', function() {

      it('should work without result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.div('A', 'B')).to.be.a('string');
      });

      it('should work with a result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.div('A', 'B', 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions', function() {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.div(1, 'B', 'C')).to.equal('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.div('A', 2, 'C')).to.equal('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(fdo3.div('A', 'B', 3)).to.be.a('string');
      });

      it('should throw for bad result name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => fdo3.div(['A', 'B'], {})).to.throw('all var names should be strings or numbers or undefined');
      });

      it('should always return the result var name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(fdo3.div('A', 'B')).to.be.a('string');
        expect(fdo3.div(1, 'B')).to.be.a('string');
        expect(fdo3.div('A', 1)).to.be.a('string');
        expect(fdo3.div(1, 2)).to.be.a('string');

        expect(fdo3.div('A', 'B', 'C')).to.eql('C');
        expect(fdo3.div(1, 'B', 'C')).to.eql('C');
        expect(fdo3.div('A', 2, 'C')).to.eql('C');
        expect(fdo3.div(1, 2, 'C')).to.eql('C');

        expect(fdo3.div('A', 'B', 3)).to.be.a('string');
        expect(fdo3.div(1, 'B', 3)).to.be.a('string');
        expect(fdo3.div('A', 2, 3)).to.be.a('string');
        expect(fdo3.div(1, 2, 3)).to.be.a('string');
      });
    });

    describe('fdo.product', function() {

      it('should work without result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.product(['A', 'B'])).to.be.a('string');
      });

      it('should work with a result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.product(['A', 'B'], 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions', function() {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.product([1, 'B'], 'C')).to.equal('C');

        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.product(['A', 2], 'C')).to.equal('C');

        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(fdo3.product(['A', 'B'], 3)).to.be.a('string');
      });

      it('should throw for bad result name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => fdo3.product(['A', 'B'], {})).to.throw('expecting result var name to be absent or a number or string:');
      });

      it('should always return the result var name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(fdo3.product(['A', 'B'])).to.be.a('string');
        expect(fdo3.product([1, 'B'])).to.be.a('string');
        expect(fdo3.product(['A', 1])).to.be.a('string');
        expect(fdo3.product([1, 2])).to.be.a('string');

        expect(fdo3.product(['A', 'B'], 'C')).to.eql('C');
        expect(fdo3.product([1, 'B'], 'C')).to.eql('C');
        expect(fdo3.product(['A', 2], 'C')).to.eql('C');
        expect(fdo3.product([1, 2], 'C')).to.eql('C');

        expect(fdo3.product(['A', 'B'], 3)).to.be.a('string');
        expect(fdo3.product([1, 'B'], 3)).to.be.a('string');
        expect(fdo3.product(['A', 2], 3)).to.be.a('string');
        expect(fdo3.product([1, 2], 3)).to.be.a('string');
      });
    });

    describe('fdo.sum', function() {

      it('should work without result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.sum(['A', 'B'])).to.be.a('string');
      });

      it('should work with a result var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.sum(['A', 'B'], 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions; 1', function() {
        let fdo = new FDO();
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        expect(fdo.sum([1, 'B'], 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions; 2', function() {
        let fdo2 = new FDO();
        fdo2.decl('A', 100);
        fdo2.decl('C', 100);
        expect(fdo2.sum(['A', 2], 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions; 3', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(fdo3.sum(['A', 'B'], 3)).to.be.a('string');
      });

      it('should throw for bad result name', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        expect(_ => fdo3.sum(['A', 'B'], {})).to.throw('expecting result var name to be absent or a number or string:');
      });

      it('should always return the result var name, regardless', function() {
        let fdo3 = new FDO();
        fdo3.decl('A', 100);
        fdo3.decl('B', 100);
        fdo3.decl('C', 100);

        expect(fdo3.sum(['A', 'B'])).to.be.a('string');
        expect(fdo3.sum([1, 'B'])).to.be.a('string');
        expect(fdo3.sum(['A', 1])).to.be.a('string');
        expect(fdo3.sum([1, 2])).to.be.a('string');

        expect(fdo3.sum(['A', 'B'], 'C')).to.eql('C');
        expect(fdo3.sum([1, 'B'], 'C')).to.be.eql('C');
        expect(fdo3.sum(['A', 2], 'C')).to.be.eql('C');
        expect(fdo3.sum([1, 2], 'C')).to.eql('C');

        expect(fdo3.sum(['A', 'B'], 3)).to.be.a('string');
        expect(fdo3.sum([1, 'B'], 3)).to.be.a('string');
        expect(fdo3.sum(['A', 2], 3)).to.be.a('string');
        expect(fdo3.sum([1, 2], 3)).to.be.a('string');
      });
    });

    describe('fdo.distinct', function() {

      it('should work', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        fdo.decl('C', 100);
        fdo.decl('D', 100);
        fdo.decl('E', 100);
        expect(fdo.distinct(['A', 'B', 'C', 'D'], 'E')).to.equal(undefined);
      });

      it('accept zero vars', function() {
        let fdo = new FDO();
        expect(_ => fdo.distinct([])).not.to.throw();
      });

      it('accept one var', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        expect(fdo.distinct(['A'])).to.equal(undefined);
      });

      it('accept two vars', function() {
        let fdo = new FDO();
        fdo.decl('A', 100);
        fdo.decl('B', 100);
        expect(fdo.distinct(['A', 'B'])).to.equal(undefined);
      });
    });

    describe('fdo comparison with .eq and .neq', function() {

      function alias(method) {
        it('should work', function() {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method]('A', 'B')).to.equal(undefined); // returns v1
        });

        it('should work with a number left', function() {
          let fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo[method](1, 'B')).to.eql(undefined);
        });

        it('should work with a number right', function() {
          let fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo[method]('A', 2)).to.eql(undefined);
        });

        it('should work with an empty array left', function() {
          let fdo = new FDO();
          fdo.decl('B', 100);
          expect(fdo[method]([], 'B')).to.equal(undefined); // returns v2!
        });

        it('should work with an empty array right', function() {
          let fdo = new FDO();
          fdo.decl('A', 100);
          expect(fdo[method]('A', [])).to.equal(undefined); // returns v2!
        });

        it('should work with an empty array left and right', function() {
          let fdo = new FDO();
          expect(fdo[method]([], [])).to.equal(undefined); // returns v2!
        });

        it('should work with an array of one element left', function() {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method](['A'], 'B')).to.equal(undefined);
        });

        it('should work with an array of one element right', function() {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          expect(fdo[method]('A', ['B'])).to.equal(undefined);
        });

        it('should work with an array of multiple elements left', function() {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(fdo[method](['A', 'C', 'D'], 'B')).to.equal(undefined);
        });

        it('should work with an array of multiple elements right', function() {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(fdo[method]('B', ['A', 'C', 'D'])).to.equal(undefined);
        });

        it('should work with an array of multiple elements on both sides', function() {
          let fdo = new FDO();
          fdo.decl('A', 100);
          fdo.decl('B', 100);
          fdo.decl('C', 100);
          fdo.decl('D', 100);
          expect(fdo[method](['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D'])).to.equal(undefined);
        });
      }

      alias('eq');
      alias('neq');
    });

    describe('fdo relative comparisons', function() {

      function alias(method) {
        describe('method [' + method + ']', function() {

          it('should work', function() {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            expect(fdo[method]('A', 'B')).to.equal(undefined);
          });

          it('should work with a number left', function() {
            let fdo = new FDO();
            fdo.decl('B', 100);
            expect(fdo[method](1, 'B')).to.equal(undefined); // if we change anonymous var naming, this'll break
          });

          it('should work with a number right', function() {
            let fdo = new FDO();
            fdo.decl('A', 100);
            expect(fdo[method]('A', 2)).to.equal(undefined); // if we change anonymous var naming, this'll break
          });
          it('should not work with an empty array', function() {
            let fdo = new FDO();
            fdo.decl('B', 100);
            expect(_ => fdo[method]([], 'B')).to.throw('NOT_ACCEPTING_ARRAYS');
          });

          it('should work with an array of one element', function() {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            expect(_ => fdo[method](['A'], 'B')).to.throw('NOT_ACCEPTING_ARRAYS');
          });

          it('should work with an array of multiple elements', function() {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            fdo.decl('C', 100);
            fdo.decl('D', 100);
            expect(_ => fdo[method](['A', 'C', 'D'], 'B')).to.throw('NOT_ACCEPTING_ARRAYS');
          });
        });
      }

      alias('gte');
      alias('gt');
      alias('lte');
      alias('lt');
    });

    describe('fdo reifiers', function() {

      function alias(method) {
        describe('method = ' + method, function() {

          it('should work:' + method, function() {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            expect(fdo[method]('A', 'B')).to.be.a('string');
          });

          it('should work with a number left: ' + method, function() {
            let fdo = new FDO();
            fdo.decl('B', 100);
            expect(fdo[method](1, 'B')).to.be.a('string');
          });

          it('should work with a number right: ' + method, function() {
            let fdo = new FDO();
            fdo.decl('A', 100);
            expect(fdo[method]('A', 2)).to.be.a('string');
          });

          it('should accept a result name: ' + method, function() {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 100);
            fdo.decl('C', 100);
            expect(fdo[method]('A', 'B', 'C')).to.equal('C');
          });

          it('should accept a result number: ' + method, function() {
            let fdo = new FDO();
            fdo.decl('A', 100);
            fdo.decl('B', 1);
            expect(fdo[method]('A', 'B', 1)).to.be.a('string');
          });

          it('should throw for bad result name', function() {
            let fdo3 = new FDO();
            fdo3.decl('A', 100);
            fdo3.decl('B', 100);
            expect(_ => fdo3[method](['A', 'B'], {})).to.throw('all var names should be strings or numbers or undefined');
          });

          it('should always return the result var name', function() {
            let fdo3 = new FDO();
            fdo3.decl('A', 100);
            fdo3.decl('B', 100);
            fdo3.decl('C', 100);

            expect(fdo3[method]('A', 'B')).to.be.a('string');
            expect(fdo3[method](1, 'B')).to.be.a('string');
            expect(fdo3[method]('A', 1)).to.be.a('string');
            expect(fdo3[method](1, 2)).to.be.a('string');

            expect(fdo3[method]('A', 'B', 'C')).to.eql('C');
            expect(fdo3[method](1, 'B', 'C')).to.eql('C');
            expect(fdo3[method]('A', 2, 'C')).to.eql('C');
            expect(fdo3[method](1, 2, 'C')).to.eql('C');

            expect(fdo3[method]('A', 'B', 3)).to.be.a('string');
            expect(fdo3[method](1, 'B', 3)).to.be.a('string');
            expect(fdo3[method]('A', 2, 3)).to.be.a('string');
            expect(fdo3[method](1, 2, 3)).to.be.a('string');
          });
        });
      }

      alias('isNeq');
      alias('isEq');
      alias('isGt');
      alias('isGte');
      alias('isLt');
      alias('isLte');
    });

    describe('fdo.solve', function() {

      it('should solve a trivial case when targeted', function() {
        let fdo = new FDO({});
        fdo.declRange('A', 1, 2);

        expect(fdo.solve({vars: ['A']})).to.eql([{A: 1}, {A: 2}]);
      });

      it('should solve a trivial case when not targeted', function() {
        let fdo = new FDO({});
        fdo.declRange('A', 1, 2);

        expect(fdo.solve()).to.eql([{A: [1, 2]}]);
      });

      function forLevel(level) {
        it('should accept all log levels (' + level + ')', function() {
          let fdo = new FDO();

          expect(fdo.solve({log: level})).to.eql([{}]);
        });

        it('should accept all dbg levels (' + level + ')', function() {
          let fdo = new FDO();

          expect(fdo.solve({dbg: level})).to.eql([{}]);
        });
      }

      forLevel(undefined);
      forLevel(null);
      forLevel(false);
      forLevel(true);
      forLevel(LOG_NONE);
      forLevel(LOG_STATS);
      forLevel(LOG_SOLVES);
      forLevel(LOG_MAX);
      forLevel(LOG_MIN);
    });

    describe('fdo._prepare', function() {

      it('should prepare for war', function() {
        let fdo = new FDO();

        fdo._prepare({});
        expect(true).to.equal(true);
      });

      it('should not require options object', function() {
        let fdo = new FDO();

        fdo._prepare({});
        expect(true).to.equal(true);
      });
    });

    describe('FDO.domainFromList', function() {

      it('should map to domainFromList', function() {
        expect(FDO.domainFromList([1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 15, 118])).to.eql([1, 2, 4, 5, 7, 7, 9, 13, 15, 15, 118, 118]);
      });

      it('should always return an array even for small domains', function() {
        expect(FDO.domainFromList([1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 15])).to.eql([1, 2, 4, 5, 7, 7, 9, 13, 15, 15]);
      });
    });
  });

  describe('targeting values', function() {

    it('should support a function comparator', function() {
      let fdo = new FDO();
      fdo.decl('a', [0, 100]);
      fdo.decl('b', [0, 100]);
      fdo.neq('a', 'b');

      let called = false;
      config_setOption(fdo.config, 'valueStrategy', (space, varIndex, choiceIndex) => {
        called = true;
        expect(space._class).to.eql('$space');
        expect(varIndex).to.be.a('number');
        expect(choiceIndex).to.be.a('number');
      });

      fdo.solve({max: 1});

      expect(called, 'the callback should be called at least once').to.eql(true);
    });
  });

  describe('continue solved space', function() {

    it('should solve this in one go', function() {
      verify(`
        : A [2 5]
        : B [2 2 4 5]
        : C [1 5]
        A < B
        C < A
      `);
    });

    it('should be able to continue a solution with extra vars', function() {
      let dsl = `
        : A [2 5]
        : B [2 2 4 5]
        : C [1 5]
        A < B
        C < A
      `;

      let solver = new FDO().imp(dsl);
      solver.solve({max: 1});
      // should not solve C yet because only A and B
      //expect(countSolutions(solver), 'solve count 1').to.eql(5); // C started with 5 values and is unconstrained
      expect(solver.solutions).to.eql([{A: 2, B: 4, C: 1}]);

      // need to either improve on this or ditch it entirely
      let solver2 = solver.branch_from_current_solution();
      // add a new constraint to the space and solve it
      solver2.lt('C', 'A');

      solver2.solve({
        vars: ['A', 'B', 'C'],
        max: 1,
        test: 1,
      });

      // now C is constrained as well so all vars have one possible value
      //expect(countSolutions(solver2), 'solve count 2').to.eql(1);
      expect(solver2.solutions[0].C < solver2.solutions[0].B).to.equal(true);
      expect(solver2.solutions).to.eql([{A: 2, B: 4, C: 1}]);
    });
  });
});
