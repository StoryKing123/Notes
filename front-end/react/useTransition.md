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

其中，前两次优先级为SyncLane，后两次为TransitionLanes。前两次更新属于一批，后两次更新属于一批，且前者的优先级高于后者，这也是被startTransition包裹的回调函数中触发的更新优先级较低的原因。
```ts
export function requestUpdateLane(fiber: Fiber): Lane {
  
  //...省略代码

  
  const isTransition = requestCurrentTransition() !== NoTransition;
  if (isTransition) {
    //本次更新处于transition上下文
    
    // The algorithm for assigning an update to a lane should be stable for all
    // updates at the same priority within the same event. To do this, the
    // inputs to the algorithm must be the same.
    //
    // The trick we use is to cache the first of each of these inputs within an
    // event. Then reset the cached values once we can be sure the event is
    // over. Our heuristic for that is whenever we enter a concurrent work loop.
    if (currentEventTransitionLane === NoLane) {
      // All transitions within the same event are assigned the same lane.
      currentEventTransitionLane = claimNextTransitionLane();
    }
	//返回transition相关lanes
    return currentEventTransitionLane;
  }
  //...省略代码


}



export function requestCurrentTransition(): Transition | null {
  return ReactCurrentBatchConfig.transition;
}
```

由于startTransitio方法中会设置当前transition上下文，当处于transition上下文时，requestUpdateLane方法会返回transition相关lane:
```ts
function startTransition(
  setPending: boolean => void,
  callback: () => void,
  options?: StartTransitionOptions,
): void {
  const previousPriority = getCurrentUpdatePriority();
  setCurrentUpdatePriority(
    higherEventPriority(previousPriority, ContinuousEventPriority),
  );


  //保存之前的transition
  const prevTransition = ReactCurrentBatchConfig.transition;
  ReactCurrentBatchConfig.transition = null;
  setPending(true);

  //设置当前的transition
  const currentTransition = (ReactCurrentBatchConfig.transition =
    ({}: BatchConfigTransition));

  if (enableTransitionTracing) {
    if (options !== undefined && options.name !== undefined) {
      ReactCurrentBatchConfig.transition.name = options.name;
      ReactCurrentBatchConfig.transition.startTime = now();
    }
  }

  try {
    setPending(false);
    callback();
  } finally {
    setCurrentUpdatePriority(previousPriority);

    ReactCurrentBatchConfig.transition = prevTransition;

  }
}
```
transition相关lane的优先级略低于默认优先级
```ts
  

export const NoLanes: Lanes = /* */ 0b0000000000000000000000000000000;

export const NoLane: Lane = /* */ 0b0000000000000000000000000000000;

  

export const SyncHydrationLane: Lane = /* */ 0b0000000000000000000000000000001;

export const SyncLane: Lane = /* */ 0b0000000000000000000000000000010;

  

export const InputContinuousHydrationLane: Lane = /* */ 0b0000000000000000000000000000100;

export const InputContinuousLane: Lane = /* */ 0b0000000000000000000000000001000;

  

export const DefaultHydrationLane: Lane = /* */ 0b0000000000000000000000000010000;

export const DefaultLane: Lane = /* */ 0b0000000000000000000000000100000;

  

export const SyncUpdateLanes: Lane = /* */ 0b0000000000000000000000000101010;

  

const TransitionHydrationLane: Lane = /* */ 0b0000000000000000000000001000000;

const TransitionLanes: Lanes = /* */ 0b0000000011111111111111110000000;

const TransitionLane1: Lane = /* */ 0b0000000000000000000000010000000;

const TransitionLane2: Lane = /* */ 0b0000000000000000000000100000000;

const TransitionLane3: Lane = /* */ 0b0000000000000000000001000000000;

const TransitionLane4: Lane = /* */ 0b0000000000000000000010000000000;

const TransitionLane5: Lane = /* */ 0b0000000000000000000100000000000;

const TransitionLane6: Lane = /* */ 0b0000000000000000001000000000000;

const TransitionLane7: Lane = /* */ 0b0000000000000000010000000000000;

const TransitionLane8: Lane = /* */ 0b0000000000000000100000000000000;

const TransitionLane9: Lane = /* */ 0b0000000000000001000000000000000;

const TransitionLane10: Lane = /* */ 0b0000000000000010000000000000000;

const TransitionLane11: Lane = /* */ 0b0000000000000100000000000000000;

const TransitionLane12: Lane = /* */ 0b0000000000001000000000000000000;

const TransitionLane13: Lane = /* */ 0b0000000000010000000000000000000;

const TransitionLane14: Lane = /* */ 0b0000000000100000000000000000000;

const TransitionLane15: Lane = /* */ 0b0000000001000000000000000000000;

const TransitionLane16: Lane = /* */ 0b0000000010000000000000000000000;
```


# entangle机制
transition是过渡的意思，Transition updates是与 Urgent updates相对的概念，其中：
1. Urgent updates指需要立刻得到相应，并且需要看到更新后效果的更新，例如输入、点击等事件。
2. Transition updates指不需要立即得到响应，只需要看到状态过渡前后的效果的更新。
参考下面示例，存在两个状态：ctn与num。ctn与输入框受控。当触发输入框onChange事件后，会改变ctn与num的状态。
```jsx
import "./styles.css";
import React, { useState, useTransition } from "react";

export default function App() {
  const [ctn, updateCtn] = useState("");
  const [num, updateNum] = useState(0);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="App">
      <input
        value={ctn}
        onChange={({ target: {value} }) => {
          updateCtn(value);
          startTransition(() => updateNum(num + 1));
        }}
      />
      <BusyChild num={num} />
    </div>
  );
}

const BusyChild = React.memo(({ num }) => {
  const cur = performance.now();
  while (performance.now() - cur < 300) {}
  return <div>{num}</div>;
});

```

当updateNum方法包裹在startTransition中时，在输入框输入文字会更加流畅。同时，视图中num的值变化的频率也更低。可见，startTransition能够起到类似debounce的效果。这就是transition的意义-只关注起始状态，忽略中间状态。num不会跟随ctn的变化立刻发生变化，而是在连续输入一段时间后（或停止输入时）再发生变化。在源码中，这是通过lane模型的entangle机制实现的。

# entangle实现原理
entangle是指lane之间的一种关系-如果laneA与laneB entangle，代表laneA、laneB不能单独进行调度，它们必须同处一个lanes中才能进行调度。这意味着如果laneA 与 laneB纠缠，必须同生共死。除此，如果laneC 与laneA 纠缠，接下来 laneA 与 laneB 纠缠，那么laneC同样会与laneB纠缠。

对于上面示例，由于transition上下文的存在，num相关update对应的lane纠缠在一起，导致他们不能单独进行调度，需要解除纠缠后再统一进行调度。
与entangle相关的数据结构包括两个：
1. root.entangledLanes，用于保存发生纠缠的lanes
2. root.entanglements，长度为31位的数组，每个索引位置保存一个lanes。用于保存root.entangledLanes中每个lane都与那些lanes发生纠缠
![[entangle相关数据结构.excalidraw|675]]

root.entangledLanes的每个lane与root.entanglements的每个索引一一对应。比如在上图中，从低位向高位，第1位的lane（从第0位开始遍历）与lane对应索引位置（索引为1）在root.entanglements中保存的lanes(0b0000000011011100001111000001)发生纠缠。

# entangle工作流程
entangle的工作流程如下图所示，整体包含三个步骤：
1. 产生交互
2. schedule阶段
3. commit阶段
![[entangle工作流程.excalidraw|675]]

首先，发生交互时，其对应方法(这里是dispatchSetState方法)中执行requestUpdateLane方法获取更新的对应的lane优先级信息。当处于transition上下文时，requestUpdateLane方法会返回transition相关lane。具体来说，内部会执行claimNextTransition方法从TransitionLanes中寻找还未被使用的lane并返回。
```typescript
export function claimNextTransitionLane(): Lane {
  // Cycle through the lanes, assigning each new transition to the next lane.
  // In most cases, this means every transition gets its own lane, until we
  // run out of lanes and cycle back to the beginning.
  //全局变量nextTransitionLane保存被使用的最后一个TransitionLane
  const lane = nextTransitionLane;
  //向左移一位，寻找下一个TransitionLane
  nextTransitionLane <<= 1;
  if ((nextTransitionLane & TransitionLanes) === NoLanes) {
  //如果超出最大的Transitionlane，则从第一个TransitionLane开始
    nextTransitionLane = TransitionLane1;
  }
  return lane;
}

```

TransitionLanes共包含十六个可能的lane:
```ts
const TransitionLanes: Lanes = /* */ 0b0000000011111111111111110000000;
```
然后，entangle会在entangleTransitionUpdate方法内部执行markRootEntangled方法，标记lanes纠缠。究竟哪些lanes会发生纠缠？举例说明，执行如下代码：
```js
//为了方便阅读，lanes只展示有效位数
markRootEntangled(root,0b1011)
```
传入的lanes VS每个lanes之间会相互纠缠，即：
* 0b001会与0b1011 纠缠
* 0b0010会与0b1011纠缠
* 0b000会与0b1011纠缠
如果root.entanglements中索引位置保存的lanes与传入的lanes有相交，则它们将发生纠缠。假设root.entangledLanes与root.entanglements数据如下，其标记lanes纠缠过程如下图所示
```ts
root.entangledLanes = 0b110;
root.entanglements = [0,0b0001,0b0110,0];
```
![[标记lanes纠缠过程.excalidraw|675]]

从低位向高位依次遍历entangledLanes（即传入的0b1011）
1. entangledLanes第0位为1，与"entangledLanes 中其他 lanes"纠缠，纠缠后的结果附加在 root.entanglements中index0保存的lanes中。
```js
root.entanglement[0] |= entangledLanes;
```
2. entangledLanes第1位为1,与entangleLanes中其他lanes纠缠，纠缠后的结果附加在root.entanglements中index1保存的lanes中。
```js
root.entanglement[1] |= entangledLanes;
```
3. entanlgedLanes第2位为0，但root.entalgedLanes中对应的位不是0，且entangledLane 与 root.entanglements 中 index2保存的lanes有交集，所以发生纠缠。

```js
// (0b1011 & 0b0110) !==0
entangledLanes & root.entanglements[2] !== NoLanes;
root.entanglements[2] |= entangledlanes;
```

4. entangledLanes第三位为1,与entangledLanes中其他lanes纠缠，纠缠后的结果附加在root.entanglements 中index3保存的lanes中。
```js
root.entanglementsp[3] |= entangledLanes;
```
相关操作发生在markRootEntangled方法中，代码如下：
```ts

export function markRootEntangled(root: FiberRoot, entangledLanes: Lanes) {
  // In addition to entangling each of the given lanes with each other, we also
  // have to consider _transitive_ entanglements. For each lane that is already
  // entangled with *any* of the given lanes, that lane is now transitively
  // entangled with *all* the given lanes.
  //
  // Translated: If C is entangled with A, then entangling A with B also
  // entangles C with B.
  //
  // If this is hard to grasp, it might help to intentionally break this
  // function and look at the tests that fail in ReactTransition-test.js. Try
  // commenting out one of the conditions below.

  const rootEntangledLanes = (root.entangledLanes |= entangledLanes);
  const entanglements = root.entanglements;
  let lanes = rootEntangledLanes;

  //遍历lanes
  while (lanes) {
    //获取lanes中最小一位值为1的lanes对应的索引
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    //上述两行代码结合while循环的意义时：遍历lanes中每个为1的位
    if (
      // Is this one of the newly entangled lanes?
      // 情况1: lane与entangledLanes 中其他 lanes 纠缠
      (lane & entangledLanes) |
      // Is this lane transitively entangled with the newly entangled lanes?
      // 情况2: 与root.entanglements 中对应 lanes 相交
      (entanglements[index] & entangledLanes)
    ) {
      // 标记 lanes 纠缠
      entanglements[index] |= entangledLanes;
    }
    lanes &= ~lane;
  }
}

```

接下来，进入schedule阶段，通过getnextLanes方法计算出本次render阶段的批(lanes)。其中与entangle相关的逻辑包含三个步骤：
1. 本次更新选定的lanes中是否包含“产生纠缠的lanes”
2. 如果包含，则遍历本次更新选定lanes中产生纠缠的lanes
3. 与root.entanglements中对应lanes纠缠
代码如下：
```ts

export function getNextLanes(root: FiberRoot, wipLanes: Lanes): Lanes {
  //省略代码
  const entangledLanes = root.entangledLanes;
  if (entangledLanes !== NoLanes) {
    const entanglements = root.entanglements;
    let lanes = nextLanes & entangledLanes;
    // 本次更新选定的lanes（批）中是否包含“产生纠缠的lanes”
    while (lanes > 0) {
      // 遍历“产生纠缠的lanes”，依次获取索引
      const index = pickArbitraryLaneIndex(lanes);
      const lane = 1 << index;
      // 将本次更新选定的 lanes 与 索引位置保存的lanes纠缠
      nextLanes |= entanglements[index];

      lanes &= ~lane;
    }
  }

  return nextLanes;
}
```
对于上面示例，随着文字在输入框中被不断输入，两类更新会不断产生：
1. ctn变化对应更新，优先级为SyncLane。
2. num变化对应更新，优先级为TransitionLanes中的某一个
前者优先级高于后者，随着文字在输入框中被不断输入会不断产生，并优先进行调度及后续流程。后者随着文字在输入框中不断输入也会不断产生，并互相发生纠缠，但由于优先级较低一直无法执行。直到被纠缠的某一个lane过期，其优先级提升，再连同其他“与它纠缠的lanes” 一起进行调度及后续流程。
最后，进入commit阶段，在markRootFinished方法中重置“纠缠的lanes”：
```ts
export function markRootFinished(root: FiberRoot, remainingLanes: Lanes) {
  //省略代码
  let lanes = noLongerPendingLanes;
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    
	//重置entanglements[index]
    entanglements[index] = NoLanes;
    eventTimes[index] = NoTimestamp;
    expirationTimes[index] = NoTimestamp;
    
    //省略代码
    lanes &= ~lane;
  }
}

```
