const fs = require('fs');
const path = require('path');

const enhancedResolve = require('enhanced-resolve');
const { getOptions } = require('loader-utils');

module.exports = (ruleMeta, loadArgs, loaderOptions) => {
  const context = {
    // sass-loader relies on this method
    // usage: https://github.com/webpack-contrib/sass-loader/blob/58858f577fb89c9d6bcdfd2874230edf332123c0/src/utils.js#L464
    // docs: https://webpack.js.org/api/loaders/#thisgetresolve
    getResolve,

    // postcss-loader relies on this method
    // usage: https://github.com/webpack-contrib/postcss-loader/blob/21008ccc13b55c5b4bc6f8feade47da896099723/src/utils.js#L43
    // docs: https://webpack.js.org/api/loaders/#thisfs
    // TODO: probably it's better to implement the methods used in webpack:
    //  https://github.com/webpack/webpack/blob/master/lib/util/fs.js
    fs,

    // file-loader relies on this property
    // usage: https://github.com/webpack-contrib/file-loader/blob/c423008dce1b16e1253b89b792f03774ffeb47de/src/index.js#L78
    // docs: https://webpack.js.org/api/loaders/#thisrootcontext
    rootContext: loadArgs.path,

    // file-loader relies on this method
    // usage: https://github.com/webpack-contrib/file-loader/blob/c423008dce1b16e1253b89b792f03774ffeb47de/src/index.js#L81
    // docs: https://webpack.js.org/api/loaders/#thisemitfile
    emitFile: emitFile.bind(null, loaderOptions.output.path),
  };

  // postcss-loader relies on this method
  // usage: https://github.com/webpack-contrib/postcss-loader/blob/1d4878171c9b94c9fea61b1b75340674e00be7a4/src/index.js#L31
  // docs: https://webpack.js.org/api/loaders/#thisgetoptionsschema
  // current webpack version of getOptions implements schema check: https://github.com/webpack/webpack/blob/2acc6c48b62fcad91b29b58688a998cf52bf82a0/lib/NormalModule.js#L395
  // while getOptions from loader-utils expects context as a first param: https://github.com/webpack/loader-utils#getoptions
  // so we bind it
  context.getOptions = getOptions.bind(null, context);

  return context;
};


// webpack uses enhanced-resolve to implement this method:
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

// webpack implements this method other way,
// because it has it's register of build assets, etc:
// https://github.com/webpack/webpack/blob/2acc6c48b62fcad91b29b58688a998cf52bf82a0/lib/NormalModule.js#L485
// while we just create the subdirs and write the file
function emitFile(outputPath, name, content) {
  const resolvedPath = path.resolve(outputPath, name);
  const dirname = path.dirname(resolvedPath);

  return fs.promises.mkdir(dirname, { recursive: true })
    .then(() => fs.promises.writeFile(resolvedPath, content));
}
