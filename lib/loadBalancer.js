import { createProxyMiddleware } from 'http-proxy-middleware';
import {v4 as uuid} from 'uuid';

import { ShinyApps } from './shinyApps.js';


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
      
      if (session === null) {
        // session has been deleted because app errored or closed, so create a new session
        session = await app.addSession(cookies.SHINYAPP_SESSION)
      }

    } else {
      session = await app.addSession()
    }
    
  } else {
    session = await app.addSession();
  }
  
  req.shinyAppSession = session;
        
  return req
}

const TIMEOUT = 0

const proxyOptions = {
  target: 'http://127.0.0.1:8888',
  changeOrigin: true,
  ws: true,
  logger: console,
  timout: TIMEOUT,
  proxyTimeout: TIMEOUT,
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
  
    if (req.shinyAppSession) {
      
      socket.on('close', () => {
        console.log("session socket closed")
        req.shinyAppSession.closeSession()
      })    
    }
  },

  onOpen: (proxySocket) => {
    console.log("proxy opened")
  },

  onClose: (res, socket, head) => {
    console.log("proxy closed")
  },
}
  
  





let shinyApps = null





/**
* Create a new PolishedProxy object from a configuration object.
* @param {*} config 
*/
const plb = async (config) => {

  
  // initialize the shiny apps load balancer
  shinyApps = new ShinyApps(config)
  
  
  
  const sessionMiddleware = async (req, res, next) => {
    if (req.shinyAppSession) {
      //shinyApps.requests.push({...req.shinyAppSession, created_at: new Date().getTime()})
      next()
    } else {
      
      req = await findSession(shinyApps, req);
      
      if (req.shinyAppSession) {
        //shinyApps.requests.push({...req.shinyAppSession, created_at: new Date().getTime()})
        next()
      } else {
        throw new Error("unable to find session")
      }
    }  
  }
  
  
  const opts_out = {
    ...proxyOptions,
    router: async (req) => {
      
      let port = null
        
      if (req.shinyAppSession) {
        port = req.shinyAppSession.port
      } else {
        req = await findSession(shinyApps, req)
        port = req.shinyAppSession.port
      }
      if (shinyApps.instances[req.shinyAppSession.instanceId].status === "STARTING") {
        // session is first session on an instance that has not finished starting, so
        // wait for the instance to finish starting
        await Promise.all([shinyApps.instances[req.shinyAppSession.instanceId].promise])
      }  
      
      return `http://127.0.0.1:${port}` 
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


