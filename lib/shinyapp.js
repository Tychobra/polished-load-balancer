
import {spawn} from 'child_process';
import {v4 as uuid} from 'uuid';

import portsPool from './portspool.js';

class ShinyAppInstance {

  constructor(id, config) {
    this.config = config;
    this.status = 'INIT';
    this.nActiveSessions = 0
    this.id = id;
    this.port = null;
    // the child process for running a shiny app instance
    this.instance = null;
    console.log("shiny app instance initialized: " + id);
  }

  async start () {
    
    return portsPool.getNext().then(port => new Promise((resolve, reject) => {
      
      console.log(`spawning instance on port ${port}`);
      this.port = port;
      this.status = 'STARTING';
        
      if (this.instance) this.child.kill();
            
            
      this.instance = spawn(
        this.config.RscriptPath, 
        ['-e', 'Sys.setenv(\'INSTANCE_ID\'=\'' + this.id + '\') && shiny::runApp(appDir=\'' + this.config.appDir + '\', port=' + port + ')'],
        {cwd: this.config.appDir}
      )
    
      this.instance.on('close', exitCode => {
                
        if (this.status === 'STARTING') {
          this.status = 'START_ERROR';
          this.instance.kill()
          portsPool.free(port);
          reject('R process exited with code ' + exitCode);
        } else {
          this.status = 'STOPPED';
          portsPool.free(port);
          this.instance.kill()
          resolve("shiny app stopped")
          //setTimeout(() => this.start(), 3000);
        }
      })

      this.instance.on('error', err => {
        if (this.status === 'STARTING') {
          this.status = 'START_ERROR';
          portsPool.free(port);
          this.instance.kill()
          reject('R process error:' + err);
        } else {
          this.status = 'ERROR';
          portsPool.free(port);
          this.instance.kill()
          setTimeout(() => this.start(), 3000);
        }
      })

      this.instance.stderr.on('data', data => {
          
        const hold = data.toString()
        console.log(hold)
        if (this.status === 'STARTING' && hold.includes('Listening on')) {
          this.status = 'RUNNING';
          setTimeout(() => resolve('Shiny app instance started'), 3000);
        }

      })

    })).catch((err) => {
      console.log('failed to start app');
      console.log(err);
    })

  }

  async stop () {
    this.status = 'STOPPED';
    portsPool.free(this.port);
    this.child.kill();
  }
}


export class ShinyApp {

  constructor(config) {
    this.config = config;
    this.instances = {};
    this.sessions = {};
  }

  async startInstance (id) {  
    
    this.instances[id] = new ShinyAppInstance(id, this.config)
        
    await this.instances[id].start()

    return null
  }

  async stopInstance (instance_id) {
    await this.instances[instance_id].stop()
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
  *  - status: either "ACTIVE" or "INACTIVE"
  *  - proxyUrl: character
  *  - closeSession: callback to close the session,
  *  - instanceId: uuid
  * 
  */
  async getSession (id) {
    
    let out = null
    if (id && this.sessions[id]) {
      // session found, so send them to the the shiny app instances running their session
            
      this.sessions[id].proxyUrl = `http://localhost:${this.instances[this.sessions[id].instanceId].port}`
      if (this.sessions[id].status !== "ACTIVE") {
        this.sessions[id].status = "ACTIVE"
      }
            
      out = this.sessions[id];
            
    } else {
      
      out = await this.addSession()
      
    }

    return out
  }
  
  async addSession() {

    const id = uuid(); 
      
    const instanceMinSessions = this.getNextInstance()

    if (instanceMinSessions.nActiveSessions < this.config.maxSessions) {
      // the instance with the min number of sessions has 2 or more slots available for
      // additional sessions, so send the user to the instance with the min sessions.
      console.log("session 2")
      this.sessions[id] = {
        sessionId: id,
        proxyUrl: `http://localhost:${instanceMinSessions.port}`,
        status: "ACTIVE",
        instanceId: instanceMinSessions.id
      }
                  
      this.instances[instanceMinSessions.id].nActiveSessions++

      return this.sessions[id]

    } else {
      // the instance with the fewest active sessions is one session away from reaching the
      // maxSessions, so preemtively start a new instance to handle any future sessions, but put
      // this session on the last available session slot on the instance with the min num of sessions
      console.log("session3: start new instance")            
      const newInstanceId = uuid()
      await this.startInstance(newInstanceId)
        
      const hold_new_instance = this.instances[newInstanceId]    

      this.sessions[id] = {
        sessionId: id,
        proxyUrl: `http://localhost:${hold_new_instance.port}`,
        status: "ACTIVE",
        instanceId: newInstanceId
      }

      this.instances[newInstanceId].nActiveSessions++
          
      return this.sessions[id]
    }
  }


  getNextInstance() {
    
    // find the instance with the fewest sessions
    let instanceMinSessions = null
    
    for (const instance in this.instances) {
          
      if (instanceMinSessions === null) {
        instanceMinSessions = this.instances[instance]
      } else if (this.instances[instance].nActiveSessions < instanceMinSessions.nActiveSessions) {
        instanceMinSessions = this.instances[instance]
      }
    }

    return instanceMinSessions
  }

  //closeSession (id) {
  //  if (this.sessions[id]) {
  //if (this.sessions[id].closeTimer) {
  //  clearTimeout(this.sessions[id].closeTimer);
  //}
  ////this.children[this.sessions[id].instanceId].nActiveSessions--
  ////this.sessions[id].status = "INACTIVE"
  ////delete this.sessions[id]
  //}
  //  }*/
}
