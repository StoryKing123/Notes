流程
#react/sourcecode


performSyncWorkOnRoot

- 获取最高Lane
* 开始具体工作前，保证上一次的useEffect都执行了，同时要注意useEffect执行时触发的更新优先级是否大于当前更新的优先级，如果出发的更新优先级大于当前优先级，取消当前调度
- 根据shouldTimeSlice判断执行 renderRootConcurrent 还是 renderRootSync 进行reconciler[[ReactReconciler]]
- 设置finish树和finishedLanes
- 执行commitRoot进入commit阶段[[ReactCommit]]

```typescript

function performConcurrentWorkOnRoot(root, didTimeout) {

  // Since we know we're in a React event, we can clear the current

  // event time. The next update will compute a new event time.

  currentEventTime = NoTimestamp;

  currentEventTransitionLane = NoLanes;

  

  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {

    throw new Error('Should not already be working.');

  }

  

  // Flush any pending passive effects before deciding which lanes to work on,

  // in case they schedule additional work.

  const originalCallbackNode = root.callbackNode;
  
  //开始执行reconciler之前，保证上一次的useEffect都执行了
  //同时要注意useEffect执行时触发的更新优先级是否大于当前更新的优先级，如果出发的更新优先级大于当前优先级，取消当前调度
  const didFlushPassiveEffects = flushPassiveEffects();

  if (didFlushPassiveEffects) {

    // Something in the passive effect phase may have canceled the current task.

    // Check if the task node for this root was changed.

    if (root.callbackNode !== originalCallbackNode) {

      // The current task was canceled. Exit. We don't need to call

      // `ensureRootIsScheduled` because the check above implies either that

      // there's a new task, or that there's no remaining work on this root.

      return null;

    } else {

      // Current task was not canceled. Continue.

    }

  }

  

  // Determine the next lanes to work on, using the fields stored

  // on the root.

  let lanes = getNextLanes(

    root,

    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,

  );

  if (lanes === NoLanes) {

    // Defensive coding. This is never expected to happen.

    return null;

  }

  

  // We disable time-slicing in some cases: if the work has been CPU-bound

  // for too long ("expired" work, to prevent starvation), or we're in

  // sync-updates-by-default mode.

  // TODO: We only check `didTimeout` defensively, to account for a Scheduler

  // bug we're still investigating. Once the bug in Scheduler is fixed,

  // we can remove this, since we track expiration ourselves.
  //如果有过期Lane或者BlockingLane，则执行renderRootSync，同步render，否则的话就异步进行rednerRootConcurrent
  //shouldTimeSlice 判断  不包含过期的lane && 不包含阻塞lane&&didTimeout参数为false

  const shouldTimeSlice =

    !includesBlockingLane(root, lanes) &&

    !includesExpiredLane(root, lanes) &&

    (disableSchedulerTimeoutInWorkLoop || !didTimeout);

  let exitStatus = shouldTimeSlice

    ? renderRootConcurrent(root, lanes)

    : renderRootSync(root, lanes);

  if (exitStatus !== RootInProgress) {

    if (exitStatus === RootErrored) {

      // If something threw an error, try rendering one more time. We'll

      // render synchronously to block concurrent data mutations, and we'll

      // includes all pending updates are included. If it still fails after

      // the second attempt, we'll give up and commit the resulting tree.

      const errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);

      if (errorRetryLanes !== NoLanes) {

        lanes = errorRetryLanes;

        exitStatus = recoverFromConcurrentError(root, errorRetryLanes);

      }

    }

    if (exitStatus === RootFatalErrored) {

      const fatalError = workInProgressRootFatalError;

      prepareFreshStack(root, NoLanes);

      markRootSuspended(root, lanes);

      ensureRootIsScheduled(root, now());

      throw fatalError;

    }

  

    if (exitStatus === RootDidNotComplete) {

      // The render unwound without completing the tree. This happens in special

      // cases where need to exit the current render without producing a

      // consistent tree or committing.

      //

      // This should only happen during a concurrent render, not a discrete or

      // synchronous update. We should have already checked for this when we

      // unwound the stack.

      markRootSuspended(root, lanes);

    } else {

      // The render completed.

  

      // Check if this render may have yielded to a concurrent event, and if so,

      // confirm that any newly rendered stores are consistent.

      // TODO: It's possible that even a concurrent render may never have yielded

      // to the main thread, if it was fast enough, or if it expired. We could

      // skip the consistency check in that case, too.

      const renderWasConcurrent = !includesBlockingLane(root, lanes);

      const finishedWork: Fiber = (root.current.alternate: any);

      if (

        renderWasConcurrent &&

        !isRenderConsistentWithExternalStores(finishedWork)

      ) {

        // A store was mutated in an interleaved event. Render again,

        // synchronously, to block further mutations.

        exitStatus = renderRootSync(root, lanes);

  

        // We need to check again if something threw

        if (exitStatus === RootErrored) {

          const errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);

          if (errorRetryLanes !== NoLanes) {

            lanes = errorRetryLanes;

            exitStatus = recoverFromConcurrentError(root, errorRetryLanes);

            // We assume the tree is now consistent because we didn't yield to any

            // concurrent events.

          }

        }

        if (exitStatus === RootFatalErrored) {

          const fatalError = workInProgressRootFatalError;

          prepareFreshStack(root, NoLanes);

          markRootSuspended(root, lanes);

          ensureRootIsScheduled(root, now());

          throw fatalError;

        }

      }

  

      // We now have a consistent tree. The next step is either to commit it,

      // or, if something suspended, wait to commit it after a timeout.
      // 设置finishedWork树和finishedLanes，然后执行finishConcurrentRedner方法，进入commit阶段

      root.finishedWork = finishedWork;

      root.finishedLanes = lanes;

      finishConcurrentRender(root, exitStatus, lanes);

    }

  }

  

  ensureRootIsScheduled(root, now());

  if (root.callbackNode === originalCallbackNode) {

    // The task node scheduled for this root is the same one that's

    // currently executed. Need to return a continuation.

    return performConcurrentWorkOnRoot.bind(null, root);

  }

  return null;

}

```




