import {spawn} from 'child_process';
import portsPool from './portspool.js';


const timeout_delay = 10

export default class ShinyAppInstance {

  constructor(id, config) {
    this.config = config
    this.status = 'INIT'
    this.nActiveSessions = 0
    this.nTotalSessions = 0 // both active and closed sessions
    this.id = id
    this.port = null
    // the child process
    this.child = null;
    console.log("shiny app instance initialized: " + id)
  }

  async start () {
    
    return portsPool.getNext()
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
            this.start()
          }
        });

        this.child.stderr.on('data', data => {
          
          const hold = data.toString()
          console.log("stderr: ", hold)
          if (this.status === 'STARTING' && hold.includes('Listening on')) {
            this.status = 'RUNNING';
            setTimeout(() => resolve('Shiny app instance started'), timeout_delay);
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