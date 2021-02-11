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
const esbuild = require('esbuild');
const webpackBridge = require('esbuild-plugin-webpack-bridge');

esbuild.build({
  // ...
  plugins: [
    webpackBridge({
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            esbuildLoader: 'js',
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

**Note:** the plugin is currently under development, so the API may change during the time. Also there're not 
so many loaders' features supported. Please, check [test/](test) folder for more examples. 
