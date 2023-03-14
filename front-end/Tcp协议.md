[为什么我抓不到baidu的数据包_wireshark抓百度的包_小二上酒8的博客-CSDN博客](https://blog.csdn.net/Huangjiazhen711/article/details/127860749)
![[TCPIP.excalidraw|675]]
`TCP/IP`（`Transmission Control Protocol/Internet Protocol`，传输控制协议/网际协议）是指能够在多个不同网络间实现信息传输的协议簇。TCP/IP协议不仅仅指的是TCP 和IP两个协议，而是指一个由 `FTP、SMTP、TCP、UDP、IP`等协议构成的协议簇， 只是因为在TCP/IP协议中TCP协议和IP协议最具代表性，所以被称为TCP/IP协议。

TCP/IP传输协议是在网络的使用中的最基本的通信协议。TCP/IP传输协议对互联网中各部分进行通信的标准和方法进行了规定。并且，TCP/IP传输协议是保证网络数据信息及时、完整传输的两个重要的协议。TCP/IP传输协议是严格来说是一个四层的体系结构，**应用层** 、**传输层**、**网络层** 和 **数据链路层** 都包含其中。

# TCP
**Transmission Control Protocol (TCP)** 是一种在IP协议之上使用的传输协议，用于确保数据包的可靠传输。

包格式
![[Pasted image 20230314164937.png]]

## 建立连接-三次握手
![[Pasted image 20230314184522.png]]