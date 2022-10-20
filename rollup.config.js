import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'app_wit.js',
  output: [
    {
      format: 'esm',
      file: 'bundle_wit.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};