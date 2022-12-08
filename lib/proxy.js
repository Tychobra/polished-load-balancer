import { createProxyMiddleware } from 'http-proxy-middleware';
import {v4 as uuid} from 'uuid';

import { ShinyApp } from './shinyapp.js';


/** 
* Parse a cookies string into an object.
*/
const parseCookies = (str) => {
  return str.split(';').map(e => e.split('=')).reduce((a, e) => ({
    ...a,
    [decodeURIComponent(e[0].trim())]: decodeURIComponent(e[1].trim())
  }), {})
}


const findSession = async (app, req) => { 
  
  let session = null;
  if (req.headers && req.headers.cookie) {
    let cookies = parseCookies(req.headers.cookie);
    
    if (app.sessions[cookies.SHINYAPP_SESSION]) {
      session = app.getSession(cookies.SHINYAPP_SESSION)
    } else {
      session = await app.addSession()
    }
    
  } else {
    session = await app.addSession();
  }
  
  req.shinyAppSession = session;
        
  return req
}

const proxyOptions = {
  target: 'http://127.0.0.1:8888',
  changeOrigin: true,
  ws: true,
  
  onError: (err, req, res) => {
          
    console.log(err)
    if (res.writeHead) {
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      }).end(err.message);
    }
  },
  
  onProxyRes: (proxyRes, req, res) => {
    //const cookies = parseCookies(req.headers.cookie)
      
    if (req.shinyAppSession && req.path === "/") {
      proxyRes.headers['Set-Cookie'] = [`SHINYAPP_SESSION=${req.shinyAppSession.sessionId}`];
    }
  },

  onProxyReqWs: (proxyReq, req, socket, options, head) => {
  
    //console.log("close event", socket._events.close)
    if (req.shinyAppSession) {
      
      socket.on('close', () => {
        console.log("socket closed")
        req.shinyAppSession.closeSession()
      })    
    }
  },

  //onOpen = (proxySocket) => {
  //socket.headers['Set-Cookie'] = [`SHINYAPP_SESSION=${req.shinyAppSession.sessionId}`];
  //}
  //onOpen: (proxySocket) => {
  //  console.log("proxy opened")
  //  //socket.headers['Set-Cookie'] = [`SHINYAPP_SESSION=${req.shinyAppSession.sessionId}`];
  //},
  //onClose: (proxySocket) => {
  //  console.log("proxy closed")
  //
  //  //socket.headers['Set-Cookie'] = [`SHINYAPP_SESSION=${req.shinyAppSession.sessionId}`];
  //}
}
  
  








/**
* Create a new PolishedProxy object from a configuration object.
* @param {*} config 
*/
const polishedProxy = (config) => {

  // initialize the shiny app
  let shinyApp = new ShinyApp(config);

  const routerMiddleware = async (req, res, next) => {
    if (req.shinyAppSession) {
      next()
    } else {
      
      req = await findSession(shinyApp, req);
      
      if (req.shinyAppSession) {
        next()
      } else {
        if (config.redirect404) {
          res.redirect(config.redirect404);
        } else {
          res.status(404).end('The page you requested cannot be found.');
        }
      }
    }  
  }
  
  // TODO: reenable this
  const opts_out = {
    ...proxyOptions,
    router: async (req) => {
      
      const hold = req.shinyAppSession
      let url_out = null
        
      if (hold) {
        url_out = hold.proxyUrl
      } else {
        req = await findSession(shinyApp, req)
        url_out = req.shinyAppSession.proxyUrl
      }
        
      
      return url_out 
    }
  }

  return shinyApp.startInstance(uuid()).then(status => {
    
    let wsProxy = createProxyMiddleware(opts_out)      
    
    return [routerMiddleware, wsProxy]
  })
  

  //let middleware = [wsProxy]

  //return wsProxy//middleware
}

export default polishedProxy;
