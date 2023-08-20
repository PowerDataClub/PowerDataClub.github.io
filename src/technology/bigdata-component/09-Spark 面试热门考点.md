---
title: "Spark 面试热门考点"
date: 2023-04-06 08:40:00
description: "Spark 面试热门考点"
head:
  - - meta
    - name: keywords
      content: Spark,大数据,PowerData
tag: [大数据组件,Spark]
order: -9
---

本文由 PowerData 罗富良贡献  
姓名：罗富良  
花名：阿良  
微信：Liang-Ace  
年龄：95 后  
工作经验：0 年  
工作内容：学生  
自我介绍：乐观晴朗，勤奋好学  
内容介绍：文章内容主要根据大数据科班生富良同学在面试过程中总结的 Spark 热门问题，结合社区已有的 Spark 相关内容进行凝练，帮助大家复习以获得更好的面试表现；

* * *

全文共 5583 个字，建议阅读 **13** 分钟

#  1. SparkCore  



## 1.1 Hadoop 与 Spark 框架的对比

![](http://oss.powerdata.top/hub-image/74689251.png)image-20230322110635338

## 1.2 Spark 核心模块

![](http://oss.powerdata.top/hub-image/11343344.png)image-20230322110817610

**Spark Core**

Spark Core 中提供了 Spark 最基础与最核心的功能，Spark 其他的功能如：Spark SQL，Spark Streaming，GraphX, MLlib 都是在 Spark Core 的基础上进行扩展的

**Spark** **SQL**

Spark SQL 是 Spark 用来操作结构化数据的组件。通过 Spark SQL，用户可以使用 SQL 或者 Apache Hive 版本的 SQL 方言（HQL）来查询数据。

**Spark Streaming**

Spark Streaming 是 Spark 平台上针对实时数据进行流式计算的组件，提供了丰富的处理数据流的 API。

**Spark MLlib**

MLlib 是 Spark 提供的一个机器学习算法库。MLlib 不仅提供了模型评估、数据导入等额外的功能，还提供了一些更底层的机器学习原语。

**Spark GraphX**

GraphX 是 Spark 面向图计算提供的框架与算法库。

## 1.3 简述 Spark 的架构

### 1.3.1 运行架构

Spark 框架的核心是一个计算引擎，整体来说，它采用了标准 master-slave 的结构。

如下图所示，它展示了一个 Spark 执行时的基本结构。图形中的 Driver 表示 master，负责管理整个集群中的作业任务调度。图形中的 Executor 则是 slave，负责实际执行任务。

![](http://oss.powerdata.top/hub-image/22757334.png)image-20230322111540687

### 1.3.2 核心组件

1）Driver

Spark 驱动器节点，用于执行 Spark 任务中的 main 方法，负责实际代码的执行工作。

Driver 在 Spark 作业执行时主要负责：

将用户程序转化为作业（job）

在 Executor 之间调度任务 (task)

跟踪 Executor 的执行情况

通过 UI 展示查询运行情况

2）Executor

Spark Executor 是集群中工作节点（Worker）中的一个 JVM 进程，负责在 Spark 作业中运行具体任务（Task），任务彼此之间相互独立。Spark 应用启动时，Executor 节点被同时启动，并且始终伴随着整个 Spark 应用的生命周期而存在。如果有 Executor 节点发生了故障或崩溃，Spark 应用也可以继续执行，会将出错节点上的任务调度到其他 Executor 节点上继续运行。

Executor 有两个核心功能：

负责运行组成 Spark 应用的任务，并将结果返回给驱动器进程

它们通过自身的块管理器（Block Manager）为用户程序中要求缓存的 RDD 提供内存式存储。RDD 是直接缓存在 Executor 进程内的，因此任务可以在运行时充分利用缓存数据加速运算。

## 1.4 Spark 作业提交流程

**Yarn Cluster 模式**

Cluster 模式将用于监控和调度的 Driver 模块启动在 Yarn 集群资源中执行。一般应用于实际生产环境。

*   在 YARN Cluster 模式下，任务提交后会和 ResourceManager 通讯申请启动 ApplicationMaster，
    
*   随后 ResourceManager 分配 container，在合适的 NodeManager 上启动 ApplicationMaster，此时的 ApplicationMaster 就是 Driver。
    
*   Driver 启动后向 ResourceManager 申请 Executor 内存，ResourceManager 接到 ApplicationMaster 的资源申请后会分配 container，然后在合适的 NodeManager 上启动 Executor 进程
    
*   Executor 进程启动后会向 Driver 反向注册，Executor 全部注册完成后 Driver 开始执行 main 函数，
    
*   之后执行到 Action 算子时，触发一个 Job，并根据宽依赖开始划分 stage，每个 stage 生成对应的 TaskSet，之后将 task 分发到各个 Executor 上执行。
    

**Spark 提交作业参数**

*   executor-cores —— 每个 executor 使用的内核数，默认为 1
    
*   num-executors —— 启动 executors 的数量，默认为 2
    
*   executor-memory —— executor 内存大小，默认 1G
    
*   driver-cores —— driver 使用内核数，默认为 1
    
*   driver-memory —— driver 内存大小，默认 512M
    

## 1.5 Spark 核心编程

### 1.5.1 RDD 概念

RDD（Resilient Distributed Dataset）叫做弹性分布式数据集，是 Spark 中最基本的数据处理模型。代码中是一个抽象类，它代表一个弹性的、不可变、可分区、里面的元素可并行计算的集合。

*   弹性
    

- 存储的弹性：内存与磁盘的自动切换；

- 容错的弹性：数据丢失可以自动恢复；

- 计算的弹性：计算出错重试机制；

- 分片的弹性：可根据需要重新分片。

*   分布式：数据存储在大数据集群不同节点上
    
*   数据集：RDD 封装了计算逻辑，并不保存数据
    
*   数据抽象：RDD 是一个抽象类，需要子类具体实现
    
*   不可变：RDD 封装了计算逻辑，是不可以改变的，想要改变，只能产生新的 RDD，在新的 RDD 里面封装计算逻辑
    
*   可分区、并行计算
    

### 1.5.2 RDD 五大属性

![](http://oss.powerdata.top/hub-image/10227575.png)image-20230322114044707

### 1.5.3 Spark 的 transformation 算子（不少于 8 个）（重点）

_**单 value**_

（1）map（2）mapPartitions（3）mapPartitionsWithIndex（4）flatMap

（5）glom（6）groupBy（7）filter（8）sample（9）distinct

（10）coalesce（11）repartition（12）sortBy（13）pipe

_**双 value**_

（1）intersection（2）union（3）subtract（4）zip

_**Key-Value**_

（1）partitionBy （2）reduceByKey （3）groupByKey （4）aggregateByKey

（5）foldByKey （6）combineByKey （7）sortByKey （8）mapValues

（9）join （10）cogroup

### 1.5.4 Spark 的 action 算子（不少于 6 个）（重点）

（1）reduce（2）collect（3）count（4）first

（5）take（6）takeOrdered（7）aggregate（8）fold

（9）countByKey（10）save（11）foreach

### 1.5.5 map 与 mapPartition 区别

（1）map：每次处理一条数据

（2）mapPartitions：每次处理一个分区数据

### 1.5.5 Repartition 和 Coalesce 区别

1）关系

两者都是用来改变 RDD 的 partition 数量的，repartition 底层调用的就是 coalesce 方法：coalesce(numPartitions, shuffle = true)

2）区别

repartition 一定会发生 shuffle，coalesce 根据传入的参数来判断是否发生 shuffle

一般情况下增大 rdd 的 partition 数量使用 repartition，减少 partition 数量时使用 coalesce

### 1.5.6 reduceByKey 与 groupByKey 的区别

reduceByKey：具有预聚合操作

groupByKey：没有预聚合

在不影响业务逻辑的前提下，优先采用 reduceByKey。

_从 shuffle 的角度_：reduceByKey 和 groupByKey 都存在 shuffle 的操作，但是 reduceByKey 可以在 shuffle 前对分区内相同 key 的数据进行预聚合（combine）功能，这样会减少落盘的数据量，而 groupByKey 只是进行分组，不存在数据量减少的问题，reduceByKey 性能比较高。

_从功能的角度_：reduceByKey 其实包含分组和聚合的功能。groupByKey 只能分组，不能聚合，所以在分组聚合的场合下，推荐使用 reduceByKey，如果仅仅是分组而不需要聚合。那么还是只能使用 groupByKey

### 1.5.7 reduceByKey、foldByKey、aggregateByKey、combineByKey 区别

ReduceByKey  没有初始值 分区内和分区间逻辑相同

foldByKey    有初始值 分区内和分区间逻辑相同

aggregateByKey 有初始值 分区内和分区间逻辑可以不同

combineByKey    初始值可以变化结构 分区内和分区间逻辑不同

### 1.5.8 Kryo 序列化

Kryo 序列化比 Java 序列化更快更紧凑，但 Spark 默认的序列化是 Java 序列化并不是 Spark 序列化，因为 Spark 并不支持所有序列化类型，而且每次使用都必须进行注册。注册只针对于 RDD。在 DataFrames 和 DataSet 当中自动实现了 Kryo 序列化。

### 1.5.9 Spark 中的血缘（笔试重点）

1）RDD 的血缘关系

RDD 的 Lineage 会记录 RDD 的元数据信息和转换行为，当该 RDD 的部分分区数据丢失时，它可以根据这些信息来重新运算和恢复丢失的数据分区。

2）宽依赖与窄依赖

宽依赖表示同一个父（上游）RDD 的 Partition 被多个子（下游）RDD 的 Partition 依赖，会引起 Shuffle，总结：宽依赖我们形象的比喻为多生。

窄依赖表示每一个父 (上游)RDD 的 Partition 最多被子（下游）RDD 的一个 Partition 使用，窄依赖我们形象的比喻为独生子女。

宽依赖和窄依赖。有 Shuffle 的是宽依赖。

## 1.6 Spark 任务的划分

（1）Application：初始化一个 SparkContext 即生成一个 Application；

（2）Job：一个 Action 算子就会生成一个 Job；

（3）Stage：Stage 等于宽依赖的个数加 1；

（4）Task：一个 Stage 阶段中，最后一个 RDD 的分区个数就是 Task 的个数。

## 1.7 RDD 持久化

1）RDD Cache 缓存

RDD 通过 Cache 将前面的计算结果缓存，默认情况下缓存在 JVM 堆内存中，是在触发后面的 action 算子后开始缓存。

2）RDD CheckPoint 检查点

所谓的检查点其实就是通过将 RDD 中间结果写入磁盘，在中间阶段做检查的容错。

cache     不改变血缘依赖     数据存储在 内存 或者磁盘 checkpoint    改变血缘依赖   数据存储在 第三方数据库  HDFS  redis

## 1.8 Spark 累加器

累加器：分布式共享只写变量。（Executor 和 Executor 之间不能读数据）

累加器用来把 Executor 端变量信息聚合到 Driver 端。在 Driver 程序中定义的变量，在 Executor 端的每个 Task 都会得到这个变量的一份新的副本，每个 task 更新这些副本的值后，传回 Driver 端进行 merge，从未实现累加。

## 1.9 Spark 广播变量

分布式共享只读变量

广播变量用来高效分发较大的对象。向所有工作节点发送一个较大的只读值，以供一个或多个 Spark 操作使用。比如，如果你的应用需要向所有节点发送一个较大的只读查询表，广播变量用起来都很顺手。在多个并行操作中使用同一个变量，但是 Spark 会为每个任务分别发送。

# 2. SparkSQL
-----------

## 2.1 RDD、DataFrame、DataSet 三者的关系

### 2.1.1 三者的共性

*   RDD、DataFrame、DataSet 全都是 spark 平台下的分布式弹性数据集，为处理超大型数据提供便利;
    
*   三者都有惰性机制，在进行创建、转换，如 map 方法时，不会立即执行，只有在遇到 Action 如 foreach 时，三者才会开始遍历运算;
    
*   三者有许多共同的函数，如 filter，排序等;
    
*   在对 DataFrame 和 Dataset 进行操作许多操作都需要这个包: import spark.implicits._（在创建好 SparkSession 对象后尽量直接导入）
    
*   三者都会根据 Spark 的内存情况自动缓存运算，这样即使数据量很大，也不用担心会内存溢出
    
*   三者都有 partition 的概念
    
*   DataFrame 和 DataSet 均可使用模式匹配获取各个字段的值和类型
    

### 2.1.2 三者的区别

1.  RDD
    

*   RDD 一般和 spark mllib 同时使用
    
*   RDD 不支持 sparksql 操作
    

2.  DataFrame
    

*   与 RDD 和 Dataset 不同，DataFrame 每一行的类型固定为 Row，每一列的值没法直接访问，只有通过解析才能获取各个字段的值
    
*   DataFrame 与 DataSet 一般不与 spark mllib 同时使用
    
*   DataFrame 与 DataSet 均支持 SparkSQL 的操作，比如 select，groupby 之类，还能注册临时表 / 视窗，进行 sql 语句操作
    
*   DataFrame 与 DataSet 支持一些特别方便的保存方式，比如保存成 csv，可以带上表头，这样每一列的字段名一目了然 (后面专门讲解)
    

3.  DataSet
    

*   Dataset 和 DataFrame 拥有完全相同的成员函数，区别只是每一行的数据类型不同。DataFrame 其实就是 DataSet 的一个特例  type DataFrame = Dataset[Row]
    
*   DataFrame 也可以叫 Dataset[Row], 每一行的类型是 Row，不解析，每一行究竟有哪些字段，各个字段又是什么类型都无从得知，只能用上面提到的 getAS 方法或者共性中的第七条提到的模式匹配拿出特定字段。而 Dataset 中，每一行是什么类型是不一定的，在自定义了 case class 之后可以很自由的获得每一行的信息
    

### 2.1.3 三者的转换

![](http://oss.powerdata.top/hub-image/76945863.png)image-20230322170934539

## 2.2 当 Spark 涉及到数据库的操作时，如何减少 Spark 运行中的数据库连接数？

使用 foreachPartition 代替 foreach，在 foreachPartition 内获取数据库的连接。

## 2.3 如何使用 Spark 实现 TopN 的获取（描述思路或使用伪代码）（重点）

**方法一**

（1）按照 key 对数据进行聚合（groupByKey）

（2）将 value 转换为数组，利用 scala 的 sortBy 或者 sortWith 进行排序（mapValues）数据量太大，会 OOM。

**方法二**

（1）取出所有的 key

（2）对 key 进行迭代，每次取出一个 key 利用 spark 的排序算子进行排序

**方法三**

（1）自定义分区器，按照 key 进行分区，使不同的 key 进到不同的分区

（2）对每个分区运用 spark 的排序算子进行排序

## 2.4 hive on spark 与 spark on hive 的对比

<table><thead><tr><th><br></th><th>元数据存储</th><th>语法</th><th>执行引擎</th></tr></thead><tbody><tr><td>hive on spark</td><td>mysql</td><td>hql</td><td>rdd</td></tr><tr><td>spark on hive</td><td>mysql</td><td>spark sql</td><td>df / ds</td></tr><tr><td><br></td><td><br></td><td><br></td><td><br></td></tr></tbody></table>

(spark on hive 生态不太完善   元数据管理 atlas   权限管理 （ranger）)

# 3. SparkStreaming
-----------------

## 3.1 SparkStreaming 是纯流式处理框架吗？他的抽象是谁？

        微批处理

DStream：就是对 RDD 在实时数据处理场景的一种封装。在 DStream 内部，每个时间区间收到的数据都作为 RDD 存在，而 DStream 是由这些 RDD 所组成的序列（因此得名 “离散化”)。

## 3.2 背压机制原理

根据处理能力动态的拉取数据

根据 JobScheduler 反馈作业的执行信息来动态调整 Receiver 数据接收率。

## 3.3 Receiver 和 Direct 模式原理

有接待 无接待

ReceiverAPI: 需要一个专门的 Executor 去接收数据，然后发送给其他的 Executor 做计算。offset 默认存储在 zookeeper 中。

DirectAPI: 是由计算的 Executor 来主动消费 Kafka 的数据，速度由自身控制。offset 默认存储在系统主题 _consumer_offset

## 3.4 kafka 的 offset 维护在什么位置（ 0.10）

维护在系统主题 _consumer_offset

## 3.5 transform 算子里面的代码都在什么端执行

调用真正的算子时，才会在 Executor 端执行，不然还是在 Driver 端运行（比较特殊）

通过 Transform 可以将 DStream 每一批次的数据直接转换为 RDD 的算子操作。

## 3.6 UpdateStateByKey 状态保存在什么位置？ 有什么缺点

使用 updateStateByKey 需要对检查点目录进行配置，会使用检查点来保存状态。

缺点：1）每个检查点记录一条数据，会产生大量小文件。

2）一旦挂掉重启，会把这段时间的数据一次性灌入内存中，会导致 spark 挂掉

## 3.7 window 有三个概念  用 wordcount 案例画图说明

*   微批大小
    
*   窗口时长：计算内容的时间范围；
    
*   滑动步长：隔多久触发一次计算。注意：这两者都必须为采集批次大小的整数倍。
    
## 3.8 SparkStreaming 实现 Exactly Once

**方法一: 使用事务**

实现 Exactly Once 语义的关键是保证处理消息和提交偏移量的原子性. 所以只要把这两个操作放到一个事务里, 不管是先处理消息和还是先提交偏移量都可以保证消息不丢失和不重复。

实现：比如手动维护消费消息的偏移量, 并把偏移量放到 MySQL 中, 然后数据的落盘也放到 MySQL 中, 而 MySQL 是支持事务的, 那么我们就可以保证着两个操作的原子性了.

缺点:

*   对存储层有依赖, 只能使用支持事务的存储层
    
*   事务性能不高
    
*   并且一个存储层容易存在单点故障压力过大, 如果做分布式又需要做分布式事务增加了复杂性
    

**方法二: 手动提交偏移量 + 幂等性**

先确保真正处理完数据后再提交偏移量, 但是可能提交偏移量失败, 导致重复消费了, 这时就要做数据的幂等性保存了, 即数据无论被保存多少次效果都是一样的, 不会存在重复数据。

## 3.9 Flink 跟 Spark Streaming 的区别

**Flink** **是标准的实时处理引擎，基于事件驱动。而** **Spark Streaming** **是微批（Micro-Batch）的模型**。

下面我们就分几个方面介绍两个框架的主要区别：（**佳人试错**）

（1）**架**构模型

Spark Streaming 在运行时的主要角色包括：Master、Worker、Driver、Executor，

Flink 在运行时主要包含：Jobmanager、Taskmanager 和 Slot。

（2）**任**务调度

Spark Streaming 连续不断的生成微小的数据批次，构建有向无环图 DAG，Spark Streaming 会依次创建 DStreamGraph、JobGenerator、JobScheduler。

Flink 根据用户提交的代码生成 StreamGraph，经过优化生成 JobGraph，然后提交给 JobManager 进行处理，JobManager 会根据 JobGraph 生成 ExecutionGraph，ExecutionGraph 是 Flink 调度最核心的数据结构，JobManager 根据 ExecutionGraph 对 Job 进行调度。

（3）**时**间机制

Spark Streaming 支持的时间机制有限，只支持处理时间。

Flink 支持了流处理程序在时间上的三个定义：处理时间、事件时间、注入时间。同时也支持 watermark 机制来处理滞后数据。

（4）容**错**机制

对于 Spark Streaming 任务，我们可以设置 checkpoint，然后假如发生故障并重启，我们可以从上次 checkpoint 之处恢复，但是这个行为只能使得数据不丢失，可能会重复处理，不能做到恰好一次处理语义。

Flink 则使用两阶段提交协议来解决这个问题。

# 4. Spark 内核
-----------

## 4.1 YarnCluster 模式提交流程

![](http://oss.powerdata.top/hub-image/96745624.png)image-20230323111130916

## 4.2 Spark 通讯架构

![](http://oss.powerdata.top/hub-image/57725913.png)image-20230323111217262

## 4.3 Stage 任务划分

![](http://oss.powerdata.top/hub-image/16432789.png)image-20230323111343643

## 4.4 Task 任务调度执行

![](http://oss.powerdata.top/hub-image/54237987.png)image-20230323111314364

# 5. hive on spark 优化
-------------------

## 5.1 数据倾斜

### 5.1.1 数据倾斜产生原因

以 Spark 和 Hive 的使用场景为例，他们在做数据运算的时候会涉及到，count distinct、group by、join on 等操作，这些都会触发 Shuffle 动作。一旦触发 Shuffle，所有相同 key 的值就会被拉到一个或几个 Reducer 节点上，容易发生单点计算问题，导致数据倾斜。

一般来说，数据倾斜原因有以下几方面：

*   key 分布不均匀
    
*   null 值的处理
    
*   业务数据量太大
    

### 5.1.2 数据倾斜表现

**1）hadoop 中的数据倾斜表现：**

*   有一个多几个 Reduce 卡住，卡在 99.99%，一直不能结束。
    
*   各种 container 报错 OOM
    
*   异常的 Reducer 读写的数据量极大，至少远远超过其它正常的 Reducer
    
*   伴随着数据倾斜，会出现任务被 kill 等各种诡异的表现。
    

**2）hive 中的数据倾斜**

*   一般都发生在 Sql 中 group by 和 join on 上，而且和数据逻辑绑定比较深。
    

**3）spark 中的数据倾斜**

Spark 中的数据倾斜，包括 Spark Streaming 和 Spark Sql，表现主要有下面几种：

*   Executor lost，OOM，Shuffle 过程出错；
    
*   Driver OOM；
    
*   单个 Executor 执行时间特别久，整体任务卡在某个阶段不能结束；
    
*   正常运行的任务突然失败；
    

### 5.1.3 数据倾斜解决思路

很多数据倾斜的问题，都可以用和平台无关的方式解决，比如更好的**数据预处理**，**异常值的过滤**等。

1）业务逻辑

我们从业务逻辑的层面上来优化数据倾斜，比如两个城市做推广活动导致那两个城市数据量激增的例子，我们可以单独对这两个城市来做 count，单独做时可用两次 MR，第一次打散计算，第二次再最终聚合计算。完成后和其它城市做整合。

2）程序层面

比如说在 Hive 中，经常遇到 count(distinct) 操作，这样会导致最终只有一个 Reduce 任务。我们可以先 group by，再在外面包一层 count，就可以了。

3）调参方面

Hadoop 和 Spark 都自带了很多的参数和机制来调节数据倾斜，合理利用它们就能解决大部分问题。

4）从业务和数据上解决数据倾斜

*   有损的方法：找到异常数据，比如 ip 为 0 的数据，过滤掉
    
*   无损的方法：对分布不均匀的数据，单独计算
    
*   先对 key 做一层 hash，先将数据随机打散让它的并行度变大，再汇集
    
*   数据预处理
    

## 5.2 小文件

（1）Combinehiveinputformat   => combinetextinputformat  
将多个文件放到一起统一切片，减少了 maptask 的个数，进而减少了集群内存 （2）JVM 重用 =》 mr 中 jvm 重用 道理一致  本周减少 JVM 开关的时间 （3）merge 如果 MapOnly 任务默认打开，如果是 mr 任务需要手动打开。单独开启一个 mr，将小于 16m 的文件合并到 256m

## 5.3 CBO

CBO 是指 Cost based Optimizer，即基于计算成本的优化。

在 Hive 中，计算成本模型考虑到了：数据的行数、CPU、本地 IO、HDFS IO、网络 IO 等方面。Hive 会计算同一 SQL 语句的不同执行计划的计算成本，并选出成本最低的执行计划。目前 CBO 在 hive 中主要用于 join 的优化，例如多表 join 的 join 顺序。

相关参数为：

```
--是否启用cbo优化 
set hive.cbo.enable=true;


```

CBO 优化也会完成一部分的谓词下推优化工作，因为在执行计划中，谓词越靠前，整个计划的计算成本就会越低

## 5.4 谓词下推

思想：将过滤表达式尽可能移动至靠近数据源的位置，以使真正执行时能直接跳过无关的数据。简单来说：就是通过将一些过滤条件尽可能的在最底层执行可以减少每一层交互的数据量，从而提升性能。

Hive 中的 Predicate Pushdown 简称谓词下推，简而言之，就是在不影响结果的情况下，尽量将过滤条件提前执行。谓词下推后，过滤条件在 map 端执行，减少了 map 端的输出，降低了数据在集群上传输的量，节约了集群的资源，也提升了任务的性能。

```
 具体配置项是hive.optimize.ppd，默认为true，即开启谓词下推

```

* * *

我们是由一群数据从业人员，因为热爱凝聚在一起，以开源精神为基础，组成的 PowerData 数据之力社区。

可关注下方公众号后点击 “加入我们”，与 PowerData 一起成长