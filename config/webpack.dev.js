/* eslint-env node */
const path = require('path')
const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const webpack = require('webpack')

module.exports = merge(common, {
  devtool: 'cheap-module-eval-source-map',
  entry: [
    'react-hot-loader/patch',
    'webpack-hot-middleware/client',
    path.resolve('src/js/index')
  ],
  devServer: {
    overlay: true,
    hot: true,
    compress: true,
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  output: {
    path: path.resolve('dist'),
    filename: 'bundle.min.js',
    publicPath: '/dist/'
  }
})
