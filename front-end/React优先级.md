
React中有自己两套优先级

一套是Lane，一套是事件优先级

# Lane


![[lanes.png]]


# 事件优先级
-   DiscreteEventPriority 离散事件优先级
-   ContinuousEventPriority 连续事件优先级
-   DefaultEventPriority 默认事件优先级
-   IdleEventPriority 空闲时间优先级


# Schedule优先级
* ImmediateSchedulerPriority
* UserBlockingSchedulerPriority
* NormalSchedulerPriority
* IdleSchedulerPriority
* NormalSchedulerPriority


## EventPriority 转 SchedulePriority
![[lanes_to_event_schedule.png]]


# Lane 转 EventPriority
![[lanes_to_event_priority.png]]


Lane <=>Event Priority <=>Schedule Priority


> [彻底搞懂 React 18 并发机制的原理 - 掘金 (juejin.cn)](https://juejin.cn/post/7171231346361106440#heading-2)