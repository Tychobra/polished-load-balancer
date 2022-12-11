import express from 'express'
import polishedProxy, { dashboard } from '../../index.js'

const app = express()

const proxy = await polishedProxy({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})

app.get("/polished-proxy", (req, res) => {
  dashboard(req, res, proxy.shinyApp)
})

app.use(proxy.middleware)

app.listen(8080)
