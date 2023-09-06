

## HTTP的缺点

-   使用明文传输
    
-   无法校验双方身份
    
-   无法校验通信报文的完整性
    

## HTTP0.9

-   没有版本号
    
-   没有请求头
    
-   只有GET请求
    
-   没有状态码
    
-   只能传输HTML(因为没有Content-Type)
    

## HTTP1.0

-   引入了头部
    
-   引入状态码
    
-   引入缓存
    

## HTTP1.1

-   支持长连接
    
-   引入Cookie
    

## HTTP2

### 多路复用

总结为 **一个域名只使用一个TCP连接和消除队头阻塞问题**。 HTTP1.1是多个TCP，每个TCP同时发送一个请求。 HTTP2是单个TCP发送多个请求。所以消除了HTTP队头阻塞问题。 ![](https://cdn.nlark.com/yuque/0/2022/webp/22244142/1648434913839-10f78ae4-58fe-44d7-8d9a-c29eb074428e.webp#clientId=u850ee3ba-798b-4&from=paste&id=u98367997&originHeight=238&originWidth=639&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u2d5977d3-083b-4e13-b6ce-b019b436c05&title=)

#### 二进制分帧

> 首先，HTTP/2 认为明文传输对机器而言太麻烦了，不方便计算机的解析，因为对于文本而言会有多义性的字符，比如回车换行到底是内容还是分隔符，在内部需要用到状态机去识别，效率比较低。于是 HTTP/2 干脆把报文全部换成二进制格式，全部传输01串，方便了机器的解析。 原来Headers + Body的报文格式如今被拆分成了一个个二进制的帧，用**Headers帧**存放头部字段，**Data帧**存放请求体数据。分帧之后，服务器看到的不再是一个个完整的 HTTP 请求报文，而是一堆乱序的二进制帧。这些二进制帧不存在先后关系，因此也就不会排队等待，也就没有了 HTTP 的队头阻塞问题。 通信双方都可以给对方发送二进制帧，这种二进制帧的**双向传输的序列**，也叫做流(Stream)。HTTP/2 用流来在一个 TCP 连接上来进行多个数据帧的通信，这就是**多路复用**的概念。 可能你会有一个疑问，既然是乱序首发，那最后如何来处理这些乱序的数据帧呢？ 首先要声明的是，所谓的乱序，指的是不同 ID 的 Stream 是乱序的，但同一个 Stream ID 的帧一定是按顺序传输的。二进制帧到达后对方会将 Stream ID 相同的二进制帧组装成完整的**请求报文**和**响应报文**。当

### 头部压缩

> 采用HPACK压缩算法对请求头进行压缩。
> 
> -   首先是在服务器和客户端之间建立哈希表，将用到的字段存放在这张表中，那么在传输的时候对于之前出现过的值，只需要把**索引**(比如0，1，2，...)传给对方即可，对方拿到索引查表就行了。这种**传索引**的方式，可以说让请求头字段得到极大程度的精简和复用。
>     
> 
> ![](https://cdn.nlark.com/yuque/0/2022/webp/22244142/1648205508091-0c8deb90-f3b2-4001-ad6d-6bd394010278.webp#clientId=u850ee3ba-798b-4&from=paste&id=u167dad16&originHeight=719&originWidth=1142&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u35efadf8-0374-4dff-8598-bbabe235ac8&title=) HTTP/2 当中废除了起始行的概念，将起始行中的请求方法、URI、状态码转换成了头字段，不过这些字段都有一个":"前缀，用来和其它请求头区分开。
> 
> -   其次是对于整数和字符串进行**哈夫曼编码**，哈夫曼编码的原理就是先将所有出现的字符建立一张索引表，然后让出现次数多的字符对应的索引尽可能短，传输的时候也是传输这样的**索引序列**，可以达到非常高的压缩率。
>     

### 服务器推送

> 在 HTTP/2 当中，服务器已经不再是完全被动地接收请求，响应请求，它也能新建 stream 来给客户端发送消息，当 TCP 连接建立之后，比如浏览器请求一个 HTML 文件，服务器就可以在返回 HTML 的基础上，将 HTML 中引用到的其他资源文件一起返回给客户端，减少客户端的等待。

![](https://cdn.nlark.com/yuque/0/2022/webp/22244142/1648434696478-cb104f4c-3b28-47f3-97b3-f0cb154f7329.webp#clientId=u850ee3ba-798b-4&from=paste&id=uaf98de8f&originHeight=632&originWidth=1227&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=none&taskId=u9b619b09-c8d1-45ee-b0c5-155fe5f8edf&title=)

## HTTP3

## HTTP队头阻塞

下一个请求因为上一个请求还在进行中被阻塞

### 解决方法

-   并发连接
    
-   域名分片
    
-   多路复用(HTTP2)
    

# HTTPS

在HTTP下面增加了一层SSL/TLS协议。TLS协议采用混合加密的方式（主要依赖三类基本算法非对称加密+对称加密+散列算法）来保证传输双方的加密性。CA机构的引入验证了传输双方身份，确保第三方中间人的加入。

# TLS1.2





# TLS1.3
> TLS1.3握手流程

---

TLS 1.3 握手流程是如下所示：

1.  Client Hello：客户端向服务器发送 Client Hello 消息，其中包含 TLS 版本号、一个 Client Random 值（随机数）、支持的密码套件、支持的压缩算法、SNI（Server Name Indication，服务器名称指示）等信息。
    
2.  Server Hello：服务器从客户端支持的密码套件中选取一组加密算法，并向客户端发送 Server Hello 消息，其中包含 TLS 版本号、一个 Server Random 值、选定的加密算法、选定的压缩算法等信息。
    
3.  Encrypted Extensions：服务器向客户端发送 Encrypted Extensions 消息，其中包含服务器的一些扩展信息，例如支持的 ALPN 协议、证书状态请求等。
    
4.  Certificate：如果服务器需要进行身份验证，它会将自己的证书链发送给客户端。证书链中的每个证书都是由一个受信任的证书颁发机构（CA）签名的，以证明该服务器的身份。
    
5.  Certificate Verify：如果服务器使用了基于证书的身份验证机制，那么它还需要向客户端发送 Certificate Verify 消息，以证明自己拥有证书中所述的私钥。
    
6.  Finished：客户端和服务器都会计算一组密钥，并将其用于生成 Finished 消息。这些消息包含了之前所有握手阶段的信息的哈希值，用于验证握手是否成功完成。
    
7.  Application Data：一旦完成了握手过程，客户端和服务器就可以开始发送加密的应用数据。
    

---

> 这个流程需要几个RTT

---

TLS 1.3 握手流程需要最少 1 个 RTT（Round Trip Time），但可以通过 0-RTT 模式来实现 0 个 RTT。

在标准的 TLS 1.3 握手流程中，需要 1 个 RTT 来完成握手过程。客户端发送 Client Hello 消息，服务器响应 Server Hello 和 Encrypted Extensions 消息，然后发送 Certificate、Certificate Verify 和 Finished 消息。客户端接收到这些消息后，会发送自己的 Finished 消息，这样握手过程就完成了。这个过程需要 1 个 RTT，也就是客户端发送消息到服务器，服务器响应消息到客户端，再次客户端发送 Finished 消息到服务器。

但是，TLS 1.3 还引入了 0-RTT 模式，可以实现 0 个 RTT 的握手过程。在 0-RTT 模式下，客户端会在之前与服务器通信过的会话中缓存加密密钥，然后在新会话中使用这些密钥来发送加密的应用数据。这种方式可以避免握手延迟，但也存在一定的安全风险，因为攻击者可能会利用这些密钥来欺骗服务器。因此，在使用 0-RTT 模式时需要特别小心，并在必要时采取额外的安全措施。


# 文件



# 引用

[你猜一个 TCP 连接上面能发多少个 HTTP 请求](https://zhuanlan.zhihu.com/p/61423830) [HTTP1、HTTP2、HTTP3](https://juejin.cn/post/6855470356657307662#heading-11) [https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/Evolution_of_HTTP](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/Evolution_of_HTTP)3 [https://juejin.cn/post/6868515600432857095](https://juejin.cn/post/6868515600432857095) [https://juejin.cn/post/7047013644445417480#heading-11](https://juejin.cn/post/7047013644445417480#heading-11) [https://juejin.cn/post/6844904100035821575#comment](https://juejin.cn/post/6844904100035821575#comment) [https://juejin.cn/post/7077550129229594632](https://juejin.cn/post/7077550129229594632)
[[一篇文章搞懂密码学基础及SSL/TLS协议 | CatBro's Blog (catbro666.github.io)](https://catbro666.github.io/posts/e92ef4b4/)]
