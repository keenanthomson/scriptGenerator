const writeScript1 = require('./writeScript1.js');
const writeScript2 = require('./writeScript2.js');

function generateScripts(data)  {
  return new Promise(async(resolve, reject) => {
    let resObj = {};
    resObj.script1 = await writeScript1(data);
    resObj.script2 = await writeScript2(data);
    resolve(resObj);
  });
};

module.exports = generateScripts;