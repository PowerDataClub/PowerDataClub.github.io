---
title: "【Flink】checkPoint与savePoint应用"
date: 2023-01-11 08:40:00
description: "Flink checkPoint与savePoint应用"
head:
  - - meta
    - name: keywords
      content: Flink,大数据,PowerData
tag: [大数据组件,Flink]
order: -4
---

本文由 PowerData 陆酒贡献  
姓名：孙含亚  
花名：陆酒  
微信：S17696769327  
年龄：95 后  
工作经验：3-5 年  
工作内容：数开, 数仓, 数分, 方案  
自我介绍：千里之行，始于足下。谋事在天，成事在我。

* * *

对本文感兴趣或有任何疑问，或者想要加入社区的同学，可直接添加作者微信。

![](http://oss.powerdata.top/hub-image/16607724.png)

# 前言

> 本文在编写时，我对它的定位是一个应用类的文章。  
> 相对于深入浅出的讲解和源码级别的钻研，本文更倾向于：  
> 1、讲出大家都熟悉的 checkpoints 和 savepoints 这两个东西到底是什么？  
> 2、这两个东西是怎么用的？

# 简介
*   抄录于 flink 官网 - 1.16.0
    

1.  Flink 中的每一个方法和算子都能够**有状态**。-- 后续作者会单独出一篇 flink-state 的文章讲解
    
2.  状态化方法在处理单个元素 / 事件的时候存储数据，让状态成为使每个类型的算子更加精细的重要部分。
    
3.  为了让状态容错，flink 需要为窗台添加 checkpoints。
    
4.  checkpoints 使得 Flink 能够恢复状态和在流中得位置，从而向应用提供和无故障执行时一样得语义
    

*   个人理解
    

1.  Flink 的流处理，就像是翻看一本无头无尾的书，而 checkpoints 就像是一个书签。
    
2.  checkpints 记录的数据源消费位置，就像是标记着书看到了哪里。
    
3.  而 checkpoints 记录的元数据内容，就像是书看到此处时的内容总结。
    

## checkpoints 前提条件

### 抄录于 flink 官网 - 1.16.0

1.  一个能够回放一段时间内数据的持久化数据源，例如持久化消息队列（例如 Apache Kafka、RabbitMQ、 Amazon Kinesis、 Google PubSub 等）或文件系统（例如 HDFS、 S3、 GFS、 NFS、 Ceph 等）。
    
2.  存放状态的持久化存储，通常为分布式文件系统（比如 HDFS、 S3、 GFS、 NFS、 Ceph 等）。
    

### 个人理解

第一个指的是 flink 的数据源，这个数据元必须得是一个方便记录偏移量的数据源，此处讲的偏移量不仅仅时 kafka 的 offset 第二个可以直接认为是 checkpoints 的存储位置

## checkpoints 配置

配置详情见官网 (有中文)，常用参数已列明：https://nightlies.apache.org/flink/flink-docs-release-1.16/zh/docs/dev/datastream/fault-tolerance/checkpointing/

```
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
// 每 1000ms 开始一次 checkpoint
env.enableCheckpointing(1000);
// 高级选项：
// 设置模式为精确一次 (这是默认值)
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
// 确认 checkpoints 之间的时间会进行 500 ms
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(500);
// Checkpoint 必须在一分钟内完成，否则就会被抛弃
env.getCheckpointConfig().setCheckpointTimeout(60000);
// 允许两个连续的 checkpoint 错误
env.getCheckpointConfig().setTolerableCheckpointFailureNumber(2);
// 同一时间只允许一个 checkpoint 进行
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
// 使用 externalized checkpoints，这样 checkpoint 在作业取消后仍就会被保留(如果使用savepoint取消任务的化就不用设置此参数，开启可以防止一些失误操作，不过也要注意自己手动删除记录)
//ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION：当作业取消时，保留作业的 checkpoint。注意，这种情况下，需要手动清除该作业保留的 checkpoint。
//ExternalizedCheckpointCleanup.DELETE_ON_CANCELLATION：当作业取消时，删除作业的 checkpoint。仅当作业失败时，作业的 checkpoint 才会被保留。
env.getCheckpointConfig().setExternalizedCheckpointCleanup(ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);

// 开启实验性的 unaligned checkpoints
env.getCheckpointConfig().enableUnalignedCheckpoints();
env.setStateBackend(new FsStateBackend("hdfs:///checkpoints-data/"));



```

# 从保留的 checkpoint 中恢复状态

```
bin/flink run -s :checkpointMetaDataPath [:runArgs]


```

##  savepoint 是什么

savepoint 在官网给的介绍是：

> Savepoint 是依据 Flink checkpointing 机制所创建的流作业执行状态的一致镜像。你可以使用 Savepoint 进行 Flink 作业的停止与重启、fork 或者更新。

我对其的理解为：

> 是一个依赖于 checkpointing 机制，可以手动创建 checkpoint 并同时停止任务的操作。所需要的条件与 checkpoints 相同.

savepoint 是用来为整个流应用程序在某个 “时间点”（point-in-time）的生成快照的功能。该快照包含了输入源的位置信息，数据源读取到的偏移量（比如 kafka 的 offset），以及整个应用的状态。借助 Chandy-Lamport 算法的变体，我们可以无需停止应用程序而得到一致的快照。

**强烈建议你按照本节所述调整你的程序，以便将来能够升级你的程序。主要通过 uid(String) 方法手动指定算子 ID 。这些 ID 将用于恢复每个算子的状态。----flink 官网**

```
DataStream<String> stream = env.
  // Stateful source (e.g. Kafka) with ID
  .addSource(new StatefulSource())
  .uid("source-id") // ID for the source operator
  .shuffle()
  // Stateful mapper with ID
  .map(new StatefulMapper())
  .uid("mapper-id") // ID for the mapper
  // Stateless printing sink
  .print(); // Auto-generated ID


```

从概念上讲，Flink 的 savepoints 与 checkpoints 的不同之处类似于传统数据库系统中的备份与恢复日志之间的差异。

Checkpoints 的主要目的是为意外失败的作业提供恢复机制。Checkpoint 的生命周期 由 Flink 管理， 即 Flink 创建，管理和删除 checkpoint - 无需用户交互。由于 checkpoint 被经常触发，且被用于作业恢复，所以 Checkpoint 的实现有两个设计目标：i）轻量级创建和 ii）尽可能快地恢复。可能会利用某些特定的属性来达到这个目标，例如， 作业的代码在执行尝试时不会改变。

> 在用户终止作业后，会自动删除 Checkpoint（除非明确配置为保留的 Checkpoint）。
> 
> Checkpoint 以状态后端特定的（原生的）数据格式存储（有些状态后端可能是增量的）。

尽管 savepoints 在内部使用与 checkpoints 相同的机制创建，但它们在概念上有所不同，并且生成和恢复的成本可能会更高一些。Savepoints 的设计更侧重于可移植性和操作灵活性，尤其是在 job 变更方面。Savepoint 的用例是针对计划中的、手动的运维。例如，可能是更新你的 Flink 版本，更改你的作业图等等。

> savepoint 仅由用户创建、拥有和删除。这意味着 Flink 在作业终止后和恢复后都不会删除 savepoint。
> 
> savepoint 以状态后端独立的（标准的）数据格式存储（注意：从 Flink 1.15 开始，savepoint 也可以以后端特定的原生格式存储，这种格式创建和恢复速度更快，但有一些限制）。

checkpoint 与 savepoint 相似但不同，两者以互补的形式，满足了不同场景下的：数据一致性，可迁移性，容错能力，集群升级，以满足多场景下的状态维护。

参考文献：  
[1] apache flink:checkpoints  
[2] apache flink:Savepoints  
[3] apache flink:Checkpoints 与 Savepoints
