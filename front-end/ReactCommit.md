#react/sourcecode

![[Pasted image 20230306175705.png]]
在Reconciler阶段完成之后，会进入finishConcurrentRender方法，针对不同的reconciler结果，进入不同的分支，如果状态是RootCompleted，进入commitRoot，commitRoot调用commitRootImpl

```typescript
  

function finishConcurrentRender(root, exitStatus, lanes) {

  switch (exitStatus) {

    case RootInProgress:

    case RootFatalErrored: {

      throw new Error('Root did not complete. This is a bug in React.');

    }

    // Flow knows about invariant, so it complains if I add a break

    // statement, but eslint doesn't know about invariant, so it complains

    // if I do. eslint-disable-next-line no-fallthrough

    case RootErrored: {

      // We should have already attempted to retry this tree. If we reached

      // this point, it errored again. Commit it.

      commitRoot(

        root,

        workInProgressRootRecoverableErrors,

        workInProgressTransitions,

      );

      break;

    }

    case RootSuspended: {

      markRootSuspended(root, lanes);

  

      // We have an acceptable loading state. We need to figure out if we

      // should immediately commit it or wait a bit.

  

      if (

        includesOnlyRetries(lanes) &&

        // do not delay if we're inside an act() scope

        !shouldForceFlushFallbacksInDEV()

      ) {

        // This render only included retries, no updates. Throttle committing

        // retries so that we don't show too many loading states too quickly.

        const msUntilTimeout =

          globalMostRecentFallbackTime + FALLBACK_THROTTLE_MS - now();

        // Don't bother with a very short suspense time.

        if (msUntilTimeout > 10) {

          const nextLanes = getNextLanes(root, NoLanes);

          if (nextLanes !== NoLanes) {

            // There's additional work on this root.

            break;

          }

          const suspendedLanes = root.suspendedLanes;

          if (!isSubsetOfLanes(suspendedLanes, lanes)) {

            // We should prefer to render the fallback of at the last

            // suspended level. Ping the last suspended level to try

            // rendering it again.

            // FIXME: What if the suspended lanes are Idle? Should not restart.

            const eventTime = requestEventTime();

            markRootPinged(root, suspendedLanes, eventTime);

            break;

          }

  

          // The render is suspended, it hasn't timed out, and there's no

          // lower priority work to do. Instead of committing the fallback

          // immediately, wait for more data to arrive.

          root.timeoutHandle = scheduleTimeout(

            commitRoot.bind(

              null,

              root,

              workInProgressRootRecoverableErrors,

              workInProgressTransitions,

            ),

            msUntilTimeout,

          );

          break;

        }

      }

      // The work expired. Commit immediately.

      commitRoot(

        root,

        workInProgressRootRecoverableErrors,

        workInProgressTransitions,

      );

      break;

    }

    case RootSuspendedWithDelay: {

      markRootSuspended(root, lanes);

  

      if (includesOnlyTransitions(lanes)) {

        // This is a transition, so we should exit without committing a

        // placeholder and without scheduling a timeout. Delay indefinitely

        // until we receive more data.

        break;

      }

  

      if (!shouldForceFlushFallbacksInDEV()) {

        // This is not a transition, but we did trigger an avoided state.

        // Schedule a placeholder to display after a short delay, using the Just

        // Noticeable Difference.

        // TODO: Is the JND optimization worth the added complexity? If this is

        // the only reason we track the event time, then probably not.

        // Consider removing.

  

        const mostRecentEventTime = getMostRecentEventTime(root, lanes);

        const eventTimeMs = mostRecentEventTime;

        const timeElapsedMs = now() - eventTimeMs;

        const msUntilTimeout = jnd(timeElapsedMs) - timeElapsedMs;

  

        // Don't bother with a very short suspense time.

        if (msUntilTimeout > 10) {

          // Instead of committing the fallback immediately, wait for more data

          // to arrive.

          root.timeoutHandle = scheduleTimeout(

            commitRoot.bind(

              null,

              root,

              workInProgressRootRecoverableErrors,

              workInProgressTransitions,

            ),

            msUntilTimeout,

          );

          break;

        }

      }

  

      // Commit the placeholder.

      commitRoot(

        root,

        workInProgressRootRecoverableErrors,

        workInProgressTransitions,

      );

      break;

    }

    case RootCompleted: {

      // The work completed. Ready to commit.

      commitRoot(

        root,

        workInProgressRootRecoverableErrors,

        workInProgressTransitions,

      );

      break;

    }

    default: {

      throw new Error('Unknown root exit status.');

    }

  }

}
```


```typescript
  

function commitRoot(

  root: FiberRoot,

  recoverableErrors: null | Array<CapturedValue<mixed>>,

  transitions: Array<Transition> | null,

) {

  // TODO: This no longer makes any sense. We already wrap the mutation and

  // layout phases. Should be able to remove.

  const previousUpdateLanePriority = getCurrentUpdatePriority();

  const prevTransition = ReactCurrentBatchConfig.transition;

  

  try {

    ReactCurrentBatchConfig.transition = null;

    setCurrentUpdatePriority(DiscreteEventPriority);

    commitRootImpl(

      root,

      recoverableErrors,

      transitions,

      previousUpdateLanePriority,

    );

  } finally {

    ReactCurrentBatchConfig.transition = prevTransition;

    setCurrentUpdatePriority(previousUpdateLanePriority);

  }

  

  return null;

}
```

```typescript

  

function commitRootImpl(

  root: FiberRoot,

  recoverableErrors: null | Array<CapturedValue<mixed>>,

  transitions: Array<Transition> | null,

  renderPriorityLevel: EventPriority,

) {


//1.循环清除掉PassiveEffect
  do {

    // `flushPassiveEffects` will call `flushSyncUpdateQueue` at the end, which

    // means `flushPassiveEffects` will sometimes result in additional

    // passive effects. So we need to keep flushing in a loop until there are

    // no more pending effects.

    // TODO: Might be better if `flushPassiveEffects` did not automatically

    // flush synchronous work at the end, to avoid factoring hazards like this.

    flushPassiveEffects();

  } while (rootWithPendingPassiveEffects !== null);

  

  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {

    throw new Error('Should not already be working.');

  }

  

  const finishedWork = root.finishedWork;

  const lanes = root.finishedLanes;

  

  

  if (finishedWork === null) {
    return null;

  } else {

  }

  root.finishedWork = null;

  root.finishedLanes = NoLanes;


  if (finishedWork === root.current) {

    throw new Error(

      'Cannot commit the same tree as before. This error is likely caused by ' +

        'a bug in React. Please file an issue.',

    );

  }

  

  // commitRoot never returns a continuation; it always finishes synchronously.

  // So we can clear these now to allow a new callback to be scheduled.

  root.callbackNode = null;

  root.callbackPriority = NoLane;

  

  // Update the first and last pending times on this root. The new first

  // pending time is whatever is left on the root fiber.

  let remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);

  markRootFinished(root, remainingLanes);

  

  if (root === workInProgressRoot) {

    // We can reset these now that they are finished.

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

//根据副作用判断是否需要调度useEffect(Passive Mask Flag)
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

  

  // Check if there are any effects in the whole tree.

  // TODO: This is left over from the effect list implementation, where we had

  // to check for the existence of `firstEffect` to satisfy Flow. I think the

  // only other reason this optimization exists is because it affects profiling.

  // Reconsider whether this is necessary.
  //如果没有副作用就直接跳过Commit阶段

  const subtreeHasEffects =

    (finishedWork.subtreeFlags &

      (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==

    NoFlags;

  const rootHasEffect =

    (finishedWork.flags &

      (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==

    NoFlags;

  

  if (subtreeHasEffects || rootHasEffect) {

    const prevTransition = ReactCurrentBatchConfig.transition;

    ReactCurrentBatchConfig.transition = null;

    const previousPriority = getCurrentUpdatePriority();

    setCurrentUpdatePriority(DiscreteEventPriority);

  

    const prevExecutionContext = executionContext;

    executionContext |= CommitContext;

  

    // Reset this to null before calling lifecycles

    ReactCurrentOwner.current = null;

  

    // The commit phase is broken into several sub-phases. We do a separate pass

    // of the effect list for each phase: all mutation effects come before all

    // layout effects, and so on.

  

    // The first phase a "before mutation" phase. We use this phase to read the

    // state of the host tree right before we mutate it. This is where

    // getSnapshotBeforeUpdate is called.

    const shouldFireAfterActiveInstanceBlur = commitBeforeMutationEffects(

      root,

      finishedWork,

    );

  


  

    // The next phase is the mutation phase, where we mutate the host tree.

    commitMutationEffects(root, finishedWork, lanes);

  

    if (enableCreateEventHandleAPI) {

      if (shouldFireAfterActiveInstanceBlur) {

        afterActiveInstanceBlur();

      }

    }

    resetAfterCommit(root.containerInfo);

  

    // The work-in-progress tree is now the current tree. This must come after

    // the mutation phase, so that the previous tree is still current during

    // componentWillUnmount, but before the layout phase, so that the finished

    // work is current during componentDidMount/Update.

    root.current = finishedWork;

  

    // The next phase is the layout phase, where we call effects that read

    // the host tree after it's been mutated. The idiomatic use case for this is

    // layout, but class component lifecycles also fire here for legacy reasons.

    

    commitLayoutEffects(finishedWork, root, lanes);



  

    // Tell Scheduler to yield at the end of the frame, so the browser has an

    // opportunity to paint.

    requestPaint();

  

    executionContext = prevExecutionContext;

  

    // Reset the priority to the previous non-sync value.

    setCurrentUpdatePriority(previousPriority);

    ReactCurrentBatchConfig.transition = prevTransition;

  } else {

    // No effects.

    root.current = finishedWork;

    // Measure these anyway so the flamegraph explicitly shows that there were

    // no effects.

    

  }

  

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


  }

  

  // Read this again, since an effect might have updated it

  remainingLanes = root.pendingLanes;

  

  // Check if there's remaining work on this root

  // TODO: This is part of the `componentDidCatch` implementation. Its purpose

  // is to detect whether something might have called setState inside

  // `componentDidCatch`. The mechanism is known to be flawed because `setState`

  // inside `componentDidCatch` is itself flawed — that's why we recommend

  // `getDerivedStateFromError` instead. However, it could be improved by

  // checking if remainingLanes includes Sync work, instead of whether there's

  // any work remaining at all (which would also include stuff like Suspense

  // retries or transitions). It's been like this for a while, though, so fixing

  // it probably isn't that urgent.

  if (remainingLanes === NoLanes) {

    // If there's no remaining work, we can clear the set of already failed

    // error boundaries.

    legacyErrorBoundariesThatAlreadyFailed = null;

  }

  
  

  onCommitRootDevTools(finishedWork.stateNode, renderPriorityLevel);

  

  if (enableUpdaterTracking) {

    if (isDevToolsPresent) {

      root.memoizedUpdaters.clear();

    }

  }

  

  // Always call this before exiting `commitRoot`, to ensure that any

  // additional work on this root is scheduled.

  ensureRootIsScheduled(root, now());

  

  if (recoverableErrors !== null) {

    // There were errors during this render, but recovered from them without

    // needing to surface it to the UI. We log them here.

    const onRecoverableError = root.onRecoverableError;

    for (let i = 0; i < recoverableErrors.length; i++) {

      const recoverableError = recoverableErrors[i];

      const componentStack = recoverableError.stack;

      const digest = recoverableError.digest;

      onRecoverableError(recoverableError.value, {componentStack, digest});

    }

  }

  

  if (hasUncaughtError) {

    hasUncaughtError = false;

    const error = firstUncaughtError;

    firstUncaughtError = null;

    throw error;

  }

  

  // If the passive effects are the result of a discrete render, flush them

  // synchronously at the end of the current task so that the result is

  // immediately observable. Otherwise, we assume that they are not

  // order-dependent and do not need to be observed by external systems, so we

  // can wait until after paint.

  // TODO: We can optimize this by not scheduling the callback earlier. Since we

  // currently schedule the callback in multiple places, will wait until those

  // are consolidated.

  if (

    includesSomeLane(pendingPassiveEffectsLanes, SyncLane) &&

    root.tag !== LegacyRoot

  ) {

    flushPassiveEffects();

  }

  

  // Read this again, since a passive effect might have updated it

  remainingLanes = root.pendingLanes;

  if (includesSomeLane(remainingLanes, (SyncLane: Lane))) {

    if (enableProfilerTimer && enableProfilerNestedUpdatePhase) {

      markNestedUpdateScheduled();

    }

  

    // Count the number of times the root synchronously re-renders without

    // finishing. If there are too many, it indicates an infinite update loop.

    if (root === rootWithNestedUpdates) {

      nestedUpdateCount++;

    } else {

      nestedUpdateCount = 0;

      rootWithNestedUpdates = root;

    }

  } else {

    nestedUpdateCount = 0;

  }

  

  // If layout work was scheduled, flush it now.

  flushSyncCallbacks();

  

  return null;

}
```

commitRoot

-   Mutation前
	*   重置finishedWork，finishedLanes，callbackNode，callbackPriority
	-   markRootFinished
	-   如果fiber及其子tree 有PassiveMask Flag 则调度flushPassiveEffects(UseEffect)
-  如果fiber及其子tree有其他Flag，则进行commit三阶段
	*   commitBeforeMutationEffects
		 在此阶段，React会执行所有在DOM更新之前需要执行的副作用操作。这些副作用操作包括获取布局信息、调用ref回调函数、执行生命周期方法等。执行lassCompoent的getSnapshotBeforeUpdate。清空HostRoot挂载的内容，方便Mutation阶段渲染。
	*    commitMutationEffects
		 React会将之前收集的所有DOM变更应用到实际的DOM树中。这些变更可能包括属性的更改、节点的插入或移除、事件处理程序的更新等。执行LayoutEffect的销毁函数
	-   切换current树 root.current = finishedWork;
	-   commitLayoutEffects
		 React会执行所有需要更新布局的副作用操作。这些操作包括获取节点尺寸、位置、滚动位置等。执行LayoutEffect的创建函数，和class组件的componentDidMount/UPdate方法。
*  收尾
	*  根据rootDoesHavePassiveEffect判断赋值相关变量
	*  执行ensureRootIsScheduled确保被调度(有两种原因会开启新的调度，commt阶段出发了新的调度，比如在useLayoutEffect回调中触发更新，有遗留的更新未处理)
	*  执行flushSyncCallbackQueue处理componentDidMount等生命周期或者useLayoutEffect等同步任务


> 为什么不用EffectList，反而要去遍历Fiber Tree，原因是为了兼容React18中的Suspence的并发更新feature。如果Suspence的子孙组件有异步加载的内容。应该只渲染fallback，而不是同时渲染非异步加载部分。


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