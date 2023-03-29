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

![[多节点Diff.excalidraw|675]]

参与比较的双方，oldFiber代表vurrent fiberNode，其数据结构是链表；newChildren代表JSX对象，其数据结构是数组。由于oldFiber是链表，所以无法借助“双指针”从数组首尾同时遍历以提高效率。

## 算法实现
第一轮遍历代码如下：
```javascript
	//参与比较的current fiberNode
    let oldFiber = currentFirstChild;
	//最后一个可复用oldFiber的位置索引
    let lastPlacedIndex = 0;
   
    //JSX对象的索引
    let newIdx = 0;
    
     //下一个oldFiber
    let nextOldFiber = null;
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      //具体实现
    }
```

第一轮遍历步骤如下：
1. 遍历newChildren，将newChildren[newIdx]与oldFiber比较，判断是否可复用
2. 如果可复用，i++，继续步骤1。如果不可复用，分两种情况:
	a key不同导致不可复用，立即跳出遍历，第一轮遍历结束
	b key相同type不同导致不可复用，会将oldFiber标记为DELETION，继续步骤1
3. 如果newChildren遍历完（即newIdx === newChildren.length）或者oldFiber遍历完(oldFiber === null)，则跳出遍历，第一轮遍历结束

对于图中的情况2，newChildren遍历完，oldFiber未遍历完，意味着有旧节点被删除，所以需要遍历其余oldFiber，依次标记Deletion。

对于情况3，oldFiber遍历完，newChildren未遍历完，意味着有新节点被插入，需要遍历其余newChildren依次生成fiberNode。

对于情况1，由于有节点改变了位置，因此不能再顺序遍历并比较。如何快速将同一个节点在更新前后对应上，并判断它的位置是否移动呢？这里涉及三个问题：
1. 如何将同一个节点在更新前后对应上
2. 如何快速找到这个节点
3. 如何判断它的位置是否移动
首先，key用于将同一个节点在更新前后对应上。其次，为了快速找到key对应的oldFiber，可以将所有还未处理的oldFiber存入以key为key，oldFiber为value的Map中。这一过程发生在mapRemainChildren方法中。
```typescript

  function mapRemainingChildren(
    returnFiber: Fiber,
    currentFirstChild: Fiber,
  ): Map<string | number, Fiber> {
    // Add the remaining children to a temporary map so that we can find them by
    // keys quickly. Implicit (null) keys get added to this set with their index
    // instead.
    //用于存储oldFiber的Map
    const existingChildren: Map<string | number, Fiber> = new Map();

    let existingChild: null | Fiber = currentFirstChild;
    while (existingChild !== null) {
      if (existingChild.key !== null) {
		//key存在，使用key作为key
        existingChildren.set(existingChild.key, existingChild);
      } else {
	    //key不存在，使用index作为key
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }

```

接下来遍历其余的newChildren时，即可以O(1)复杂度获取相同的key对应的oldFiber:
```javascript
  //获取相同的key对应的oldFiber
  const matchedFiber =
    existingChildren.get(
      newChild.key === null ? newIdx : newChild.key,
    ) || null;
```

当获取到相同key对应的oldFiber后，如何判断它的位置是否移动?
判断的参照物是lastPlacedIndex变量（最后一个可复用oldFiber的位置索引）。由于newChildren中JSX对象的顺序代表“本次更新后对应fiberNode的顺序”，因此在遍历newChildren生成wip fiberNode的过程中，每个新生成的wip fiberNode一定是“当前所有同级wip fiberNode中最靠右的一个”。如果改wip fiberNode存在相同的key对应的oldFiber，则有以下两种情况
1. oldFiber.index < lastPlacedIndex
	表明oldFiber在lastPlacedIndex对应fiberNode左边。已知wip fiberNode不会在lastPlacedIndex对应fiberNode左边（因为它是当前所有同级wip fiberNode中最靠右的一个），这表明该fiberNode发生了移动，需要标记Placement。
2. oldFiber.index >= lastPlacedIndex
表明oldFiber 不在 lastPlacedIndex 对应 fiberNode 左边。与wip fiberNode位置一致，所以不需要移动

判断“位置是否移动”的逻辑发生在placeChild方法中：
```typescript

  function placeChild(
    newFiber: Fiber,
    lastPlacedIndex: number,
    newIndex: number,
  ): number {
    newFiber.index = newIndex;
    if (!shouldTrackSideEffects) {
      // During hydration, the useId algorithm needs to know which fibers are
      // part of a list of children (arrays, iterators).
      newFiber.flags |= Forked;
      return lastPlacedIndex;
    }
    const current = newFiber.alternate;
    if (current !== null) {
		//存在复用
      const oldIndex = current.index;
      if (oldIndex < lastPlacedIndex) {
		//节点移动
        // This is a move.
        newFiber.flags |= Placement | PlacementDEV;
        return lastPlacedIndex;
      } else {
	    //节点在原位置未移动
        // This item can stay in place.
        return oldIndex;
      }
    } else {
      // This is an insertion.
      //新节点插入
      newFiber.flags |= Placement | PlacementDEV;
      return lastPlacedIndex;
    }
  }
```

每次执行placeChild方法后都会用返回值更新lastPlacedIndex:
```javascript
lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
```

lastPlacedIndex对应逻辑比较复杂，这里通过两个示例来说明多节点Diff的流程。

```html

//更新前
<ul>
    <li key="a">a</li>
    <li key="b">b</li>
    <li key="c">c</li>
    <li key="d">d</li>
</ul>



//更新后 
<ul>
    <li key="a">a</li>
    <li key="c">c</li>
    <li key="d">d</li>
    <li key="b">b</li>
</ul>
```

第一轮遍历开始:
1. a（后）与a（前）比较，可以复用，oldFiber.index === 0，所以lastPlacedIndex = 0
2. c（后）与b（前）比较，不能复用，跳出第一轮遍历，此时plastPlacedIndex === 0
此时newChildren包含cbd，oldFiber包含bcd，属于情况1.将oldFiber保存在map中，数据结构如下：
```javascript
{
	"b" => FiberNode,
	"c" => FiberNode,
	"d" => FiberNode
}
```

第二轮开始，继续遍历剩余newchildren
1. c在map中找到，可以复用，oldFiber.index === 2 （更新前顺序为abcd，所以c对应index为2）。由于oldFiber.index > lastPlacedIndex （2 > 0），则c位置不变，同时lastPlacedIndex = 2。
2. d在map中找到，可以复用，oldFiber.index === 3。由于 oldFiber.index < lastPlacedIndex (1 < 3)，标记b移动。第二轮遍历结束。
最终b标记Placement。由于b对应wip fiberNode没有sibling。在commitPlacement方法中不存在before，所以执行parentNode.appendChild 方法，对应DOM元素被移动至同级最后。

示例2
```html
//更新前
<ul>
    <li key="a">a</li>
    <li key="b">b</li>
    <li key="c">c</li>
    <li key="d">d</li>
</ul>



//更新后 
<ul>
    <li key="d">d</li>
    <li key="a">a</li>
    <li key="b">b</li>
    <li key="c">c</li>
</ul>
```
第一轮遍历开始：
d（后）与a（前）比较，不能复用，跳出第一轮遍历，此时lastPalcedIndex === 0。
此时newChildren包含dabc，oldFiber包含abcd，属于情况下。将oldFiber保存在map中，数据结构如下
```javascript
{
	"a" => FiberNode,
	"b" => FiberNode,
	"c" => FiberNode,
	"d" => FiberNode
}
```

第二轮遍历开始，继续遍历其余newChildren：
1. d在map中找到，可以复用，oldFiber.index === 3。由于 oldFiber.index > lastPlacedIndex （3 > 0），则d位置不变，同时lastPalcedIndex  = 3.
2. a在map中找到，可以复用，oldFiber.index === 0。由于 oldFiber.index < lastPlacedIndex (0 < 3)，标记a移动
3. b在map中找到，可以复用，oldFiber.index === 1。由于 oldFiber.index < lastPlacedIndex (1 < 3)，标记b移动
4. c在map中找到，可以复用，oldFiber.index === 2。由于oldFiber.index < lastPlcedIndex (2<3)，标记c移动，第二轮遍历结束
最终abc三个节点标记Placement，依次执行 parentNode.appendChild 方法。可以看到，abcd 变为 dabc，虽然只需要将d移动到最前面，但实际上React保持d不变，将abc分享移动到了d的后面。出于性能的考虑，开发时要尽量避免将节点从后面移动到前面的操作


# 实现Diff算法
不管是单节点还是多节点Diff，都有判断是否复用的操作。可以认为：单节点Diff是同级只有一个节点的多节点Diff。而多节点Diff之所以会经历两轮遍历，是出于性能考虑，优先处理“常见情况”。所以我们可以基于多节点Diff中第二轮遍历情况1使用的算法实现Diff。

虚拟DOM节点的数据结构定义如下：
```typescript
type Flag = 'Placement' | 'Deletion'
```