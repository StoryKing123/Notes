useTransition时基于useState与Lane优先级机制实现的内置Hooks。作为面向开发者的并发特性，useTransition用于以较低优先级调度一个更新。示例如下，触发点击事件后，事件回调函数内部会触发两次updateNum方法，其中第二次触发被包裹在startTransition方法中，所以优先级更低。
```jsx
import { useState, useTransition } from "react";

export default function App() {
  const [num, updateNum] = useState(0);
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="App"
      style={{ color: isPending ? "red" : "black" }}
      onClick={() => {
        updateNum(222), startTransition(() => updateNum(444));
      }}
    >
      {num}
    </div>
  );
}

```

当快速、多次点击DIV后，视图中会闪现红色的“222”并最终显示黑色的“444”。

# 实现原理
useTransition的实现很简单，由useState与startTransition方法组合构成。其内部维护了一个状态isPending：
```js
function mountTransition(): [
  boolean,
  (callback: () => void, options?: StartTransitionOptions) => void,
] {
  const [isPending, setPending] = mountState(false);
  // The `start` method never changes.
  const start = startTransition.bind(null, setPending);
  const hook = mountWorkInProgressHook();
  hook.memoizedState = start;
  return [isPending, start];
}

function updateTransition(): [
  boolean,
  (callback: () => void, options?: StartTransitionOptions) => void,
] {
  const [isPending] = updateState(false);
  const hook = updateWorkInProgressHook();
  const start = hook.memoizedState;
  return [isPending, start];
}

```
startTransition方法的原理与batchedUpdates方法类似，只是将操作对象从BatchedContext变为ReactCurrentBatchConfig.transition，具体实现如下：
```ts

function startTransition(
  setPending: boolean => void,
  callback: () => void,
  options?: StartTransitionOptions,
): void {
	//保存之前的更新优先级
  const previousPriority = getCurrentUpdatePriority();
  //设置当前更新优先级
  setCurrentUpdatePriority(
    higherEventPriority(previousPriority, ContinuousEventPriority),
  );

  //保存之前的transition上下文
  const prevTransition = ReactCurrentBatchConfig.transition;
  //设置当前的transition上下文
  ReactCurrentBatchConfig.transition = null;

  //触发isPending状态更新，更新为true
  setPending(true);
  const currentTransition = (ReactCurrentBatchConfig.transition =
    ({}: BatchConfigTransition));


  try {
	//触发isPending状态更新，更新为false
    setPending(false);
    //执行回调函数 
    callback();
  } finally {
	 //重置更新优先级和transition上下文
    setCurrentUpdatePriority(previousPriority);

    ReactCurrentBatchConfig.transition = prevTransition;

  }
}

```

其中ReactCurrentBatchConfig.transition用于标记“本次批处理是否属于transition上下文”，数据结构如下：
```ts
const ReactCurrentBatchConfig = {
	// 0代表 “不属于trnnsition上下文”， 非0代表“属于transition上下文”
	transition: 0
}
```

# 工作流程
上面点击事件后会触发四次更新：
1. updateNum(222)
2. setPending(true)
3. setPending(false)
4. updateNum(444)


![[usetransition工作流程.excalidraw|675]]