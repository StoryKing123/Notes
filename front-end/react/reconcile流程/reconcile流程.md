在beginWork中，没有命中bailout策略的fiberNode会根据所处阶段不同(mount 或者 update)进入mountChildFibers 或 reconcilerChildFibers，它们的区别在于是否追踪副作用（即是否标记flags）。这一流程被统称为reconcile流程。对于一个DOM元素，在某一时刻最多会有三个节点与它相关：
1. current FiberNode，与试图中的DOM元素对应
2. wip fiberNode,与更新流程中的COM元素对应
3. JSX对象，包括描述DOM元素所需的数据
reconciler流程的本质，是**对比current fiberNode 与 JSX对象，生成wip fiberNode。** 除React外，这一流程的核心算法被称为Diff算法。
Diff算法本身也会带来性能损耗。将两棵树完全对比的算法复杂福为O(n3)。其中n是元素的数量。为了降低复杂度，React的Diff算法会预设三个限制。
1. 只对同级元素进行Diff。如果一个DOM元素在前后两次更新中跨越了层级，那么React不会尝试复用它
2. 两个不同类型的元素会产生不同的树。如果元素由IDV变为PReact会销毁DIV及其子孙元素，并新建P及其子孙元素
3. 开发者可以通过指定key来表示子元素在不同的渲染下能够保持稳定
JSX代码如下
```html
//更新前
<div>
    <p key="a">a</p>
    <h3 key="b">b</h3>
</div>


//更新后
<div>
    <h3 key="b">b</h3>
    <p key="a">a</p>
</div>
```
如果没有key，React会认为DIV的第一个子元素由P变为H3，第二个子元素由H3变为P，这符合限制二的设定。当用key执行元素更新前后的对应关系时，key === “a”的P在更新后仍然存在，所以DOM元素可以复用，只是需要交换顺序。
reconcileChildFibers方法执行流程如下
```typescript

  // This API will tag the children with the side-effect of the reconciliation
  // itself. They will be added to the side-effect list as we pass through the
  // children and the parent.
  function reconcileChildFibersImpl(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    newChild: any,
    lanes: Lanes,
  ): Fiber | null {
    // This function is not recursive.
    // If the top level item is an array, we treat it as a set of children,
    // not as a fragment. Nested arrays on the other hand will be treated as
    // fragment nodes. Recursion happens at the normal flow.

    // Handle top level unkeyed fragments as if they were arrays.
    // This leads to an ambiguity between <>{[...]}</> and <>...</>.
    // We treat the ambiguous cases above the same.
    // TODO: Let's use recursion like we do for Usable nodes?
    const isUnkeyedTopLevelFragment =
      typeof newChild === 'object' &&
      newChild !== null &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      newChild.key === null;
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild.props.children;
    }

    // Handle object types
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes,
            ),
          );
        case REACT_PORTAL_TYPE:
          return placeSingleChild(
            reconcileSinglePortal(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes,
            ),
          );
        case REACT_LAZY_TYPE:
          const payload = newChild._payload;
          const init = newChild._init;
          // TODO: This function is supposed to be non-recursive.
          return reconcileChildFibers(
            returnFiber,
            currentFirstChild,
            init(payload),
            lanes,
          );
      }

      if (isArray(newChild)) {
        return reconcileChildrenArray(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes,
        );
      }

      if (getIteratorFn(newChild)) {
        return reconcileChildrenIterator(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes,
        );
      }

      // Usables are a valid React node type. When React encounters a Usable in
      // a child position, it unwraps it using the same algorithm as `use`. For
      // example, for promises, React will throw an exception to unwind the
      // stack, then replay the component once the promise resolves.
      //
      // A difference from `use` is that React will keep unwrapping the value
      // until it reaches a non-Usable type.
      //
      // e.g. Usable<Usable<Usable<T>>> should resolve to T
      //
      // The structure is a bit unfortunate. Ideally, we shouldn't need to
      // replay the entire begin phase of the parent fiber in order to reconcile
      // the children again. This would require a somewhat significant refactor,
      // because reconcilation happens deep within the begin phase, and
      // depending on the type of work, not always at the end. We should
      // consider as an future improvement.
      if (typeof newChild.then === 'function') {
        const thenable: Thenable<any> = (newChild: any);
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          unwrapThenable(thenable),
          lanes,
        );
      }

      if (
        newChild.$$typeof === REACT_CONTEXT_TYPE ||
        newChild.$$typeof === REACT_SERVER_CONTEXT_TYPE
      ) {
        const context: ReactContext<mixed> = (newChild: any);
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          readContextDuringReconcilation(returnFiber, context, lanes),
          lanes,
        );
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      return placeSingleChild(
        reconcileSingleTextNode(
          returnFiber,
          currentFirstChild,
          '' + newChild,
          lanes,
        ),
      );
    }


    // Remaining cases are all treated as empty.
    return deleteRemainingChildren(returnFiber, currentFirstChild);
  }
  
```

根据Diff算法的第一条限制规则“只对同级元素进行DIff”，可以将DIff流程分为两类：
1. 当newChild类行为object,number,string时，代表更新后同级只有一个元素，此时根据newChild创建wip fiberNode，并返回wip fiberNode
2. 当newChild类型为Array、iterator时，代表更新后同级有多个元素，此时会遍历newChild创建wip fiberNode及其兄弟fiberNode， 并返回wip fiberNode
下面分别针对这两种情况进行讨论

# 单节点Diff
以最常见的JSX类型REACT_ELEMENT_TYPE为例子，在reconcileChildFiber方法中会执行reconcileSingleElement方法：
```javascript
if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes,
            ),
          );
          ...
```


reconcileSingleElement方法执行流程：
![[reconcileSingleElement执行流程.excalidraw|675]]

对应代码如下
```typescript

  function reconcileSingleElement(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    element: ReactElement,
    lanes: Lanes,
  ): Fiber {
    const key = element.key;
    let child = currentFirstChild;
//遍历current fiberNode及其兄弟fiberNode（如果存在）
    while (child !== null) {
      // TODO: If key === null and child.key === null, then this only applies to
      // the first item in the list.
      //首先比较key是否相同
      if (child.key === key) {
        const elementType = element.type;
        if (elementType === REACT_FRAGMENT_TYPE) {
          if (child.tag === Fragment) {
            deleteRemainingChildren(returnFiber, child.sibling);
            const existing = useFiber(child, element.props.children);
            existing.return = returnFiber;
            return existing;
          }
        } else {
        //比较type是否相同
          if (
            child.elementType === elementType ||
            // Keep this check inline so it only runs on the false path:
            // Lazy types should reconcile their resolved type.
            // We need to do this after the Hot Reloading check above,
            // because hot reloading has different semantics than prod because
            // it doesn't resuspend. So we can't let the call below suspend.
            (typeof elementType === 'object' &&
              elementType !== null &&
              elementType.$$typeof === REACT_LAZY_TYPE &&
              resolveLazy(elementType) === child.type)
          ) {
          //标记删除 “current fiberNode”的兄弟节点
            deleteRemainingChildren(returnFiber, child.sibling);
            const existing = useFiber(child, element.props);
            existing.ref = coerceRef(returnFiber, child, element);
            existing.return = returnFiber;
            return existing;
          }
        }
        // 剩余的都不能用，标记删除
        // Didn't match.
        deleteRemainingChildren(returnFiber, child);
        break;
      } else {
      //key不相同，当前current fiberNode不能复用，标记删除
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    if (element.type === REACT_FRAGMENT_TYPE) {
      const created = createFiberFromFragment(
        element.props.children,
        returnFiber.mode,
        lanes,
        element.key,
      );
      created.return = returnFiber;
      return created;
    } else {
    //创建wip fiberNode
      const created = createFiberFromElement(element, returnFiber.mode, lanes);
      created.ref = coerceRef(returnFiber, currentFirstChild, element);
      created.return = returnFiber;
      return created;
    }
  }
```

reconcile流程是对比current fiberNode与JSX对象，生成wip fiberNode。执行reconcileSingleElement方法代表更新后同级只有一个JSX对象，生成wip fiberNode。执行reconcileSingleElement方法代表“更新后同级只有一个JSX对象”。而current fiberNode可能存在兄弟fiberNode，所以需要遍历current fiberNode机器兄弟节点寻找可以复用的fiberNode。判断是否复用遵循如下顺序。
1. 判断key是否相同。
如果更新前后均未设置key，则key均为null，也数据相同的情况。
2. 如果key相同，再判断type是否相同
当以上条件都满足时，则current fiberNode可以复用

当"child !== null 且key且type不同时"，执行deleteRemainChildren将child及其兄弟fiberNode均标记删除。
当"child !== null 且key不同时"，仅将child标记删除。
```html
更新前
<ul>
	<li>1</li>
	<li>2</li>
	<li>3</li>
</ul>

更新后
<ul>
	<p>1</p>
</ul>
```


因为key相同且type不同时，代表已经找到本次更新对应的fiberNode(key 相同)，但由于type不同，不能复用。即然唯一的可能性不能复用，则其与兄弟fiberNode都没有机会，所以都需要标记删除。key不同只代表当前遍历到的fiberNode不能被复用，后面可能还有兄弟fiberNode没有遍历到，所以仅标记当前fiberNode删除。



# 多节点Diff
考虑如下FC：
```jsx
function List (){
	return (
		<ul>
			<li key="0">0</li>
			<li key="1">1</li>
			<li key="2">2</li>
			<li key="3">3</li>
		</ul>
	)
}
```

其redner后的返回值JSX对象的children属性不是单一节点，而是包含四个对象的数组。
```js
{
	$$typeof: Symbol(react.element),
	key: null,
	props: {
		children: {
			{$$typeof: Symbol(react.element), type: 'li',key: "0",...},
			{$$typeof: Symbol(react.element), type: 'li',key: "1",...}
			{$$typeof: Symbol(react.element), type: 'li',key: "2",...}
			{$$typeof: Symbol(react.element), type: 'li',key: "3",...}
		}
	},
	ref: null,
	type: "ul"

}
```
在这种情况下，reconcileChildFibers 的 newChild 参数类型为 Array，在reconcileChildFibers方法内部对应如下逻辑：
```javascript
      if (isArray(newChild)) {
        return reconcileChildrenArray(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes,
        );
      }
```

这种情况属于同级多节点Diff。包含以下三种需要处理的情况。
1. 节点位置没有变化
```html
//before
<ul>
    <li key="0" className="before">0</li>
    <li key="1">1</li>
</ul>

//after
<ul>
    <li key="0" className="after">0</li>
    <li key="1">1</li>
</ul>
```

2. 节点增删
```html
//更新前
<ul>
    <li key="0">0</li>
    <li key="1">1</li>
    <li key="2">2</li>
</ul>

//更新后 新增节点
<ul>
    <li key="0">0</li>
    <li key="1">1</li>
    <li key="2">2</li>
    <li key="3">3</li>
</ul>


//更新后 删除节点
<ul>
    <li key="0">0</li>
    <li key="1">1</li>
</ul>
```

3. 节点移动
```html
//更新前
<ul>
    <li key="0">0</li>
    <li key="1">1</li>
</ul>



//更新后 
<ul>
    <li key="1">1</li>
    <li key="0">0</li>
</ul>
```

同级多节点Diff，一定属于以上三种情况中的一种或多种。

常见的Diff算法设计思路是：
1. 判断当前节点属于哪种情况
2. 如果是删减，执行增删逻辑
3. 如果位置没有变化，执行相应逻辑
4. 如果是移动，执行移动逻辑
这个方案隐含的前提是，不同操作的优先级是相同的。但在日常开发中，“节点移动”较少发生，所以Diff会优先判断其他情况。基于这个理念，Diff算法的整体逻辑会经历两轮遍历，流程如下图所示
1. 第一轮遍历尝试逐个复用节点
2. 第二轮遍历处理剩下的节点
对于最常见的情况（即“节点位置没有变化”），对应图中的情况4。此时仅需经历第一轮遍历，相较其他情况省略了第二轮遍历。

