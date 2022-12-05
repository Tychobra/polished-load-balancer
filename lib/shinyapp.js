
import {spawn} from 'child_process';
import {v4 as uuid} from 'uuid';

import portsPool from './portspool.js';

class ShinyAppInstance {

  constructor(id, config) {
    this.config = config
    this.status = 'INIT'
    this.nActiveSessions = 0
    this.nTotalSessions = 0 // both active and closed sessions
    this.id = id
    this.port = null
    // the child process
    //this.child = null;
    console.log("shiny app instance initialized: " + id)
  }

  async start () {
    
    return await portsPool.getNext()
      .then(port => new Promise((resolve, reject) => {
        console.log(`spawning instance on port ${port}`);
        this.port = port;
        this.status = 'STARTING';
        if (this.child) this.child.kill();
            
            
        this.child = spawn(
          'R', 
          ['-e', 'Sys.setenv(\'INSTANCE_ID\'=\'' + this.id + '\') && shiny::runApp(appDir=\'' + this.config.appDir + '\', port=' + port + ')'],
          {cwd: this.config.appDir}
        )
    
        this.child.on('close', exitCode => {
                
          if (this.status === 'STARTING') {
            this.status = 'START_ERROR';
            this.child.kill()
            portsPool.free(port);
            reject('R process exited with code ' + exitCode);
          } else {
            this.status = 'STOPPED';
            portsPool.free(port);
            this.child.kill()
            resolve("shiny app stopped")
            //setTimeout(() => this.start(), 3000);
          }
        });

        this.child.on('error', err => {
          if (this.status === 'STARTING') {
            this.status = 'START_ERROR';
            portsPool.free(port);
            this.child.kill()
            reject('R process error:' + err);
          } else {
            this.status = 'ERROR';
            portsPool.free(port);
            this.child.kill()
            setTimeout(() => this.start());
          }
        });

        this.child.stderr.on('data', data => {
          
          const hold = data.toString()
          console.log(hold)
          if (this.status === 'STARTING' && hold.includes('Listening on')) {
            this.status = 'RUNNING';
            setTimeout(() => resolve('Shiny app instance started'), 2000);
          }

        })

      })).catch((err) => {
        console.log('failed to start app');
        console.log(err);
      });

    }

  async stop () {
    this.status = 'STOPPED';
    portsPool.free(this.port);
    this.child.kill();
  }
}


export class ShinyApp {

  constructor(config) {
    this.config = config
    this.children = {}
    this.sessions = {}

    // every 5 minutes check nTotalSessions of each instance, and
    // if there are no sessions and this is not the only inctance, then stop the
    // instance 
    setInterval(async () => {   
      
      const n_instances = Object.keys(this.children).length

      if (n_instances === 0) {
        //console.log("there are no app instances")
      } else if (n_instances === 1) {
        //console.log("there is only 1 instance, so keep it alive no matter what")
        // TODO: replace 1 with a min instances config option
      } else {
        let hold = null
        
        for (let key in this.children) {
          hold = this.children[key]
          
          //console.log("instance id: ", hold.id)
          //console.log("port: ", hold.port)
          //console.log("nActiveSessions: ", hold.nActiveSessions)
          //console.log("nTotalSessions: ", hold.nTotalSessions)
          
          if (hold.nTotalSessions === 0) {
            await this.stopInstance(hold.id)
          }

        }
      }   

    }, 1000 * 60 * 5)
  }

  async startInstance (id) {  
    
    this.children[id] = new ShinyAppInstance(id, this.config)
        
    await this.children[id].start()

    return null
  }

  async stopInstance (instance_id) {
    await this.children[instance_id].stop()
    delete this.children[instance_id]
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
      this.children[this.sessions[id].instanceId].nActiveSessions++
    }
            
    return this.sessions[id];          
  }
  
  async addSession () {
    
    const id = uuid();
    
    let sessionOut = null
    // find the instance with the fewest sessions
    let instanceMinSessions = null
    for (const instanceId in this.children) {
            
      if (instanceMinSessions === null) {
        instanceMinSessions = this.children[instanceId]
      } else if (this.children[instanceId].nActiveSessions < instanceMinSessions.nActiveSessions) {
        instanceMinSessions = this.children[instanceId]
      }
    }
            
    if (instanceMinSessions.nActiveSessions < this.config.maxSessions) {
      // the instance with the min number of sessions has 2 or more slots available for
      // additional sessions, so send the user to the instance with the min sessions.
      //console.log("session 2")
      this.sessions[id] = {
        sessionId: id,
        proxyUrl: `http://127.0.0.1:${instanceMinSessions.port}`,
        status: "ACTIVE",
        closeSession: () => this.closeSession(id),
        instanceId: instanceMinSessions.id
      }
                  
      this.children[instanceMinSessions.id].nActiveSessions++
      this.children[instanceMinSessions.id].nTotalSessions++

      sessionOut = this.sessions[id]

    } else {
      // the instance with the fewest active sessions is one session away from reaching the
      // maxSessions, so preemtively start a new instance to handle any future sessions, but put
      // this session on the last available session slot on the instance with the min num of sessions
      //console.log("session3: start new instance")            
      const newInstanceId = uuid()
      await this.startInstance(newInstanceId)
        
      const hold_new_instance = this.children[newInstanceId]    

      this.sessions[id] = {
        sessionId: id,
        proxyUrl: `http://127.0.0.1:${hold_new_instance.port}`,
        status: "ACTIVE",
        closeSession: () => this.closeSession(id),
        instanceId: newInstanceId
      }

      this.children[newInstanceId].nActiveSessions++
      this.children[newInstanceId].nTotalSessions++
          
      sessionOut = this.sessions[id]
                    
    }

    return sessionOut
  }

  closeSession (id) {
    if (this.sessions[id]) {
  
      this.children[this.sessions[id].instanceId].nActiveSessions--
      this.sessions[id].status = "CLOSED"
      this.sessions[id].closedAt = (new Date()).getTime()
      // delete the session if closed for 15 minutes
      // TODO: should also set the cookie to clear after 15 minutes when the session is closed
      this.sessions[id].deleteTimer = setTimeout(() => this.deleteSession(id), 900 * 1000)//10 * 1000) 
      
      console.log("session closed")
    } else {
      console.log("Session not found")
    }
  }

  deleteSession (id) {
    this.children[this.sessions[id].instanceId].nTotalSessions--
    delete this.sessions[id]
  }
}
