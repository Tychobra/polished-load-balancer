# polished-proxy

`polished-proxy` is a simple way to deploy R Shiny apps. It sets up a reverse proxy. It relies on the popular [`http-proxy`](https://github.com/http-party/node-http-proxy) and [`http-proxy-middleware`](https://github.com/chimurai/http-proxy-middleware) for proxying. 

* it runs several instances of your Shiny app to overcome the single-process limitation of a standard shiny app
* it is a middleware for a Node.js [Express](https://expressjs.com) application, so it can be extended easily

## Simple example

The following example will serve a Shiny apps located in the `/srv/shiny_app` folder:

``` javascript
import express from 'express';
import polishedProxy from 'polished-proxy';

const holdProxy = await polishedProxy({
  appDir: "/srv/shiny_app",
  maxSessions: 1
})

const app = express()

app.use(holdProxy.middleware)

app.listen(8080)
```

## Options

A `polished-proxy` is created with `polishedProxy(options)`. `options` is an object with
the following properties.

* **appDir:** string: the path of the folder containing the Shiny app.

* **maxSessions** integer: the max number of connections per worker before starting up a new worker.
