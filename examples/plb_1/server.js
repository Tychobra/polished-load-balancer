import express from 'express'
import polishedLoadBalancer, { shinyApps, get_sessions_data } from '../../index.js'

import dashboard_ui from "./dashboard/index.js"

const app = express()

const loadBalancer = await polishedLoadBalancer({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})



app.get("/polished-proxy", (req, res) => {
  
  // TODO: could check that user is an admin here

  const dat = get_sessions_data(shinyApps)  

  res.send(dashboard_ui(dat))
})

app.use(loadBalancer)

app.listen(8080)
