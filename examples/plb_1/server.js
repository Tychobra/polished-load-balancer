import express from 'express'
import polishedLoadBalancer, { shinyApps, get_sessions_data } from '../../index.js'

import dashboard_ui from "./dashboard/index.js"

const app = express()

const plb = await polishedLoadBalancer({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})


app.get("/__polished__", (req, res) => {
  
  // TODO: could check that user is an admin here

  const dat = get_sessions_data(shinyApps)  

  res.send(dashboard_ui(dat))
})

app.use(plb)

app.listen(8080)
