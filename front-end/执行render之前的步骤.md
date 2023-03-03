#react/sourcecode
  
#react
createRoot主要是为了得到fiberNodeRoot，也就是根fiber节点。初始化之后，执行render开始渲染流程

![](https://cdn.nlark.com/yuque/0/2022/jpeg/22244142/1666109679518-ae5dbdb5-d014-4691-9482-8ed2af544f87.jpeg)

开始执行createRoot.

```
export function createRoot(container, options) {
  return createRootImpl(container, options);
}
```


createRoot执行creatRootImpl

```
export function createRootImpl(container, options) {
    const root = createContainer(container, options);
	//往node节点上挂在hostroot
    markContainerAsRoot(root.current, container);
    // let root = cont
    //事件相关，暂不处理
    //     const rootContainerElement: Document | Element | DocumentFragment =
    //     container.nodeType === COMMENT_NODE
    //       ? (container.parentNode: any)
    //       : container;
    //   listenToAllSupportedEvents(rootContainerElement);

    return new ReactDOMRoot(root);
}
```



在createRootImpl中，有以下步骤

-   执行createContainer创建容器
-   标记container为root
-   初始化所有监听事件
-   返回ReactDOMRoot实例

在createContainer中

```

/**
 * 
 * @param {*} containerInfo 
 * @param {*} tag 
 * @param {*} hydrationCallbacks 
 * @param {*} isStrictMode 
 * @param {*} concurrentUpdatesByDefaultOverride 
 * @param {*} identifierPrefix 
 * @param {*} onRecoverableError 
 * @param {*} transitionCallbacks 
 */
export function createContainer(
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks
) {
    const hydrate = false;
    const initialChildren = null;
    // console.log(containerInfo)
    return createFiberRoot(
        containerInfo,
        tag,
        hydrate,
        initialChildren,
        hydrationCallbacks,
        isStrictMode,
        concurrentUpdatesByDefaultOverride,
        identifierPrefix,
        onRecoverableError,
        transitionCallbacks
    );
}

export function createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    initialChildren,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    // TODO: We have several of these arguments that are conceptually part of the
    // host config, but because they are passed in at runtime, we have to thread
    // them through the root constructor. Perhaps we should put them all into a
    // single type, like a DynamicHostConfig that is defined by the renderer.
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks
) {
    const root = new FiberRootNode(
        containerInfo,
        tag,
        hydrate,
        identifierPrefix,
        onRecoverableError
    );
    const uninitializedFiber = createHostRootFiber(
        tag,
        isStrictMode,
        concurrentUpdatesByDefaultOverride
    );
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;
    
    initializeUpdateQueue(uninitializedFiber);
    return root;
}
```


创建FiberRootNode和RootFiber，互相挂载，返回root。初始化Fiber的update队列。fiberRoot保存构建过程中所依赖的全局状态。

最终返回ReactDOMRoot
![[Pasted image 20230302160845.png]]
上面有着FiberRootNode属性,原型上有着render，unmount两个方法


FiberRootNode

-   属于react-reconciler包, 作为react-reconciler在运行过程中的全局上下文, 保存 fiber 构建过程中所依赖的全局状态.
-   其大部分实例变量用来存储fiber 构造循环(详见[两大工作循环](https://github.com/7kms/react-illustration-series/blob/main/docs/main/workloop.md))过程的各种状态.react 应用内部, 可以根据这些实例变量的值, 控制执行逻辑.

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1666195521515-4257142b-a856-46ef-88b1-95be250267c7.png)

# 引用

[https://github.com/7kms/react-illustration-series/blob/main/docs/main/bootstrap.md](https://github.com/7kms/react-illustration-series/blob/main/docs/main/bootstrap.md)