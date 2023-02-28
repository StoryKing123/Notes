# Model-driven-app介绍

Model-driven-app是由微软出品的一种App，开发者可以在Power Platform中使用低代码甚至无代码即可开发出一款应用。但是也有一定的局限性，通过Model-driven-app开发出来的App是与databerse（数据库）有着相关联型的，开发者无法在上面对其进行解耦。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1651121857903-8ace4704-d9ca-43e6-b80d-b889510316c1.png)

鉴于Modle-driven-app可以引入Web Resource的特点。我们可以对应用进行增强，大大提高了上限。我们可以利用前端开发的方式，将页面引入到MDA中。这样我们有着前端开发的体验，也有MDA提供的特性。

Power Platform在国内比较小众，基本上只有工作相关的才会接触。其余的可以自行查阅，作者对MDA也不太了解，没有使用原生MDA开发过应用。

## 为什么要结合Modle-driven-app去使用。

对于现在的开发模式（前后端分离），我们需要做的事情有很多，包括权限认证、请求跨域处理。

MDA能提供API去对数据进行操作（通过Parent上的Xrm）。

# 实现原理

在MDA中可以引入JS、HTML、CSS等资源。我们通过Webpack、Vite等构建工具打包出来的资源是JS、HTML、CSS和图片等资源。将打包后的资源上传到Power Platform平台，就可以在MDA中使用引入的资源。这样我们就可以做初步的实现。在MDA应用中关联某一个Tab页到上传的HTML中，即可使用实现React应用的加载。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1652149157389-111e9c8c-94d4-42eb-b8d8-8332f652c798.png)

通过选择Page的Content type和URL，将上传的资源关联起来。

  

# 问题

  

## 开发如何连接到本地React dev

上面讲的原理是通过将页面与Webpack打包出来的HTML关联起来。HTML去加载JS、CSS等资源去加载应用。但是我们在开发阶段时，是通过Webpack构建工具的Dev服务启动一个本地的服务，通过locahost去访问应用比如http://localhost:3000）。如果要在MDA应用中进行调试，每次更改都要上传到Power Platform平台是一件十分麻烦的事情。那有没有什么方法可以让我们MDA应用上进行开发？

我们可以打开Webpack服务Dev时的URL看看。在控制台工具查看页面元素。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1652150506313-f32d23e8-90ad-458b-9748-c81a1d12f12f.png)

可以看到页面加载的时当前路径的bundle.js文件，也就是http://localhost:3000/bundle.js。我们也可以效仿这种方式。创建一个空的HTML文件。创建容器div和引入bundle.js包。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1652150683680-abed0d15-53ce-4486-bf5d-9b74fb32990b.png)

将这个HTML文件上传到Power Platform平台中。设置MDA的Page URL为该HTML文件。这样我们访问该页面的时候，就会去加载localhost的bundle.js文件。即可在MDA应用上进行开发。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1652151672545-29dca8e7-0ef6-49a7-8cea-6ad1c89e9754.png)

图片加载错误是因为图片路径错误

## 热部署问题

当我们通过上面的方式进行引入后，会发现控制台进行了报错。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1652151855602-9e7a559a-423f-4adb-bde8-93fd1ebffc57.png)

热部署的websocket没有连接上，所以我们显式地去修改连接ws的地址。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1652152397189-8e908b20-bcb5-463d-aa92-9ff93cb1de3c.png)

修改Webpack配置文件，指定web socket URL

修改完之后，再进去Network看一看，现在websocket已经成功连接上。

![](https://cdn.nlark.com/yuque/0/2022/png/22244142/1652152328814-5d90d3ce-c59c-4c5b-a51e-d01db2ecf6a9.png)

  

  

  

# 资源

[https://docs.microsoft.com/zh-cn/power-apps/maker/model-driven-apps/model-driven-app-overview](https://docs.microsoft.com/zh-cn/power-apps/maker/model-driven-apps/model-driven-app-overview)