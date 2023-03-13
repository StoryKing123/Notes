
![[pendingLanes相关工作流程.excalidraw|675]]


> 三者关系如下


# 第一步
交互发生后产生新的lane。由于lanes冒泡，从目标fiberNode向上遍历，遍历过程中的fiberNode.childLanes和最终的root.pendingLanes中会附加该lane。然后被调度后进入第二步

# 第二步
在render reconciler阶段中，每进入一个fiberNode的beginWork时，该fiberNode会消费lanes，具体消费方式为根据lanes对应update，计算state (useState更新的value在此处计算)，所以该fiberNode.lanes会被重置，代表对应lanes被消费。当消费之后，也需要在每一级祖先fiberNode.childLanes中被移除。会在render阶段的completeWork进行flags冒泡，每一级祖先fiberNode.childLanes会被更新。

```typescript


```

如果遇到lanes消费失败的场景，比如Suspense造成的挂起，则fiberNode.lanes会在completeWork中被subtreeRednerLanes重置，代表对于该fiberNode，subtreeRenderLanes对应lanes在本次redner阶段并未执行。


# 第三步
当render阶段完成进入commit阶段，表示进入了lane模型一轮工作的收尾阶段。在commit阶段的三个子阶段开始前，会执行一些重置操作: