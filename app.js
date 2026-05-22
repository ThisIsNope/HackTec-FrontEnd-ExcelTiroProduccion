const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to serve static files
app.use(express.static(__dirname));
app.use(express.json());

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});