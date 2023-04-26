最简单的grid布局
```html
<div class="grid-container">
      <div class="item"></div>
      <div class="item"></div>
      <div class="item"></div>
      <div class="item"></div>
      <div class="item"></div>
</div>
```

```css

.grid-container{
  height:500px;
  width: 1000px;
  background-color:cyan;
  gap:1px;

  display: grid;
  grid-template-columns: 1fr 1fr 1fr ;
  grid-template-rows: 1fr 1fr 1fr;
}


```
