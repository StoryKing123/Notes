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
所以，useState可以视为reducer参数为basicStateReducer的useReducer
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



# effect相关Hook
React中用于定义由副作用的因变量的Hook总共有三个：
1. useEffect
回调函数在commit阶段完成后异步执行，所以不会阻塞视图渲染
2. useLayoutEffect
回调函数会在commit阶段的Layout子阶段同步执行，一般用于执行DOM相关操作
3. useInsertionEffect
回调函数会在commit阶段的Mutation子阶同步执行，与useLayoutEffect的区别在于-useInsertionEffect执行时无法访问对DOM的引用。这个Hook是专为Css-in-JS库插入全局Style元素或Defs元素（对于SVG）而设计的。
## 数据结构
对于三个effec相关Hook，hook.memoizedState公用一套数据结构：
```javascript
const effect = {
	//用于区分effect类型Passive | Layout | Insertion
	tag,
	//effect回调函数
	create,
	//effect销毁函数
	destroy,
	//依赖项
	deps,
	//与当前FC的其他effect形成环状链表
	next:null
}
```

其中tag字段用于区分effect类型，比如：
1. Passive代表useEffect
2. Layout代表useLayoutEffect
3. Insertion代表useInsertionEffect
create与destroy分别指代effect回调函数与effect销毁函数，考虑如下useEffect：
```javascript
useEffect(()=>{
	//这里是回create
	return ()=>{
	//这里是destroy
	}
},[])
```
next字段用于与当前FC的其他effect形成环状链表，连接方式为单向环状链表。注意区分其于fiberNode.memoizedState的区别
![[effect结构.excalidraw|675]]

## 声明阶段
整体工作流程分为三个阶段：
1. 声明阶段
2. 调度阶段（useEffect独有）
3. 执行阶段
声明阶段即FC render，effect相关Hook执行的阶段，其工作流程如下
![[effect声明阶段.excalidraw|675]]

```typescript
function updateEffectImpl(
  fiberFlags: Flags,
  hookFlags: HookFlags,
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const effect: Effect = hook.memoizedState;
  const inst = effect.inst;

  // currentHook is null when rerendering after a render phase state update.
  if (currentHook !== null) {
    if (nextDeps !== null) {
      const prevEffect: Effect = currentHook.memoizedState;
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(hookFlags, create, inst, nextDeps);
        return;
      }
    }
  }

  currentlyRenderingFiber.flags |= fiberFlags;

  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    inst,
    nextDeps,
  );
}

```

mount 与 update 分别对应 mountEffectImpl与 updateEffectImpl 方法。区别在于update时会比较deps是否变化，逻辑如下：
```javascript
if (areHookInputsEqual(nextDeps, prevDeps)) {
  hook.memoizedState = pushEffect(hookFlags, create, inst, nextDeps);
  return;
}
```

areHookInputsEqual方法采用浅比较的方式遍历并判断deps是否发生变化
```typescript

function areHookInputsEqual(
  nextDeps: Array<mixed>,
  prevDeps: Array<mixed> | null,
): boolean {

  if (prevDeps === null) {
    return false;
  }

  // $FlowFixMe[incompatible-use] found when upgrading Flow
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    // $FlowFixMe[incompatible-use] found when upgrading Flow
    // 使用object.is 判断
    if (is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
```
无论deps在mount和update流程中是否发生变化,最终都会执行pushEffect方法，该方法的目的是创建effect并形成单向环状链表
```typescript

function pushEffect(
  tag: HookFlags,
  create: () => (() => void) | void,
  inst: EffectInstance,
  deps: Array<mixed> | null,
): Effect {
  const effect: Effect = {
    tag,
    create,
    inst,
    deps,
    // Circular
    next: (null: any),
  };
  let componentUpdateQueue: null | FunctionComponentUpdateQueue =
    (currentlyRenderingFiber.updateQueue: any);
    //创建单向环向链表
  if (componentUpdateQueue === null) { 
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = (componentUpdateQueue: any);
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
```
即使update时effect deps没有变化，也会创建对应effect，以此保证effect链表中effect数量、顺序的稳定区分“effect create回调是否应该执行”需要依靠HasEffect tag：
```javascript
// update时deps没有变化的情况
hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);

// update时deps发生变化的情况
hook.memoizedState = pushEffect(HasEffect | hookFlags, create, destroy,nextDeps);
```
deps变化时，会加上一个HasEffect flag，这个flag会在commit阶段遍历effect链表时使用。

## 调度阶段
由于useEffect的回调函数会在commit阶段完成后异步执行，因此需要经历调度阶段。在commit阶段三个子阶段开始之前，会执行如下代码调度useEffect：
```typescript
  //执行阶段：在commitBeforeMutationEffects之前
  // If there are pending passive effects, schedule a callback to process them.
  // Do this as early as possible, so it is queued before anything else that
  // might get scheduled in the commit phase. (See #16714.)
  // TODO: Delete all other places that schedule the passive effect callback
  // They're redundant.
  if (
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
    (finishedWork.flags & PassiveMask) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      pendingPassiveEffectsRemainingLanes = remainingLanes;
      // workInProgressTransitions might be overwritten, so we want
      // to store it in pendingPassiveTransitions until they get processed
      // We need to pass this through as an argument to commitRoot
      // because workInProgressTransitions might have changed between
      // the previous render and commit if we throttle the commit
      // with setTimeout
      pendingPassiveTransitions = transitions;
      scheduleCallback(NormalSchedulerPriority, () => {
        //执行effect回调函数的具体方法
        flushPassiveEffects();
        // This render triggered passive effects: release the root cache pool
        // *after* passive effects fire to avoid freeing a cache pool that may
        // be referenced by a node in the tree (HostRoot, Cache boundary etc)
        return null;
      });
    }
  }
  
```

其中PassiveMask Tag包含 useEffect对应tag （Passive）
```javascript
const PassiveMask = Passive | ChildDeletion;
```

commit阶段在结尾处会根据调度阶段赋值的rootDoesHavePassiveEffects变量赋值rootWithPendingPassiveEffects变量：
```typescript
//commitLayoutEffects执行完了，root.current = finishedWork之后
const rootDidHavePassiveEffects = rootDoesHavePassiveEffects
if (rootDoesHavePassiveEffects) {
  // This commit has passive effects. Stash a reference to them. But don't
  // schedule a callback until after flushing layout work.
  rootDoesHavePassiveEffects = false;
  rootWithPendingPassiveEffects = root;
  pendingPassiveEffectsLanes = lanes;
} else {
  // There were no passive effects, so we can immediately release the cache
  // pool for this render.
  releaseRootPooledCache(root, remainingLanes);
}
```
当调度结束之后，scheduleCallback方法会执行回调函数内部的flushPassiveEffects方法，进入useEffect的执行阶段：

```typescript
//简化版
export function flushPassiveEffects(): boolean {
  //根据rootWithPendingPassiveEffects变量判断是否需要执行useEffect回调函数
  if (rootWithPendingPassiveEffects !== null) {
	  //省略具体流程
      return flushPassiveEffectsImpl();
  }
  return false;
}
```

```typescript
//完整版
export function flushPassiveEffects(): boolean {
  // Returns whether passive effects were flushed.
  // TODO: Combine this check with the one in flushPassiveEFfectsImpl. We should
  // probably just combine the two functions. I believe they were only separate
  // in the first place because we used to wrap it with
  // `Scheduler.runWithPriority`, which accepts a function. But now we track the
  // priority within React itself, so we can mutate the variable directly.
  //根据rootWithPendingPassiveEffects变量判断是否需要执行useEffect回调函数
  if (rootWithPendingPassiveEffects !== null) {
    // Cache the root since rootWithPendingPassiveEffects is cleared in
    // flushPassiveEffectsImpl
    const root = rootWithPendingPassiveEffects;
    // Cache and clear the remaining lanes flag; it must be reset since this
    // method can be called from various places, not always from commitRoot
    // where the remaining lanes are known
    const remainingLanes = pendingPassiveEffectsRemainingLanes;
    pendingPassiveEffectsRemainingLanes = NoLanes;

    const renderPriority = lanesToEventPriority(pendingPassiveEffectsLanes);
    const priority = lowerEventPriority(DefaultEventPriority, renderPriority);
    const prevTransition = ReactCurrentBatchConfig.transition;
    const previousPriority = getCurrentUpdatePriority();

    try {
      ReactCurrentBatchConfig.transition = null;
      setCurrentUpdatePriority(priority);
      return flushPassiveEffectsImpl();
    } finally {
      setCurrentUpdatePriority(previousPriority);
      ReactCurrentBatchConfig.transition = prevTransition;

      // Once passive effects have run for the tree - giving components a
      // chance to retain cache instances they use - release the pooled
      // cache at the root (if there is one)
      releaseRootPooledCache(root, remainingLanes);
    }
  }
  return false;
}
```
由于调度阶段的存在，为了保证下一次commit阶段执行前本次commit阶段调度的useEffect均已执行，commit阶段会在入口处执行flushPassiveEffects方法，已保证本次commit阶段执行时，不存在“还在调度中，未执行的useEffect”
```typescript
function commitRootImpl(
  root: FiberRoot,
  recoverableErrors: null | Array<CapturedValue<mixed>>,
  transitions: Array<Transition> | null,
  renderPriorityLevel: EventPriority,
) {
  do {
    // `flushPassiveEffects` will call `flushSyncUpdateQueue` at the end, which
    // means `flushPassiveEffects` will sometimes result in additional
    // passive effects. So we need to keep flushing in a loop until there are
    // no more pending effects.
    // TODO: Might be better if `flushPassiveEffects` did not automatically
    // flush synchronous work at the end, to avoid factoring hazards like this.
    flushPassiveEffects();
  } while (rootWithPendingPassiveEffects !== null);
  //省略代码
 }
```

flushPassiveEffects方法之所以包裹在do...while循环中，是因为该方法会执行flushSyncCallbacks方法，遍历并执行所有被调度的更新。在更新执行过程中，useEffect的生命阶段可能有会标记HasEffect tag，所以需要循环执行flushPassiveEffects方法知道所有遗留的useEffect回调都执行完毕。

## 执行阶段
在这三个effect相关Hooks的执行将人，commitHookEffectListUnmount方法（用于遍历effect链表依次执行effect.destroy方法）与commitHookEffectListMount方法（用于遍历effect链表依次执行effect.create方法）会依次执行：
```typescript
function commitHookEffectListUnmount(
  flags: HookFlags,
  finishedWork: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  const updateQueue: FunctionComponentUpdateQueue | null =
    (finishedWork.updateQueue: any);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
	// 遍历effect链表
    do {
      if ((effect.tag & flags) === flags) {
        // Unmount
        const inst = effect.inst;
        const destroy = inst.destroy;
        if (destroy !== undefined) {
          inst.destroy = undefined;
          safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy);
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

```

注意执行过程中dvtag的判断，根据判断结果区分“effect的类型”以及“是否需要执行effect回调函数”：
```javascript
 if ((effect.tag & flags) === flags) {
	 //省略代码
 }
```
commitHookEffectListMount方法的执行过程如下，“在生命阶段创建，但是没有标记HasEffect tag的effect回调”不会执行：
```typescript

function commitHookEffectListMount(flags: HookFlags, finishedWork: Fiber) {
  const updateQueue: FunctionComponentUpdateQueue | null =
    (finishedWork.updateQueue: any);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
       
        // Mount
        const create = effect.create;

        const inst = effect.inst;
        const destroy = create();
        inst.destroy = destroy;


      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
```

```javascript

//类型为useInsertionEffect且存在HasEffect tag的effect会执行回调
commitHookEffectListMount(HookInsertion | HookHasEffect,fiber,)
//类型为useEffect且存在HasEffect tag的effect会执行回调
commitHookEffectListMount(HookPassive | HookHasEffect, fiber)；
//类型为useLayoutEffect且存在HasEffect tag的effect会执行回调
commitHookEffectListMount(HookLayout | HookHasEffect, fiber);

```

由于commitHookEffectListUnmount 方法会由于commitEffectListMount方法执行，因此所有effect.destroy执行后才会执行任意effect.create

# useMemo 与useCallback
useMemo用于缓存一个值，useCallback用于缓存一个函数，他们的实现比较类似，且比较简单。这里针对mount时与update时分别进行讨论

## mount时执行流程
从以下代码可以发现，useMemo时useCallback与mount时的唯一区别是：useMemo会执行传入的函数并返回需要缓存的值，而useCallback会将传入的函数直接作为需要缓存的函数：
```typescript
function mountMemo<T>(
  nextCreate: () => T,
  deps: Array<mixed> | void | null,
): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  if (shouldDoubleInvokeUserFnsInHooksDEV) {
    nextCreate();
  }
  //执行create，返回需要缓存的值
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function mountCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}
```

## update时执行流程
相较于mount时，update时增加了比较deps是否变化的逻辑。如果变化，则重新缓存新值。如果没有变化，则返回缓存的值：
```typescript

function updateMemo<T>(
  nextCreate: () => T,
  deps: Array<mixed> | void | null,
): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  // Assume these are defined. If they're not, areHookInputsEqual will warn.
  if (nextDeps !== null) {
    const prevDeps: Array<mixed> | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  if (shouldDoubleInvokeUserFnsInHooksDEV) {
    nextCreate();
  }
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}


function updateCallback<T>(callback: T, deps: Array<mixed> | void | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (nextDeps !== null) {
    const prevDeps: Array<mixed> | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

```

## useMemo作用
利用useMemo缓存变量的特性，可以实现与命中bailout策略类似的效果。
```jsx
function Child(){
	console.log("child render")
	return <p>child</p>
}


function App(){
	const [num,updateNum] = useState(0)
	const child = useMemo(()=> <Child />,[]);
	const onClick  //...
	return (<div onClick={onClick}>
		{child}
	</div>)

}
```

在Children的beginWork中，由于oldProps === newProps（前后props都是useMemo的返回值），且其满足其他bailout所需条件，因此Child组件命中bailout策略，不再打印“children render”。


