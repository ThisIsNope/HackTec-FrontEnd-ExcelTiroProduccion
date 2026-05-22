const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/private', express.static(path.join(__dirname, 'private')));
app.use(express.json());

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
