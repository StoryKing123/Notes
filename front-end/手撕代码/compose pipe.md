# pipe
```javascript
const pipeline = (...funcs) => {

    const callback = (prev, func) => {

        return func(prev)

    }

    return (param) => {

        return funcs.reduce(callback, param)

    }

}

const add1 = (x) => x + 1

const add2 = x => x + 2

  

const res = pipeline(add1, add2)

console.log(res(2))
```


