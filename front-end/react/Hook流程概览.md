在React Hook中，组件mount时的hook与update时的hook来源于不同的对象，这类对象在源码中被称为dispatcher:
```typescript

const HooksDispatcherOnMount: Dispatcher = {
  readContext,

  useCallback: mountCallback,
  useContext: readContext,
  useEffect: mountEffect,
  useImperativeHandle: mountImperativeHandle,
  useLayoutEffect: mountLayoutEffect,
  useInsertionEffect: mountInsertionEffect,
  useMemo: mountMemo,
  useReducer: mountReducer,
  useRef: mountRef,
  useState: mountState,
  useDebugValue: mountDebugValue,
  useDeferredValue: mountDeferredValue,
  useTransition: mountTransition,
  useMutableSource: mountMutableSource,
  useSyncExternalStore: mountSyncExternalStore,
  useId: mountId,
};



const HooksDispatcherOnUpdate: Dispatcher = {
  readContext,

  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useInsertionEffect: updateInsertionEffect,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: updateReducer,
  useRef: updateRef,
  useState: updateState,
  useDebugValue: updateDebugValue,
  useDeferredValue: updateDeferredValue,
  useTransition: updateTransition,
  useMutableSource: updateMutableSource,
  useSyncExternalStore: updateSyncExternalStore,
  useId: updateId,
};
```

在FC进入render流程前，会根据FC对应fiberNode的如下判断条件为ReactCurrentDispatcher.current赋值。其中current.memoizedState保存hook对应数据。在FC render时，可以从ReactCurrentDispatcher.current中获取当前上下文环境Hoks对应的实现。
```javascript
  ReactCurrentDispatcher.current =
      current === null || current.memoizedState === null
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate;
```
这样设计的目的是检测Hooks执行的上下文环境。考虑如下情况，当错误地写了嵌套形式的hook：
```javascript
useEffect(()=>{
	useState(0)
})
```
此时ReactCurrentDispatcher.current已经指向ContextOnlyDispatcher，所以执行useState方法时，实际执行的是throwInvalidHookError方法。
```javascript

export const ContextOnlyDispatcher: Dispatcher = {
  readContext,

  useCallback: throwInvalidHookError,
  useContext: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useImperativeHandle: throwInvalidHookError,
  useInsertionEffect: throwInvalidHookError,
  useLayoutEffect: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useReducer: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useState: throwInvalidHookError,
  useDebugValue: throwInvalidHookError,
  useDeferredValue: throwInvalidHookError,
  useTransition: throwInvalidHookError,
  useMutableSource: throwInvalidHookError,
  useSyncExternalStore: throwInvalidHookError,
  useId: throwInvalidHookError,
};

```
该方法会直接抛出错误
虽然基于ReactCurrentDispatcher.current指向Hooks的实现由众多好处，但也为开发者带来了一些困惑。比如，开发组件库时，使用npm link进行本地调试，如果组件库中Hooks对应的ReactCurrentDispatcher.current与项目中的ReactCurrentDispatcher.current来自不同的React引用，就会报错。这时候需要在项目中为React中添加alias解决这个问题。

# Hooks数据结构
Hooks的数据结构与Update类似，相信读者已经熟悉这些字段的意义：
```javascript
const hook = {
	memoizedState: null,
	baseState: null,
	baseQueue: null,
	queue: null,
	next: null
}
```

这里主要关注memoizedState字段，了解hook.momoizedState与fiberNode.memoizedState属性的区别。
fiber.memozedSae:"FC"对应的fiberNode保存的Hooks链表中的第一个hook数据。
hook.memoizedState:某个hook自身的数据
不同类型Hook的memoziedState保存了不同类型的数据，比如：
* useState：保存state的值
* useReducer：保存state的值
* useEffect：保存callack、[...deps]等数据
* useRef：保存{current: initialValue}
* useMemo: 保存[callback(),[...deps]]
* useCallback: 保存[callback,[...deps]]
有些hook不需要memoizedState保存自身数据，比如useContext。

# Hooks执行流程
所以Hooks执行流程大体一致
1. FC进入redner流程前，确定ReactCurrentDispatcher.current指向
2. 进入mount流程是，执行mount对应逻辑，方法名一般为"mountXXX"，如mountState
3. update时，执行udpate对应逻辑，方法名一般为updateXXX，如uateState
```javascript
function updateXXX(){
	//获取对应hook
	const hook = updateWorkInProgressHook();
	//...执行hook自身操作
}
```
4. 其他情况hook执行，一炬ReactCurrentDispatcher.current指向不同处理。
上述mountWorkInProgressHook方法用于在mount时获取对应hook数据，类似简易视线中的isMount部分逻辑。其实现如下:
```javascript

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,

    baseState: null,
    baseQueue: null,
    queue: null,

    next: null,
  };

  if (workInProgressHook === null) {
    // This is the first hook in the list
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // Append to the end of the list
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```
updateWorkInProgressHook方法用于在update时获取对应hook数据，目的与mountWorkInProgressHook方法类似，但实现比mountWorkInProgressHook方法复杂，主要原因在于update时需要区分两种情况：
1. 正常update流程，此时会克隆currentHook作为workInProgressHook并返回
2. render阶段触发的更新，因为上一轮render阶段已经创建了workInProgressHook，所以直接返回workInProgressHook

# useReducer
useReducer与useState的区别主要体现在queue.lastRenderReducer属性上，其代表"上一次render时使用的reducer"。其中：
1. useReducer的lastRenderReducer为传入的reducer参数
2. useState的lastRenderReducer为basicStateReducer
```typescript
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  // $FlowFixMe[incompatible-use]: Flow doesn't like mixed types
  return typeof action === 'function' ? action(state) : action;
}
```
 在update时，useReducer与useState执行的同一个函数-updateReducer:
 ```typescript
 
function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;

  if (queue === null) {
    throw new Error(
      'Should have a queue. This is likely a bug in React. Please file an issue.',
    );
  }

  queue.lastRenderedReducer = reducer;

  const current: Hook = (currentHook: any);

  // The last rebase update that is NOT part of the base state.
  let baseQueue = current.baseQueue;

  // The last pending update that hasn't been processed yet.
  const pendingQueue = queue.pending;
  if (pendingQueue !== null) {
    // We have new updates that haven't been processed yet.
    // We'll add them to the base queue.
    if (baseQueue !== null) {
      // Merge the pending queue and the base queue.
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }

```

