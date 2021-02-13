const path = require('path');
const fs = require('fs');

const { runLoaders } = require('loader-runner');
const { getOptions } = require('loader-utils');
const enhancedResolve = require('enhanced-resolve');
const { validate } = require('schema-utils');

const optionsSchema = require('./options-schema.json');

module.exports = (options = {}) => {
  log('Validate options');

  validate(optionsSchema, options);

  const rules = options.module.rules;

  return {
    name: 'webpack-bridge',
    setup(build) {
      log('Setup, rules found:', rules.length);

      for (let i = 0; i < rules.length; i++) {
        const meta = buildRuleMeta(rules[i]);
        registerRuleOnResolve(meta, options, build);
        registerRuleOnLoad(meta, options, build);
      }
    },
  };
};

let ruleCounter = 1;
function buildRuleMeta(rule) {
  log('Build meta for rule', ruleCounter);

  const namespace = `rule-${ruleCounter++}-${rule.test.toString()}`;

  log('Generated namespace for the rule:', namespace);

  return {
    namespace,
    test: rule.test,
    use: rule.loader ? [rule.loader] : rule.use,
    loader: rule.esbuildLoader,
  };
}

function registerRuleOnResolve(ruleMeta, loaderOptions, build) {
  log('Register onResolve for the rule with namespace', ruleMeta.namespace);

  // if (ruleMeta.test instanceof RegExp) {
  log(ruleMeta.namespace, 'is regexp rule');

  // we do not register 'file' namespace here, because the root file won't be processed
  // https://github.com/evanw/esbuild/issues/791
  build.onResolve({ filter: ruleMeta.test }, buildResolveCallback(ruleMeta, loaderOptions));
  // return;
  // }

  // if (typeof ruleMeta.test === 'string') {
  //   log(ruleMeta.namespace, 'is string rule');
  //
  //   // TODO: do we need ^ & $ here?
  //   const re = new RegExp(`^${escapeRegExp(ruleMeta.test)}$`);
  //
  //   build.onResolve({ filter: re }, buildResolveCallback(ruleMeta));
  //   return;
  // }

  // console.warn('`test` property of webpack rules should be RegExp. Other types make ESBuild slower. Read more: https://esbuild.github.io/plugins/#filters');
}

function buildResolveCallback(ruleMeta, loaderOptions) {
  const { resolve: { modules: resolveModules = [] } = {} } = loaderOptions;

  log('Build onResolve callback for rule with namespace', ruleMeta.namespace);

  return args => {
    log('Run onResolve callback for file', args.path, 'with predefined namespace', args.namespace);

    if (args.path.includes('!')) {
      throw new Error(`Can not load '${args.path}'. Inline loaders are not supported yet.`);
    }

    let resolvedPath;

    if (args.path.match(/^\.\.?\//)) {
      resolvedPath = enhancedResolve.sync(args.resolveDir, args.path);
    } else if (!resolveModules.length) {
      resolvedPath = enhancedResolve.sync(args.resolveDir, args.path);
    } else {
      const resolver = enhancedResolve.create.sync({
        modules: resolveModules,
      });
      resolvedPath = resolver(args.resolveDir, args.path);
    }

    return {
      path: resolvedPath,
      namespace: ruleMeta.namespace,
    };
  };
}

function registerRuleOnLoad(ruleMeta, loaderOptions, build) {
  log('Register onLoad for the rule with namespace', ruleMeta.namespace);

  const { output: { path: outputPath = '' } = {} } = loaderOptions;

  build.onLoad({ filter: /.*/, namespace: ruleMeta.namespace }, async (args) => new Promise(resolve => {
    log('Run loaders for', args.path, 'using rule with namespace', args.namespace);

    const context = {
      // TODO: add mode?
      // https://github.com/webpack/webpack/blob/2acc6c48b62fcad91b29b58688a998cf52bf82a0/lib/NormalModule.js#L508
      getResolve, // sass-loader
      fs, // postcss-loader
      rootContext: args.path,
      emitFile: (name, content) => fs.promises.mkdir(path.dirname(path.resolve(outputPath, name)), { recursive: true })
        .then(() => fs.promises.writeFile(path.resolve(outputPath, name), content)),
    };

    // a lot of loaders use it, e.g. postcss-loader
    // but current webpack version of getOptions implements schema check: https://github.com/webpack/webpack/blob/2acc6c48b62fcad91b29b58688a998cf52bf82a0/lib/NormalModule.js#L395
    // while getOptions from loader-utils expects context as a first param: https://github.com/webpack/loader-utils#getoptions
    // so we bind it
    // TODO: implement schema check?
    context.getOptions = getOptions.bind(null, context);

    runLoaders({
      resource: args.path,
      loaders: ruleMeta.use,
      context,
    }, (err, res) => {
      if (err) {
        log('Error occurred while running loaders for', args.path, 'using rule with namespace', args.namespace);

        // TODO: add more info?
        // https://nodejs.org/api/errors.html
        // https://github.com/webpack/loader-runner/blob/master/lib/LoaderLoadingError.js

        return resolve({
          errors: [{
            text: err.message,
            detail: err,
          }],
        });
      }

      log('Complete running loaders for', args.path, 'using rule with namespace', args.namespace);

      return resolve({
        // TODO: https://github.com/webpack/loader-runner
        //  according to the doc result should be Buffer or String, but it's an array with String inside. why?
        contents: res.result[0],
        resolveDir: path.dirname(args.path),
        loader: ruleMeta.loader,
      });
    });
  }));
}

// function escapeRegExp(string) {
//   // $& means the whole matched string
//   return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

// sass-loader relies on this context method:
// https://github.com/webpack-contrib/sass-loader/blob/58858f577fb89c9d6bcdfd2874230edf332123c0/src/utils.js#L464
// https://github.com/webpack-contrib/sass-loader/blob/58858f577fb89c9d6bcdfd2874230edf332123c0/src/utils.js#L354-L368
// https://webpack.js.org/api/loaders/#thisgetresolve
// webpack uses inside enhanced-resolve module:
// https://github.com/webpack/webpack/blob/2acc6c48b62fcad91b29b58688a998cf52bf82a0/lib/ResolverFactory.js
// so we are
function getResolve(options) {
  const resolver = enhancedResolve.create(options);

  return (context, request, callback) => {
    if (callback) {
      return resolver(context, request, callback);
    }

    return new Promise((resolve, reject) => {
      resolver(context, request, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  };
}

function log(...args) {
  if (process.env.DEBUG) {
    console.log('[webpack-bridge]', ...args);
  }
}
