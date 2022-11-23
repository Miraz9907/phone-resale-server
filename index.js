const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

//middlewar
app.use(cors())
app.use(express.json());