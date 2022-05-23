# polished-proxy

`polished-proxy` is a simple way to deploy R Shiny apps. It sets up a reverse proxy. It relies on the popular [`http-proxy`](https://github.com/http-party/node-http-proxy) and [`http-proxy-middleware`](https://github.com/chimurai/http-proxy-middleware) for proxying. 

* it runs several instances of your Shiny app to overcome the single-process limitation of a standard shiny app
* it is a middleware for a Node.js [Express](https://expressjs.com) application, so it can be extended easily

## Simple example

The following example will serve two Shiny apps located in the `/srv/shiny_app` folders:

``` javascript

import express from 'express';
import polishedProxy from 'shiny-proxy';

const holdProxy = polishedProxy({
  appDir: "/srv/shiny_app",
  maxSessions: 1
})

const app = express();

app.use(holdProxy);

app.listen(8080);

```

## Options

A `polished-proxy` is created with `polishedProxy(options)`. This section described available options.

#### Main settings

* **options.redirect404:** the path to redirect "page not found" errors to (by default, `/404`).

* **options.redirect500:** the path to redirect "internal server errors" to (by default, `/500`). On error, `polished-proxy` will try to launch new instance of your apps.

#### Apps settings

* **options.appDir:** the path of the folder containing the Shiny app.

* **options.maxSessions** the max number of connections per worker before starting up a new worker.
