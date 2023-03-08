#react/sourcecode

performUnitOfWork

-   执行beginwork
-   执行完beginWork后，pendingProps 变为 memoizedProps
-   执行completeUnitOfWork



- prepareFreshStack初始化操作
- 执行createWorkInProgress创建wip
- 循环执行workLoop
- 循环执行performUnitOfWork直到wip是null

  

  

beginwork

-   对比props
-   重置wip.lanes为NoLane
-   根据wip的tag进入不同分支处理

FC [https://www.yuque.com/firengxuan/cxdc13/cgp14k4n22gmbhxx](https://www.yuque.com/firengxuan/cxdc13/cgp14k4n22gmbhxx)

  

completeUnitOfWork

从下向上,dfs执行completeWork，如果遇到有sibling，则设置wip为sibling，然后return，返回performUnitOfWork,对sibing进行beginWork

let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    if ((completedWork.flags & Incomplete) === NoFlags) {
      let next;
      if (
        !enableProfilerTimer ||
        (completedWork.mode & ProfileMode) === NoMode
      ) {
        next = completeWork(current, completedWork, renderLanes);
      } else {
        next = completeWork(current, completedWork, renderLanes);
        // Update render duration assuming we didn't error.
        stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);
      }
      if (next !== null) {
        // Completing this fiber spawned new work. Work on that next.
        workInProgress = next;
        return;
      }
    } else {
      const next = unwindWork(current, completedWork, renderLanes);
      if (next !== null) {
        next.flags &= HostEffectMask;
        workInProgress = next;
        return;
      }

      if (returnFiber !== null) {
        // Mark the parent fiber as incomplete and clear its subtree flags.
        returnFiber.flags |= Incomplete;
        returnFiber.subtreeFlags = NoFlags;
        returnFiber.deletions = null;
      } else {
        // We've unwound all the way to the root.
        workInProgressRootExitStatus = RootDidNotComplete;
        workInProgress = null;
        return;
      }
    }

    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      // If there is more work to do in this returnFiber, do that next.
      workInProgress = siblingFiber;
      return;
    }
    // Otherwise, return to the parent
    // $FlowFixMe[incompatible-type] we bail out when we get a null
    completedWork = returnFiber;
    // Update the next thing we're working on in case something throws.
    workInProgress = completedWork;
  } while (completedWork !== null);

  // We've reached the root.
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }

  

completeWork
-   根据wip的tag进行不同分支处理
-   针对普通组件(HostComponent为例子)
	- 如果是update，就执行updateHostComponent 判断是否有属性变化，如果有则找出变化的属性，并标记Update flag
	- 如果是mount，则执行下面操作
		- createInstance 创建DOM
		- appendAllChildren 对children执行appendChild
		- finalizeInitialChildren 设置DOM Element属性
-   bubbleProperties 根据fiber.child及fiber.child.sibling更新subtreeFlags和childLanes




# Render（可中断）

workloop利用空闲时间去构建fiber树

-   beginWork

-   自上而下根据VDOM和当前的fiber进行比较决定是否复用旧的fiber节点。如果是组件，调用类组件的实例的render方法或者执行函数组件获取react element子元素。对fiber.child进行循环调用。如果没有child则进入CompleteWork。

-   completeUnitOfWork

-   CompleteWork

-   完成此fiber对应的真实DOM节点创建和属性赋值的功能
-   对当前fiber进行complete，然后对sibling进行complete，如果没有sibling，则返回parent fiber
-   bubbleProperties 根据fiber.child及fiber.child.sibling更新subtreeFlags和childLanes, 主要是为了标记子树有没有更新, 这样可以通过 fiber.subtreeFlags 快速判断子树是否有副作用钩子，不需要深度遍历. 在React17版本后使用subtreeFlags替换了finishWork.firstEffect的副作用链表, 操作主要发生在bubbleProperties函数中, 核心代码如下

-   如果有兄弟节点，则将wip设为兄弟节点，然后退出，进入下一轮workloop

beginWork和completeWork都会标记节点是否有副作用  

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1665744391707-968f282a-bb93-42ed-a863-2aa2172d6006.png)

结束得到一棵fiber树（finishedWork）和副作用链表