

const app_box = (obj) => {
  return `<div style="background-color: #F5F5F5; padding: 15px; border: 1px solid #000;">
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
}


const content = (dat) => {
  
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Polished Load Balancer</title>
    </head>
    <body>
      <h1>Polished Load Balancer</h1>
      <h3>Active Sessions: ${ dat.totals.active }</h3>
      <h3>Inactive Sessions: ${ dat.totals.inactive }</h3>
      <h3>Total Sessions</h3>
      
      ${dat.apps.map(app_obj => app_box(app_obj))}
  
    </body>
  </html>`
}

export default content

