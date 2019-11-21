const writeVariableData = require('./writeVariables.js');
const writeMbScript = require('./writeMbScript.js');

function scriptGenerator(data, cb) {

  writeVariableData(data)
  writeMbScript(() => {
    cb();
  });

};

module.exports = scriptGenerator;