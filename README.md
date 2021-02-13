# esbuild-plugin-webpack-bridge

<p align="center">
  <img src="image.svg" alt="Plugin image: esbuild logo, bridge road sign, webpack logo">
</p>

A plugin that allows to use webpack loaders with [esbuild](https://github.com/evanw/esbuild).


## Rationale

Current set of plugins for esbuild is not enough for production development, 
but webpack's community already has everything that developers may want to. So why not use it?


## Installation

```sh
npm install --save-dev esbuild-plugin-webpack-bridge
```

## Usage

Define plugin in the `plugins` section of esbuild config like this:

```js
const path = require('path');
const esbuild = require('esbuild');
const webpackBridge = require('esbuild-plugin-webpack-bridge');

esbuild.build({
  // ...
  plugins: [
    webpackBridge({
      // output.path is used by file-loader and others, so it's required
      output: {
        path: path.resolve(__dirname, 'public'),
      },
      
      // resolve.modules should be set then the same option was used in webpack config
      // e.g. when your project was set up for path relative to the some non-root folder
      resolve: {
        modules: [path.resolve(__dirname, 'src'), path.resolve(__dirname, 'node_modules')],
      },
      
      module: {
        rules: [
          {
            // only regexps are supported by now
            test: /\.js$/,
            
            // required option that sets final loader on the esbuild side that will be used
            // read more about esbuild loaders:
            // https://esbuild.github.io/content-types/
            esbuildLoader: 'js',
            
            // `use` or `loader` might be used here
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: [
                    ['@babel/preset-env', { targets: { ie: 11 } }],
                  ],
                },
              },
            ],
          },
          {
            test: /\.scss$/,
            esbuildLoader: 'css',
            use: [
              {
                loader: 'sass-loader',
                options: {
                  implementation: require('sass'),
                },
              },
            ],
          },
        ],
      },
    }),
  ],
})
```

## Important notes

The plugin is currently under development, so the API may change during the time. Also there're not 
so many loaders' features supported, see the list below.

Only the latest major version of each loader is tested, which, most of the time, means that it should work with webpack@4 
and sometimes with webpack@5.

Check [test/](test) folder for more examples. 

## List of tested loaders

Probably works correctly:

- [babel-loader](https://github.com/babel/babel-loader)
- [sass-loader](https://github.com/webpack-contrib/sass-loader/)
- [postcss-loader](https://github.com/webpack-contrib/postcss-loader)
