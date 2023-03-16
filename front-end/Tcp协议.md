[为什么我抓不到baidu的数据包_wireshark抓百度的包_小二上酒8的博客-CSDN博客](https://blog.csdn.net/Huangjiazhen711/article/details/127860749)
![[TCPIP.excalidraw|675]]
`TCP/IP`（`Transmission Control Protocol/Internet Protocol`，传输控制协议/网际协议）是指能够在多个不同网络间实现信息传输的协议簇。TCP/IP协议不仅仅指的是TCP 和IP两个协议，而是指一个由 `FTP、SMTP、TCP、UDP、IP`等协议构成的协议簇， 只是因为在TCP/IP协议中TCP协议和IP协议最具代表性，所以被称为TCP/IP协议。

TCP/IP传输协议是在网络的使用中的最基本的通信协议。TCP/IP传输协议对互联网中各部分进行通信的标准和方法进行了规定。并且，TCP/IP传输协议是保证网络数据信息及时、完整传输的两个重要的协议。TCP/IP传输协议是严格来说是一个四层的体系结构，**应用层** 、**传输层**、**网络层** 和 **数据链路层** 都包含其中。

# 十分详细的TCP讲解
[4.1 TCP 三次握手与四次挥手面试题 | 小林coding (xiaolincoding.com)](https://xiaolincoding.com/network/3_tcp/tcp_interview.html#tcp-%E4%B8%89%E6%AC%A1%E6%8F%A1%E6%89%8B%E8%BF%87%E7%A8%8B%E6%98%AF%E6%80%8E%E6%A0%B7%E7%9A%84)

# TCP
**Transmission Control Protocol (TCP)** 是一种在IP协议之上使用的传输协议，用于确保数据包的可靠传输。

报文格式

![Pasted image 20230314164937](https://raw.githubusercontent.com/StoryKing123/pics/main/Pasted%20image%2020230314164937.png)

## 建立连接-三次握手
使用wireshark抓取TCP可以看到tcp包

![](https://raw.githubusercontent.com/StoryKing123/pics/main/tcp%E5%BB%BA%E7%AB%8B%E8%BF%9E%E6%8E%A5.png)

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20230315160259.png)

第三次握手的时候，客户端可以发送数据。

## 客户端发送SYN请求

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20230315154150.png)
客户端发送了SYN标志位为1的请求




# UDP
UDP（User Datagram Protocol），用户数据包协议，是一个简单的**面向数据报的通信协议**，即对应用层交下来的报文，不合并，不拆分，只是在其上面加上首部后就交给了下面的网络层
也就是说无论应用层交给`UDP`多长的报文，它统统发送，一次发送一个报文

而对接收方，接到后直接去除首部，交给上面的应用层就完成任务

`UDP`报头包括4个字段，每个字段占用2个字节（即16个二进制位），标题短，开销小

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20230315170942.png)



-   UDP 不提供复杂的控制机制，利用 IP 提供面向无连接的通信服务
-   传输途中出现丢包，UDP 也不负责重发
-   当包的到达顺序出现乱序时，UDP没有纠正的功能。
-   并且它是将应用程序发来的数据在收到的那一刻，立即按照原样发送到网络上的一种机制。即使是出现网络拥堵的情况，UDP 也无法进行流量控制等避免网络拥塞行为


| 特性 | TCP | UDP |
| --- | --- | --- |
| 可靠性 | 可靠 | 不可靠 |
| 连接性 | 面向连接 | 无连接 |
| 报文 | 面向字节流 | 面向报文 |
| 效率 | 传输效率低 | 传输效率高 |
| 双共性 | 全双工 | 一对一、一对多、多对一、多对多 |
| 流量控制 | 滑动窗口 | 无 |
| 拥塞控制 | 慢开始、拥塞避免、快重传、快恢复 | 无 |
| 传输效率 | 慢 | 快 |














# 引用
[面试官：如何理解UDP 和 TCP? 区别? 应用场景? | web前端面试 - 面试官系列 (vue3js.cn)](https://vue3js.cn/interview/http/UDP_TCP.html#%E4%B8%80%E3%80%81udp)