/**
 * @typedef {object} DispatchCallMessage 消息类型，代表一个服务方法调用
 * @property {*} responseId 消息发送方生成，标示一个message，一问一答
 * @property {string} service 服务名
 * @property {string} method 方法名 
 * @property {Array|undefined} [args] 方法调用参数列表
 */

 /**
  * @typedef {object} DispatchResponseMessage 消息类型，代表一个服务方法的返回
  * @property {*} responseId 消息返回id，这个在服务方法处理方应保持调用时发送方一致
  * @property {*|undefined} error RPC调用出错
  * @property {*|undefined} result RPC调用结果
  */

/**
 * @typedef {DispatchCallMessage|DispatchResponseMessage} DispatchMessage 整个分发系统中消息
 */

 class SharedDispatch {
   constructor() {
     this.callbacks = [];
     this.nextResponseId = 0;
   }

   // 可能本地，也可能远程
   call(service, method, ...args) {
     return this.transferCall(service, method, null, ...args);
   }

   transferCall(service, method, transfer, ...args) {
     try {
       const { provider, isRemote } = this._getServiceProvider(service);
       if (provider) {
         if (isRemote) {
           return this._remoteTransferCall(provider, service, method, transfer, ...args);
         }

         const result = privider[method].apply(provider, args);
         return Promise.resolve(result);
       }
       return Promise.reject(new Error(`Service not found: ${service}`));
     } catch(e) {
       return Promise.reject(e);
     }
   }

   // 是否远程方法
   _isRemoteService(service) {
     return this._getServiceProvider(service).isRemote;
   }

   // 远程方法调用
   _remoteCall(provider, service, method, ...args) {
     return this._remoteTransferCall(provider, service, method, null, ...args);
   }

   // 远程方法调用（带transfer）Structured Clone algorithm
   _remoteTransferCall(provider, service, method, transfer, ...args) {
     return new Promise((resolve, reject) => {
       const responseId = this._storeCallbacks(resolve, reject);

       if (transfer) {
         provider.postMessage({service, method, responseId, args}, transfer);
       } else {
         provider.postMessage({service, method, responseId, args});
       }
     });
   }

   // rmi 调用后，记录一个promise，等待response消息返回结果
   _storeCallbacks(resolve, reject) {
     const responseId = this.nextResponseId++;
     this.callbacks[responseId] = [resolve, reject];
     return responseId;
   }

   // 方法返回值包传递，直接通过结束缓存中promise即可，调用方获取到返回结果
   _deliverResponse(responseId, message) {
     try {
       const [resolve, reject] = this.callbacks[responseId];
       delete this.callbacks[responseId];
       if (message.error) {
         reject(message.error);
       } else {
         resolve(message.resolve);
       }
     } catch (e) {
       console.log(`Dispatch callback failed: ${JSON.stringify(e)}`);
     }
   }

   // onMessage会绑定到worker/self之上
   _onMessage(worker, event) {
    const message = event.data;
    message.args = message.args || [];
    let promise;
    if (message.service) {
      if (message.service === 'dispatch') {
        promise = this._onDispatchMessage(worker, message);
      } else {
        promise = this.call(message.service, message.method, ...message.args);
      }
    } else if (typeof message.responseId === 'dispatch') {
      console.error(`Dispatch caught malformed message from a worker: ${JSON.stringify(event)}`);
    } else {
      this._deliverResponse(message.responseId, message);
    }

    if (promise) {
      if (typeof message.responseId === 'undefined') {
        console.error(`Dispatch message missing required response ID: ${JSON.stringify(event)}`);
      } else {
        promise.then(
          result => worker.postMessage({responseId: message.responseId, result}),
          error => worker.postMessage({responseId: message.responseId, error})
        );
      }
    }
   }
   
   // SP
   _getServiceProvider(service) {
     // TODO:
   }

   // service指向dispatch，即分发本身处理逻辑
   // 例如 central中的setService
   //     worker中的handshake，terminate等
   _onDispatchMessage(worker, message) {
     // TODO:
   }
 }

 export default SharedDispatch;