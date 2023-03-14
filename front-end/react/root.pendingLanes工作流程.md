
![[pendingLanes相关工作流程.excalidraw|675]]


> 三者关系如下
> `remainingLanes = HostRootFiber.lanes | HostRootFiber.childlanes` 待执行lanes = rootFiber待执行的lanes 加上 子孙待执行的lanes
> `noLongPendingLanes = root.pendingLanes & ~remainingLanes`  本次更新需要执行的lanes = 待执行lanes 移除掉 剩余的lanes


# 第一步
交互发生后产生新的lane。由于lanes冒泡，从目标fiberNode向上遍历，遍历过程中的fiberNode.childLanes和最终的root.pendingLanes中会附加该lane。然后被调度后进入第二步

# 第二步
在render reconciler阶段中，每进入一个fiberNode的beginWork时，该fiberNode会消费lanes，具体消费方式为根据lanes对应update，计算state (useState更新的value在此处计算)，所以该fiberNode.lanes会被重置，代表对应lanes被消费。当消费之后，也需要在每一级祖先fiberNode.childLanes中被移除。会在render阶段的completeWork进行flags冒泡，每一级祖先fiberNode.childLanes会被更新。

```typescript

let child = completedWork.child;

while (child !== null) {

newChildLanes = mergeLanes(

newChildLanes,

mergeLanes(child.lanes, child.childLanes),

);

  

subtreeFlags |= child.subtreeFlags;

subtreeFlags |= child.flags;

  

// Update the return pointer so the tree is consistent. This is a code

// smell because it assumes the commit phase is never concurrent with

// the render phase. Will address during refactor to alternate model.

child.return = completedWork;

  

child = child.sibling;

}

completedWork.subtreeFlags |= subtreeFlags;
```

如果遇到lanes消费失败的场景，比如Suspense造成的挂起，则fiberNode.lanes会在completeWork中被subtreeRednerLanes重置，代表对于该fiberNode，subtreeRenderLanes对应lanes在本次redner阶段并未执行。


# 第三步
当render阶段完成进入commit阶段，表示进入了lane模型一轮工作的收尾阶段。在commit阶段的三个子阶段开始前，会执行一些重置操作:，，调度的回调函数优先级
```typescript

//重置本次更新的HostRootFiber
root.finishedWork = null;

//重置本次更新的lanes
root.finishedLanes = NoLanes;

// commitRoot never returns a continuation; it always finishes synchronously.

// So we can clear these now to allow a new callback to be scheduled.

//重置本次更新调度的回调函数
root.callbackNode = null;

//重置本次更新调度的回调函数优先级
root.callbackPriority = NoLane;

// Check which lanes no longer have any work scheduled on them, and mark

// those as finished.

//收集HostRootFiber及其子孙中所有待执行lane的集合
let remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);

// Make sure to account for lanes that were updated by a concurrent event

// during the render phase; don't mark them as finished.

const concurrentlyUpdatedLanes = getConcurrentlyUpdatedLanes();

remainingLanes = mergeLanes(remainingLanes, concurrentlyUpdatedLanes);

  

markRootFinished(root, remainingLanes);

if (root === workInProgressRoot) {

// We can reset these now that they are finished.
//已经进入commit阶段，重置wip相关全局变量

workInProgressRoot = null;

workInProgress = null;

workInProgressRootRenderLanes = NoLanes;

} else {

// This indicates that the last root we worked on is not the same one that

// we're committing now. This most commonly happens when a suspended root

// times out.

}
```


```typescript

export function markRootFinished(root: FiberRoot, remainingLanes: Lanes) {

const noLongerPendingLanes = root.pendingLanes & ~remainingLanes;

  

root.pendingLanes = remainingLanes;

  

// Let's try everything again
//重置lanes

root.suspendedLanes = NoLanes;

root.pingedLanes = NoLanes;

  
// 从各种lanes中移除已被消费的lanes
root.expiredLanes &= remainingLanes;
root.mutableReadLanes &= remainingLanes;
root.entangledLanes &= remainingLanes;
root.errorRecoveryDisabledLanes &= remainingLanes;

  

const entanglements = root.entanglements;

const eventTimes = root.eventTimes;

const expirationTimes = root.expirationTimes;

const hiddenUpdates = root.hiddenUpdates;

  

// Clear the lanes that no longer have pending work

let lanes = noLongerPendingLanes;

//重置过期事件及纠缠的lanes
while (lanes > 0) {

const index = pickArbitraryLaneIndex(lanes);

const lane = 1 << index;

  

entanglements[index] = NoLanes;

eventTimes[index] = NoTimestamp;

expirationTimes[index] = NoTimestamp;

  

const hiddenUpdatesForLane = hiddenUpdates[index];

if (hiddenUpdatesForLane !== null) {

hiddenUpdates[index] = null;

// "Hidden" updates are updates that were made to a hidden component. They

// have special logic associated with them because they may be entangled

// with updates that occur outside that tree. But once the outer tree

// commits, they behave like regular updates.

for (let i = 0; i < hiddenUpdatesForLane.length; i++) {

const update = hiddenUpdatesForLane[i];

if (update !== null) {

update.lane &= ~OffscreenLane;

}

}

}

  

lanes &= ~lane;

}

}
```