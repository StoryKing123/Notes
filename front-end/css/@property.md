使用property可以实现一些正常css transition过渡不了的属性
```html
1<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Static Template</title>
    <style>
      @property --tlength {
        syntax: "<length>";
        inherits: false;
        initial-value: 0;
      }

      .text-animation {
        text-decoration: underline;
        text-underline-offset: var(--tlength, 0px);
        transition: --tlength 400ms, text-decoration-color 400ms;
      }
      .text-animation:hover {
        --tlength: 10px;
        text-decoration-color: orange;
      }
    </style>
  </head>
  <body>
    <div class="text-animation">text</div>
    <h1>
      This is a static template, there is no bundler or bundling involved!
    </h1>
  </body>
</html>


```


<iframe src="https://hrjyqm.csb.app" width="100%"></iframe>