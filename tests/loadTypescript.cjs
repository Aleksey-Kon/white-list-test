/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Test the actual TypeScript modules with native boundaries mocked, without a device runtime.
exports.loadTypescript = function loadTypescript(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  const requireMock = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.')) {
      return loadTypescript(path.relative(path.resolve(__dirname, '..'),
        path.resolve(path.dirname(filename), name + '.ts')), mocks);
    }
    throw new Error('Unexpected unmocked import: ' + name);
  };
  new Function('require', 'module', 'exports', source)(requireMock, module, module.exports);
  return module.exports;
};
