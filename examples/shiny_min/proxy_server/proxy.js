import express from 'express';
import PolishedProxy from '../../../index.js';

const polishedProxy = new PolishedProxy({
  RscriptPath: "R",
  appDir: '../shiny_app',
  maxSessions: 1
});

const app = express();

app.use(polishedProxy.middleware);

app.listen(8080);
