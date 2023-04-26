
装饰器使用
```
@f @g x



@f
@g
x

```

(_f_ ∘ _g_)(_x_) 结果相等 f(_g_(_x_)).
执行顺序
```ts
function first() {
  console.log("first(): factory evaluated");
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log("first(): called");
  };
}
 
function second() {
  console.log("second(): factory evaluated");
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log("second(): called");
  };
}
 
class ExampleClass {
  @first()
  @second()
  method() {}
}
```

输出顺序

```ts
first(): factory evaluated

second(): factory evaluated

second(): called

first(): called
```