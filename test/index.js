const path = require('path');
const fs = require('fs');
const assert = require('assert');

const esbuild = require('esbuild');

const bridgePlugin = require('..');

const resolveFixture = (...x) => path.resolve(__dirname, 'fixtures', ...x);

describe('Main tests', () => {
  it('should work with regexp', done => {
    runTest(
      'regexp',
      done,
      {
        module: {
          rules: [
            {
              test: /\.js$/,
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
      },
    );
  });

  it('should work with imports', done => {
    runTest(
      'imports',
      done,
      {
        module: {
          rules: [
            {
              test: /\.js$/,
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
      },
    );
  });
});

function runTest(name, done, pluginSettings) {
  const output = fs.readFileSync(resolveFixture(name, 'output.js'), 'utf-8');

  esbuild.build({
    entryPoints: [resolveFixture(name, 'input.js')],
    nodePaths: [resolveFixture(name)],
    write: false,
    minify: true,
    bundle: true,
    plugins: [
      bridgePlugin(pluginSettings),
    ],
  })
    .then(res => {
      done(assert.deepStrictEqual(res.outputFiles[0].text, output));
    })
    .catch(err => {
      done(err);
    });
}
