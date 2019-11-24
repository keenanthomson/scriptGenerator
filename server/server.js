const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const port = 3001;
const writeScript1 = require('./scriptGenerator/writeScript1.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('./client/dist'));

app.post('/api/renderscripts', async (req, res) => {
  await writeScript1(req.body);
  await writeScript2(req.body);
  fs.readFile(path.join(__dirname, '/scriptGenerator/testing.sql'), (err, data) => {
    if (err) {
      console.log(`Readfile error: `, err)
    } else {
      let resObj = {script1: `${data}`};
      res.send(resObj);
    };
  });
});

app.use('/api/renderscript2', (req, res) => {
  res.send(`Request #2 completed.`)
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});