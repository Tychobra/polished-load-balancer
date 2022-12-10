import express from 'express'
import polishedProxy from 'polished-proxy'

const app = express()

const proxy = await polishedProxy({
  appDir: '/srv/shiny_app',
  maxSessions: 2
})


app.use(proxy.middleware)

app.listen(8080)
