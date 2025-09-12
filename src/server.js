const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();


const authRoutes = require('./auth');
const courseRoutes = require('./courses');


const app = express();
app.use(cors());
app.use(bodyParser.json());


app.use('/routes/auth', authRoutes);
app.use('/routes/courses', courseRoutes);


const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));