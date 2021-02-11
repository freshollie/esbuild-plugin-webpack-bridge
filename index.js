const path = require('path');

const { runLoaders } = require('loader-runner');

module.exports = (options = {}) => {
  const { module: { rules = [] } = {} } = options;

  return {
    name: 'webpack-bridge',
    setup(build) {
      log('Setup, rules found:', rules.length);

      for (let i = 0; i < rules.length; i++) {
        const meta = buildRuleMeta(rules[i]);
        registerRuleOnResolve(meta, build);
        registerRuleOnLoad(meta, build);
      }
    },
  };
};

let ruleCounter = 1;
function buildRuleMeta(rule) {
  log('Build meta for rule', ruleCounter);

  const supportedRuleProperties = ['test', 'use'];

  if (Object.keys(rule).some(key => !supportedRuleProperties.includes(key))) {
    throw new Error(`Rule properties other than '${supportedRuleProperties.join(', ')}' are not supported yet.`);
  }

  const namespace = `rule-${ruleCounter++}-${rule.test.toString()}`;

  log('Generated namespace for the rule:', namespace);

  return {
    namespace,
    test: rule.test,
    use: rule.use,
  };
}

function registerRuleOnResolve(ruleMeta, build) {
  log('Register onResolve for the rule with namespace', ruleMeta.namespace);

  if (ruleMeta.test instanceof RegExp) {
    log(ruleMeta.namespace, 'is regexp rule');

    // we do not register 'file' namespace here, because the root file won't be processed
    build.onResolve({ filter: ruleMeta.test }, buildResolveCallback(ruleMeta));
    return;
  }

  // if (typeof ruleMeta.test === 'string') {
  //   log(ruleMeta.namespace, 'is string rule');
  //
  //   // TODO: do we need ^ & $ here?
  //   const re = new RegExp(`^${escapeRegExp(ruleMeta.test)}$`);
  //
  //   build.onResolve({ filter: re }, buildResolveCallback(ruleMeta));
  //   return;
  // }

  throw new Error('\'test\' property of webpack rules should be RegExp. Other types are not supported yet.\'');
  // console.warn('`test` property of webpack rules should be RegExp. Other types make ESBuild slower. Read more: https://esbuild.github.io/plugins/#filters');
}

function buildResolveCallback(ruleMeta) {
  log('Build onResolve callback for rule with namespace', ruleMeta.namespace);

  return args => {
    log('Run onResolve callback for file', args.path, 'with namespace', ruleMeta.namespace);

    if (args.path.includes('!')) {
      throw new Error(`Can not load '${args.path}'. Inline loaders are not supported yet.`);
    }

    return {
      path: path.resolve(args.resolveDir, args.path),
      namespace: ruleMeta.namespace,
    };
  };
}

function registerRuleOnLoad(ruleMeta, build) {
  log('Register onLoad for the rule with namespace', ruleMeta.namespace);

  build.onLoad({ filter: /.*/, namespace: ruleMeta.namespace }, async (args) => new Promise(resolve => {
    log('Run loaders for', args.path, 'using rule with namespace', ruleMeta.namespace);

    runLoaders({
      resource: args.path,
      loaders: ruleMeta.use,
    }, (err, res) => {
      if (err) {
        log('Error occurred while running loaders for', args.path, 'using rule with namespace', ruleMeta.namespace);

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

      log('Complete running loaders for', args.path, 'using rule with namespace', ruleMeta.namespace);

      return resolve({
        // TODO: https://github.com/webpack/loader-runner
        //  according to the doc result should be Buffer or String, but it's an array with String inside. why?
        contents: res.result[0],
        resolveDir: path.dirname(args.path),
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
