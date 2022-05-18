import { createProxyMiddleware } from 'http-proxy-middleware';
import {v4 as uuid} from 'uuid';

import { ShinyApp } from './shinyapp.js';


/** Class managing Shiny apps instances */

        
// initialize the shiny app
const proxy = (config) => {
  console.log("config: ", config)
  let shinyApp = new ShinyApp(config)
    
  const findSession = async (req) => {
          
    if (Object.keys(shinyApp.instances).length === 0) {
    // start the first shiny app instance
      await shinyApp.startInstance(uuid());
    } 
      
    let session = null;
    if (req.headers && req.headers.cookie) {
      let cookies = parseCookies(req.headers.cookie);
            
      session = await shinyApp.getSession(cookies.SHINYAPP_SESSION);
    } else {
      session = await shinyApp.addSession();
    }
      
    req.shinyAppSession = session;
            
    return req
  }

  const routerMiddleware = async (req, res, next) => {
    
    if (req.shinyAppSession) {
      next()
    } else {
      req = await findSession(req);
      if (req.shinyAppSession) {
        next()
      } else { 
        res.status(404).end('The page you requested cannot be found.');
      }
    }  
  }

  const proxyOptions = {
    target: 'http://localhost:3001',
    changeOrigin: true,
    ws: true
  }

  proxyOptions.router = async (req) => {
    const hold = req.shinyAppSession
    let url_out = null
        
    if (hold) {
      url_out = hold.proxyUrl
    } else {
      url_out = await findSession(req)
      url_out = url_out.proxyUrl
    }
        
    return url_out
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
          
  let wsProxy = createProxyMiddleware(proxyOptions)      
  let middleware = [routerMiddleware, wsProxy]

  return middleware
}
/** 
* Parse a cookies string into an object.
*/
const parseCookies = (str) => {
  return str.split(';').map(e => e.split('=')).reduce((a, e) => ({
    ...a,
    [decodeURIComponent(e[0].trim())]: decodeURIComponent(e[1].trim())
  }), {});
}


export default proxy;
