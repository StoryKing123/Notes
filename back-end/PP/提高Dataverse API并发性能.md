
![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main//20250404130647135.png)

# 参数配置
单连接
```
System.Net.ServicePointManager.DefaultConnectionLimit = 65000;

System.Net.ServicePointManager.Expect100Continue = false;

System.Net.ServicePointManager.UseNagleAlgorithm = false;

ThreadPool.SetMinThreads(100, 100);
client.EnableAffinityCookie = false;
```

结果

| Label | # Samples | Average | Median | 90% Line | 95% Line | 99% Line | Min | Maximum | Error % | Throughput | Received KB/sec | Sent KB/sec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TOTAL | 60 | 35623 | 34743 | 62626 | 66862 | 69309 | 2355 | 69324 | 0.00% | 25.1/min | 1009.64 | 0.05 |


单连接取消参数


| Label | # Samples | Average | Min | Max | Std. Dev. | Error % | Throughput | Received KB/sec | Sent KB/sec | Avg. Bytes |
|---|---|---|---|---|---|---|---|---|---|---|
| TOTAL | 60 | 35000 | 2489 | 68640 | 19530.87 | 0.00% | 23.3/min | 935.98 | 0.05 | 2469699.0 |

在单连接的情况下区别不大


两个client，4个连接

| Label | # Samples | Average | Min | Max | Std. Dev. | Error % | Throughput | Received KB/sec | Sent KB/sec | Avg. Bytes |
|---|---|---|---|---|---|---|---|---|---|---|
| TOTAL | 60 | 12629 | 3749 | 21604 | 5392.50 | 0.00% | 29.9/min | 1200.23 | 0.06 | 2469699.0 |



