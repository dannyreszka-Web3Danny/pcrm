# How to Edit the Files Programmatically

All JSX files (comp_*.js, tab_*.js, app.js) use the same JSON-encoding pattern:
```
window.__pcrmXxx = "JSON-encoded JSX content";
```

## Decode / Encode Pattern (Node.js)

```js
const fs = require('fs');

function decodeFile(filename, globalName) {
  const raw = fs.readFileSync(filename, 'utf8');
  const prefix = 'window.' + globalName + ' = "';
  const inner = raw.slice(prefix.length, -3); // strip prefix + closing ";\n
  return JSON.parse('"' + inner + '"');
}

function encodeFile(filename, globalName, decoded) {
  const encoded = JSON.stringify(decoded).slice(1, -1); // strip outer quotes
  fs.writeFileSync(filename, 'window.' + globalName + ' = "' + encoded + '";\n');
}
```

## File → Global Name Map

| File | Global |
|------|--------|
| `comp_core.js` | `__pcrmCore` |
| `comp_panels.js` | `__pcrmPanels` |
| `comp_ai.js` | `__pcrmAI` |
| `comp_features.js` | `__pcrmFeatures` |
| `tab_leads.js` | `__pcrmTabLeads` |
| `tab_outreach.js` | `__pcrmTabOutreach` |
| `tab_other.js` | `__pcrmTabOther` |
| `app.js` | `__pcrmApp` |

## Adding a New Component (comp_features.js)

1. Decode `comp_features.js`
2. Find the line `window.__C={...` (it's the last line)
3. Insert your new component function(s) ABOVE that line
4. Add the new component name to the `window.__C` object: `NewComp:typeof NewComp!=="undefined"?NewComp:null`
5. Re-encode and write

**Example:**
```js
const decoded = decodeFile('comp_features.js', '__pcrmFeatures');
// Find window.__C line
const cIdx = decoded.lastIndexOf('\nwindow.__C=');
const newComp = '\nfunction MyNewComp(props) { return <div>hello</div>; }';
const newExport = ',MyNewComp:typeof MyNewComp!=="undefined"?MyNewComp:null';
// Insert component before window.__C, add to exports
let updated = decoded.slice(0, cIdx) + newComp + decoded.slice(cIdx);
updated = updated.replace('};', newExport + '};');  // add to __C object
encodeFile('comp_features.js', '__pcrmFeatures', updated);
```

## Editing constants / services

These are plain JS — edit directly (Read → Edit tools), no JSON encoding needed.

## Validate Sizes

```js
function validateSizes() {
  const pass1 = ['comp_core','comp_panels','comp_ai','comp_features']
    .reduce((s, n) => s + decodeFile(n+'.js', '__pcrm'+n.split('_').map(w=>w[0].toUpperCase()+w.slice(1)).join('')).length, 0);
  const pass2 = ['tab_leads','tab_outreach','tab_other','app']
    .reduce((s, n) => s + decodeFile(n+'.js', n==='app'?'__pcrmApp':'__pcrmTab'+n.split('_')[1][0].toUpperCase()+n.split('_')[1].slice(1)).length, 0);
  console.log('Pass 1:', pass1, pass1 < 500000 ? 'OK' : 'OVER LIMIT');
  console.log('Pass 2:', pass2, pass2 < 500000 ? 'OK' : 'OVER LIMIT');
}
```

## Key Gotchas
- No backticks in JSX (break JSON encoding) — use `"str " + var` concatenation
- No literal `\n` inside string values — use `\\n`
- Always validate brace depth == 0 after edits
- After adding component to `comp_features.js`, also add to `window.__C` object AND update the `var inj=` line in `index.html` loader
