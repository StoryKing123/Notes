
# 确认问题
通过运行历史/日志来进行问题的确认

## 减少Action
## 数据操作过多
### 如果是循环遍历数据进行操作，可以使用并行处理（注意不能开太高，如果涉及到API操作的话，如果开太高，反而会出发api并发限制）
### 该用plugin进行数据处理/操作

## 数据查询过慢/过多
### 优化查询语句，尽量减少连表
### 减少字段
### 如果数据查询次数过多并且数据比较重复，可以考虑将数据进行本地化。通过变量获取，后续的数据查询都从本地进行查询

## 数据操作过多
### 检查是否达到API调用次数瓶颈，如果是的话，可以考虑使用Batch Request进行数据批处理