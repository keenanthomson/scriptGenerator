const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const port = 3001;
const scriptGenerator = require('./scriptGenerator/scriptGenerator.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('./client/dist'));

app.post('/api/renderfile', (req, res) => {

  scriptGenerator(req.body, () => {
    fs.readFile(path.join(__dirname, '/scriptGenerator/testing.sql'), (err, data) => {
    if (err) {
      console.log(`Readfile error: `, err)
    } else {
      res.send(data);
      console.log(`data sent @ ${Date.now()}`)
    };
    })
  })

});

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});