const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const developmentCSP = `default-src 'self'; upgrade-insecure-requests; script-src 'self'; style-src 'self'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*; media-src 'self'; object-src 'none'; child-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`;

const productionCSP  = `default-src 'self'; upgrade-insecure-requests; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; child-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`;

const csp = isProduction ? productionCSP : developmentCSP;

const templatePath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(templatePath, 'utf8');

html = html.replace(
  /content="[^"]*"/,
  `content="${csp}"`
);

fs.writeFileSync(templatePath, html);
console.log(`CSP updated for ${isProduction ? 'production' : 'development'}`);