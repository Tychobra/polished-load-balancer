

const get_sessions_data = (shinyApps) => {
  
  let out = []
  let hold_app = null
  let total_active_users = 0
  let total_total_users = 0
  let requests = null
  
  for (const key in shinyApps.instances) {
    hold_app = shinyApps.instances[key]
    
    total_active_users = total_active_users + hold_app.nActiveSessions 
    total_total_users = total_total_users + hold_app.nTotalSessions
    
    requests = shinyApps.requests.filter(obj => obj.instanceId === key)

    out.push({
      instance_id: key,
      port: hold_app.port,
      nActiveSessions: hold_app.nActiveSessions,
      nTotalSessions: hold_app.nTotalSessions,
      requests: requests
    })

    

  }
  

  return {
    totals: {
      active: total_active_users,
      inactive: total_total_users - total_active_users
    },
    apps: out
  }
}

export default get_sessions_data
