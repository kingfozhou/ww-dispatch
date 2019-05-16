import CentralDispatch from './CentralDispatch';

class RPCMainManager {
  constructor() {
    this.nextServiceWorkerId = 0;
    this.pendingServices = [];
    this.pendingWorkers = [];
    CentralDispatch.setService('services', this).catch(e => {
      console.error(`RPCManager was unable to register service: ${JSON.stringify(e)}`);
    });

    this.loadService('./Worker1.js');
    this.loadService('./Worker2.js');
  }

  loadService(serviceURL) {
    return new Promise((resolve, reject) => {
      const RPCWorker = require('worker-loader!./RPCWorker.js');
      CentralDispatch.addWorker(new RPCWorker());
      this.pendingServices.push({serviceURL, resolve, reject});
    });
  }

  allocateWorker() {
    const id = this.nextServiceWorkerId++;
    const workerInfo = this.pendingServices.shift();
    this.pendingWorkers[id] = workerInfo;
    return [id, workerInfo.serviceURL];
  }

  onWorkerInit(id, e) {
    const workerInfo = this.pendingWorkers[id];
    delete this.pendingWorkers[id];
    if (e) {
      workerInfo.reject(e);
    } else {
      workerInfo.resolve(id);
    }
  }
}

export default new RPCMainManager();