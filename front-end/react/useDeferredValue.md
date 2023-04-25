useTransition为开发者提供了操作优先级的功能。开发者可以自行决定那些状态更新是低优先级更新。但有时开发者可能无法方法触发状态更新的方法（比如使用第三方库时），此时可以使用useDeferredValue。

useDeferredValue接收一个状态并返回该状态的拷贝。当原始状态变化后，拷贝状态会以较低的优先级更新，这意味着拷贝状态变化的频率会低于原始状态。
//useDeferredValue的实现与useTransition类似，都是借助transition机制。源码实现变了

```ts

function mountDeferredValue<T>(value: T): T {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = value;
  return value;
}

function updateDeferredValue<T>(value: T): T {
  const hook = updateWorkInProgressHook();
  const resolvedCurrentHook: Hook = (currentHook: any);
  const prevValue: T = resolvedCurrentHook.memoizedState;
  return updateDeferredValueImpl(hook, prevValue, value);
}


function updateDeferredValueImpl<T>(hook: Hook, prevValue: T, value: T): T {
  const shouldDeferValue = !includesOnlyNonUrgentLanes(renderLanes);
  if (shouldDeferValue) {
    // This is an urgent update. If the value has changed, keep using the
    // previous value and spawn a deferred render to update it later.

    if (!is(value, prevValue)) {
      // Schedule a deferred render
      const deferredLane = claimNextTransitionLane();
      currentlyRenderingFiber.lanes = mergeLanes(
        currentlyRenderingFiber.lanes,
        deferredLane,
      );
      markSkippedUpdateLanes(deferredLane);

      // Set this to true to indicate that the rendered value is inconsistent
      // from the latest value. The name "baseState" doesn't really match how we
      // use it because we're reusing a state hook field instead of creating a
      // new one.
      hook.baseState = true;
    }

    // Reuse the previous value
    return prevValue;
  } else {
    // This is not an urgent update, so we can use the latest value regardless
    // of what it is. No need to defer it.

    // However, if we're currently inside a spawned render, then we need to mark
    // this as an update to prevent the fiber from bailing out.
    //
    // `baseState` is true when the current value is different from the rendered
    // value. The name doesn't really match how we use it because we're reusing
    // a state hook field instead of creating a new one.
    if (hook.baseState) {
      // Flip this back to false.
      hook.baseState = false;
      markWorkInProgressReceivedUpdate();
    }

    hook.memoizedState = value;
    return value;
  }
}
```

