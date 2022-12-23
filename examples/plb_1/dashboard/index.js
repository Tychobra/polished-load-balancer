

const requests_table = (requests) => {
  
  let out = requests.sort(function(a, b){return b.created_at - a.created_at})

  out = out.slice(0, 10)
  

  out.forEach((obj, i) => {
    out[i].created_at = new Date(obj.created_at).toString().substring(0, 24)
  })

  return `<table style="width: 100%;">
    <thead>
      <tr>
        <td class="cell_" style="text-align: center; font-weight: 600;">Session ID</td>
        <td class="cell_" style="text-align: center; font-weight: 600;">Timestamp</td>
      </tr>
    </thead>
    <tbody>
      ${out.map(obj => {
        return `<tr>
          <td class="cell_" style="text-align: center;">${obj.sessionId}</td>
          <td class="cell_" style="text-align: center;">${obj.created_at}</td>
        </tr>`
      }).join("")}
    </tbody>
  </table>`
}

const app_box = (obj) => {
  return `<div style="background-color: #F5F5F5; padding: 15px; border: 1px solid #000; margin: 15px 0;">
    <table style="width: 100%;">
      <tbody>
        <tr>
          <td class="cell_" style="border-top: 1px solid #BBB;">Instance ID</td>
          <td class="cell_" style="border-top: 1px solid #BBB; text-align: right;">${obj.instance_id}</td>
        </tr>
        <tr>
          <td class="cell_">Port</td>
          <td class="cell_" style="text-align: right;">${obj.port}</td>
        </tr>
        <tr>
          <td class="cell_">Active Sessions</td>
          <td class="cell_" style="text-align: right;">${obj.nActiveSessions}</td>
        </tr>
        <tr>
          <td class="cell_">Total Sessions</td>
          <td class="cell_" style="text-align: right;">${obj.nTotalSessions}</td>
        </tr>
      </tbody>
    </table>
    <div style="text-align: center">
      <h3>Last 10 Requests</h3>
    </div>
    ${requests_table(obj.requests)}
  </div>`
}


const dashboard_ui = (dat) => {
  
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Polished Load Balancer</title>
      <style>
        .cell_ {
          width: 50%; 
          padding: 5px; 
          border-bottom: 1px solid #BBB;
        }
      </style>
    </head>
    <body>
      <h1>Polished Load Balancer</h1>
      <h3>Active Sessions: ${ dat.totals.active }</h3>
      <h3>Inactive Sessions: ${ dat.totals.inactive }</h3>
      <h3>Total Sessions</h3>
      
      ${dat.apps.map(app_obj => {
        return app_box(app_obj)
      }).join("")}
    </body>
  </html>`
}

export default dashboard_ui

