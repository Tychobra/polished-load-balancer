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
    return `<div style="background-color: F5F5F5; padding: 15px; border: 1px solid #000;">
      <table style="width: 100%;">
        <tbody>
          <tr>
            <td style="width: 50%; padding: 5px; border-bottom: 1px solid #BBB; border-top: 1px solid #BBB;">Instance ID</td>
            <td style="text-align: right; width: 50%; padding: 5px; border-bottom: 1px solid #BBB; border-top: 1px solid #BBB;">${obj.instance_id}</td>
          </tr>
          <tr>
            <td style="width: 50%; padding: 5px; border-bottom: 1px solid #BBB;">Active Sessions</td>
            <td style="text-align: right; width: 50%; padding: 5px; border-bottom: 1px solid #BBB;">${obj.nActiveSessions}</td>
          </tr>
          <tr>
            <td style="width: 50%; padding: 5px; border-bottom: 1px solid #BBB;">Total Sessions</td>
            <td style="text-align: right; width: 50%; padding: 5px; border-bottom: 1px solid #BBB;">${obj.nTotalSessions}</td>
          </tr>
        </tbody>
      </table>
    </div>`
  })
  res.send(`<html>
    <head></head>
    <body>
      <h1>Load Balancer Monitoring</h1>
      <h3>Active Users: ${total_active_users}</h3>
      <h3>Inactive Users: ${total_total_users - total_active_users}</h3>
      <h3>Total Users: ${total_total_users}</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        ${out_html}
      </div>
    </body>
  </html>`)
})

app.use(proxy.middleware)

app.listen(8080)
