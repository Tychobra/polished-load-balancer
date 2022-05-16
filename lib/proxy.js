import { createProxyMiddleware } from 'http-proxy-middleware';
import {v4 as uuid} from 'uuid';

import { ShinyApp } from './shinyapp.js';


/** Class managing Shiny apps instances */
class PolishedProxy {
  /**
  * Create a new ShinyProxy object from a configuration object.
  * @param {*} config 
  */
  constructor (config) {
        
    // initialize the shiny app
    this.shinyApp = new ShinyApp(config);
    
    // start the first shiny app instance
    this.shinyApp.startInstance(uuid());
        
    this.findSession = async (req) => {
            
      let app = this.shinyApp;
            
      
      let session = null;
      if (req.headers && req.headers.cookie) {
        let cookies = ShinyProxy.parseCookies(req.headers.cookie);
            
        session = await app.getSession(cookies.SHINYAPP_SESSION);
      } else {
        session = await app.getSession();
      }
      
      req.shinyAppSession = session;
            
      return req
    }

    const routerMiddleware = async (req, res, next) => {
      const session = await this.findSession(req);
      
      if (session) {
        next();
      } else {
        if (config.redirect404) {
          res.redirect(config.redirect404);
        } else {
          res.status(404).end('The page you requested cannot be found.');
        }
      }
    }

    const proxyOptions = {
      target: 'http://0.0.0.0:3001',
      changeOrigin: true,
      ws: true//,
      //followRedirects: true,
		  //secure: true        
    }

    proxyOptions.router = (req) => { 
                      
      return req.shinyAppSession.proxyUrl;
    }
    
    proxyOptions.onError = (err, req, res) => {
            
      console.log(err)
      if (res.writeHead) {
        res.writeHead(500, {
          'Content-Type': 'text/plain'
        }).end('An error occured.');
      }
    }

    proxyOptions.onProxyRes = (proxyRes, req, res) => {
      if (req.shinyAppSession) {
        proxyRes.headers['Set-Cookie'] = [`SHINYAPP_SESSION=${req.shinyAppSession.sessionId}`];
      }
    }

    proxyOptions.onProxyReqWs = (proxyReq, req, socket, options, head) => {
      if (req.shinyAppSession) {
        //console.log("session: ", req.shinyAppSession)
        //socket.on('close', () => req.shinyAppSession.closeSession());    
      }
    }
        
    this.wsProxy = createProxyMiddleware(proxyOptions);      
    this.middleware = [routerMiddleware, this.wsProxy];
  }

  /** 
  * Parse a cookies string into an object.
  */
  static parseCookies(str) {
    return str.split(';').map(e => e.split('=')).reduce((a, e) => ({
      ...a,
      [decodeURIComponent(e[0].trim())]: decodeURIComponent(e[1].trim())
    }), {});
  }

}

export default PolishedProxy;
