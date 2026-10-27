// Vercel loads the JavaScript emitted by `npm run build`, not TypeScript source
// whose NodeNext .js imports only become real files after compilation.
export { default } from "./dist/index.js";
