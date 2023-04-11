ref时reference的缩写。在React中，开发者早期习惯用ref保存对DOM元素的引用。事实上，任何需要被引用的数据都可以保存在ref中，useRef的出现将这种思想进一步发扬光大。在React发展过程中，出现过三个ref相关数据结构：
1. String类型
2. 函数类型
3. {current: T}
由于String类型的ref已不推荐使用，因此本节关注的时候后两种类型

# 实现原理
与其他Hook类型，useRef在mount时与update时对应两个不同的dispatcher，其原理很简单，使用的是{current:T}这一数据结构：
```typescript
function mountRef<T>(initialValue: T): {current: T} {
  const hook = mountWorkInProgressHook();
  const ref = {current: initialValue};
  hook.memoizedState = ref;
  return ref;
}


function updateRef<T>(initialValue: T): {current: T} {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}
```

除useRef外，React.createRef方法也会创建同样数据结构的ref：
```typescript
export function createRef(): RefObject {
  const refObject = {
    current: null,
  };
  return refObject;
}
```

# ref的工作流程
在React中，有多个组件类型可以赋值ref props，比如HostComonent、ClassComonent、ForwardRef，使用方式如下：
```jsx
// HostComponent
<div ref={domRef}></div>

//ClassComponent、ForwardRef
<App ref={cpnRef} />
```
ref的工作流程分为两个阶段如下图所示：
1. render阶段：标记Reg flag
2. commit阶段：根据Ref flag，执行ref相关操作


![[ref工作流程.excalidraw|675]]

markRef方法用于标记Reg flag，代码如下：
```javascript
function markRef(current: Fiber | null, workInProgress: Fiber) {
  const ref = workInProgress.ref;
  if (
    (current === null && ref !== null) ||
    (current !== null && current.ref !== ref)
  ) {
    // Schedule a Ref effect
    workInProgress.flags |= Ref;
    workInProgress.flags |= RefStatic;
  }
}
```
从上面代码可知，两种情况下会标记Ref flag：
1. mount时（current === null），且ref props存在。
2. update时，且ref props变化。
3. 对于“标记了Ref flag的fiberNode”，在commit阶段的Mutation子阶段，首先会废除旧的ref：
4. 