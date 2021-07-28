import {addRoutes} from "./routeManager.js";
import express from 'express'
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

addRoutes(app)

app.listen(3000, () => console.log('server started'));