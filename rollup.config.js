import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';

export default [
  // UMD Development
  {
    input: 'src/fdo.js',
    output: {
      file: 'dist/fdo.js',
      format: 'umd',
      name: 'FDO',
      indent: false,
      sourceMap: true,
    },
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    },
    plugins: [
      resolve(),
      commonjs(),
      babel(),
      replace({ 'process.env.NODE_ENV': JSON.stringify('development') }),
    ],
  },

  // UMD Production
  {
    input: 'src/fdo.js',
    output: {
      file: 'dist/fdo.min.js',
      format: 'umd',
      name: 'FDO',
      indent: false,
    },
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    },
    plugins: [
      resolve(),
      commonjs(),
      babel(),
      replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
      terser({
        compress: {
          pure_funcs: [
            // config
            'config_clone',
            'config_create',
            'config_createVarStratConfig',

            /* impure
            config_addConstraint,
            config_addPropagator,
            config_addVarAnonConstant,
            config_addVarAnonNothing,
            config_addVarAnonRange,
            config_addVarConstant,
            config_addVarDomain,
            config_addVarNothing,
            config_addVarRange,
            config_generatePropagators,
            config_init,
            config_populateVarPropHash,
            config_setDefaults,
            config_setOption,
            config_setOptions,
            _config_addVar,
            */

            // constraint
            'constraint_create',

            // distribution/defaults
            'distribution_getDefaults',

            // distribution/markov
            'distribution_markovSampleNextFromDomain',

            // distribution/vars
            /* impure
            distribution_getNextVarIndex,
            */

            /* Should not be used in production
            'distribution_varByList',
            'distribution_varByMax',
            'distribution_varByMarkov',
            'distribution_varByMin',
            'distribution_varByMinSize',
            'distribution_varFallback',
            */

            // distribution/values
            /* impure
            distribution_getDefaults
            */

            /* Should not be used in production
            'distribution_valueByList',
            'distribution_valueByMarkov',
            'distribution_valueByMax',
            'distribution_valueByMid',
            'distribution_valueByMin',
            'distribution_valueByMinMaxCycle',
            'distribution_valueBySplitMax',
            'distribution_valueBySplitMin',
            '_distribute_getNextDomainForVar',
            */

            // exporter
            'exporter_main',
            'exporter_encodeVarName',

            // fdo
            /* impure
            default // (FDO)
            */

            // importer
            /* impure
            importer_main
            */

            // markov
            'markov_createLegend',
            'markov_createProbVector',

            // propagator
            /* impure
            propagator_addDistinct,
            propagator_addDiv,
            propagator_addEq,
            propagator_addGt,
            propagator_addGte,
            propagator_addLt,
            propagator_addLte,
            propagator_addMarkov,
            propagator_addMin,
            propagator_addMul,
            propagator_addNeq,
            propagator_addPlus,
            propagator_addProduct,
            propagator_addReified,
            propagator_addRingMul,
            propagator_addSum,
            propagator_addRing,
            propagator_addRingPlusOrMul,
            */

            // propagators/div
            /* impure
            propagator_divStep,
            */

            // propagators/eq
            'propagator_eqStepWouldReject',

            /* impure
            propagator_eqStepBare,
            */

            // propagators/lt
            'propagator_gtStepWouldReject',
            'propagator_ltStepWouldReject',

            /* impure
            propagator_gtStepBare,
            propagator_ltStepBare,
            */

            // propagators/lte
            'propagator_gteStepWouldReject',
            'propagator_lteStepWouldReject',

            /* impure
            propagator_gteStepBare,
            propagator_lteStepBare,
            */

            // propagators/markov
            /* impure
            propagator_markovStepBare,
            */

            // propagators/min
            /* Should not be used in production
            '_propagator_minStep',
            */

            /* impure
            propagator_minStep,
            */

            // propagators/mul
            /* impure
            propagator_mulStep,
            */

            // propagators/neq
            'propagator_neqStepWouldReject',

            /* impure
            propagator_neqStepBare,
            */

            // propagators/reified
            /* impure
            propagator_reifiedStepBare 
            */

            // propagators/ring
            /* Should not be used in production
            _propagator_ringStepBare,
            */

            /* impure
            propagator_ringStepBare,
            */

            // search
            /* impure
            search_afterPropagation,
            search_createNextSpace,
            search_depthFirst,
            */

            // space
            'space_createRoot',
            'space_getDomainArr',
            'space_getVarSolveState',
            'space_solution',
            'space_toConfig',

            /* impure
            space_createClone,
            space_createFromConfig,
            space_generateVars,
            space_initFromConfig,
            space_propagate,
            space_updateUnsolvedVarList,
            */

            /* Should not be used in production
            space_getUnsolvedVarCount,
            _space_debug,
            _space_getUnsolvedVarNamesFresh,
            */

          ],
          pure_getters: true,
          unsafe: true,
          unsafe_comps: false, // TODO: find out why things break when this is true
          warnings: false,
        },
      }),
    ],
  },
];
