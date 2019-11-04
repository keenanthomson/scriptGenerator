const writeVariables = require('./writeVariables.js')

async function scriptGenerator(data) {

  await writeVariables(data);

};

module.exports = scriptGenerator;