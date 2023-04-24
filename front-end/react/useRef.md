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
对于“标记了Ref flag的fiberNode”，在commit阶段的Mutation子阶段，首先会废除旧的ref：
```typescript

//commitMutationEffectsOnFiber方法

current = finishedWork.alternate
if (flags & Ref) {
  if (current !== null) {
    safelyDetachRef(current, current.return);
  }
}
```


其中safelyDetachRef方法执行具体的移除操作：

```typescript
function safelyDetachRef(current: Fiber, nearestMountedAncestor: Fiber | null) {
  const ref = current.ref;
  const refCleanup = current.refCleanup;

  if (ref !== null) {
    if (typeof refCleanup === 'function') {
      try {
          refCleanup();
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      } finally {
        // `refCleanup` has been called. Nullify all references to it to prevent double invocation.
        current.refCleanup = null;
        const finishedWork = current.alternate;
        if (finishedWork != null) {
          finishedWork.refCleanup = null;
        }
      }
    } else if (typeof ref === 'function') {
      let retVal;
      try {
	      //函数类型ref，执行并传入null参数
          retVal = ref(null);
      } catch (error) {
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    } else {
    // {current: T}类型ref，重置current指向
      // $FlowFixMe[incompatible-use] unable to narrow type to RefObject
      ref.current = null;
    }
  }
}

```

接下来进入Layout子阶段，重新赋值ref
```typescript
if (flags & Ref) {
   safelyAttachRef(finishedWork, finishedWork.return);
}
```

其中safelyAttachRef方法执行具体的赋值操作
```typescript
// Capture errors so they don't interrupt mounting.
function safelyAttachRef(current: Fiber, nearestMountedAncestor: Fiber | null) {
  try {
    commitAttachRef(current);
  } catch (error) {
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}


function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode;
    let instanceToUse;
    switch (finishedWork.tag) {
      case HostHoistable:
      case HostSingleton:
      case HostComponent:
        instanceToUse = getPublicInstance(instance);
        break;
      default:
        instanceToUse = instance;
    }
    // Moved outside to ensure DCE works with this flag
    if (enableScopeAPI && finishedWork.tag === ScopeComponent) {
      instanceToUse = instance;
    }
    if (typeof ref === 'function') {
	  //函数类型，执行函数并将实例传入
      finishedWork.refCleanup = ref(instanceToUse);
    } else {
      // $FlowFixMe[incompatible-use] unable to narrow type to the non-function case
	  // {current:T}类型更新current指向
      ref.current = instanceToUse;
    }
  }
}

```

# ref的失控
当使用ref保存“对DOM元素的引用”时，可能会造成ref失控。什么事ref失控？考虑如下代码，用inputRef保存对INPUT元素的因素，并在useEffect回调中执行三个操作
```javascript

const inputRef = useRef(null) //保存对input输入框的引用
useEffect(()=>{
	//action1
	inputRef.current.focus()

	//action2
	inputRef.current.getBoundingClientRect()
	
	//action3
	inputRef.current.style.width = '500px'
},[])
```
作为视图层框架，React代替了开发者接管了大部分视图操作，使开发者可以专注于业务逻辑开发。上述三个操作中，前两个操作并没有被React接管，所以当产生INPUT元素聚焦或者获取INPUT元素尺寸这样的结果后，可以确定这是开发者直接操作DOM的结果。但是当产生INPUT元素宽度变为500px的结果时，并不能确定这是开发者直接操作DOM的结果还是React接管视图操作的结果，所以当开发者通过ref操作DOM进行本该由React进行的DO操作时，ref会失控。

正常情况下，如果当前渲染的视图不符合预期，开发者只需要在试图对应组件的逻辑与UI中寻找原因。但是当ref失控时，除正常情况下可能的原因外，还要排查“是不是开发者直接操作DOM导致的”以及”是不是开发者直接操作DOM与React操作DOM之间的冲突导致的“等因素，使问题的排查变得更加困难。所以，开发者在编码时要尽量避免ref失控。

# ref失控的防治
ref失控是由于开发者通过ref操作DOM进行本该由React进行的DOM操作造成的。但是React并不能阻止开发者直接操作DOM，也无法接管所有DOM操作，使开发者完全没有直接操作DOM的需求。如何在这种情况下减少ref的失控？措施体现在两个方面：
* 防：控制“ref失控”影响的范围，使”ref失控造成的影响“更容易被定位。
* 治：从ref引用的数据结构入手，尽力避免可能引起失控的操作。

首先来看防。在React中，组件可以分为：
* 高阶组件
* 低阶组件
低阶组件指基于DOM封装的组件，比如下面的组件，直接基于input元素封装：
```jsx
function MyInput(props){
	return <input {...props} />
}
```

高阶组件指“基于低阶组件封装的组件”，比如下面的MyForm组件是基于MyInput组件封装的：
```jsx
function MyForm(){
	return (
		<>
			<MyInput/>
		</>
	)
}
```
高阶组件无法直接将ref指向DOM，这一限制将ref失控的范围指控在单个组件内，不会出现跨越组件的ref失控。

```javascript
export default function App() {
  const inputRef = useRef(null);
  console.log(inputRef);
  return (
    <div className="App">
      <MyInput ref={inputRef} />
    </div>
  );
}

const MyInput = (props) => {
  return (
    <>
      <input {...props}></input>
    </>
  );
};
```
上面代码会报错。因为父组件向Myinput传递ref失败，inputRef.current并没有指向INPUT元素。原因是为了将ref失控的范围控制在单个组件内，React默认情况下不支持跨组件传递ref。
如果一定要取消这一限制，可以使用forwardRef API（forward意为传递，转发）显式传递ref：
```jsx
const MyInput = forwardRef((props,ref)=>{
	return <input {...props} ref={ref}>
})
```

在实践中，一些开发者认为forwardRef API是多余e，完全可以将ref改名为xxx属性规避“默认情况下不支持跨组件传递ref”。但是从ref失控角度看，forwardRef就像是一份免责告知书-既然开发者手动调用forwardRef存在，发生ref失控相关的错误后更容易定位错误。
```jsx
export default function App() {
  const inputRef = useRef(null);
  console.log(inputRef);
  return (
    <div className="App">
      <MyInput customRef={inputRef} />
    </div>
  );
}

const MyInput = (props) => {
  return (
    <>
      <input {...props} ref={props.customRef}></input>
    </>
  );
};
```


了解“防”后，接下来看“治”。useImperativeHandle作为一个原生Hook，使用方式如下，它可以在使用ref时向父组件传递自定义的引用值:
```js
useImperativeHandle(ref, createHandle, [deps])
```
比如在下述代码中，MyInput的父组件接收的ref中只包含focus方法：
```jsx

export default function App() {
  const inputRef = useRef(null);
  console.log(inputRef);
  return (
    <div className="App">
      <MyInput ref={inputRef} />
    </div>
  );
}

const MyInput = forwardRef((props, ref) => {
  useImperativeHandle(ref, () => ({
    focus() {
      ref.current.focus();
    }
  }));
  return (
    <>
      <input {...props} ref={ref}></input>
    </>
  );
});
```
经过useImpreativeHandle处理过的ref，可以人为移除可能造成ref失控的属性或方法。使用useImperativeHandle修改Myinput组件。现在父组件通过inputRef.current只能获取到子组件预先定义的数据结构，杜绝开发者通过ref获取到DOM后执行不当操作，出现ref失控的情况
```js
{
	focues() {
		inputRef.current.focus();
	}
}
```



