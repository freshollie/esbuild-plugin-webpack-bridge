# Changelog

## 0.4.0 (12.02.2021)

Added support for [`Rule.loader`](https://webpack.js.org/configuration/module/#ruleloader) property.


## 0.3.1 (12.02.2021)

Fixed paths resolution for nested modules imports.


## 0.3.0 (12.02.2021)

Implemented shims to make postcss-loader work.


## 0.2.1 (12.02.2021)

Removed postinstall hook that crashed installation process.


## 0.2.0 (11.02.2021)

Implemented shims to make sass-loader work. 

API has been slightly changed. Now each rule has to contain string `esbuildLoader` field that sets esbuild loader
that will be used after webpack loaders. Read more about esbuild loaders in [esbuild docs](https://esbuild.github.io/content-types/).


## 0.1.0 (11.02.2021)

Initial version.

Plugin surely works with JS loaders. Anything else has not been tested yet.
