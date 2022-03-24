import express from 'express';
import ShinyProxy from '../../../index.js';

const shinyProxy = new ShinyProxy({
  RscriptPath: "R",
  appDir: '../shiny_app',
  maxConnections: 10
});

const app = express();

app.use(shinyProxy.middleware);

app.listen(8080);
