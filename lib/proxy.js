import { createProxyMiddleware } from 'http-proxy-middleware';
import {v4 as uuid} from 'uuid';

import { ShinyApp } from './shinyapp.js';
import portsPool from './portspool.js';

/** Class managing Shiny apps instances */
class ShinyProxy {
    /**
     * Create a new ShinyProxy object from a configuration object.
     * @param {*} config 
     */
    constructor (config) {
        //if (config.portRangeStart) portsPool.init(config.portRangeStart, config.portRangeEnd);
        
        // initialize the shiny app
        this.shinyApp = new ShinyApp(config);
        // start the first shiny app instance
        
        //this.shinyApp.startInstance(uuid());
        
        this.findSession = (req) => {
            // find app with home url or SHINYAPP_PATH
            let url = req.url.replace(/^(.+?)\/*?$/, "$1");
            
            // remove query string and/or hash from url, so that we can find the app by path
            // even if the path includes a query string and/or a hash.
            url = url.split(/[?#]/)[0]
            // remove trailing "/"
            if (url !== "/" && url.endsWith("/")) {
              url = url.slice(0, -1) 
            }
            

            let app = this.shinyApp;
            let session = null;
            if (req.headers && req.headers.cookie) {
                let cookies = ShinyProxy.parseCookies(req.headers.cookie);
                console.log("cookies: ", cookies)
                session = app.getSession(cookies.SHINYAPP_SESSION);
            } else {
                session = app.getSession();
            }
            console.log("session: ", session)
            req.shinyAppSession = session;
            
            return req
        };
        const routerMiddleware = (req, res, next) => {
            this.findSession(req);
            if (req.shinyAppSession) {
                next();
            } else {
                if (config.redirect404) {
                    res.redirect(config.redirect404);
                } else {
                    res.status(404).end('The page you requested cannot be found.');
                }
            }
        };
        const proxyOptions = {
            target: 'http://localhost:3001',
            changeOrigin: true,
            ws: true        
        };
        proxyOptions.router = (req) => {
            if (!req.shinyAppSession) this.findSession(req);
            if (req.shinyAppSession) {
                return req.shinyAppSession.proxyUrl;
            }
        };
        //proxyOptions.pathRewrite = this.shinyApps.reduce((a, e) => ({
        //    ...a, 
        //    [`^${e.config.path.replace(/^(.+?)\/*?$/, "$1")}`]: ''
        //}), {});
        proxyOptions.onError = (err, req, res) => {
            if (res.writeHead) {
                res.writeHead(500, {
                    'Content-Type': 'text/plain'
                }).end('An error occured.');
            }
        };
        proxyOptions.onProxyRes = (proxyRes, req, res) => {
            if (req.shinyAppSession) {
                proxyRes.headers['Set-Cookie'] = [`SHINYAPP_SESSION=${req.shinyAppSession.sessionId};Path=/`];
            }
        };
        proxyOptions.onProxyReqWs = (proxyReq, req, socket, options, head) => {
            if (req.shinyAppSession) {
                socket.on('close', () => req.shinyAppSession.closeSession());    
            }
        };
        this.wsProxy = createProxyMiddleware(proxyOptions);
        this.middleware = [routerMiddleware, this.wsProxy];
    }

    /** 
     * Parse a cookies string into an object.
    */
    static parseCookies(str) {
        return str.split(';').map(e => e.split('='))
        .reduce((a, e) => ({
            ...a,
            [decodeURIComponent(e[0].trim())]: decodeURIComponent(e[1].trim())
        }), {});
    }

}

export default ShinyProxy;
