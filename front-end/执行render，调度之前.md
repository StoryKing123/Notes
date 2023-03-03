#react/sourcecode

```javascript
ReactDOMRoot.prototype.render = function(

  children: ReactNodeList,

): void {
  const root = this._internalRoot;
  updateContainer(children, root, null, null);
};
```




```typescript
  
1.创建updateLane
2.getContextForSubtree (第一次进入会是空{})
3.根据eventTime和Lane创建Update
4.插入update更新
5.执行scheduleUpdateForFiber
6.执行entangleTransitions，作用目前还不知道

export function updateContainer(

  element: ReactNodeList,

  container: OpaqueRoot,

  parentComponent: ?React$Component<any, any>,

  callback: ?Function,

): Lane {


  const current = container.current;

  const eventTime = requestEventTime();

  const lane = requestUpdateLane(current);

  const context = getContextForSubtree(parentComponent);

  if (container.context === null) {

    container.context = context;

  } else {

    container.pendingContext = context;

  }

  const update = createUpdate(eventTime, lane);

  // Caution: React DevTools currently depends on this property

  // being called "element".

  update.payload = {element};

  

  callback = callback === undefined ? null : callback;

  if (callback !== null) {


    update.callback = callback;

  }

  

  const root = enqueueUpdate(current, update, lane);

  if (root !== null) {

    scheduleUpdateOnFiber(root, current, lane, eventTime);

    entangleTransitions(root, current, lane);

  }

  

  return lane;

}

```

update结构
![[Pasted image 20230302162539.png]]


```typescript

1.往root的pendingLanes上插入Lane
2.
这么多最重要的就只有ensureRootIsScheduled方法，这个方法会进入调度

export function scheduleUpdateOnFiber(

  root: FiberRoot,

  fiber: Fiber,

  lane: Lane,

  eventTime: number,

) {

  

  // Mark that the root has a pending update.

  markRootUpdated(root, lane, eventTime);

  

  if (

    (executionContext & RenderContext) !== NoLanes &&

    root === workInProgressRoot

  ) {

    // This update was dispatched during the render phase. This is a mistake

    // if the update originates from user space (with the exception of local

    // hook updates, which are handled differently and don't reach this

    // function), but there are some internal React features that use this as

    // an implementation detail, like selective hydration.

    warnAboutRenderPhaseUpdatesInDEV(fiber);

  

    // Track lanes that were updated during the render phase

    workInProgressRootRenderPhaseUpdatedLanes = mergeLanes(

      workInProgressRootRenderPhaseUpdatedLanes,

      lane,

    );

  } else {

    // This is a normal update, scheduled from outside the render phase. For

    // example, during an input event.


  

    warnIfUpdatesNotWrappedWithActDEV(fiber);
  

    if (root === workInProgressRoot) {

      // Received an update to a tree that's in the middle of rendering. Mark

      // that there was an interleaved update work on this root. Unless the

      // `deferRenderPhaseUpdateToNextBatch` flag is off and this is a render

      // phase update. In that case, we don't treat render phase updates as if

      // they were interleaved, for backwards compat reasons.

      if (

        deferRenderPhaseUpdateToNextBatch ||

        (executionContext & RenderContext) === NoContext

      ) {

        workInProgressRootInterleavedUpdatedLanes = mergeLanes(

          workInProgressRootInterleavedUpdatedLanes,

          lane,

        );

      }

      if (workInProgressRootExitStatus === RootSuspendedWithDelay) {

        // The root already suspended with a delay, which means this render

        // definitely won't finish. Since we have a new update, let's mark it as

        // suspended now, right before marking the incoming update. This has the

        // effect of interrupting the current render and switching to the update.

        // TODO: Make sure this doesn't override pings that happen while we've

        // already started rendering.

        markRootSuspended(root, workInProgressRootRenderLanes);

      }

    }

  

    ensureRootIsScheduled(root, eventTime);

    if (

      lane === SyncLane &&

      executionContext === NoContext &&

      (fiber.mode & ConcurrentMode) === NoMode &&

      // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.

      !(__DEV__ && ReactCurrentActQueue.isBatchingLegacy)

    ) {

      // Flush the synchronous work now, unless we're already working or inside

      // a batch. This is intentionally inside scheduleUpdateOnFiber instead of

      // scheduleCallbackForFiber to preserve the ability to schedule a callback

      // without immediately flushing it. We only do this for user-initiated

      // updates, to preserve historical behavior of legacy mode.

      resetRenderTimer();

      flushSyncCallbacksOnlyInLegacyMode();

    }

  }

}
```

```typescript


1.执行markStarvedLanesAsExpired，将过期Lane的优先级调高
2.执行getNextLanes，获取下一次要调度的Lanes
3.执行getHighestPriorityLane，提取最高优先级的Lane
4.对Lane进行转换，转换成Eventority
5.执行scheduleCallback发起调度，传入优先级和performConcurrentWorkOnRoot方法
  

// Use this function to schedule a task for a root. There's only one task per

// root; if a task was already scheduled, we'll check to make sure the priority

// of the existing task is the same as the priority of the next level that the

// root has work on. This function is called on every update, and right before

// exiting a task.

function ensureRootIsScheduled(root: FiberRoot, currentTime: number) {

  const existingCallbackNode = root.callbackNode;

  

  // Check if any lanes are being starved by other work. If so, mark them as

  // expired so we know to work on those next.

  markStarvedLanesAsExpired(root, currentTime);

  

  // Determine the next lanes to work on, and their priority.

  const nextLanes = getNextLanes(

    root,

    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,

  );

  

  if (nextLanes === NoLanes) {

    // Special case: There's nothing to work on.

    if (existingCallbackNode !== null) {

      cancelCallback(existingCallbackNode);

    }

    root.callbackNode = null;

    root.callbackPriority = NoLane;

    return;

  }

  

  // We use the highest priority lane to represent the priority of the callback.

  const newCallbackPriority = getHighestPriorityLane(nextLanes);

  

  // Check if there's an existing task. We may be able to reuse it.

  const existingCallbackPriority = root.callbackPriority;

  if (

    existingCallbackPriority === newCallbackPriority &&

    // Special case related to `act`. If the currently scheduled task is a

    // Scheduler task, rather than an `act` task, cancel it and re-scheduled

    // on the `act` queue.

    !(

      __DEV__ &&

      ReactCurrentActQueue.current !== null &&

      existingCallbackNode !== fakeActCallbackNode

    )

  ) {

    // The priority hasn't changed. We can reuse the existing task. Exit.

    return;

  }

  

  if (existingCallbackNode != null) {

    // Cancel the existing callback. We'll schedule a new one below.

    cancelCallback(existingCallbackNode);

  }

  

  // Schedule a new callback.

  let newCallbackNode;

  if (newCallbackPriority === SyncLane) {

    // Special case: Sync React callbacks are scheduled on a special

    // internal queue

    if (root.tag === LegacyRoot) {

      scheduleLegacySyncCallback(performSyncWorkOnRoot.bind(null, root));

    } else {

      scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));

    }

    if (supportsMicrotasks) {

      // Flush the queue in a microtask.

      

        scheduleMicrotask(() => {

          // In Safari, appending an iframe forces microtasks to run.

          // https://github.com/facebook/react/issues/22459

          // We don't support running callbacks in the middle of render

          // or commit so we need to check against that.

          if (

            (executionContext & (RenderContext | CommitContext)) ===

            NoContext

          ) {

            // Note that this would still prematurely flush the callbacks

            // if this happens outside render or commit phase (e.g. in an event).

            flushSyncCallbacks();

          }

        });

      

    } else {

      // Flush the queue in an Immediate task.

      scheduleCallback(ImmediateSchedulerPriority, flushSyncCallbacks);

    }

    newCallbackNode = null;

  } else {

    let schedulerPriorityLevel;

    switch (lanesToEventPriority(nextLanes)) {

      case DiscreteEventPriority:

        schedulerPriorityLevel = ImmediateSchedulerPriority;

        break;

      case ContinuousEventPriority:

        schedulerPriorityLevel = UserBlockingSchedulerPriority;

        break;

      case DefaultEventPriority:

        schedulerPriorityLevel = NormalSchedulerPriority;

        break;

      case IdleEventPriority:

        schedulerPriorityLevel = IdleSchedulerPriority;

        break;

      default:

        schedulerPriorityLevel = NormalSchedulerPriority;

        break;

    }

    newCallbackNode = scheduleCallback(

      schedulerPriorityLevel,

      performConcurrentWorkOnRoot.bind(null, root),

    );

  }

  

  root.callbackPriority = newCallbackPriority;

  root.callbackNode = newCallbackNode;

}
```

总结，创建Update，Lane，处理优先级，然后发起调度。