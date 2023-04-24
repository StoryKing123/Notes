
# 数据结构

## 队列

## 栈

## 树

## 链表



# 常见的算法考察

## 动态规划
关键词：最值
[告别动态规划，连刷 40 道题，我总结了这些套路，看不懂你打我（万字长文） - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/91582909)
[leetcode97，优化成一维数组](https://leetcode.cn/problems/interleaving-string/solution/dong-tai-gui-hua-you-hua-zhi-yi-wei-shu-issf3/))


[#背包问题 (qq.com)](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU4NDE3MTEyMA==&action=getalbum&album_id=1751702161341628417&scene=173&from_msgid=2247486107&from_itemidx=1&count=3&nolastread=1#wechat_redirect)

对于二维数组`dp[i][j]` 如果需要访问`dp[i][j-1],dp[i][j+1],dp[i+1][j],dp[i-1][j]`四个方位，可以分开两次进行访问，一次从上到下，从左往右，另一次从下到上，从右往左。这样就可以根据四个访问得到当前`dp[i][j]`的最优值。

## DFS
关键词： 有多少种方式

## BFS
关键词：最短路径

## 双指针

### 快慢指针

### 对撞指针

### 递归

## 回溯法
