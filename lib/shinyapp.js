
import {spawn} from 'child_process';
import {v4 as uuid} from 'uuid';

import portsPool from './portspool.js';
import path from 'path';


//const serverDir = process.env.SHINYPROXY_DIR_PATH || '.';

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
            
            
            this.child = spawn(this.config.RscriptPath || '/usr/lib/R/bin/Rscript', 
            ['-e', 'Sys.setenv(\'INSTANCE_ID\'=\'' + this.id + 
            '\') && shiny::runApp(appDir=\'' + this.config.appDir + '\', port=' + port + ')'])
    
            this.child.on('close', exitCode => {
                
                console.log("I closed")
                
                if (this.status === 'STARTING') {
                    this.status = 'START_ERROR';
                    //this.child.kill()
                    portsPool.free(port);
                    reject('R process exited with code ' + exitCode);
                } else {
                    this.status = 'STOPPED';
                    portsPool.free(port);
                    //this.child.kill()
                    //resolve("shiny app stopped")
                    setTimeout(() => this.start(), 3000);
                }
            });

            this.child.on('error', err => {
                if (this.status === 'STARTING') {
                    this.status = 'START_ERROR';
                    portsPool.free(port);
                    //this.child.kill()
                    reject('R process error:' + err);
                } else {
                    this.status = 'ERROR';
                    //portsPool.free(port);
                    //this.child.kill()
                    setTimeout(() => this.start(), 3000);
                }
            });

            this.child.stderr.on('data', data => {
                
                data=data.toString();
                console.log(data)
                if (this.status === 'STARTING' && data.includes('Listening on')) {
                    this.status = 'RUNNING';
                    resolve('Shiny app instance started');
                }
            });

        }))
        .catch((err) => {
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

    startInstance (id) {  
        console.log("config: ", this.config)
        this.children[id] = new ShinyAppInstance(id, this.config)
        
        return this.children[id]
          .start()
          .then(msg => {
              console.log(msg)
          })
    }

    stopInstance (instance_id) {
       this.children[instance_id].stop()
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
        
        console.log("children: ", this.children)

        if (id && this.sessions[id]) {

            console.log("session found")
            
            clearTimeout(this.sessions[id].timer);
            this.sessions[id].timer = setTimeout(() => this.closeSession(id), 3600*1000);
            this.sessions[id].proxyUrl = `http://localhost:${this.children[this.sessions[id].instanceId].port}`
            if (this.sessions[id].status !== "ACTIVE") {
                this.sessions[id].status = "ACTIVE"
                this.children[this.sessions[id].instanceId]++
            }
            
            return this.sessions[id];
            
        } else {
            
            id = uuid();
            
            // TODO: might need to check if the instances are running
            
            const nInstances = Object.keys(this.children).length
            console.log("nInstances: " + nInstances)
            if (nInstances === 0) {
                
                console.log("no instances started")
                const newInstanceId = uuid()
                return this.startInstance(newInstanceId).then(() => {
                    this.sessions[id] = {
                        sessionId: id,
                        startedAt: (new Date()).getTime(),
                        closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
                        status: "ACTIVE",
                        proxyUrl: `http://localhost:${this.children[newInstanceId].port}`,
                        closeSession: () => this.closeSession(id),
                        instanceId: newInstanceId
                    }

                    this.children[newInstanceId].nActiveSessions++

                }).then(() => this.sessions[id])
                    
                

            } else {
                
                // find the instance with the fewest sessions
                let instanceMinSessions = null
                for (const instance in this.children) {
                  if (instanceMinSessions === null) {
                    instanceMinSessions = instance
                  } else if (instance.nActiveSessions < instanceMinSessions.nActiveSessions) {
                    instanceMinSessions = instance
                  }
                }
                
                
                if (instanceMinSessions.nActiveSessions < this.config.maxSessions) {
                  // an instance with fewer than the max connection exists, so start this session on the instance with the
                  // fewest open connections
                  this.sessions[id] = {
                      sessionId: id,
                      startedAt: (new Date()).getTime(),
                      proxyUrl: `http://localhost:${instanceMinSessions.port}`,
                      closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
                      status: "ACTIVE",
                      closeSession: () => this.closeSession(id),
                      instanceId: instanceMinSessions.id
                  }
                  
                  instanceMinSessions.nActiveSessions++

                  return this.sessions[id]

                } else {
                    // no instances with fewer than max connections, so create a new instance
                    
                    // TODO: need to check that max instances has not been exceeded
                    const newInstanceId = uuid()
                    return this.startInstance(newInstanceId).then(() => {
                        this.sessions[id] = {
                            sessionId: id,
                            startedAt: (new Date()).getTime(),
                            proxyUrl: `http://localhost:${this.children[newInstanceId].port}`,
                            closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
                            status: "ACTIVE",
                            closeSession: () => this.closeSession(id),
                            instanceId: newInstanceId
                        }

                        this.children[newInstanceId].nActiveSessions++

                    }).then(() => this.sessions[id]) 
                    
                    
                }
            } 
        }
    }

    closeSession (id) {
        if (this.sessions[id]) {
            if (this.sessions[id].closeTimer) {
                clearTimeout(this.sessions[id].closeTimer);
            }
            //this.children[this.sessions[id].instanceId].nActiveSessions--
            //this.sessions[id].status = "INACTIVE"
            //delete this.sessions[id]
        }
    }

}
