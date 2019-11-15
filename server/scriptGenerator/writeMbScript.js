const path = require('path');
const fs = require('fs');

function writeMbScript(cb) {
  fs.readFile(path.join(__dirname, '/scriptText/MbScriptBody.sql'), (err, data) => {
    if (err) console.log(`readFile error: `, err);
    fs.appendFile(path.join(__dirname, '/testing.sql'), data, err => {
      if (err) console.log(`appendFile error: `, err);
      else cb();
    });
  });
};

module.exports = writeMbScript;