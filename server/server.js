const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = 3001;
const scriptGenerator = require('./scriptGenerator/scriptGenerator.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('./client/dist'));

app.post('/api/renderfile', async (req, res) => {

  console.log(req.body.platforms)

  await scriptGenerator(req.body);

  // res.download(path.join(__dirname, '/testing.sql'));

  await res.send("Server here!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});