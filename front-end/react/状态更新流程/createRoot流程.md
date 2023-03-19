


![[ReactDom.createRoot流程.excalidraw|675]]


下面代码会开启首屏渲染
```jsx
ReactDOM.createRoot(root).render(<App/>)
```
其中创建的Update结构如下
```javascript
const update = {
	paload: {
		element //App对应JSX对象
	},
	tag: UpdateState,
	next: null,
	...
}
```

接下来接入schedule阶段，调度完成后进入render阶段。在HostRoot的beginWork中计算state，其中updateQueue数据结构如下。
```javascript
const updateQueue = {
	baseState: {
		element: null
	},
	shared: {
		pending: update //上述update
		...
	},
	...
}
```
