import tcpPortUsed from 'tcp-port-used';
import AsyncLock from 'async-lock';

const rangeStart = 3001
const rangeStop = 4000

class PortsPool {

  constructor() {
    this.inUse = new Set()
    this.lock = new AsyncLock()
  }

  async getNext() {
    const nextPort = await this.lock.acquire('nextport', async () => {
      let port
    
      for (port = rangeStart; port < rangeStop; port++){
        
        if (!this.inUse.has(port)) {
          let inUse = await tcpPortUsed.check(port)
          
          if (!inUse) break
        }
      }
    
      this.inUse.add(port)
      return port
    })
        
    return nextPort
  }

  free(port) {
    this.inUse.delete(port)
  }

}

const portPool = new PortsPool()
export default portPool
