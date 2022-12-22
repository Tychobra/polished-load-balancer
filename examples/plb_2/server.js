import express from 'express'
import polishedLoadBalancer from 'polished-load-balancer'

const app = express()

const loadBalancer = await polishedLoadBalancer({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})

app.use(loadBalancer)

app.listen(8080)
