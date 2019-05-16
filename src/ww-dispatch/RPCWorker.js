import WorkerDispatch from './WorkerDispatch';

class RPCWorker {
  constructor() {
    this.nextServiceId = 0;
    this.initialRegistrations = [];

    WorkerDispatch.waitForConnection.then(() => {
      WorkerDispatch.call('services', 'allocateWorker').then(x => {
        const [id, service] = x;
        
        try {
          // service 因为是在worker中加载，我们指定worker中有一个全局的访问点
          // global.RPC.services.register(serviceObject)
          importScripts(service);

          const initialRegistrations = this.initialRegistrations;
          this.initialRegistrations = null;

          Promise.all(initialRegistrations).then(() => WorkerDispatch.call('services', 'onWorkerInit', id));
        } catch(e) {
          WorkerDispatch.call('services', 'onWorkerInit', id, e);
        }
      })
    });
  }
}

global.RPC = global.RPC || {};

const rpcWorker = new RPCWorker();
global.RPC.services = {
  register: rpcWorker.register.bind(rpcWorker)
};