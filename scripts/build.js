const fs = require('fs');
const { execFileSync } = require('child_process');

const version = process.env.VERSION || 'local';
const out = `dist/movie-collection-${version}.tar.gz`;
const files = ['app.js', 'db.js', 'server.js', 'public', 'package.json', 'package-lock.json'];

fs.mkdirSync('dist', { recursive: true });
execFileSync('tar', ['-czf', out, ...files], { stdio: 'inherit' });
console.log(`Built ${out}`);