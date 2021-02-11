const path = require('path');

const { runLoaders } = require('loader-runner');

module.exports = function(options = {}) {
  const { module: { rules = [] } = {} } = options;

  return {
    name: 'webpack-bridge',
    setup(build) {
      for (let i = 0; i < rules.length; i++) {
        const meta = buildRuleMeta(rules[i]);
        registerRuleOnResolve(meta, build);
        registerRuleOnLoad(meta, build);
      }
    }
  };
}

let ruleCounter = 1;
function buildRuleMeta(rule) {
  const supportedRuleProperties = ['test', 'use'];

  if (Object.keys(rule).some(key => !supportedRuleProperties.includes(key))) {
    throw new Error(`Rule properties other than '${supportedRuleProperties.join(', ')}' are not supported yet.`);
  }

  return {
    namespace: `rule-${ruleCounter++}-${rule.test.toString()}`,
    test: rule.test,
    use: rule.use,
  }
}

function registerRuleOnResolve(ruleMeta, build) {
  if (ruleMeta.test instanceof RegExp) {
    build.onResolve({ filter: ruleMeta.test, namespace: 'file' }, buildResolveCallback(ruleMeta));
    return;
  }

  if (typeof ruleMeta.test === 'string') {
    const re = new RegExp(`^${escapeRegExp(ruleMeta.test)}$`);

    build.onResolve({ filter: re, namespace: 'file' }, buildResolveCallback(ruleMeta));
    return;
  }

  throw new Error(`'test' property of webpack rules should be RegExp or string. Other types are not supported yet.`);
  // console.warn('`test` property of webpack rules should be RegExp. Other types make ESBuild slower. Read more: https://esbuild.github.io/plugins/#filters');
}

function buildResolveCallback(ruleMeta) {
  return args => {
    if (args.path.includes('!')) {
      throw new Error(`Can not load '${args.path}'. Inline loaders are not supported yet.`)
    }

    ruleMeta.resolveDir = args.resolveDir; // TODO: make it cleaner?

    return {
      path: path.resolve(args.resolveDir, args.path),
      namespace: ruleMeta.namespace,
    }
  }
}

function registerRuleOnLoad(ruleMeta, build) {
  build.onLoad({ filter: /.*/, namespace: ruleMeta.namespace }, async (args) => {
    return new Promise(resolve => {
      runLoaders({
        resource: args.path,
        loaders: ruleMeta.use,
      }, (err, res) => {
        if (err) {
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

        return resolve({
          // TODO: https://github.com/webpack/loader-runner
          //  according to the doc result should be Buffer or String, but it's an array with String inside. why?
          contents: res.result[0],
          resolveDir: ruleMeta.resolveDir,
        });
      });
    })
  });
}

function escapeRegExp(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
