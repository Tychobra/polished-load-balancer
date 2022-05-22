import express from 'express';
import polishedProxy from '../../../index.js';

const proxyMiddleware = polishedProxy({
  RscriptPath: "R",
  appDir: '../shiny_app',
  maxSessions: 1
});

const app = express();

app.use(proxyMiddleware);

app.listen(8080);

//app.on('upgrade', polishedProxy.middleware.upgrade); 
