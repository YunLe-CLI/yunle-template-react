const webpack = require('webpack');
const path = require('path');
const Mock = require('mockjs');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const serverConfig = require('./config/server.config');
const webpackConfig = require('./config/_config');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const PATHS = webpackConfig.PATHS;

const proxys = {};

serverConfig.proxys.dev.map(function (item) {
  proxys[item.path] = {
    target: item.host,
    pathRewrite: item.pathRewrite,
    changeOrigin: true
  };
});
serverConfig.router.dev.map(function (item) {
  proxys[item.route] = {
    secure: false,
    bypass: function(req, res, opt){
      if(req.path.indexOf(item.route) !== -1){
        if (item.mockData) {
          const data = Mock.mock(item.mockData);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return;
        }
        item.handle ? item.handle(req, res) : null;
      }
      return req.path;
    }
  };
});


const sourcePath = path.join(__dirname, './src');
const staticsPath = path.join(__dirname, './dist');

module.exports = function (env) {
  const nodeEnv = env && env.prod ? 'production' : 'development';
  const isProd = nodeEnv === 'production';

  const plugins = [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity,
      filename: 'vendor.bundle.js'
    }),
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: JSON.stringify(nodeEnv) }
    }),
    new webpack.NamedModulesPlugin(),
  ];

  if (isProd) {
    plugins.push(
      new ExtractTextPlugin("main.css"),
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false
      }),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
          screw_ie8: true,
          conditionals: true,
          unused: true,
          comparisons: true,
          sequences: true,
          dead_code: true,
          evaluate: true,
          if_return: true,
          join_vars: true,
        },
        output: {
          comments: false,
        },
      })
    );
  } else {
    plugins.push(
      new ExtractTextPlugin("main.css"),
      new webpack.HotModuleReplacementPlugin(),
      new BrowserSyncPlugin({
        notify: false,
        port: webpackConfig.port,
        proxy: `localhost:${webpackConfig.port * 2 + 3}`,
        open: 'external',
        // files: 'src/*',
      })
    );
  }
  return {
    devtool: isProd ? 'source-map' : 'eval',
    context: sourcePath,
    entry: {
      js: './index.js',
      vendor: [
        'babel-polyfill',
        'react',
        'react-dom',
        'redux',
        'react-router',
        'react-router-redux',
        'redux-thunk',
        'redux-saga',
        'react-redux',
        'immutable',
        'keymirror',
        'redux-immutablejs',
        'whatwg-fetch',
      ]
    },
    output: {
      path: staticsPath,
      filename: '[name].bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: {
            loader: 'file-loader',
            query: {
              name: '[name].[ext]'
            },
          },
        },
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: ExtractTextPlugin.extract({
            fallback: "style-loader",
            use: "css-loader"
          })
        },
        {
          test: /\.less$/,
          use: ExtractTextPlugin.extract({
            fallback: "style-loader",
            use: "css-loader!less-loader",
          }),
        },
        {
          test: /\.(jpe?g|png|gif|svg)$/i,
          use: [
            'file-loader?hash=sha512&digest=hex&name=[hash].[ext]',
            'image-webpack-loader?bypassOnDebug&optimizationLevel=7&interlaced=false',
          ],
        },
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: [
            'babel-loader'
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.webpack-loader.js', '.web-loader.js', '.loader.js', '.js', '.jsx'],
      modules: [
        path.resolve(__dirname, 'node_modules'),
        sourcePath
      ]
    },

    plugins,

    performance: isProd && {
      maxAssetSize: 100,
      maxEntrypointSize: 300,
      hints: 'warning',
    },

    stats: {
      colors: {
        green: '\u001b[32m',
      }
    },

    devServer: {
      contentBase: './src',
      historyApiFallback: true,
      port: webpackConfig.port * 2 + 3,
      compress: isProd,
      inline: !isProd,
      hot: !isProd,
      proxy: proxys,
      stats: {
        assets: true,
        children: false,
        chunks: false,
        hash: false,
        modules: false,
        publicPath: false,
        timings: true,
        version: false,
        warnings: true,
        colors: {
          green: '\u001b[32m',
        },
      },
    },
  };
};
