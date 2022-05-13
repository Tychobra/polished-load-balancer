# polishedproxy

`polished_proxy` is a simple way to deploy R Shiny apps. It sets up a reverse proxy. It relies on the popular [`http-proxy`](https://github.com/http-party/node-http-proxy) and [`http-proxy-middleware`](https://github.com/chimurai/http-proxy-middleware) for proxying. 

* it runs several instances of your Shiny app to overcome the single-process limitation of a standard shiny app
* it is a middleware for a Node.js [Express](https://expressjs.com) application, so it can be extended easily

## Simple example

The following example will serve two Shiny apps located in the `shiny-apps/main-app` and `shiny-apps/my-app`folders:

``` javascript

import express from 'express';
import ShinyProxy from 'shiny-proxy';

const shinyProxy = new ShinyProxy({
  appDir: "/srv/shiny-server/shiny_app",
  maxConnections: 1,
  maxWorkers: 2
})

const app = express();

app.use(shinyProxy.middleware);

app.listen(8080);

```

## Options

A `shiny-proxy` object is created with `new ShinyProxy(options)`. This section described available options.

#### Main settings

* **options.RscriptPath:** the path to `Rscript` executable (by default, `/usr/lib/R/bin/Rscript`).

* **options.redirect404:** the path to redirect "page not found" errors to (by default, `/404`).

* **options.redirect500:** the path to redirect "internal server errors" to (by default, `/500`). On error, `shiny-proxy` will try to launch new instance of your apps.

#### Apps settings

* **options.appDir:** the path of the folder containing the Shiny app (with either `app.R` or `server.R` and `ui.R`).

* **options.maxConnections** the max number of connections per worker before starting up a new worker.

* **options.maxWorkers:** the max number of instances of the app to run, by default the number of cores on the server.

## License

MIT License (MIT)
