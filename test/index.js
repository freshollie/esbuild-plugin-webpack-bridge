const path = require('path');
const fs = require('fs');
const assert = require('assert');

const esbuild = require('esbuild');

const bridgePlugin = require('..');

const resolvePath = x => path.resolve(__dirname, x);

describe('Main tests', () => {
  it('should work with regexp', done => {
    const output = fs.readFileSync(resolvePath('fixtures/regexp/output.js'), 'utf-8');

    esbuild.build({
      entryPoints: [resolvePath('fixtures/regexp/input.js')],
      write: false,
      minify: true,
      bundle: true,
      plugins: [
        bridgePlugin({
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
        }),
      ],
    })
      .then(res => {
        done(assert.deepStrictEqual(res.outputFiles[0].text, output));
      })
      .catch(err => {
        done(err);
      });
  });
});
