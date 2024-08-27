

对于基础proxy里面的函数,比如get,里面的第三个参数receiver,这个参数指的是**原始的读/赋值操作所在的那个对象**
指的是以下两种情况


# proxy
## 第一种情况
```javascript

const obj = { a: "bbb" };
// const aobj = Object.create(obj);

const pobj = new Proxy(obj, {
    get(target, key, receiver) {
        console.log(receiver === pobj);//true
        return target[key];
    },
});
```

这种情况是最基础的情况,里面的receiver指的就是代理对象本身

# 第二种情况

```javascript
const obj = { a: "bbb" };

const pobj = new Proxy(obj, {
    get(target, key, receiver) {
        console.log(receiver === pobj); //false
        console.log(receiver === bobj); //true
        return target[key];
    },
});

const bobj = {};
Object.setPrototypeOf(bobj, pobj);

console.log(bobj.a);//bbb
```
这种情况receiver指的是继承proxy的那个对象.也就是bobj


# Reflect
在Reflect中receiver中可以修正属性访问中的this指向
```javascript
const parent = {
  name: '19Qingfeng',
  get value() {
    return this.name;
  },
};

const handler = {
  get(target, key, receiver) {
    return Reflect.get(target, key);
    // 这里相当于 return target[key]
  },
};

const proxy = new Proxy(parent, handler);

const obj = {
  name: 'wang.haoyu',
};

// 设置obj继承与parent的代理对象proxy
Object.setPrototypeOf(obj, proxy);

// log: 19Qingfeng
console.log(obj.value);

```

	加上receiver后

```javascript
const parent = {
  name: '19Qingfeng',
  get value() {
    return this.name;
  },
};

const handler = {
  get(target, key, receiver) {
-   return Reflect.get(target, key);
+   return Reflect.get(target, key, receiver);
  },
};

const proxy = new Proxy(parent, handler);

const obj = {
  name: 'wang.haoyu',
};

// 设置obj继承与parent的代理对象proxy
Object.setPrototypeOf(obj, proxy);

// log: wang.haoyu
console.log(obj.value);

```
