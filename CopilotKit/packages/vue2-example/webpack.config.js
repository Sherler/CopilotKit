const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables
const env = dotenv.config({ path: '.env.local' }).parsed || {};
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      title: 'CopilotKit Vue2 Example',
    }),
    new webpack.DefinePlugin(envKeys),
  ],
  resolve: {
    alias: {
      vue$: 'vue/dist/vue.esm.js',
    },
    extensions: ['*', '.js', '.vue', '.json'],
  },
  devServer: {
    static: './dist',
    hot: true,
    port: 8081,
    proxy: {
      // Proxy all /api requests to the backend
      '/api': {
        target: env.PROXY_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
          console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
        },
        onError: (err, req, res) => {
          console.error('[PROXY ERROR]', err.message);
        }
      },
      // Proxy CopilotKit runtime requests
      '/copilotkit': {
        target: env.PROXY_COPILOT_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
        pathRewrite: {
          '^/copilotkit': '/api/copilotkit' // Rewrite /copilotkit to /api/copilotkit
        },
        onProxyReq: (proxyReq, req, res) => {
          console.log(`[COPILOT PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
        },
        onError: (err, req, res) => {
          console.error('[COPILOT PROXY ERROR]', err.message);
        }
      }
    },
  },
};
