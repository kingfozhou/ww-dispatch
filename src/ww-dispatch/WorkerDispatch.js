import SharedDispatch from './CentralDispatch';

class WorkerDispatch extends SharedDispatch {
  constructor() {
    super();
    this._connectionPromise = new Promise(resolve => {
      this._onConnect = resolve;
    });
    this.services = {};
    this._onMessage = this._onMessage.bind(this, self);
    if (typeof self !== 'undefined') {
      self.onMessage = this._onMessage;
    }
  }

  get waitForConnection() {
    return this._connectionPromise;
  }

  setService(service, provider) {
    if (this.services.hasOwnProperty(service)) {
      console.warn(`Worker dispatch replacing existing service provider for ${service}`);
    }
    this.services[service] = provider;
    return this.waitForConnection.then(() => this._remoteCall(self, 'dispatch', 'serService', service));
  }

  _getServiceProvider(service) {
    const provider = this.services[service];
    return {
      provider: provider || self,
      isRemote: !provider
    }
  }

  _onDispatchMessage(worker, message) {
    let promise;
    switch (message.method) {
      case 'handshake':
        promise = this._onConnect();
        break;
      case 'terminate':
        setTimeout(() => self.close(), 0);
        promise = Promise.resolve();
        break;
      default:
        console.error(`Worker dispatch received message for unknown method: ${message.method}`);
    }
    return promise;
  }
}

export default new WorkerDispatch();