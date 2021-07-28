const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.get('/', (req, res) => {
	res.send('Hello Express app');
});

app.get('/api/echo/:param*', (req, res) => {
	res.send(req.params.param);
});

app.get('/api/echodbl/:param1/:param2', (req, res) => {
	res.send(req.params.param1 + ', ' + req.params.param2);
});

app.get('/api/echoquery/*', (req, res) => {
	res.send(req.query.q);
});

app.get('/api', (req, res) => {
	res.send('API is ACTIVE');
});

app.listen(3000, () => console.log('server started'));