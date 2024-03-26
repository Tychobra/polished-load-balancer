

import {v4 as uuid} from 'uuid';

import ShinyAppInstance from "./shinyAppInstance.js"


export class ShinyApps {

  constructor(config) {
    this.config = config
    this.instances = {}
    this.sessions = {}
    this.requests = []

    // every 5 minutes check nTotalSessions of each instance, and
    // if there are no sessions and this is not the only instance, then stop the
    // instance 
    setInterval(async () => {   
      
      const n_instances = Object.keys(this.instances).length

      if (n_instances > 2) {
        
        let hold = null
        let nNoSessions = 0
        for (let key in this.instances) {
          hold = this.instances[key]
          
          if (hold.nTotalSessions === 0) {
            nNoSessions++
            // leave one empty instance running so that new user will have a faster 
            // initial connection
            if (nNoSessions > 1) {
              await this.stopInstance(hold.id)
            }
          }
        }
      }   

    }, 1000 * 60 * 5)
  }

  async startInstance (id) {  
    
    this.instances[id] = new ShinyAppInstance(id, this.config)
        
    await this.instances[id].start(this.sessions)

    return null
  }

  async stopInstance (instance_id) {
    await this.instances[instance_id].stop()
    delete this.instances[instance_id]
  }
    
  /*
  * find the existing shiny session.  
  * 
  * @param id the session id
  * 
  * @return if the session does not exist, return null, otherwise return the session object 
  * containing the following properties:
  *  - sessionId: uuid
  *  - startedAt: datetime
  *  - closeTimer: setTimeout()
  *  - status: either "ACTIVE" or "CLOSED"
  *  - port: integer
  *  - closeSession: callback to close the session,
  *  - instanceId: uuid
  * 
  */
  getSession (id) {
    if (!this.sessions[id]) {
      return null
    }    
    
    
    // session found, so send them to the the shiny app instances running their session            
    if (this.sessions[id].status !== "ACTIVE") {
      this.sessions[id].status = "ACTIVE"
    }

    if (this.sessions[id].closedAt) {
      // the session is closed, so set it back to active
      delete this.sessions[id].closedAt
      clearTimeout(this.sessions[id].deleteTimer)
      delete this.sessions[id].deleteTimer
      
      // this was a closed session that was made active again, so bump the number of nActiveSessions
      // for this instance
      this.instances[this.sessions[id].instanceId].nActiveSessions++
    }
            
    return this.sessions[id];          
  }
  
  async addSession (id = null) {
    
    if (id === null) {
      id = uuid();
    }
    
    
    let sessionOut = null
    // find the instance with the fewest sessions
    let instanceMinSessions = null
    for (const instanceId in this.instances) {
      if (this.this.instances[instanceId].instanceId === "ERROR") {
        next
      }

      if (instanceMinSessions === null) {
        instanceMinSessions = this.instances[instanceId]
      } else if (this.instances[instanceId].nActiveSessions < instanceMinSessions.nActiveSessions) {
        instanceMinSessions = this.instances[instanceId]
      }
    }
            
    if (instanceMinSessions.nActiveSessions < this.config.maxSessions - 1) {
      
      // the instance with the min number of sessions has 2 or more slots available for
      // additional sessions, so send the user to the instance with the min sessions.
      this.sessions[id] = {
        sessionId: id,
        port: instanceMinSessions.port,
        status: "ACTIVE",
        closeSession: () => this.closeSession(id),
        instanceId: instanceMinSessions.id
      }
                  
      this.instances[instanceMinSessions.id].nActiveSessions++
      this.instances[instanceMinSessions.id].nTotalSessions++

      sessionOut = this.sessions[id]

    } else if (instanceMinSessions.nActiveSessions === (this.config.maxSessions - 1)) {

      // the instance with the fewest active sessions is one session away from reaching the
      // maxSessions, so preemtively start a new instance to handle any future sessions, but put
      // this session on the last available session slot on the instance with the min num of sessions            
      console.log("new instance started")
      const newInstanceId = uuid()
      this.startInstance(newInstanceId)    

      this.sessions[id] = {
        sessionId: id,
        port: instanceMinSessions.port,
        status: "ACTIVE",
        closeSession: () => this.closeSession(id),
        instanceId: instanceMinSessions.id
      }

      this.instances[instanceMinSessions.id].nActiveSessions++
      this.instances[instanceMinSessions.id].nTotalSessions++
          
      sessionOut = this.sessions[id]
                    
    } else {
      // no open slots available, so start a new instance and put the session on the new instance
      console.log("new instance started and session sent to new instance")
      const newInstanceId = uuid()
      await this.startInstance(newInstanceId)
        
      const hold_new_instance = this.instances[newInstanceId]    

      this.sessions[id] = {
        sessionId: id,
        port: hold_new_instance.port,
        status: "ACTIVE",
        closeSession: () => this.closeSession(id),
        instanceId: newInstanceId
      }

      this.instances[newInstanceId].nActiveSessions++
      this.instances[newInstanceId].nTotalSessions++
          
      sessionOut = this.sessions[id]
    }

    return sessionOut
  }

  closeSession (id) {
    if (this.sessions[id]) {
  
      this.instances[this.sessions[id].instanceId].nActiveSessions--
      this.sessions[id].status = "CLOSED"
      this.sessions[id].closedAt = (new Date()).getTime()
      
      // delete the session if closed for 5 minutes
      this.sessions[id].deleteTimer = setTimeout(() => this.deleteSession(id), 60 * 5 * 1000) 
      
      console.log("session closed")
    } else {
      console.log("Session not found")
    }
  }

  deleteSession (id) {
    this.instances[this.sessions[id].instanceId].nTotalSessions--
    delete this.sessions[id]
  }


  
}
