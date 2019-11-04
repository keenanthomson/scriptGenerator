const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = 3001;
const scriptGenerator = require('./scriptGenerator.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('./client/dist'));

app.post('/api/renderfile', async (req, res) => {

  await scriptGenerator(req.body);

  // await fs.writeFile(temp.sql, req.body, (err) => {
  //   if (err) {
  //     console.log(`writeFile error: ${err}`);
  //   };
  // });

  // res.download(path.join(__dirname, '/testing.sql'));

  // console.log(`REQUEST BODY -> `, req.body);
  await res.send("Server here!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});