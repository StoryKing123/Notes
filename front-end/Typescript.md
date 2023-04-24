
# 递归运算
在正常运算中，typescript中是不会进行递归运算的，比如下面给对象添加readonly属性
```ts
type Readonly3<T> = { readonly [Key in keyof T]: T[Key] extends Object ? Test<T[Key]> : T[Key] }
type RR2 = Readonly3<{ a: number } | { b: number }>
```
![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20230424144259.png)

如果要进行深层次的计算，可以使用extends触发计算

```ts
type Readonly3<T> = T extends any? { readonly [Key in keyof T]: T[Key] extends Object ? Test<T[Key]> : T[Key] }:never;
```

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20230424144410.png)
