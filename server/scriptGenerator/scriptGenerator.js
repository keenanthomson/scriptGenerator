const writeVariables = require('./writeVariables.js');
const writeMbScript = require('./writeMbScript.js');

async function scriptGenerator(data) {

  await writeVariables(data);
  await writeMbScript()

};

module.exports = scriptGenerator;