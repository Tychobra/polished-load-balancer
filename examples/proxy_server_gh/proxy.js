import express from 'express'
import polishedProxy from 'polished-proxy'

const app = express()

const proxyMiddleware = await polishedProxy({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})

app.use(proxyMiddleware)

app.listen(8080)
