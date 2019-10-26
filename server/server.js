const express = require('express');
const app = express();
const port = 3001;
// const fs = require('fs');

// START HERE -> take in data from client -> write file with fs -> download file to client

app.use(express.static('./client/dist'));

app.post('/api/renderfile', async (req, res) => {

  // await fs.writeFile(temp.sql, req.body, (err) => {
  //   if (err) {
  //     console.log(`writeFile error: ${err}`);
  //   };
  // });
  console.log(req.body);
  res.send("Server here!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});