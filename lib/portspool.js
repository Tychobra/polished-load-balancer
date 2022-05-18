import tcpPortUsed from 'tcp-port-used';
import AsyncLock from 'async-lock';

const rangeStart = 3001
const rangeStop = 4000
const lock = new AsyncLock()

class PortsPool {

  constructor() {    
    this.inUse = new Set()
  }

  async getNext() {
    
    const nextPort = await lock.acquire('nextport', async () => {
      
      var port;
      for (port = rangeStart; port < rangeStop; port++) {
        if (!this.inUse.has(port)) {
          let inUse = await tcpPortUsed.check(port)
          if (!inUse) break
        }
      }
      this.inUse.add(port)
      return port;
    })

    return nextPort;
  }

  free(port) {
    this.inUse.delete(port);
  }

}

const portPool = new PortsPool();
export default portPool;