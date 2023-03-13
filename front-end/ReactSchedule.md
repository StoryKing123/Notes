![[JSFrame.excalidraw|600]]


![[并发架构的结构.excalidraw|550]]

react在Fiber架构中，实现了一套基于lane模型的优先级算法，并基于这算法实现了批量更新、任务中断、恢复等低级特性。





# 该选用什么宏任务
根据ReactSchedule的需求，能够符合react调度要求的，需要有下面的条件
* 在一帧内能够执行多次
* 执行时间越早越好
* 兼容性要足够好
* 要有稳定性

##  requestIdleCallback
requestIdleCallbak会在每帧的空闲时期执行，但是会有如下缺点
* 浏览器兼容性较差
* 执行频率不稳定，受很多因素影响。用户切换浏览器tab之后，非当前tab页的rIC执行频率会大幅降低
* 应用场景局限在低优先级工作
rIC的设计初衷是“能够在事件循环中执行低优先级任务，减少对动画、用户输入等高优先级事件的影响”。这与Schduler 中多种优先级的调度策略不符。


## requestAnimationFrame
rAF定义的回调函数会在浏览器下次paint前之前执行，一般用于更新动画。rAF的执行取决于每一帧Paint前的时机，即执行与帧相关，执行频率并不高，Scheduler满足条件的备选项应该是在一帧内可以执行多次，而且执行时机越早越好。


## MessageChannel
符合Scheduler调度要求。执行时机早，一帧内可以执行多次。

## setImmediate
符合Scheduler调度要求。执行时机早，一帧内可以执行多次。setImmediate执行时机比MessageChannel还要早，但是兼容性特别差。
> 该方法用来把一些需要长时间运行的操作放在一个回调函数里，在浏览器完成后面的其他语句后，就立刻执行这个回调函数。
> 该方法可能不会被批准成为标准，目前只有最新版本的 Internet Explorer 和 Node.js 0.10+ 实现了该方法。它遇到了 [Gecko](https://bugzilla.mozilla.org/show_bug.cgi?id=686201)(Firefox) 和[Webkit](https://code.google.com/p/chromium/issues/detail?id=146172) (Google/Apple) 的阻力。

## setTimeout
符合Scheduler调度要求。即使setTimeout的delay设置为0，也不会立即执行。在Chrome上会有4ms的延迟，之后才会执行，所有会存在浪费时间的现象

在react内的调度逻辑是，先setImmediate，然后MessageChannel，最后使用setTimeout兜底。