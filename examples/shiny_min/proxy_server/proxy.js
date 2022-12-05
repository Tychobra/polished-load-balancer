import express from 'express'
import polishedProxy from '../../../index.js'

const proxyMiddleware = await polishedProxy({
  appDir: '../shiny_app',
  maxSessions: 1
})

//shiny::runApp("../shiny_app")
const app = express()

app.get("/favicon.ico", (req, res) => {
  res.status(404).json({message: "not found"})
})

app.use(proxyMiddleware)

app.listen(8080)

//app.on('upgrade', ws_proxy.upgrade) 
