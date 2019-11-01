const express = require('express');
const app = express();
const port = 3001;
const bodyParser = require('body-parser');
// const fs = require('fs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('./client/dist'));

app.post('/api/renderfile', async (req, res) => {

  // await fs.writeFile(temp.sql, req.body, (err) => {
  //   if (err) {
  //     console.log(`writeFile error: ${err}`);
  //   };
  // });
  console.log(`REQUEST BODY -> `, req.body);
  await res.send("Server here!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});