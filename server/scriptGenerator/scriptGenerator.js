const writeVariables = require('./writeVariables.js');
const writeMbScript = require('./writeMbScript.js');

function scriptGenerator(data, cb) {

    writeVariables(data)
    writeMbScript(() => {
      cb();
    });

};

module.exports = scriptGenerator;