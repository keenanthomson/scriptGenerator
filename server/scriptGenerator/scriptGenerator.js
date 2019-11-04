const writeVariables = require('./writeVariables.js')

function scriptGenerator(data) {

  writeVariables(data);

};

module.exports = scriptGenerator;