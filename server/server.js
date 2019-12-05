const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = process.env.PORT || 3001;
const generateScripts = require('./scriptGenerator/generateScripts.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('./client/dist'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});

app.post('/api/renderscripts', (req, res) => {
  generateScripts(req.body)
  .then(data => {
    res.send(data);
  });
});