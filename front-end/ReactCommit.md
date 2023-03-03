#react/sourcecode

commitRoot

-   重置finishedWork，finishedLanes，callbackNode，callbackPriority
-   markRootFinished
-   如果fiber及其子tree 有PassiveMask Flag 则调度flushPassiveEffects
-   commitBeforeMutationEffects
-   commitMutationEffects
-   切换current树 root.current = finishedWork;
-   commitLayoutEffects

commitMutationEffects

commitMutationEffectsOnFiber

根据tag处理不同分支，主要执行recursivelyTraverseMutationEffects和commitReconciliationEffects

commitReconciliationEffects

往真实 DOM 树中插入 DOM 节点

  

处理带有MutationnoMask 和PassiveMask的副作用

![](https://cdn.nlark.com/yuque/0/2023/png/22244142/1673700911542-306628c4-e356-4409-aae5-04ad1c375f79.png)

DFS

![](https://cdn.nlark.com/yuque/0/2023/png/22244142/1673708544314-4fca1311-f313-46e5-84e3-5c16281dce12.png)


# Commit

  

  

执行commitRootImpl

function commitRootImpl(
  root: FiberRoot,
  recoverableErrors: null | Array<CapturedValue<mixed>>,
  transitions: Array<Transition> | null,
  renderPriorityLevel: EventPriority,
  ) {

    do {
  //执行flushPassiveEffects
  //flushPassiveEffectsImpl
  //flushPassiveEffectsImpl主要做三件事：
//调用该useEffect在上一次render时的销毁函数
//调用该useEffect在本次render时的回调函数
//如果存在同步任务，不需要等待下次事件循环的宏任务，提前执行他
  // `flushPassiveEffects` will call `flushSyncUpdateQueue` at the end, which
  // means `flushPassiveEffects` will sometimes result in additional
  // passive effects. So we need to keep flushing in a loop until there are
  // no more pending effects.
  // TODO: Might be better if `flushPassiveEffects` did not automatically
  // flush synchronous work at the end, to avoid factoring hazards like this.
  flushPassiveEffects();
} while (rootWithPendingPassiveEffects !== null);
flushRenderPhaseStrictModeWarningsInDEV();

if (enableSchedulingProfiler) {
  markCommitStarted(lanes);
}

// 清空FiberRoot对象上的属性
root.finishedWork = null;
root.finishedLanes = NoLanes;
// commitRoot never returns a continuation; it always finishes synchronously.
// So we can clear these now to allow a new callback to be scheduled.
root.callbackNode = null;
root.callbackPriority = NoLane;
// Check which lanes no longer have any work scheduled on them, and mark
// those as finished.
let remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);

// Make sure to account for lanes that were updated by a concurrent event
// during the render phase; don't mark them as finished.
const concurrentlyUpdatedLanes = getConcurrentlyUpdatedLanes();
remainingLanes = mergeLanes(remainingLanes, concurrentlyUpdatedLanes);

markRootFinished(root, remainingLanes);

if (root === workInProgressRoot) {
  // 重置全局变量 We can reset these now that they are finished.
  workInProgressRoot = null;
  workInProgress = null;
  workInProgressRootRenderLanes = NoLanes;
} else {
  // This indicates that the last root we worked on is not the same one that
  // we're committing now. This most commonly happens when a suspended root
  // times out.
}

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
      flushPassiveEffects();
      // This render triggered passive effects: release the root cache pool
      // *after* passive effects fire to avoid freeing a cache pool that may
      // be referenced by a node in the tree (HostRoot, Cache boundary etc)
      return null;
    });
  }
}

const shouldFireAfterActiveInstanceBlur = commitBeforeMutationEffects(
  root,
  finishedWork,
);
commitMutationEffects(root, finishedWork, lanes);
resetAfterCommit(root.containerInfo);
// The work-in-progress tree is now the current tree. This must come after
// the mutation phase, so that the previous tree is still current during
// componentWillUnmount, but before the layout phase, so that the finished
// work is current during componentDidMount/Update.
root.current = finishedWork;
commitLayoutEffects(finishedWork, root, lanes);
// Tell Scheduler to yield at the end of the frame, so the browser has an
// opportunity to paint.
requestPaint();

const rootDidHavePassiveEffects = rootDoesHavePassiveEffects;
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
  if (__DEV__) {
    nestedPassiveUpdateCount = 0;
    rootWithPassiveNestedUpdates = null;
  }
}
  if (
    includesSomeLane(pendingPassiveEffectsLanes, SyncLane) &&
    root.tag !== LegacyRoot
  ) {
    flushPassiveEffects();
  }
}

  

-   commitBeforeMutationEffects

-   调用 类组件的 getSnapshotBeforeUpdate 生命周期方法

-   commit

-   commitPlacement。调用 parentNode.appendChild(child); 或者 container.insertBefore(child, beforeChild) 插入 DOM 节点
-   commitWork。

-   对于 HostText 节点，直接更新 nodeValue
-   对于类组件，什么都不做
-   同步调用函数组件 useLayoutEffect 的清除函数，这个函数对于类组件没有任何操作

-   commitDeletion。主要是删除 DOM 节点，以及调用当前节点以及子节点所有的 卸载 相关的生命周期方法

-   同步调用函数组件的 useLayoutEffect 的 清除函数，这是同步执行的
-   将函数组件的 useEffect 的 清除函数 添加进异步刷新队列，这是异步执行的
-   同步调用类组件的 componentWillUnmount 生命周期方法

-   commitLayoutEffect

-   对于 HostComponent。判断是否需要聚焦
-   对于 HostText。什么都不做。
-   对于类组件。

-   执行类组件的 componentDidMount 生命周期方法，同步执行
-   执行类组件的 componentDidUpdate 生命周期方法，同步执行
-   执行类组件 this.setState(arg, callback) 中的 callback 回调，同步执行

-   调用函数组件的 useLayoutEffect 监听函数，同步执行
-   将函数组件的 useEffect 监听函数放入异步队列，异步执行

在commitLayoutEffect中，会调用commitLayoutEffectOnFiber，在commitLayoutEffectOnFiber中，会根据fiber的tag进行switch调用,处理不同的fiber，其中会执行recursivelyTraverseLayoutEffects，recursivelyTraverseLayoutEffects会递归child，遍历sibling去调用commitLayoutEffectOnFiber.

可以看到在Commit阶段，和React17的遍历副作用链表不同，React18会遍历Fiber树。根据fiber node的flag去处理副作用。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1670297721753-c3c9ee77-59ad-4179-909b-e62aca6a9177.png)