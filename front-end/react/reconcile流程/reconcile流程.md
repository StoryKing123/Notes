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
