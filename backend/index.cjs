// A single CommonJS bundle avoids relying on package.json ESM scopes after
// Vercel collects/relocates the function's files.
module.exports = require("./dist/vercel/index.cjs");
