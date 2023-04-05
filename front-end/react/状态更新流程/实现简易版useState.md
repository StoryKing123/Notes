```typescript
let callbackNode: NodeJS.Timeout | undefined = undefined;
let workInProgressHook: Hook | undefined | null;
let isMount = true;
let App = () => {};

type Action = (key: any) => void;

interface Fiber {
  memoizedState?: Hook;
  stateNode: () => { click: () => void };
}

interface Hook {
  queue: Queue;
  memoizedState: any;
  next?: Hook | null;
}

interface Update {
  action: Action;
  next?: Update | null;
}

interface Queue {
  pending?: Update | null;
}

const fiber: Fiber = {
  memoizedState: undefined,
  stateNode: App as any
  // stateNode: App
};

function schedule() {
  if (callbackNode) {
    clearTimeout(callbackNode);
  }

  callbackNode = setTimeout(() => {
    workInProgressHook = fiber.memoizedState;
    (window as any).app = fiber.stateNode();
    isMount = false;
  });
}

function dispatchSetState(queue: Queue, action: Action) {
  const update: Update = {
    action,
    next: undefined
  };

  if (!queue.pending) {
    update.next = update;
  } else {
    update.next = queue.pending.next;
    queue.pending.next = update;
  }

  queue.pending = update;

  schedule();
}

function useState(initialState: any) {
  let hook: Hook | undefined | null;

  //判断是否是初次挂载
  if (isMount) {
    //初始化hook
    hook = {
      queue: {
        pending: null
      },
      memoizedState: initialState,
      next: null
    };

    //挂载到fiber.memoziedState上
    //复制WIPHook
    if (!fiber.memoizedState) {
      fiber.memoizedState = hook;
    } else {
      (workInProgressHook as Hook).next = hook;
    }
    workInProgressHook = hook;
  } else {
    hook = workInProgressHook;
    workInProgressHook = (workInProgressHook as Hook).next;
  }

  if (!hook) {
    throw new Error("target hook doesn't exist");
  }

  //update执行前的初始state
  let baseState = hook.memoizedState;

  if (hook.queue.pending) {
    let firstUpdate = hook.queue.pending.next as Update;

    //遍历链表计算state
    do {
      const action = firstUpdate.action;
      baseState = action(baseState);
      firstUpdate = firstUpdate.next as Update;
      //最后一个update执行完后跳出循环
      //因为是循环链表，所以判断是否到头，到头了就跳出循环
    } while (firstUpdate !== hook.queue.pending.next);

    //清空queue.pending
    hook.queue.pending = null;
  }

  //将update action执行完后的state作为memoizedState
  hook.memoizedState = baseState;

  return [baseState, dispatchSetState.bind(null, hook.queue)];
}

```

[funny-shape-0m9455 - CodeSandbox](https://codesandbox.io/s/funny-shape-0m9455?file=/src/index.ts:0-2350)