import html from 'html-express-js'


const box = obj => html`<div style="background-color: F5F5F5; padding: 15px; border: 1px solid #000;">
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

export const view = (data, state) => html`<html>
  <head></head>
  <body>
    <h1>Polished Load Balancer</h1>
    <h3>Active Sessions: ${data.totals.active}</h3>
    <h3>Inactive Sessions: ${data.totals.inactive}</h3>
    <h3>Total Sessions: ${data.totals.active + data.totals.inactive}</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      ${data.apps.map(obj => box(obj))}
    </div>
  </body>
</html>`


