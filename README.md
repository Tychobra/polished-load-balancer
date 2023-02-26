# polished-load-balancer

`polished-load-balancer` is a simple load balancer for a single Shiny app. 

* it runs several instances of your Shiny app to overcome the single-process limitation of a standard shiny app
* new Shiny app instances are automatically started and stopped as your app experiences more and less traffic
* it is a middleware for a Node.js [Express](https://expressjs.com) application, so it can be easily extended

## Installation

```terminal
npm install polished-load-balancer
```

## Simple Example

The following example will serve a Shiny app located in the `/srv/shiny_app` folder:

```nodejs
# server.js
import express from 'express'
import polishedLoadBalancer from 'polished-load-balancer'

const plb = await polishedLoadBalancer({
  appDir: "/srv/shiny_app",
  maxSessions: 1
})

const app = express()

app.use(plb)

app.listen(8080)
```

If you run the above server using `node server.js`, your auto scaling Shiny app will be available at `http://localhost:8080`.

## Options

The load balancer middleware is created by `polishedLoadBalancer(options)`. `options` is an object with
the following configurable properties:

* **appDir:** string - the path of the folder containing the Shiny app. 

* **maxSessions:** integer > 0 - the max number of active sessions per Shiny app instance before starting up a new Shiny app instance.  New Shiny app instances are automatically scaled up and down as each running Shiny app reaches this maxSessions number of sessions.

## Prior Work

This package was adapted from [node-shiny-proxy](https://github.com/martinv13/node-shiny-proxy) by Martin Vergier
