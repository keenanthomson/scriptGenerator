const express = require('express');
const app = express();
const port = 3001;

app.use(express.static('./client/dist'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});