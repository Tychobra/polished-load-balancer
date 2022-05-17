
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
    // the child process
    //this.child = null;
    console.log("shiny app instance initialized: " + id);
  }

  async start () {
    return portsPool.getNext()
      .then(port => new Promise((resolve, reject) => {
        console.log(`spawning instance on port ${port}`);
        this.port = port;
        this.status = 'STARTING';
        if (this.child) this.child.kill();
            
            
        this.child = spawn(
          this.config.RscriptPath, 
          ['-e', 'Sys.setenv(\'INSTANCE_ID\'=\'' + this.id + '\') && shiny::runApp(appDir=\'' + this.config.appDir + '\', port=' + port + ')']
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
            setTimeout(() => this.start(), 3000);
          }
        });

        this.child.stderr.on('data', data => {
          
          const hold = data.toString()
          console.log(hold)
          if (this.status === 'STARTING' && hold.includes('Listening on')) {
            this.status = 'RUNNING';
            resolve('Shiny app instance started');
          }

        });

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
    this.config = config;
    this.children = {};
    this.sessions = {};
  }

  async startInstance (id) {  
    
    this.children[id] = new ShinyAppInstance(id, this.config)
        
    return await this.children[id]
      .start()
      .then(msg => {
        console.log(msg)
    })
  }

  async stopInstance (instance_id) {
    await this.children[instance_id].stop()
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
  async getSession (id=null) {
        
    
    
    if (id && this.sessions[id]) {
      // session found, so send them to the the shiny app instances running their session
      console.log("session found", this.children[this.sessions[id].instanceId].port)
            
      //clearTimeout(this.sessions[id].timer);
      //this.sessions[id].timer = setTimeout(() => this.closeSession(id), 3600*1000);
      this.sessions[id].proxyUrl = `http://0.0.0.0:${this.children[this.sessions[id].instanceId].port}`
      if (this.sessions[id].status !== "ACTIVE") {
        this.sessions[id].status = "ACTIVE"
        this.children[this.sessions[id].instanceId]++
      }
            
      return this.sessions[id];
            
    } else {
            
      id = uuid();
            
                   
      // find the instance with the fewest sessions
      let instanceMinSessions = null
      //console.log("children", this.children)
      for (const instance in this.children) {
            
        if (instanceMinSessions === null) {
          instanceMinSessions = this.children[instance]
        } else if (instance.nActiveSessions < instanceMinSessions.nActiveSessions) {
          instanceMinSessions = this.children[instance]
        }
      }
                
      if (instanceMinSessions.nActiveSessions < (this.config.maxSessions) - 1) {
        // the instance with the min number of sessions has 2 or more slots available for
        // additional sessions, so send the user to the instance with the min sessions.
        
        this.sessions[id] = {
          sessionId: id,
          //startedAt: (new Date()).getTime(),
          proxyUrl: `http://0.0.0.0:${instanceMinSessions.port}`,
          //closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
          status: "ACTIVE",
          //closeSession: () => this.closeSession(id),
          instanceId: instanceMinSessions.id
        }
                  
        instanceMinSessions.nActiveSessions++

        return this.sessions[id]

      } else {
        // the instance with the fewest active sessions is one session away from reaching the
        // maxSessions, so preemtively start a new instance to handle any future sessions, but put
        // this session on the last available session slot on the instance with the min num of sessions
                    
        const newInstanceId = uuid()
        return this.startInstance(newInstanceId).then(() => {
                        
          this.sessions[id] = {
            sessionId: id,
            //startedAt: (new Date()).getTime(),
            proxyUrl: `http://0.0.0.0:${this.children[instanceMinSessions].port}`,
            //closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
            status: "ACTIVE",
            //closeSession: () => this.closeSession(id),
            instanceId: instanceMinSessions
          }

          this.children[instanceMinSessions].nActiveSessions++

        }).then(() => {
          console.log("new session:", this.sessions[id])
          return this.sessions[id]
        }) 
                    
                    
      }
    }
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
