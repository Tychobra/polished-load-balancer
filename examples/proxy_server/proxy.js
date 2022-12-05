import express from 'express'
import polishedProxy from '../../index.js'

const proxyMiddleware = await polishedProxy({
  //appDir: '../shiny_min',
  appDir: '../shiny_w_polished',
  maxSessions: 2
})


const app = express()

app.get("/favicon.ico", (req, res) => {
  res.status(404).json({message: "not found"})
})

app.use(proxyMiddleware)

app.listen(8080)

//app.on('upgrade', ws_proxy.upgrade) 
