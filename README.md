# polished-load-balancer

`polished-load-balancer` is a simple load balancer for a single Shiny app. 

* it runs several instances of your Shiny app to overcome the single-process limitation of a standard shiny app
* new Shiny app instances are automatically started and stopped as your app experiences more and less traffic
* it is a middleware for a Node.js [Express](https://expressjs.com) application, so it can be easily extended

## Simple Example

The following example will serve a Shiny app located in the `/srv/shiny_app` folder:

``` javascript
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

## Options

The load balancer middleware is created by `polishedLoadBalancer(options)`. `options` is an object with
the following configurable properties:

* **appDir:** string - the path of the folder containing the Shiny app. 

* **maxSessions:** integer > 0 - the max number of active sessions per Shiny app instance before starting up a new Shiny app instance.  New Shiny app instances are automatically scaled up and down as each running Shiny app reaches this maxSessions number of sessions.

## Usage Dashboard

A simple dashboard with information on your running instanes is available at `/__polished__`

![Screen Shot 2023-02-25 at 12 42 40 PM](https://user-images.githubusercontent.com/4030554/221371574-2f74ec6f-673c-4044-b93e-f27ab947ed83.png)

## Prior Work

This package was adapted from [node-shiny-proxy](https://github.com/martinv13/node-shiny-proxy) by Martin Vergier
