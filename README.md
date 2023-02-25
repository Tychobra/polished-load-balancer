# polished-load-balancer

`polished-load-balancer` is a simple load balancer for a single Shiny app. 

* it runs several instances of your Shiny app to overcome the single-process limitation of a standard shiny app
* new Shiny app instances are automatically started and stopped as to your Shiny app scales up and down
* it is a middleware for a Node.js [Express](https://expressjs.com) application, so it can be extended easily

## Simple example

The following example will serve a Shiny apps located in the `/srv/shiny_app` folder:

``` javascript
import express from 'express';
import polishedLoadBalancer from 'polished-load-balancer';

const plb = await polishedLoadBalancer({
  appDir: "/srv/shiny_app",
  maxSessions: 1
})

const app = express()

app.use(plb.middleware)

app.listen(8080)
```

## Options

The load balancer middlemare is created by `polishedLoadBalancer(options)`. `options` is an object with
the following configurable properties.

* **appDir:** string: the path of the folder containing the Shiny app. 

* **maxSessions** integer > 0: the max number of connections per worker before starting up a new Shiny app instance.  New Shiny app instances are automatically scaled up and down as each running Shiny app reached this maxSessions number of active sessions.

## Prior Work

This library was adapted from [node-shiny-proxy](https://github.com/martinv13/node-shiny-proxy) by Martin Vergier
