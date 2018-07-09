# API Examples

## Circular
Get all circular dependencies detected while requiring a module

```js
const detect = require('../../index');

detect.circular({
  callback(err, results) {
    console.log('results', results);
  },
});

const myModule = require('../always-empty/a');
```

```
results [ { file: '../always-empty/a',
    stack: [ '../always-empty/a', '../always-empty/b' ],
    exportsNotIdentical: true,
    hasIncompleteExports: true,
    causingProblems: true } ]
```
Each item has some properties which used to filter the results to be used in another functions

.problems() uses .causingProblems == true

.alwaysEmptyExports uses .exportsNotIdentical == true

.emptySyncAccess uses .hasIncompleteExports == true

.emptySyncAccess uses .missingProperty != undefined
