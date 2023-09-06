	核心就是返回自身
```javascript
function initQuery(list) {
    return new query(list);
}
function query(list) {
    console.log(this);
    this.fn = [];
    this.list = list;
    return this;
}

query.prototype.where = function (fn) {
    const listfn = () => {
        this.list = this.list.filter(fn);
    };
    this.fn.push(listfn);
    return this;
};

query.prototype.sort = function (fn) {
    const listfn = () => {
        console.log("before");
        console.log(this.list);
        this.list = this.list.sort(fn);
        console.log("after");
        console.log(this.list);
    };
    this.fn.push(listfn);
    return this;
};

query.prototype.groupBy = function () {};

query.prototype.execute = function () {
    console.log(this.fn);
    for (let i = 0; i < this.fn.length; i++) {
        let fn = this.fn[i];
        console.log(fn);
        fn();
    }
    return this.list;
};

const data = initQuery([{ age: 2 }, { age: 5 }, { age: 4 }, { age: 1 }])
    .where((item) => {
        return item.age > 1;
    })
    .sort((a, b) => {
        return a.age - b.age;
    })
    .execute();

```