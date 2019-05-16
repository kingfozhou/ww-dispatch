import SharedDispatch from './SharedDispatch';

class CentralDispatch extends SharedDispatch {
  constructor() {
    super();
    this.services = {};// 所提供的服务列表（包含本地服务和远程worker服务）
    this.workerClass = (typeof Worker === 'undefined') ? null : Worker;
    this.workers = []; // 
  }

  callSync(service, method, ...args) {
    const { provider, isRemote } = this._getServiceProvider(service);
    if (provider) {
      if (isRemote) {
        throw new Error(`Cannot use 'callSync' on remote provider for service ${service}`);
      }

      return provider[method].apply(provider, args);
    }
    throw new Error(`Provider not found for services: ${service}`);
  }

  setServiceSync(service, provider) {
    if (this.services.hasOwnProperty(service)) {
      console.warn(`Central dispatch replacing existing service provider for ${service}`);
    }
    this.services[service] = provider;
  }

  setService(service, provider) {
    try {
      this.setServiceSync(service, provider);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  addWorker(worker) {
    if (this.workers.indexOf(worker) === -1) {
      this.workers.push(worker);
      worker.onmessage = this._onMessage.bind(this, worker);
      this._remoteCall(worker, 'dispatch', 'handshake').catch(e => {
        console.error(`Could not handshake with worker: ${JSON.stringify(e)}`);
      });
    } else {
      console.warn(`Central dispatch ignoring attempt to add duplicate worker`);
    }
  }

  _getServiceProvider(service) {
    const provider = this.services[service];
    return provider && {
      provider,
      isRemote: Boolean(this.workerClass && provider instanceof this.workerClass)
    };
  }

  _onDispatchMessage(worker, message) {
    let promise;
    switch(message.method) {
      case 'setService':
        promise = this.setService(message.args[0], worker);
        break;
      default:
        console.error(`Central dispatch received message for unknown method: ${message.method}`);
    }
    return promise;
  }
}

export default new CentralDispatch();