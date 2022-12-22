

import {v4 as uuid} from 'uuid';

import ShinyAppInstance from "./shinyAppInstance.js"


export class ShinyApps {

  constructor(config) {
    this.config = config
    this.instances = {}
    this.sessions = {}

    // every 5 minutes check nTotalSessions of each instance, and
    // if there are no sessions and this is not the only inctance, then stop the
    // instance 
    setInterval(async () => {   
      
      const n_instances = Object.keys(this.instances).length

      if (n_instances === 0) {
        // there are no app instances.  this should not happen
      } else if (n_instances === 1) {
        // there is only 1 instance, so keep it alive no matter what
        
      } else {
        let hold = null
        
        for (let key in this.instances) {
          hold = this.instances[key]
          
          if (hold.nTotalSessions === 0) {
            await this.stopInstance(hold.id)
          }

        }
      }   

    }, 1000 * 60 * 5)
  }

  async startInstance (id) {  
    
    this.instances[id] = new ShinyAppInstance(id, this.config)
        
    await this.instances[id].start()

    return null
  }

  async stopInstance (instance_id) {
    await this.instances[instance_id].stop()
    delete this.instances[instance_id]
  }
    
  /*
  * find the existing shiny session or create a new one.  If creating a new one, check if existing 
  * shiny instances have room for more connections, and, if they don't, spin up a new instance.
  * 
  * @param id the optional session id.  If left `null`, or if the session cannot be found, then 
  * a new session will be created.
  * 
  * @return the session object containing the following properties:
  *  - sessionId: uuid
  *  - startedAt: datetime
  *  - closeTimer: setTimeout()
  *  - status: either "ACTIVE" or "CLOSED"
  *  - proxyUrl: character
  *  - closeSession: callback to close the session,
  *  - instanceId: uuid
  * 
  */
  getSession (id) {
    if (!this.sessions[id]) {
      throw new Error("session not found")
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
  
  async addSession () {
    
    const id = uuid();
    
    let sessionOut = null
    // find the instance with the fewest sessions
    let instanceMinSessions = null
    for (const instanceId in this.instances) {
            
      if (instanceMinSessions === null) {
        instanceMinSessions = this.instances[instanceId]
      } else if (this.instances[instanceId].nActiveSessions < instanceMinSessions.nActiveSessions) {
        instanceMinSessions = this.instances[instanceId]
      }
    }
            
    if (instanceMinSessions.nActiveSessions < this.config.maxSessions) {
      
      // the instance with the min number of sessions has 2 or more slots available for
      // additional sessions, so send the user to the instance with the min sessions.
      this.sessions[id] = {
        sessionId: id,
        proxyUrl: `http://127.0.0.1:${instanceMinSessions.port}`,
        status: "ACTIVE",
        closeSession: () => this.closeSession(id),
        instanceId: instanceMinSessions.id
      }
                  
      this.instances[instanceMinSessions.id].nActiveSessions++
      this.instances[instanceMinSessions.id].nTotalSessions++

      sessionOut = this.sessions[id]

    } else {

      // the instance with the fewest active sessions is one session away from reaching the
      // maxSessions, so preemtively start a new instance to handle any future sessions, but put
      // this session on the last available session slot on the instance with the min num of sessions            
      const newInstanceId = uuid()
      await this.startInstance(newInstanceId)
        
      const hold_new_instance = this.instances[newInstanceId]    

      this.sessions[id] = {
        sessionId: id,
        proxyUrl: `http://127.0.0.1:${hold_new_instance.port}`,
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
      
      // delete the session if closed for 15 minutes
      this.sessions[id].deleteTimer = setTimeout(() => this.deleteSession(id), 60 * 15 * 1000) 
      
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
