import express from 'express';
import ShinyProxy from '../../../index.js';

const shinyProxy = new ShinyProxy({
  RscriptPath: "R",
  appDir: '../shiny_app',
  maxSessions: 1
});

const app = express();

app.use(shinyProxy.middleware);

app.listen(3001);
