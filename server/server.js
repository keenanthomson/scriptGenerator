const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const port = 3001;
const writeScript1 = require('./scriptGenerator/writeScript1.js');
const writeScript2 = require('./scriptGenerator/writeScript2.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('./client/dist'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});

app.post('/api/renderscripts', async (req, res) => {
  await writeScript1(req.body);
  // await writeScript2(req.body);
  let resObj = {};
  console.log(`AFTER SUCCESS?`)
  fs.readFile(path.join(__dirname, '/scriptGenerator/script1.sql'), (err, data) => {
    if (err) {
      console.log(`Readfile error: `, err);
    } else {
      resObj['script1'] = `${data}`;
    };
  });
  // fs.readFile(path.join(__dirname, './scriptGenerator/scrip2.sql'), (err, data) => {
  //   if (err) {
  //     console.log(`Readfile error: `, err);
  //   } else {
  //     resObj['script2'] = `${data}`;
  //   };
  // });
  res.send(resObj);
});