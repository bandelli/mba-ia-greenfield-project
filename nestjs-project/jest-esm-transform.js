// Jest transformer for ESM-only .mjs files pulled in transitively by
// @tus/server / @tus/s3-store (e.g. the `srvx` package). TypeScript's
// compiler unconditionally treats `.mjs` as ESM regardless of the `module`
// compiler option (impliedNodeFormat is extension-driven), so ts-jest can
// never downlevel these files. Babel has no such extension restriction.
const babel = require('@babel/core');

module.exports = {
  process(sourceText, sourcePath) {
    const result = babel.transform(sourceText, {
      filename: sourcePath,
      babelrc: false,
      configFile: false,
      sourceType: 'module',
      plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
    return { code: result.code };
  },
};
