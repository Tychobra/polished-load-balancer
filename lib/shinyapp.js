
import {spawn} from 'child_process';
import {v4 as uuid} from 'uuid';

import portsPool from './portspool.js';
import path from 'path';


//const serverDir = process.env.SHINYPROXY_DIR_PATH || '.';

class ShinyAppInstance {

    constructor(id, config) {
        this.config = config;
        this.status = 'INIT';
        this.sessions = {};
        this.nActiveSessions = 0
        this.id = id;
        this.port = null;
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
                if (this.status === 'STARTING') {
                    this.status = 'START_ERROR';
                    portsPool.free(port);
                    reject('R process exited with code ' + exitCode);
                } else {
                    this.status = 'STOPPED';
                    portsPool.free(port);
                    setTimeout(() => this.start(), 3000);
                }
            });

            this.child.on('error', err => {
                if (this.status === 'STARTING') {
                    this.status = 'START_ERROR';
                    portsPool.free(port);
                    reject('R process error:' + err);
                } else {
                    this.status = 'ERROR';
                    portsPool.free(port);
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
        this.child.kill()
    }

    addSession (sessionId) {
      
      let hold = this.sessions
      
      
      if (hold[sessionId] === null) {
        // the session does not exist, so add the session 
        hold[sessionId] = {
            id: sessionsId,
            status: "ACTIVE"
        }
        this.nActiveSessions = this.nActiveSessions + 1
        this.sessions = hold      
      } else {
        if (hold[sessionId].status !== "ACTIVE") {
            // the session already exists, but it is inactive, set it to active
            this.nActiveSessions = this.nActiveSessions + 1
            hold[sessionId] = {
                id: sessionsId,
                status: "ACTIVE"
            }
            this.sessions = hold      
        } else {
            // active session already exists, so do nothing
           console.log("ACTIVE session already exists") 
        }
      }

      
    }

    updateSession (status) {
      // TODO: set the session to inactive  
    }

}


export class ShinyApp {

    constructor(config) {
        this.config = config;
        this.children = [];
        this.sessions = {};
    }

    startInstance (id) {  
        console.log("config: ", this.config)
        this.children.push(new ShinyAppInstance(id, this.config))
        let self = this
        
        return this.children[this.children.length - 1]
          .start()
          .then(msg => {
              console.log(msg)
          })
    }

    stopInstance (instance_id) {
       this.children[instance_id].stop()
    }

    getSession (id=null) {
        if (id && this.sessions[id]) {
            
            clearTimeout(this.sessions[id].timer);
            this.sessions[id].timer = setTimeout(() => this.closeSession(id), 3600*1000);
            return this.sessions[id];
            
        } else {
            
            id = uuid();
            
            // TODO: might need to check if the instances are running
            
            const nInstances = this.children.length
            console.log("nInstances: " + nInstances)
            if (nInstances === 0) {
                const newInstanceId = uuid()
                return this.startInstance(newInstanceId).then(() => {
                    this.sessions[id] = {
                        sessionId: id,
                        startedAt: (new Date()).getTime(),
                        closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
                        proxyUrl: `http://localhost:${this.children[newInstanceId]}`,
                        closeSession: () => this.closeSession(id),
                        instanceId: newInstanceId
                    }
                }).then(() => this.sessions[id])
                    
                

            } else if (nInstances === 1) {
                if (this.children[0].nActiveSessions < this.config.maxSessions) {
                    
                    this.sessions[id] = {
                        sessionId: id,
                        startedAt: (new Date()).getTime(),
                        proxyUrl: `http://localhost:${this.children[0].port}`,
                        closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
                        closeSession: () => this.closeSession(id),
                        instanceId: this.children[0].id
                    }

                    return this.children[0].id
                } else {
                    const newInstanceId = uuid()
                    return this.startInstance(newInstanceId).then(() => {
                        this.sessions[id] = {
                            sessionId: id,
                            startedAt: (new Date()).getTime(),
                            proxyUrl: `http://localhost:${this.children[newInstanceId].port}`,
                            closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
                            closeSession: () => this.closeSession(id),
                            instanceId: newInstanceId
                        }
                    }).then(() => id) 
                        
                    
                    
                    
                }
                
            } else if (nInstances > 1) {
                let instanceMinSessions = this.children.reduce((prev, curr) => {
                    return prev.nActiveSessions < curr.nActiveSessions ? prev : curr
                })
                
                if (instanceMinSessions.nActiveSessions < this.config.maxSessions) {
                  this.sessions[id] = {
                      sessionId: id,
                      startedAt: (new Date()).getTime(),
                      proxyUrl: `http://localhost:${instanceMinSessions.port}`,
                      closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
                      closeSession: () => this.closeSession(id),
                      instanceId: instanceMinSessions.id
                  }

                  return id

                } else {
                    // TODO: need to check that max instances has not been exceeded
                    const newInstanceId = uuid()
                    return this.startInstance(newInstanceId).then(() => {
                        this.sessions[id] = {
                            sessionId: id,
                            startedAt: (new Date()).getTime(),
                            proxyUrl: `http://localhost:${this.children[newInstanceId].port}`,
                            closeTimer: setTimeout(() => this.closeSession(id), 1800*1000),
                            closeSession: () => this.closeSession(id),
                            instanceId: newInstanceId
                        }
                    }).then(() => id) 
                    
                    
                }
            } 
            console.log("sessions: ", this.sessions)
            
        }
    }

    closeSession (id) {
        if (this.sessions[id]) {
            if (this.sessions[id].closeTimer) {
                clearTimeout(this.sessions[id].closeTimer);
            }
            delete this.sessions[id];
            setTimeout(() => this.scale(), 100);
        }
    }

}
