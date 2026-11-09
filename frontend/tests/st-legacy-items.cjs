'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/app/kepegawaian/surat-tugas/_lib/untuk-helpers.ts');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { parseLetterItems, buildOrderedAdditionalUntukItems } = loaded.exports;
assert.deepEqual(parseLetterItems('  Dummy A ; Dummy B '), [{ id: '0', text: 'Dummy A' }, { id: '1', text: 'Dummy B' }]);
assert.deepEqual(parseLetterItems('[null,{"id":"valid","text":" Dummy legal clause "},{"text":{"dummy":"shape"}},"Dummy copy"]'),
  [{ id: 'valid', text: 'Dummy legal clause' }, { id: '3', text: 'Dummy copy' }]);
for (const input of [null, undefined, false, 3, { dummy: 'shape' }, [null, false, { text: {} }, { text: 3 }]]) {
  assert.deepEqual(parseLetterItems(input), []);
}
assert.deepEqual(parseLetterItems([{ id: {}, text: 'Dummy id fallback' }]), [{ id: '0', text: 'Dummy id fallback' }]);
const ordered = buildOrderedAdditionalUntukItems({ customTemplateItems: [null, { text: {} }, { id: 'valid', text: 'Dummy supplemental clause' }], sertakanLaporan: false });
assert.deepEqual(ordered, [{ id: 'valid', text: 'Dummy supplemental clause' }]);
console.log('PASS: actual ST list reader preserves legacy text/IDs and drops malformed children across preview, Builder and ordered clauses.');
