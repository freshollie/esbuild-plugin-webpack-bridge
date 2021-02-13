const path = require('path');
const fs = require('fs');
const assert = require('assert');

const esbuild = require('esbuild');

const bridgePlugin = require('..');

const resolveFixture = (...x) => path.resolve(__dirname, 'fixtures', ...x);

describe('Main tests', () => {
  it('should work with loader whose test defined as regexp', done => {
    const folder = 'regexp';
    const output = readFixture(folder, 'output.js');

    esbuild.build({
      entryPoints: [resolveFixture(folder, 'input.js')],
      nodePaths: [resolveFixture(folder)],
      write: false,
      minify: true,
      bundle: true,
      plugins: [
        bridgePlugin({
          output: {
            path: 'outdir',
          },
          module: {
            rules: [
              {
                test: /\.js$/,
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
            ],
          },
        }),
      ],
    })
      .then(res => {
        assert.strictEqual(output.compare(res.outputFiles[0].contents), 0);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should work with several files imported one into another', done => {
    const folder = 'imports';
    const output = readFixture(folder, 'output.js');

    esbuild.build({
      entryPoints: [resolveFixture(folder, 'input.js')],
      nodePaths: [resolveFixture(folder)],
      write: false,
      minify: true,
      bundle: true,
      plugins: [
        bridgePlugin({
          output: {
            path: 'outdir',
          },
          module: {
            rules: [
              {
                test: /\.js$/,
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
            ],
          },
        }),
      ],
    })
      .then(res => {
        assert.strictEqual(output.compare(res.outputFiles[0].contents), 0);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should work with nested modules paths', done => {
    const folder = 'nested-modules-paths';
    const output = readFixture(folder, 'output.js');

    esbuild.build({
      entryPoints: [resolveFixture(folder, 'input.js')],
      nodePaths: [resolveFixture(folder)],
      write: false,
      minify: true,
      bundle: true,
      plugins: [
        bridgePlugin({
          output: {
            path: 'outdir',
          },
          module: {
            rules: [
              {
                test: /\.js$/,
                esbuildLoader: 'js',
                use: [
                  {
                    loader: 'babel-loader',
                  },
                ],
              },
            ],
          },
        }),
      ],
    })
      .then(res => {
        assert.strictEqual(output.compare(res.outputFiles[0].contents), 0);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should work with rule.loader property', done => {
    const folder = 'loader-property';
    const output = readFixture(folder, 'output.js');

    esbuild.build({
      entryPoints: [resolveFixture(folder, 'input.js')],
      nodePaths: [resolveFixture(folder)],
      write: false,
      minify: true,
      bundle: true,
      plugins: [
        bridgePlugin({
          output: {
            path: 'outdir',
          },
          module: {
            rules: [
              {
                test: /\.js$/,
                esbuildLoader: 'js',
                loader: 'babel-loader',
              },
            ],
          },
        }),
      ],
    })
      .then(res => {
        assert.strictEqual(output.compare(res.outputFiles[0].contents), 0);
        done();
      })
      .catch(err => {
        done(err);
      });
  });
});

describe('Loaders', () => {
  it('should work with sass-loader', done => {
    const folder = 'sass-loader';
    const outputJS = readFixture(folder, 'output.js');
    const outputCSS = readFixture(folder, 'output.css');

    esbuild.build({
      entryPoints: [resolveFixture(folder, 'input.js')],
      nodePaths: [resolveFixture(folder)],
      write: false,
      minify: true,
      bundle: true,
      outdir: 'outdir',
      plugins: [
        bridgePlugin({
          output: {
            path: 'outdir',
          },
          module: {
            rules: [
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
      .then(res => {
        assert.strictEqual(outputJS.compare(res.outputFiles[0].contents), 0);
        assert.strictEqual(outputCSS.compare(res.outputFiles[1].contents), 0);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should work with postcss-loader', done => {
    const folder = 'postcss-loader';
    const outputJS = readFixture(folder, 'output.js');
    const outputCSS = readFixture(folder, 'output.css');

    esbuild.build({
      entryPoints: [resolveFixture(folder, 'input.js')],
      nodePaths: [resolveFixture(folder)],
      write: false,
      minify: true,
      bundle: true,
      outdir: 'outdir',
      plugins: [
        bridgePlugin({
          output: {
            path: 'outdir',
          },
          module: {
            rules: [
              {
                test: /\.css$/,
                esbuildLoader: 'css',
                use: [
                  {
                    loader: 'postcss-loader',
                    options: {
                      postcssOptions: {
                        plugins: [
                          require('autoprefixer')({
                            overrideBrowserslist: ['> 1%', 'android >= 4.4.4', 'ios >= 9'],
                          }),
                        ],
                      },
                    },
                  },
                ],
              },
            ],
          },
        }),
      ],
    })
      .then(res => {
        assert.strictEqual(outputJS.compare(res.outputFiles[0].contents), 0);
        assert.strictEqual(outputCSS.compare(res.outputFiles[1].contents), 0);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it.only('should work with file-loader', done => {
    const folder = 'file-loader';
    const outputJS = readFixture(folder, 'output.js');
    const outputCSS = readFixture(folder, 'output.css');
    const outputJPEG = readFixture(folder, 'bg.jpg');
    const outputTXT = readFixture(folder, 'robots.txt');

    esbuild.build({
      entryPoints: [resolveFixture(folder, 'input.js')],
      nodePaths: [resolveFixture(folder)],
      write: false,
      minify: true,
      bundle: true,
      outdir: 'outdir',
      plugins: [
        bridgePlugin({
          output: {
            path: 'outdir',
          },
          module: {
            rules: [
              {
                test: /\.(jpg|txt)$/,
                esbuildLoader: 'js',
                loader: 'file-loader',
              },
            ],
          },
        }),
      ],
    })
      .then(res => {
        console.log(res.outputFiles.map(x => x.text))
        assert.strictEqual(outputTXT.compare(res.outputFiles[0].contents), 0);
        assert.strictEqual(outputJS.compare(res.outputFiles[1].contents), 0);
        assert.strictEqual(outputJPEG.compare(res.outputFiles[2].contents), 0);
        assert.strictEqual(outputCSS.compare(res.outputFiles[3].contents), 0);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  // TODO: add test for resolve.modules
});

function readFixture(...pathParts) {
  return fs.readFileSync(resolveFixture(...pathParts));
}
