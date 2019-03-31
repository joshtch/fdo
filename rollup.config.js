import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
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
    },
    plugins: [
      nodeResolve(),
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
    plugins: [
      nodeResolve(),
      commonjs(),
      babel(),
      replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false,
        },
      }),
    ],
  },
];

