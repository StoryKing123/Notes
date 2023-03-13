
React中有自己两套优先级

一套是Lane，一套是事件优先级

# Lane

![](https://github.com/StoryKing123/Notes/raw/0dcfed923b1af57ed9132b6f4a19284dd3894883/pics/lanes.png)

Lane模型是


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