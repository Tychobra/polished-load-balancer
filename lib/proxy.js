import { createProxyMiddleware } from 'http-proxy-middleware';
import {v4 as uuid} from 'uuid';

import { LoadBalancer } from './loadBalancer.js';


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
  }
}
  
  





let shinyApps = null


/**
* Create a new PolishedProxy object from a configuration object.
* @param {*} config 
*/
const plb = async (config) => {

  
  // initialize the shiny apps load balancer
  shinyApps = new LoadBalancer(config);
  
  // Do we even need this??
  const sessionMiddleware = async (req, res, next) => {
    if (req.shinyAppSession) {
      next()
    } else {
      
      req = await findSession(shinyApps, req);
      
      if (req.shinyAppSession) {
        next()
      } else {
        throw new Error("unable to find session")
      }
    }  
  }
  
  
  const opts_out = {
    ...proxyOptions,
    router: async (req) => {
      
      const hold = req.shinyAppSession
      let url_out = null
        
      if (hold) {
        url_out = hold.proxyUrl
      } else {
        req = await findSession(shinyApps, req)
        url_out = req.shinyAppSession.proxyUrl
      }
        
      
      return url_out 
    }
  }

  await shinyApps.startInstance(uuid())
    
  let wsProxy = createProxyMiddleware(opts_out)      
    
  return [sessionMiddleware, wsProxy]
}

export {
  shinyApps
}

export default plb;


