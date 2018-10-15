const detectCircularDeps = require('../../index');

describe('Circular Dependencies Issues', () => {
  it('Should not cause a problem', (done) => {
    detectCircularDeps.problems({
      callback(err, results) {
        if (err) {
          throw err;
        }
        if (results[0]) {
          throw new Error(results[0].message);
        }
        done();
        process.exit();
      },
    });
    require('../always-empty/a');
  });
  it('Should not cause a problem', (done) => {
    detectCircularDeps.problems({
      callback(err, results) {
        if (err) {
          throw err;
        }
        if (results[0]) {
          throw new Error(results[0].message);
        }
        done();
        process.exit();
      },
    });
    require('../always-empty/a.solved');
  });
});
