const path = require('path');

const { runLoaders } = require('loader-runner');
const enhancedResolve = require('enhanced-resolve');
const { validate } = require('schema-utils');

const buildContext = require('./lib/build-context');

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
    filter: rule.test,
    loaders: rule.loader ? [rule.loader] : rule.use,
    esbuildLoader: rule.esbuildLoader,
  };
}

function registerRuleOnResolve(ruleMeta, loaderOptions, build) {
  log('Register onResolve for the rule with namespace', ruleMeta.namespace);

  // if (ruleMeta.test instanceof RegExp) {
  log(ruleMeta.namespace, 'is regexp rule');

  // we do not register 'file' namespace here, because the root file won't be processed
  // https://github.com/evanw/esbuild/issues/791
  build.onResolve({ filter: ruleMeta.filter }, buildResolveCallback(ruleMeta, loaderOptions));
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

  build.onLoad({ filter: /.*/, namespace: ruleMeta.namespace }, async (args) => new Promise(resolve => {
    log('Run loaders for', args.path, 'using rule with namespace', args.namespace);

    const context = buildContext(ruleMeta, args, loaderOptions);

    runLoaders({
      resource: args.path,
      loaders: ruleMeta.loaders,
      context,
    }, (err, res) => {
      if (err) {
        log('Error occurred while running loaders for', args.path, 'using rule with namespace', args.namespace);

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
        loader: ruleMeta.esbuildLoader,
      });
    });
  }));
}

// function escapeRegExp(string) {
//   // $& means the whole matched string
//   return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

function log(...args) {
  if (process.env.DEBUG) {
    console.log('[webpack-bridge]', ...args);
  }
}
