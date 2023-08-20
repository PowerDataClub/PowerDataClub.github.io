---
title: "Zookeeper在Hbase中的应用"
date: 2023-06-20 08:30:00
description: "Zookeeper在Hbase中的应用"
head:
  - - meta
    - name: keywords
      content: Zookeeper,Hbase,大数据,PowerData
tag: [大数据组件,Zookeeper,Hbase]
order: -12
---

本文由 PowerData 时老师与 PowerData 阿丞联合贡献

* * *

全文共 3452 个字，建议阅读 **14** 分钟

# 文章脑图


![](http://oss.powerdata.top/hub-image/60934150.png)

# 前置知识

## Zookeeper

Zookeeper 是一个基于观察者模式设计的分布式服务管理框架，其主要功能就是维护配置信息、命名、提供分布式同步和组成员服务，其只能满足分布式系统 CAP 法则中的 C 和 P，是因 Zookeeper 会因为网络波动可能造成的通信问题和 Leader 挂掉重新选举时造成是 ZK 整体服务不可用的情况。

CAP 分别是一致性（C）、可用性（A）、分区容错性（P）。

### Zookeeper 组成及架构

*   Client：客户端通信
    
*   Leader：处理事务请求，更新系统状态、进行投票的发起和决议
    
*   Follower：处理客户端非事务请求并向客户端返回结果，将写事务请求转发给 Leader、参与选举投票，并同步 Leader 的状态
    
*   Observer：接收客户端读请求，将客户端写请求转发给 Leader，不参与投票过程，只同步 Leader 的状态
    

![](http://oss.powerdata.top/hub-image/90718121.png)

### Zookeeper 数据模型

Zookeeper 的数据模型类似于文件树一样，Znode 是 Zookeeper 中数据的最小单元，可以保存数据。通过挂载子节点构成一个树状的层次化命名空间。

*   /
    
*   /app1/data1
    
*   /app2/data2
    
*   /app1
    
*   /app2
    

## Hbase

Hbase 是一个分布式、支持海量数据存储的 NoSQL 数据库，其数据以 Key-Value 的形式存储进行存储。

### Hbase 组成及架构

*   Master：是 Hbase 集群中的主节点，负责管理和协调整个集群的工作、管理 RegionServer 以及故障恢复、元数据管理、表的操作等
    
*   RegionServer：是 Hbase 集群中的具体工作节点，主要负责管理 region 和存储一部分数据、处理客户端的读写请求和处理数据的刷写、压缩等操作，其存储架构如下：
    
*   Memstore：写缓存，基于内存，文件会在其中排序，达到阈值后 Flush 到 StoreFile 中
    
*   StoreFile：基于 HDFS 的存储 Key-Value 文件
    
*   Block Cache：读缓存，基于内存，查询到的数据会缓存在 Block Cache 中
    
*   WAL：预写日志，主打一个保证数据不丢失，主要是防止 RegionServer 挂了导致数据丢失
    
*   Region
    
*   Zookeeper：是 Hbase 集群中的协调服务，主要负责管理和维护集群的元数据和状态信息、负责集群间通信、故障恢复等
    
*   HDFS：是 Hbase 集群中的存储，数据以 region 的形式存储在 HDFS 上，每个 region 对应一个块（block）
    

![](http://oss.powerdata.top/hub-image/93926960.png)

### Hbase 数据模型

*   表（table）：一个表由一个或者多个列族组成
    
*   行（row）：一个行包含了多个列，每一行代表一个数据对象，每一行都以行键（Row Key）来进行唯一标识，这些列通过列族来分类
    
*   列族（column family）：列族是多个列的集合
    
*   列（column）：多个列组成一个行
    
*   单元格（cell）：：一个列中可以存储多个版本的数据，每个版本就称为一个单元格
    
*   时间戳（timestamp）：用来标记同一个列中多个单元格的版本号
    

### Hbase 的几个重要操作

对于 Hbase 来讲，比较重要的几个操作：

*   Flush：Flush 是指将内存数据持久化到磁盘，也就是 Memstore 刷写到 StoreFile 的过程，其包括数据写入磁盘、更新 StoreFile 索引、清空内存等操作。其刷写时机如下：
    
*   某个 memstore 的大小达到 Hbase Memstore 刷新大小，其所在 Region 的所有 memstore 都会刷写
    
*   Region Server 中 memstore 总大小达到 Java_Heap * Region Server 中 memstore 最大大小 * memstore 里的阈值，region 按照 memstore 大小顺序依次刷写，直到 Region Server 中所有的 memstore 的总大小减少到上述值后停止
    
*   定时刷写（俩个参数，时间和大小）
    
*   WAL 文件数量超过提前写入日志（WAL）文件的最大数量时，region 会按照时间顺序依次刷写
    
*   手动刷写
    
*   Compaction：StoreFile 合并，Hbase 有 Major Compaction 和 Minor Compaction 俩种。
    
*   Major Compaction：简称 “大合并”，大合并是指将一个 Store 下的所有 StoreFile 进行合并，并且清理所有有 delete 标记和过期的数据。
    
*   Minor Compaction：简称 “小合并”，小合并是指将临近的几个 StoreFile 进行合并，并清理部分有 delete 标记和过期的数据。
    
*   Compaction 有自动合并和手动合并，自动合并会根据参数设置
    
*   Split：Region 切分，Region 的数量和预分区的数量有关，一般情况下，建表不手动设置预分区，该表就会只有一个 region，随着数据写入，region 在达到一定数量以后会进行切分，且俩个 region 都会处于一个 RegionServer 上，后面触发重平衡以后 Hmaster 可能会将某个 Region 转移到其他 RegionServer 上。
    

需要注意的是，以上三个操作在集群中建议关闭自动，手动进行，每一个操作都会消耗集群资源，影响集群的稳定性和性能。

# HMaster 选举与主备切换


HMaster 选举与主备切换的原理和 HDFS 中 NameNode 及 YARN 中 ResourceManager 的 HA 原理相同。

在 Hadoop 中，HDFS 的 NameNode 主要用于管理 HDFS 的元数据和统筹各个 DataNode 的工作，由于 NameNode 是 Hadoop 集群的单点故障，因此生产环境中一般都需要配置 HA 来保证集群的高可用性。

HMaster 的选举与主备切换、Yarn 的 ResourceManager、HDFS 的 NameNode 的 HA 都是通过 Active-Standby 机制来实现的，在 Active 节点发生故障时，自动切换到 Standby 节点，保证集群的高可用性，其原理如下：

1.  Active 节点：在 HA 机制中，只有一个节点（主节点）处于 Active 状态，负责管理整个集群的。Active 节点会定期向 ZooKeeper 发送心跳信息，以保证其正常运行。
    
2.  Standby 节点：在 HA 机制中，另一个节点（备节点）处于 Standby 状态，等待 Active 节点出现故障时接管其工作。Standby 节点会从 ZooKeeper 中获取 Active 节点的状态信息，并定期检查 Active 节点的状态，以保证其能够及时接管其工作。
    
3.  ZooKeeper：在 HA 机制中，ZooKeeper 用于存储和管理 Active 节点和 Standby 节点的状态信息。Active 节点会定期向 ZooKeeper 发送心跳信息，以保证其正常运行。Standby 节点会从 ZooKeeper 中获取 Active 节点的状态信息，并定期检查 Active 节点的状态，以保证其能够及时接管其工作。
    
4.  自动切换：当 Active 节点出现故障时，Standby 节点会自动接管其工作，并成为新的 Active 节点。此时，HDFS 集群的所有元数据和协调工作都由新的 Active 节点负责。
    

# 系统容错

当 HBase 启动时，每个 RegionServer 都会到 ZooKeeper 的 / hbase/rs 节点下创建一个信息节点（下文中，我们称该节点为”rs 状态节点”），例如 / hbase/rs/[Hostname]，同时，HMaster 会对这个节点注册监听。当某个 RegionServer 挂掉的时候，ZooKeeper 会因为在一段时间内无法接受其心跳（即 Session 失效），而删除掉该 RegionServer 服务器对应的 rs 状态节点。与此同时，HMaster 则会接收到 ZooKeeper 的 NodeDelete 通知，从而感知到某个节点断开，并立即开始容错工作。

思考：HBase 为什么不直接让 HMaster 来负责 RegionServer 的监控呢？

如果 HMaster 直接通过心跳机制等来管理 RegionServer 的状态，随着集群越来越大，HMaster 的管理负担会越来越重，另外它自身也有挂掉的可能，因此数据还需要持久化。在这种情况下，ZooKeeper 就成了理想的选择。

# RootRegion 管理


对应 HBase 集群来说，数据存储的位置信息是记录在元数据 region，也就是 RootRegion 上的。

每次客户端发起新的请求，需要知道数据的位置，就会去查询 RootRegion，而 RootRegion 自身位置则是记录在 ZooKeeper 上的（默认情况下，是记录在 ZooKeeper 的 / hbase/meta-region-server 节点中）。

当 RootRegion 发生变化，比如 Region 的手工移动、重新负载均衡或 RootRegion 所在服务器发生了故障等是，就能够通过 ZooKeeper 来感知到这一变化并做出一系列相应的容灾措施，从而保证客户端总是能够拿到正确的 RootRegion 信息。

# Region 管理

HBase 里的 Region 会经常发生变更，这些变更的原因来自于系统故障、负载均衡、配置修改、Region 分裂与合并等。一旦 Region 发生移动，它就会经历下线（offline）和重新上线（online）的过程。

当 Region 发生移动时，其上线的过程如下：

1.  RegionServer 检查目标 RegionServer 是否可用，如果可用，则将 Region 的元数据更新为目标 RegionServer 的地址。
    
2.  目标 RegionServer 接受 Region 的请求，并将 Region 的数据从源 RegionServer 复制到本地。
    
3.  目标 RegionServer 更新 Region 的状态为 “打开”，并通知 HMaster 更新 Region 的状态。
    

当 Region 发生移动时，其下线的过程如下：

1.  RegionServer 将 Region 的状态更新为 “下线”，并通知 HMaster 更新 Region 的状态。
    
2.  HMaster 将 Region 的元数据更新为其他 RegionServer 的地址，并将 Region 的状态更新为 “正在分裂” 或“正在合并”。
    
3.  其他 RegionServer 接受 Region 的请求，并将 Region 的数据从源 RegionServer 复制到本地。
    
4.  其他 RegionServer 更新 Region 的状态为 “打开”，并通知 HMaster 更新 Region 的状态。
    

在下线期间数据是不能被访问的，并且 Region 的这个状态变化必须让全局知晓，否则可能会出现事务性的异常。对于大的 HBase 集群来说，Region 的数量可能会多达十万级别，甚至更多，这样规模的 Region 状态管理交给 ZooKeeper 来做也是一个很好的选择。

# 分布式 SplitWAL 任务管理

当某台 RegionServer 服务器挂掉时，由于总有一部分新写入的数据还没有持久化到 HFile 中，因此在迁移该 RegionServer 的服务时，一个重要的工作就是从 WAL 中恢复这部分还在内存中的数据，而这部分工作最关键的一步就是 SplitWAL，即 HMaster 需要遍历该 RegionServer 服务器的 WAL，并按 Region 切分成小块移动到新的地址下，并进行日志的回放（replay）。

由于单个 RegionServer 的日志量相对庞大（可能有上千个 Region，上 GB 的日志），而用户又往往希望系统能够快速完成日志的恢复工作。因此一个可行的方案是将这个处理 WAL 的任务分给多台 RegionServer 服务器来共同处理，而这就又需要一个持久化组件来辅助 HMaster 完成任务的分配。

当前的做法是，HMaster 会在 ZooKeeper 上创建一个 SplitWAL 节点（默认情况下，是 / hbase/SplitWAL 节点），将 “哪个 RegionServer 处理哪个 Region” 这样的信息以列表的形式存放到该节点上，然后由各个 RegionServer 服务器自行到该节点上去领取任务并在任务执行成功或失败后再更新该节点的信息，以通知 HMaster 继续进行后面的步骤。ZooKeeper 在这里担负起了分布式集群中相互通知和信息持久化的角色。

# 小结

以上就是一些 HBase 中依赖 ZooKeeper 完成分布式协调功能的典型场景。

但事实上，HBase 对 ZooKeepr 的依赖还不止这些，比如 HMaster 还依赖 ZooKeeper 来完成 Table 的 enable/disable 状态记录，以及 HBase 中几乎所有的元数据存储都是放在 ZooKeeper 上的。

由于 ZooKeeper 出色的分布式协调能力及良好的通知机制，HBase 在各版本的演进过程中越来越多地增加了 ZooKeeper 的应用场景，从趋势上来看两者的交集越来越多。HBase 中所有对 ZooKeeper 的操作都封装在了 org.apache.hadoop.hbase.zookeeper 这个包中，感兴趣的同学可以自行研究。

* * *

想要加入社区或对本文有任何疑问，可直接添加社区联系人微信。

![](http://oss.powerdata.top/hub-image/12988772.png)

* * *

我们是由一群数据从业人员，因为热爱凝聚在一起，以开源精神为基础，组成的 PowerData 数据之力社区。

可关注下方公众号后点击 “加入我们”，与 PowerData 一起成长。