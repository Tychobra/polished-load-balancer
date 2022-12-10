import express from 'express'
import polishedProxy from '../../index.js'

const app = express()

const proxy = await polishedProxy({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})

app.get("/polished-proxy", (req, res) => {
  
  let out = []
  let hold_app = null
  let total_active_users = 0
  let total_total_users = 0
  for (const key in proxy.shinyApp.children) {
    hold_app = proxy.shinyApp.children[key]
    
    total_active_users = total_active_users + hold_app.nActiveSessions 
    total_total_users = total_total_users + hold_app.nTotalSessions

    out.push({
      instance_id: key,
      nActiveSessions: hold_app.nActiveSessions,
      nTotalSessions: hold_app.nTotalSessions
    })
  }

  const out_html = out.map(obj => {
    return `<div style="padding: 15px; border: 1px solid #EEE;">
      <ul style="list-style-type: none;">
        <li>Instance ID: ${obj.instance_id}</li>
        <li>Active Sessions: ${obj.nActiveSessions}</li>
        <li>Total Sessions: ${obj.nTotalSessions}</li>
      </ul>
    </div>`
  })
  res.send(`<html>
    <head></head>
    <body>
      <h1>Load Balancer Monitoring</h1>
      <h3>Active Users: ${total_active_users}</h3>
      <h3>Inactive Users: ${total_total_users - total_active_users}</h3>
      <h3>Total Users: ${total_total_users}</h3>
      ${out_html}
    </body>
  </html>`)
})

app.use(proxy.middleware)

app.listen(8080)
