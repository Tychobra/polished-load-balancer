import express from 'express';
import proxy from '../../../index.js';

const polishedProxy = proxy({
  RscriptPath: "R",
  appDir: '../shiny_app',
  maxSessions: 5
});

const app = express();

app.use(polishedProxy);

app.listen(8080);
