
React中有自己两套优先级

一套是Lane，一套是事件优先级

# Lane

![](https://raw.githubusercontent.com/StoryKing123/pics/main/lanes.png)

	在旧的React中，react使用了基于expiratinoTime的优先级算法，expirationTime可以很好的应对CPU密集型场景，因为在该场景下只需考虑任务中断与继续、高优先级任务打断低优先级任务。
	Lane模型是react用于替代expirtationTime模型的新模型，新模型将I/O密集型场景也纳入优化范畴（通过suspense）。expirationTime字段耦合了“优先级”与“批”这两个概念，限制了模型的表达能力。

fiberNode上面lane属性
* pendingLanes 当前FiberRootNode下待执行的update对应lane的集合
* suspendedlanes，当前FIberRootNode由于Suspense而挂起的update对应lane的集合
* pingedLanes 当前FIberRootNode下由于请求成功，Suspense取消挂起的update对应的lane的集合
* expiredLanes 当前FiberRootNode下由于过期，需要同步，不可中断执行render阶段的update对应lane的集合



requestUpdateLane逻辑
1. 如果当前应用未开启并发模式，则返回SyncLane
2. 是否是render阶段产生的更新
3. 是否与transition相关
4. 是否有手动设置的优先级
5. 事件的优先级

```typescript
  

export function requestUpdateLane(fiber: Fiber): Lane {

// Special cases

const mode = fiber.mode;

if ((mode & ConcurrentMode) === NoMode) {

return (SyncLane: Lane);

} else if (

!deferRenderPhaseUpdateToNextBatch &&

(executionContext & RenderContext) !== NoContext &&

workInProgressRootRenderLanes !== NoLanes

) {

// This is a render phase update. These are not officially supported. The

// old behavior is to give this the same "thread" (lanes) as

// whatever is currently rendering. So if you call `setState` on a component

// that happens later in the same render, it will flush. Ideally, we want to

// remove the special case and treat them as if they came from an

// interleaved event. Regardless, this pattern is not officially supported.

// This behavior is only a fallback. The flag only exists until we can roll

// out the setState warning, since existing code might accidentally rely on

// the current behavior.

return pickArbitraryLane(workInProgressRootRenderLanes);

}

  

const isTransition = requestCurrentTransition() !== NoTransition;

if (isTransition) {

if (__DEV__ && ReactCurrentBatchConfig.transition !== null) {

const transition = ReactCurrentBatchConfig.transition;

if (!transition._updatedFibers) {

transition._updatedFibers = new Set();

}

  

transition._updatedFibers.add(fiber);

}

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

return currentEventTransitionLane;

}

  

// Updates originating inside certain React methods, like flushSync, have

// their priority set by tracking it with a context variable.

//

// The opaque type returned by the host config is internally a lane, so we can

// use that directly.

// TODO: Move this type conversion to the event priority module.

const updateLane: Lane = (getCurrentUpdatePriority(): any);

if (updateLane !== NoLane) {

return updateLane;

}

  

// This update originated outside React. Ask the host environment for an

// appropriate priority, based on the type of event.

//

// The opaque type returned by the host config is internally a lane, so we can

// use that directly.

// TODO: Move this type conversion to the event priority module.

const eventLane: Lane = (getCurrentEventPriority(): any);

return eventLane;

}
```


# 事件优先级
-   DiscreteEventPriority 离散事件优先级
	-click,input,focus,blur,touchstart等事件
-   ContinuousEventPriority 连续事件优先级
	-drag,mouse move,scroll,touchmove,wheel
-   DefaultEventPriority 默认事件优先级
-   IdleEventPriority 空闲时间优先级


# Schedule优先级
* ImmediateSchedulerPriority
* UserBlockingSchedulerPriority
* NormalSchedulerPriority
* IdleSchedulerPriority
* NormalSchedulerPriority


## EventPriority 转 SchedulePriority
![](https://github.com/StoryKing123/Notes/raw/0dcfed923b1af57ed9132b6f4a19284dd3894883/pics/lanes_to_event_schedule.png)

# Lane 转 EventPriority


![](https://github.com/StoryKing123/Notes/raw/0dcfed923b1af57ed9132b6f4a19284dd3894883/pics/lanes_to_event_priority.png)


Lane <=>Event Priority <=>Schedule Priority


> [彻底搞懂 React 18 并发机制的原理 - 掘金 (juejin.cn)](https://juejin.cn/post/7171231346361106440#heading-2)