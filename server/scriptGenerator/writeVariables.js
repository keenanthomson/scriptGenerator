const path = require('path');
const fs = require('fs');

function writeVariables(data) {
  console.log(data)
  let testID = data.testID;
  let startDate = formatDate(data.startDate);
  let endDate = formatDate(data.endDate);
  let platforms = data.platforms;

    let scriptVariables = 
`settarget webvertica;
meta SET sessionstartDate between '${startDate}' and '${endDate}';
${testID ? `meta SET testID = (` + testID + `);` : ``}
${platforms ? `meta SET platformID = (` + platforms + `);` : ``}`

  fs.writeFile(path.join(__dirname, '/testing.sql'), scriptVariables, err => {
    if (err) {
      console.log(`Error: `, err);
    };
  });
};

function formatDate(date) {
  let year = date.slice(0, 4);
  let month = date.slice(5, 7);
  let day = date.slice(8, 10);
  return `${year}-${month}-${day}`;
};

module.exports = writeVariables;