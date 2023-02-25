import express from 'express'
import polishedLoadBalancer from 'polished-load-balancer'

const app = express()

const plb = await polishedLoadBalancer({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})

app.use(plb)

app.listen(8080)
