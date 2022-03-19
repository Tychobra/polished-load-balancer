# polished_server

`polished_proxy` is a simple way to deploy R Shiny apps. It sets up a reverse proxy. It relies on the popular [`http-proxy`](https://github.com/http-party/node-http-proxy) and [`http-proxy-middleware`](https://github.com/chimurai/http-proxy-middleware) for proxying. As a pure Node.js solution it is platform-independent.

* it runs several instances of your Shiny apps to overcome the single-process limitation of the free version of Shiny Server
* it basically a middleware for a Node.js [Express](https://expressjs.com) application, so it can be extended easily to suit your needs

## Simple example

The following example will serve two Shiny apps located in the `shiny-apps/main-app` and `shiny-apps/my-app`folders:

``` javascript

import express from 'express';
import ShinyProxy from 'shiny-proxy';

const shinyProxy = new ShinyProxy({
    RscriptPath: "R"
    appDir: "<path to my app>"
});

const app = express();

app.use(shinyProxy.middleware);

app.listen(8080);

```

## Options

A `shiny-proxy` object is created with `new ShinyProxy(options)`. This section described available options.

#### Main settings

* **options.portRangeStart:** the start of the port range to serve Shiny apps instances on `localhost` (defaults to 4000). Shiny apps instances will be served on available tcp ports starting from there.

* **options.RscriptPath:** the path to `Rscript` executable (by default, `/usr/lib/R/bin/Rscript`).

* **options.redirect404:** the path to redirect "page not found" errors to (by default, `/404`).

* **options.redirect500:** the path to redirect "internal server errors" to (by default, `/500`). On error, `shiny-proxy` will try to launch new instance of your apps.
