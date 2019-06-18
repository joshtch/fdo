import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
//import { terser } from 'rollup-plugin-terser';

export default [
  // Core Node builds
  {
    input: 'src/fdo.js',
    plugins: [
      resolve(),
      commonjs({ include: 'node_modules/**' }),
      babel(),
//      terser({
//        sourcemap: true,
//        compress: {
//          pure_funcs: [
//            // fdlib
//            'domain_arr_max',
//            'domain_arrToStr',
//            'domain_str_decodeValue',
//            'domain_str_getValue',
//            'domain_bit_getValue',
//            'domain_sol_getValue',
//            'domain_num_createRange',
//            'domain_createEmpty',
//            'domain_createValue',
//            'domain_str_decodeValue',
//            'domain_toList',
//            'domain_max',
//            'domain_size',
//            'domain_min',
//            'domain_isSolved',
//            'domain_isZero',
//            'domain_hasNoZero',
//            'domain_hasZero',
//            'domain_isBool',
//            'domain_isBooly',
//            'domain_sharesNoElements',
//            'domain_createRange',
//            'domain_createRangeTrimmed',
//            'domain_toArr',
//            'domain_toStr',
//            'domain_toSmallest',
//            'domain_anyToSmallest',
//            'domain_arrToSmallest',
//            'domain_str_closeGaps',
//            'domain_containsValue',
//            'domain_num_containsValue',
//            'domain_createBoolyPair',
//            'domain__debug',
//            'domain_getFirstIntersectingValue',
//            'domain_getValue',
//            'domain_intersection',
//            'domain_intersectionValue',
//            'domain_isBoolyPair',
//            'domain_isEmpty',
//            'domain_numToStr',
//            'domain_removeGte',
//            'domain_removeGtUnsafe',
//            'domain_removeLte',
//            'domain_removeLtUnsafe',
//            'domain_removeValue',
//            'domain_resolveAsBooly',
//            'domain_str_encodeRange',
//            'domain_minus',
//            'domain_plus',
//            'INSPECT',
//            'getTerm',
//            'trie_create',
//            '_trie_debug',
//            'trie_get',
//            'trie_getNum',
//            'trie_getValueBitsize',
//            'trie_has',
//            'trie_hasNum',

//            // fdo-specific

//            // config
//            'config_clone',
//            'config_create',
//            'config_createVarStratConfig',

//            // constraint
//            'constraint_create',

//            // distribution/defaults
//            'distribution_getDefaults',

//            // distribution/markov
//            'distribution_markovSampleNextFromDomain',

//            // exporter
//            'exporter_main',
//            'exporter_encodeVarName',

//            // markov
//            'markov_createLegend',
//            'markov_createProbVector',

//            // propagators/eq
//            'propagator_eqStepWouldReject',

//            // propagators/lt
//            'propagator_gtStepWouldReject',
//            'propagator_ltStepWouldReject',

//            // propagators/lte
//            'propagator_gteStepWouldReject',
//            'propagator_lteStepWouldReject',

//            // propagators/neq
//            'propagator_neqStepWouldReject',

//            // space
//            'space_createRoot',
//            'space_getDomainArr',
//            'space_getVarSolveState',
//            'space_solution',
//            'space_toConfig',

//            /* impure
//            // config
//            config_addConstraint,
//            config_addPropagator,
//            config_addVarAnonConstant,
//            config_addVarAnonNothing,
//            config_addVarAnonRange,
//            config_addVarConstant,
//            config_addVarDomain,
//            config_addVarNothing,
//            config_addVarRange,
//            config_generatePropagators,
//            config_init,
//            config_populateVarPropHash,
//            config_setDefaults,
//            config_setOption,
//            config_setOptions,
//            _config_addVar,

//            // distribution/vars
//            distribution_getNextVarIndex,

//            // distribution/values
//            distribution_getDefaults

//            // fdo
//            default // (FDO)

//            // importer
//            importer_main

//            // propagator
//            propagator_addDistinct,
//            propagator_addDiv,
//            propagator_addEq,
//            propagator_addGt,
//            propagator_addGte,
//            propagator_addLt,
//            propagator_addLte,
//            propagator_addMarkov,
//            propagator_addMin,
//            propagator_addMul,
//            propagator_addNeq,
//            propagator_addPlus,
//            propagator_addProduct,
//            propagator_addReified,
//            propagator_addRingMul,
//            propagator_addSum,
//            propagator_addRing,
//            propagator_addRingPlusOrMul,

//            // propagators/div
//            propagator_divStep,

//            // propagators/eq
//            propagator_eqStepBare,

//            // propagators/lt
//            propagator_gtStepBare,
//            propagator_ltStepBare,

//            // propagators/lte
//            propagator_gteStepBare,
//            propagator_lteStepBare,

//            // propagators/markov
//            propagator_markovStepBare,

//            // propagators/min
//            propagator_minStep,

//            // propagators/mul
//            propagator_mulStep,

//            // propagators/neq
//            propagator_neqStepBare,

//            // propagators/reified
//            propagator_reifiedStepBare

//            // propagators/ring
//            propagator_ringStepBare,

//            // search
//            search_afterPropagation,
//            search_createNextSpace,
//            search_depthFirst,

//            // space
//            space_createClone,
//            space_createFromConfig,
//            space_generateVars,
//            space_initFromConfig,
//            space_propagate,
//            space_updateUnsolvedVarList,
//            */

//            /* Should not be used in production
//            // distribution/markov
//            'distribution_varByList',
//            'distribution_varByMax',
//            'distribution_varByMarkov',
//            'distribution_varByMin',
//            'distribution_varByMinSize',
//            'distribution_varFallback',

//            // distribution/values
//            'distribution_valueByList',
//            'distribution_valueByMarkov',
//            'distribution_valueByMax',
//            'distribution_valueByMid',
//            'distribution_valueByMin',
//            'distribution_valueByMinMaxCycle',
//            'distribution_valueBySplitMax',
//            'distribution_valueBySplitMin',
//            '_distribute_getNextDomainForVar',

//            // propagators/min
//            '_propagator_minStep',

//            // propagators/ring
//            _propagator_ringStepBare,

//            // space
//            space_getUnsolvedVarCount,
//            _space_debug,
//            _space_getUnsolvedVarNamesFresh,
//            */
//          ],
//          pure_getters: true,
//          unsafe: true,
//          unsafe_comps: false, // TODO: find out why things break when this is true
//          warnings: false,
//        },
//      }),
    ],
    external: ['fs', 'path', 'events', 'module', 'util', 'fdlib'],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
    },
    output: [
      { file: 'dist/fdo.js', format: 'cjs', sourcemap: true },
      { file: 'dist/fdo.es.js', format: 'esm' },
    ],
  },
];
