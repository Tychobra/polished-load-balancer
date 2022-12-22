import express from 'express'
import polishedLoadBalancer, { shinyApps, get_sessions_data } from '../../index.js'

import content from "./dashboard.js"

const app = express()

const loadBalancer = await polishedLoadBalancer({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})


// set the view engine to ejs
app.set('view engine', 'ejs');


app.get("/polished-proxy", (req, res) => {
  
  // TODO: could check that user is an admin here

  const dat = get_sessions_data(shinyApps)
  console.log("dat: ", dat)
  res.send(content(dat))
  
})

app.use(loadBalancer)

app.listen(8080)
