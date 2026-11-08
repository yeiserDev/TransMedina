const fs = require('node:fs');
const path = require('node:path');
const source = path.dirname(require.resolve('pdfjs-dist/package.json'));
for (const folder of ['standard_fonts', 'cmaps']) {
  const destination = path.join(process.cwd(), 'public', 'pdfjs', folder);
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(path.join(source, folder), destination, { recursive: true });
}
console.log('PDF preview fonts and character maps prepared.');
