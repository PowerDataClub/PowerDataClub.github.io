---
title: "【万字长文】Spark 较全知识点整理（内含脑图）"
date: 2023-02-13 08:40:00
description: "Spark 较全知识点整理"
head:
  - - meta
    - name: keywords
      content: Spark,大数据,PowerData
tag: [大数据组件,Spark]
order: -5
---


本文由 PowerData 灵魂人物贡献

姓名：李奇峰  
花名：灵魂人物  
微信：bigdata_qifeng  
年龄：95 后  
工作经验：3-5 年  
工作内容：数仓, 数开, 数据中台, 后端开发  
自我介绍：一个对数据中台非常感兴趣的人

****PDF 文档统一发到社区交流群****

**扫描下方二维码申请加入社区**

![](http://oss.powerdata.top/hub-image/93639331.png)
=======



# 1、简单描述 Spark 的特点，其与 Hadoop 的区别

===========

**速度快**

1.  Spark 使用 DAG 调度器、查询优化器和物理执行引擎，能够在批处理和流数据获得很高的性能。

2.  spark 把运算的中间数据 (shuffle 阶段产生的数据) 存放在内存，迭代计算效率更高，mapreduce 的中间结果需要落地，保存到磁盘；

3.  Spark 计算框架对内存的利用和运行的并行度比 mapreduce 高，Spark 运行容器为 executor，内部 ThreadPool 中线程运行一个 Task，mapreduce 在线程内部运行 container，container 容器分类为 MapTask 和 ReduceTask。Spark 程序运行并行度高；

**容错性高**

1.  Spark 通过弹性分布式数据集 RDD 来实现高效容错，RDD 是一组分布式的存储在节点内存中的只读性的数据集，这些集合是弹性的，某一部分丢失或者出错，可以通过整个数据集的计算流程的血缘关系来实现重建，mapreduce 的容错只能重新计算；

2.  Spark 采用 CheckPoint 机制，对于特别复杂的 Spark 应用，会出现某个反复使用的 RDD，即使之前持久化过但由于节点的故障导致数据丢失了。CheckPoint 机制是我们在 spark 中用来保障容错性的主要机制，它可以阶段性的把应用数据存储到诸如 HDFS 等可靠存储系统中，以供恢复时使用。

**通用性强 - 集成度高**

1.  以 Spark 为基础建立起来的模块 (库) 有 Spark SQL,Spark Streaming,MLlib(machine learning)和 GraphX(graph)。我们可以很容易地在同一个应用中将这些库结合起来使用，以满足我们的实际需求。并且提供了 transformation 和 action 这两大类的多功能 api。mapreduce 只提供了 map 和 reduce 两种操作，流计算及其他的模块支持比较缺乏；

2.  Spark 框架和生态更为复杂，有 RDD，血缘 lineage、执行时的有向无环图 DAG，stage 划分等，很多时候 spark 作业都需要根据不同业务场景的需要进行调优以达到性能要求，mapreduce 框架及其生态相对较为简单，对性能的要求也相对较弱，运行较为稳定，适合长期后台运行；

**兼容性强**

1.  Spark 任务支持多种调度方式包括 Yarn、mesos、Standalone 等。可通过 Spark 直接对接大数据生态中 Hbase、Hdfs、Kafka 等多种数据源。

# 2、hadoop 和 spark 的相同点和不同点

======

*   Hadoop 将中间结果存放在 HDFS 中，每次 MR 都需要刷写 - 调用，而 Spark 中间结果存放优先存放在内存中，内存不够再存放在磁盘中，不放入 HDFS，避免了大量的 IO 和刷写读取操作；

*   Hadoop 底层使用 MapReduce 计算架构，只有 map 和 reduce 两种操作，表达能力比较欠缺，而且在 MR 过程中会重复的读写 hdfs，造成大量的磁盘 io 读写操作，所以适合高时延环境下批处理计算的应用；Spark 是基于内存的分布式计算架构，提供更加丰富的数据集操作类型，主要分成转化操作和行动操作，包括 map、reduce、filter、flatmap、groupbykey、reducebykey、union 和 join 等，数据分析更加快速，所以适合低时延环境下计算的应用；

*   spark 与 hadoop 最大的区别在于迭代式计算模型。基于 mapreduce 框架的 Hadoop 主要分为 map 和 reduce 两个阶段，所以在一个 job 里面能做的处理很有限，对于复杂的计算，需要使用多次 MR；spark 计算模型是基于内存的迭代式计算模型，根据用户编写的 RDD 算子和程序，在调度时根据宽窄依赖可以生成多个 Stage，根据 action 算子生成多个 Job。所以 spark 相较于 mapreduce，计算模型更加灵活，可以提供更强大的功能。

*   由于 spark 基于内存进行计算，在面对大量数据且没有进行调优的情况下，可能会出现比如 OOM 内存溢出等情况，导致 spark 程序可能无法运行起来，而 mapreduce 虽然运行缓慢，但是至少可以慢慢运行完。

*   Hadoop 适合处理静态数据，对于迭代式流式数据的处理能力差；Spark 通过在内存中缓存处理的数据，提高了处理流式数据和迭代式数据的性能；

# 3、Spark 的部署方式

=============

Spark 有以下四种部署方式，分别是：Local，Standalone，Yarn，Mesos

**Local** 本地运行模式 （单机）

*   该模式被称为 Local[N] 模式，是用单机的多个线程来模拟 Spark 分布式计算，直接运行在本地，便于调试，通常用来验证开发出来的应用程序逻辑上有没有问题。

*   其中 N 代表可以使用 N 个线程，每个线程拥有一个 core。如果不指定 N，则默认是 1 个线程（该线程有 1 个 core）。

*   如果是 local[*]，则根据当前 CPU 的核数来自动设置线程数

**Standalone** 独立模式

自带完整的服务，可单独部署到一个集群中，无需依赖任何其他资源管理系统。它是 Spark 实现的资源调度框架，其主要的节点有 Client 节点、Master 节点和 Worker 节点

在 standalone 部署模式下又分为 client 模式和 cluster 模式

client 模式：driver 和 client 运行于同一 JVM 中，不在 worker 上启动, 该 JVM 进程直到 spark application 计算完成返回结果后才退出

cluster 模式：driver 由 worker 启动，client 在确认 spark application 成功提交给 cluster 后直接退出，并不等待 spark application 运行结果返回

**Yarn**

通常，生产环境中，我们是把 Spark 程序在 YARN 中执行。而 Spark 程序在 YARN 中运行有两种模式，一种是 Cluster 模式、一种是 Client 模式。这两种模式的关键区别就在于 Spark 的 driver 是运行在什么地方。

client 模式：如果是 Client 模式，Driver 就运行在提交 spark 程序的地方，Spark Driver 是需要不断与任务运行的 Container 交互的，所以运行 Driver 的 client 是必须在网络中可用的，直到应用程序结束。在本地环境测试的时候经常使用

cluster 模式：本地进程则仅仅只是一个 client，它会优先向 yarn 申请 AppMaster 资源运行 AppMaster，在运行 AppMaster 的时候通过反射启动 Driver(我们的应用代码)，在 SparkContext 初始化成功后，再向 yarn 注册自己并申请 Executor 资源，此时 Driver 与 AppMaster 运行在同一个 container 里，是两个不同的线程，当 Driver 运行完毕，AppMaster 会释放资源并注销自己。所以在该模式下如果结束了该进程，整个 Spark 任务也不会退出，因为 Driver 是在远程运行的

**Mesos**

国内几乎不用，所以不讨论

# 4、Spark 的作业提交参数


<table><thead><tr><th width="96">参数名</th><th width="464">参数说明</th></tr></thead><tbody><tr><td width="142">--master</td><td width="443">master 的地址，提交任务到哪里执行，例如 spark://host:port, yarn, local</td></tr><tr><td width="96">--deploy-mode</td><td width="443">在本地 (client) 启动 driver 或在 cluster 上启动，默认是 client</td></tr><tr><td width="96">--class</td><td width="443">应用程序的主类，仅针对 java 或 scala 应用</td></tr><tr><td width="96">--name</td><td width="443">应用程序的名称</td></tr><tr><td width="96">--jars</td><td width="443">用逗号分隔的本地 jar 包，设置后，这些 jar 将包含在 driver 和 executor 的 classpath 下</td></tr><tr><td width="96">--packages</td><td width="443">包含在 driver 和 executor 的 classpath 中的 jar 的 maven 坐标</td></tr><tr><td width="96">--exclude-packages</td><td width="443">为了避免冲突 而指定不包含的 package</td></tr><tr><td width="96">--repositories</td><td width="443">远程 repository</td></tr><tr><td width="96">--conf PROP=VALUE</td><td width="443">指定 spark 配置属性的值， 例如 -conf spark.executor.extraJavaOptions="-XX:MaxPermSize=256m"</td></tr><tr><td width="96">--properties-file</td><td width="443">加载的配置文件，默认为 conf/spark-defaults.conf</td></tr><tr><td width="96">--driver-memory</td><td width="443">Driver 内存，默认 1G</td></tr><tr><td width="96">--driver-java-options</td><td width="443">传给 driver 的额外的 Java 选项</td></tr><tr><td width="96">--driver-library-path</td><td width="443">传给 driver 的额外的库路径</td></tr><tr><td width="96">--driver-class-path</td><td width="443">传给 driver 的额外的类路径</td></tr><tr><td width="96">--driver-cores</td><td width="443">Driver 的核数，默认是 1。在 yarn 或者 standalone 下使用</td></tr><tr><td width="96">--executor-memory</td><td width="443">每个 executor 的内存，默认是 1G</td></tr><tr><td width="96">--total-executor-cores</td><td width="443">所有 executor 总共的核数。仅仅在 mesos 或者 standalone 下使用</td></tr><tr><td width="96">--num-executors</td><td width="443">启动的 executor 数量。默认为 2。在 yarn 下使用</td></tr><tr><td width="96">--executor-core</td><td width="443">每个 executor 的核数。在 yarn 或者 standalone 下使用</td></tr></tbody></table>

# 5、简述 Spark 的作业提交流程

===

Spark 的作业提交流程根据部署模式不同，其提交流程也不相同。目前企业中最常用的部署模式为 Yarn，主要描述 Spark 在采用 Yarn 的情况下的作业提交流程。Spark 程序在 YARN 中运行有两种模式，一种是 Cluster 模式、一种是 Client 模式。

**yarn-client![](http://oss.powerdata.top/hub-image/67175347.png)**

1.  client 向 ResouceManager 申请启动 ApplicationMaster，同时在 SparkContext 初始化中创建 DAGScheduler 和 TaskScheduler

2.  ResouceManager 收到请求后，在一台 NodeManager 中启动第一个 Container 运行 ApplicationMaster。与 YARN-Cluster 区别的是在该 ApplicationMaster 不运行 SparkContext，只与 SparkContext 进行联系进行资源的分派

3.  Client 中的 SparkContext 初始化完毕后，与 Application Master 建立通讯，向 Resource Manager 注册，根据任务信息向 Resource Manager 申请资源 (Container)

4.  当 application master 申请到资源后，便与 node manager 通信，要求它启动 container

5.  Container 启动后向 driver 中的 sparkContext 注册，并申请 task

6.  应用程序运行完成后，Client 的 SparkContext 向 ResourceManager 申请注销并关闭自己。

**yarn-cluster![](http://oss.powerdata.top/hub-image/73575176.png)**

1.  Spark Yarn Client 向 YARN 中提交应用程序，包括 Application Master 程序、启动 Application Master 的命令、需要在 Executor 中运行的程序等；

2.  Resource manager 收到请求后，在其中一个 node manager 中为应用程序分配一个 container，要求它在 container 中启动应用程序的 Application Master，Application master 初始化 sparkContext 以及创建 DAG Scheduler 和 Task Scheduler。

3.  Application master 根据 sparkContext 中的配置，向 resource manager 申请 container，同时，Application master 向 Resource manager 注册，这样用户可通过 Resource manager 查看应用程序的运行状态

4.  Resource manager 在集群中寻找符合条件的 node manager，在 node manager 启动 container，要求 container 启动 executor，

5.  Executor 启动后向 Application master 注册，并接收 Application master 分配的 task

6.  应用程序运行完成后，Application Master 向 Resource Manager 申请注销并关闭自己。

# 6、谈谈你对 RDD 机制的理解

=

RDD 是 spark 提供的核心抽象，全称为弹性分布式数据集。Spark 中的所有算子都是基于 rdd 来执行的，不同的场景会有不同的 rdd 实现类，但是都可以进行互相转换。rdd 执行过程中会形成 DAG 图，在 DAG 中又根据宽窄依赖进行 stage 的划分，形成 lineage 血缘保证容错性等。

RDD 的算子主要分成 2 类，action 和 transformation。transformation 算子不会立即触发作业提交的，每一个 transformation 方法返回一个新的 RDD。action 会触发真正的作业提交，一旦触发 action 就形成了一个完整的 DAG。原始的 RDD 通过一系列的 transformation 操作就形成了 DAG 有向无环图，任务执行时，可以按照 DAG 的描述，执行真正的计算。

RDD 最重要的特性就是容错性，可以自动从节点失败中恢复过来。即如果某个结点上的 RDD partition 因为节点故障，导致数据丢失，那么 RDD 可以通过自己的数据血缘重新计算该 partition。这一切对使用者都是透明的。

RDD 在逻辑上是一个 hdfs 文件，在抽象上是一种元素集合，包含了数据。它是被分区的，分为多个分区，每个分区分布在集群中的不同结点上，从而让 RDD 中的数据可以被并行操作（分布式数据集）

RDD 的数据默认存放在内存中，但是当内存资源不足时，spark 会自动将 RDD 数据写入磁盘。

# 7、reduceByKey 与 groupByKey 的区别, 哪一种更具优势


reduceByKey：reduceByKey 会在结果发送至 reducer 之前会对每个 mapper 在本地进行 combiner。这样做的好处在于，在 map 端进行一次 combiner 之后，数据量会大幅度减小，从而减小传输，保证 reduce 端能够更快的进行结果计算。

groupByKey：groupByKey 会对每一个 RDD 中的 value 值进行聚合形成一个序列 (Iterator)，此操作发生在 reduce 端，所以势必会将所有的数据通过网络进行传输，造成不必要的浪费。同时如果数据量十分大，可能还会造成 OutOfMemoryError。

所以在进行大量数据的 reduce 操作时候建议使用 reduceByKey。不仅可以提高速度，还可以防止使用 groupByKey 造成的内存溢出问题。

# 8、简单描述缓存 cache、persist 和 checkpoint 的区别


**cache、persist**

首先，cache 和 persist 都是用于将一个 RDD 进行缓存的。RDD 通过 persist 或 cache 方法可以将前面的计算结果缓存，但是并不是这两个方法被调用时立即缓存，而是触发后面的 action 时，该 RDD 将会被缓存在计算节点的内存中，并供后面重用。通过查看 RDD 的源码发现 cache 最终也是调用了 persist 无参方法，默认存储只存在内存中（MEMORYONLY） cache 只有一个默认的缓存级别 MEMORYONLY ，而 persist 可以根据情况设置其它的缓存级别。

<table><thead><tr><th width="178">持久化级别</th><th width="378">说明</th></tr></thead><tbody><tr><td width="68">MORY_ONLY(默认)</td><td width="357">将 RDD 以非序列化的 Java 对象存储在 JVM 中。如果没有足够的内存存储 RDD，则某些分区将不会被缓存，每次需要时都会重新计算。这是默认级别</td></tr><tr><td width="68">MORYANDDISK(开发中可以使用这个)</td><td width="357">将 RDD 以非序列化的 Java 对象存储在 JVM 中。如果数据在内存中放不下，则溢写到磁盘上．需要时则会从磁盘上读取</td></tr><tr><td width="68">MEMORYONLYSER (Java and Scala)</td><td width="357">将 RDD 以序列化的 Java 对象 (每个分区一个字节数组) 的方式存储．这通常比非序列化对象 (deserialized objects) 更具空间效率，特别是在使用快速序列化的情况下，但是这种方式读取数据会消耗更多的 CPU</td></tr><tr><td width="68">MEMORYANDDISK_SER (Java and Scala)</td><td width="357">与 MEMORYONLYSER 类似，但如果数据在内存中放不下，则溢写到磁盘上，而不是每次需要重新计算它们</td></tr><tr><td width="68">DISK_ONLY</td><td width="357">将 RDD 分区存储在磁盘上</td></tr><tr><td width="68">MEMORYONLY2, MEMORYANDDISK_2 等</td><td width="357">与上面的储存级别相同，只不过将持久化数据存为两份，备份每个分区存储在两个集群节点上</td></tr><tr><td width="68">OFF_HEAP(实验中)</td><td width="357">与 MEMORYONLYSER 类似，但将数据存储在堆外内存中。(即不是直接存储在 JVM 内存中)</td></tr></tbody></table>

**checkpoint**

Checkpoint 的产生就是为了更加可靠的数据持久化，在 Checkpoint 的时候一般把数据放在在 HDFS 上，这就天然的借助了 HDFS 天生的高容错、高可靠来实现数据最大程度上的安全，实现了 RDD 的容错和高可用。

> 开发中如何保证数据的安全性性及读取效率：可以对频繁使用且重要的数据，先做缓存 / 持久化，再做 checkpint 操作。

**缓存与 checkpoint 的区别**

位置：缓存只能保存在本地的磁盘和内存中， Checkpoint 可以保存数据到 HDFS 这类可靠的存储上。生命周期：缓存的 RDD 会在程序结束或者手动调用 unpersist 方法后会被清除。Checkpoint 的 RDD 在程序结束后依然存在，不会被删除。依赖关系：缓存不会丢掉 RDD 间的依赖关系，CheckPoint 会切断依赖关系。

# 9、描述 repartition 和 coalesce 的关系与区别


**关系：**两者都是用来改变 RDD 的 partition 数量的，repartition 底层调用的就是 coalesce 方法：coalesce(numPartitions, shuffle = true)

**区别：**coalesce() 方法的参数 shuffle 默认设置为 false，coalesce 根据传入的参数来判断是否发生 shuffle。repartition() 方法就是 coalesce() 方法 shuffle 为 true 的情况，repartition 一定会发生 shuffle。

> 一般情况下增大 rdd 的 partition 数量使用 repartition，减少 partition 数量时使用 coalesce。

# 10、Spark 中的广播变量与累加器


在默认情况下，当 Spark 在集群的多个不同节点的多个任务上并行运行一个函数时，它会把函数中涉及到的每个变量，在每个任务上都生成一个副本。但是，有时候需要在多个任务之间共享变量，或者在任务 (Task) 和任务控制节点 (Driver Program) 之间共享变量。

为了满足这种需求，Spark 提供了两种类型的变量：

累加器 accumulators：因为 task 的执行是在多个 Executor 中执行，所以会出现计算总量的时候，每个 Executor 只会计算部分数据，不能全局计算。累加器支持在所有不同节点之间进行累加计算 (比如计数或者求和)。

广播变量 broadcast variables：广播变量用来把变量在所有节点的内存之间进行共享，在每个机器上缓存一个只读的变量，而不是为机器上的每个任务都生成一个副本，起到节省资源和优化的作用。它通常用来高效分发较大的对象。

# 11、Spark 中宽窄依赖、Shuffle、DAG 的关系

窄依赖是指父 RDD 的每个分区只被子 RDD 的一个分区所使用，子 RDD 分区通常对应常数个父 RDD 分区 (O(1)，与数据规模无关)

宽依赖是指父 RDD 的每个分区都可能被多个子 RDD 分区所使用，子 RDD 分区通常对应所有的父 RDD 分区 (O(n)，与数据规模有关)

![](http://oss.powerdata.top/hub-image/13184693.png)

其中，宽依赖会造成 Shuffle。

DAG 划分 stage 的规则：

回溯算法，在运行时也就是触发 action 算子开始向前回溯后，遇到宽依赖就切分成一个 stage，直到所有的 RDD 全部遍历完成为止。每一个 stage 包含一个或多个并行的 task 任务。

# 12、Spark 主备切换机制


Master 实际上可以配置两个，Spark 原生的 standalone 模式是支持 Master 主备切换的。当 Active Master 节点挂掉以后，我们可以将 Standby Master 切换为 Active Master。

Spark Master 主备切换可以基于两种机制，一种是基于文件系统的，一种是基于 ZooKeeper 的。

基于文件系统的主备切换机制，需要在 Active Master 挂掉之后手动切换到 Standby Master 上；

而基于 Zookeeper 的主备切换机制，可以实现自动切换 Master。

# 13、Spark 如何保证宕机迅速恢复


*   适当增加 spark standby master

*   编写 shell 脚本，定期检测 master 状态，出现宕机后对 master 进行重启操作

# 14、Spark 运行流程

![](http://oss.powerdata.top/hub-image/65615382.png)

1.  SparkContext 向资源管理器注册并向资源管理器申请运行 Executor

2.  资源管理器分配 Executor，然后资源管理器启动 Executor

3.  Executor 发送心跳至资源管理器

4.  SparkContext 构建 DAG 有向无环图

5.  将 DAG 分解成 Stage（TaskSet）

6.  把 Stage 发送给 TaskScheduler

7.  Executor 向 SparkContext 申请 Task

8.  TaskScheduler 将 Task 发送给 Executor 运行

9.  同时 SparkContext 将应用程序代码发放给 Executor

10.  Task 在 Executor 上运行，运行完毕释放所有资源


# 15、Spark 中的 OOM 问题


1.  map 算子执行中内存溢出如 flatMap，mapPatitions 原因：map 端过程产生大量对象导致内存溢出：这种溢出的原因是在单个 map 中产生了大量的对象导致的。解决方案：1）增加堆内内存。2）在不增加内存的情况下，可以减少每个 Task 处理数据量，使每个 Task 产生大量的对象时，Executor 的内存也能够装得下。具体做法可以在会产生大量对象的 map 操作之前调用 repartition 方法，分区成更小的块传入 map。

2.  shuffle 后单个文件过大导致内存溢出如 join，reduceByKey，repartition。原因：分区数过少导致 shuffle 后单个分区内的文件过大。解决方案：1） spark.default.parallelism 默认分区数，调大此参数。此参数只对 hashPartition 有效。2）自定义 partition 函数，优化数据分区机制。

3.  数据倾斜导致内存溢出 解决方案：数据倾斜解决方案

4.  driver 内存溢出 1）原因：用户在 Dirver 端创建的对象占用空间过多，比如创建了一个大的集合数据结构。解决方案：1、考虑将该对象转化成 Executor 端加载. 例如调用 sc.textFile/sc.hadoopFile 等。2、根据对象大小调大 driver 内存 2）原因：从 Executor 端收集数据回 Driver 端，比如 Collect 操作导致返回的数据超过 spark.driver.maxResultSize。解决方案：1、将 Driver 端对 collect 回来的数据所做的操作, 转化成 Executor 端 RDD 操作。2、根据对象大小调大 driver 内存

# 16、修改默认 task 个数


spark 中有 partition 的概念，每个 partition 都会对应一个 task，task 越多，在处理大规模数据的时候，就会越有效率。

针对 spark sql 的 task 数量：spark.sql.shuffle.partitions=50

非 spark sql 程序设置生效：spark.default.parallelism=10

# 17、Hadoop 和 Spark 使用场景

Hadoop/MapReduce 和 Spark 最适合的都是做离线型的数据分析，但 Hadoop 特别适合是单次分析海量数据，而 Spark 则适用于非海量数据或流式数据，更适用于机器学习之类的 “迭代式” 应用。

Spark 是基于内存的迭代计算框架，适用于需要多次操作特定数据集的应用场合。需要反复操作的次数越多，所需读取的数据量越大，受益越大，数据量小但是计算密集度较大的场合，受益就相对较小

由于 RDD 的特性，Spark 不适用那种异步细粒度更新状态的应用，例如 web 服务的存储或者是增量的 web 爬虫和索引。就是对于那种增量修改的应用模型不适合。

总的来说 Spark 的适用面比较广泛且比较通用。

# 18、RDD、DStream、DataFrame、Dataset 区别


*   RDD：SparkCore 数据抽象

*   DStream：spark streaming 提供的一种高级抽象，代表了一个持续不断的数据流，内部其实不断产生按照时间段划分的 RDD 称为 batch。可以通过输入数据源来创建，比如 Kafka、flume 等，也可以通过其他 DStream 的高阶函数来创建，比如 map、reduce、join 和 window 等。DStream 的数据是分散在各个子节点的 partition 中。

*   DataFrame：底层基于 RDD，除了数据以外，还记录数据的结构信息，即 schema。把它当成一张表来使用且支持 sql 语言，比函数式的 RDD API 要更加友好，门槛更低。支持嵌套数据类型（struct、array 和 map）。定制化内存管理：数据以二进制的方式存在于堆外内存，节省了大量空间之外，还摆脱了 GC 的限制，Spark SQL 的查询优化器，效率更快。

*   Dataset：基于 DataFrame，DataFrame 弱类型，只有在执行时才知道字段的类型，而 DataSet 是强类型的，不仅仅知道字段，而且知道字段类型，有更严格的错误检查。

# 19、Spark 资源规划


在一定范围之内，增加资源与性能的提升是成正比的。因此，增加和分配更多的资源，在性能和速度上的提升，是显而易见的。因此，在编写完成 Spark 作业之后的第一步，便是要调节最优资源配置。在给予程序所能获取到的最大资源之后，才考虑对程序进行其他方面的调优。

资源参数的调优，没有一个固定的值，需要同学们根据自己的实际情况（包括 Spark 作业中的 shuffle 操作数量、RDD 持久化操作数量以及 spark web ui 中显示的作业 gc 情况），同时参考以下内容给出的原理以及调优建议，合理地设置资源参数。

在资源配置时，主要配置以下种类的资源：

Executor 数量：num-executors
-------------------------

**参数说明：**该参数用于设置 Spark 作业总共要用多少个 Executor 进程来执行。Driver 在向 YARN 集群管理器申请资源时，YARN 集群管理器会尽可能按照你的设置来在集群的各个工作节点上，启动相应数量的 Executor 进程。这个参数非常之重要，如果不设置的话，默认只会给你启动少量的 Executor 进程，此时你的 Spark 作业的运行速度是非常慢的。

**参数调优建议：**每个 Spark 作业的运行一般设置 50~100 个左右的 Executor 进程比较合适，设置太少或太多的 Executor 进程都不好。设置的太少，无法充分利用集群资源；设置的太多的话，大部分队列可能无法给予充分的资源。

Executor CPU 数量：executor-cores
------------------------------

**参数说明：**该参数用于设置每个 Executor 进程的 CPU core 数量。这个参数决定了每个 Executor 进程并行执行 task 线程的能力。因为每个 CPU core 同一时间只能执行一个 task 线程，因此每个 Executor 进程的 CPU core 数量越多，越能够快速地执行完分配给自己的所有 task 线程。

**参数调优建议：**Executor 的 CPU core 数量设置为 2 ~ 4 个较为合适。同样得根据不同部门的资源队列来定，可以看看自己的资源队列的最大 CPU core 限制是多少，再依据设置的 Executor 数量，来决定每个 Executor 进程可以分配到几个 CPU core。同样建议，如果是跟他人共享这个队列，那么 num-executors * executor-cores 不要超过队列总 CPU core 的 1/3~1/2 左右比较合适，也是避免影响其他同学的作业运行。

Task 并行度调节：spark.default.parallelism
------------------------------------

**参数说明：**Task 并行度资源 = Executor 数量 * Executor CPU 数量（每个 Executor 的 CPU 数量可能不同），一个 CPU 可执行一个 Task。

Task 并行度调节参数：spark.default.parallelism，此参数限制了 spark 可以运行 task 的最大数量。如果 spark.default.parallelism 的数量设置小于集群的并行度资源，意味着启动的 task 任务无法占满集群中的并行度资源，会造成 CPU 资源的限制。导致部分 CPU 没有分配到 Task 的情况。你的资源虽然分配足够了，但是并行度没有与资源相匹配，导致的资源都浪费掉了。

**参数调优建议：**因此 Spark 官网建议的设置原则是，设置该参数为 Task 并行度资源（Executor 数量 * 每个 Executor 的 CPU 数量）的 2~3 倍较为合适，比如 Executor 的总 CPU core 数量为 300 个，那么设置 1000 个 task 是可以的，此时可以充分地利用 Spark 集群的资源。

Executor 内存大小：executor-memory
-----------------------------

**参数说明：**该参数用于设置每个 Executor 进程的内存。Executor 内存的大小，很多时候直接决定了 Spark 作业的性能，而且跟常见的 JVM OOM 异常，也有直接的关联。

**参数调优建议：**每个 Executor 进程的内存设置 4G ~ 8G 较为合适。但是这只是一个参考值，具体的设置还是得根据不同部门的资源队列来定。可以看看自己团队的资源队列的最大内存限制是多少，num-executors 乘以 executor-memory，是不能超过队列的最大内存量的。此外，如果你是跟团队里其他人共享这个资源队列，那么申请的内存量最好不要超过资源队列最大总内存的 1/3~1/2，避免你自己的 Spark 作业占用了队列所有的资源，导致别的同学的作业无法运行。

driver 端内存：driver-memory
------------------------

**参数说明：**该参数用于设置 Driver 进程的内存。

**参数调优建议：**Driver 的内存通常来说不设置，或者设置 1G 左右应该就够了。唯一需要注意的一点是，如果需要使用 collect 算子将 RDD 的数据全部拉取到 Driver 上进行处理，那么必须确保 Driver 的内存足够大，否则会出现 OOM 内存溢出的问题。

存储内存比例：spark.storage.memoryFraction
-----------------------------------

**参数说明：**该参数用于设置 RDD 持久化数据在 Executor 内存中能占的比例，默认是 0.6。也就是说，默认 Executor 60% 的内存，可以用来保存持久化的 RDD 数据。根据你选择的不同的持久化策略，如果内存不够时，可能数据就不会持久化，或者数据会写入磁盘。

**参数调优建议：**如果 Spark 作业中，有较多的 RDD 持久化操作，该参数的值可以适当提高一些，保证持久化的数据能够容纳在内存中。避免内存不够缓存所有的数据，导致数据只能写入磁盘中，降低了性能。但是如果 Spark 作业中的 shuffle 类操作比较多，而持久化操作比较少，那么这个参数的值适当降低一些比较合适。此外，如果发现作业由于频繁的 gc 导致运行缓慢（通过 spark web ui 可以观察到作业的 gc 耗时），意味着 task 执行用户代码的内存不够用，那么同样建议调低这个参数的值。

执行内存比例：spark.shuffle.memoryFraction
-----------------------------------

**参数说明：**该参数用于设置 shuffle 过程中一个 task 拉取到上个 stage 的 task 的输出后，进行聚合操作时能够使用的 Executor 内存的比例，默认是 0.2。也就是说，Executor 默认只有 20% 的内存用来进行该操作。shuffle 操作在进行聚合时，如果发现使用的内存超出了这个 20% 的限制，那么多余的数据就会溢写到磁盘文件中去，此时就会极大地降低性能。

**参数调优建议：**如果 Spark 作业中的 RDD 持久化操作较少，shuffle 操作较多时，建议降低持久化操作的内存占比，提高 shuffle 操作的内存占比比例，避免 shuffle 过程中数据过多时内存不够用，必须溢写到磁盘上，降低了性能。此外，如果发现作业由于频繁的 gc 导致运行缓慢，意味着 task 执行用户代码的内存不够用，那么同样建议调低这个参数的值。

# 20、Spark 性能优化


调优概述
----

在开发 Spark 作业的过程中注意和应用一些性能优化的基本原则包括：RDD lineage 设计、算子的合理使用、shuffle 优化，特殊操作的优化等。在开发过程中，时时刻刻都应该注意以上原则，并将这些原则根据具体的业务以及实际的应用场景，灵活地运用到自己的 Spark 作业中。

一、避免创建重复的 RDD
-------------

对于同一份数据，只应该创建一个 RDD，不能创建多个 RDD 来代表同一份数据。

在开发 RDD lineage 极其冗长的 Spark 作业时，可能会忘了自己之前对于某一份数据已经创建过一个 RDD 了，从而导致同一份数据，创建了多个 RDD。这就意味着，我们的 Spark 作业会进行多次重复计算来创建多个代表相同数据的 RDD，进而增加了作业的性能开销。

二、尽可能复用同一个 RDD
--------------

在对 RDD 进行算子时，要避免相同算子和计算逻辑下对 RDD 进行重复的计算。并且在对不同的数据执行算子操作时还要尽可能地复用一个 RDD，减少 RDD 的数量，从而减少算子执行的次数。如下图所示：

![](http://oss.powerdata.top/hub-image/70256867.png)

对上图中的 RDD 计算架构进行修改，得到如下图所示的优化结果：

![](http://oss.powerdata.top/hub-image/17840900.png)

三、对多次使用的 RDD 进行持久化
------------------

对多次使用的 RDD 进行持久化。以后每次对这个 RDD 进行算子操作时，都会直接从内存或磁盘中提取持久化的 RDD 数据，然后执行算子，而不会从源头处重新计算一遍这个 RDD，再执行算子操作。

四、mapPartitions 和 foreachPartitions
-----------------------------------

partitions 类的算子，一次函数调用会处理一个 partition 所有的数据，而不是一条数据调用一次函数，可以减少对象的创建，以及批量操作数据。但是有的时候，使用 partitions 会出现 OOM（内存溢出）的问题。因为单次函数调用就要处理掉一个 partition 所有的数据，如果内存不够，垃圾回收时是无法回收掉太多对象的，很可能出现 OOM 异常。所以使用这类操作时要慎重！

五、使用 reduceByKey 替代 groupByKey
------------------------------

reduceByKey：reduceByKey 会在结果发送至 reducer 之前会对每个 mapper 在本地根据 key 进行 combiner。这样做的好处在于，在 map 端进行一次 combiner 之后，数据量会大幅度减小，从而减小传输，保证 reduce 端能够更快的进行结果计算。

groupByKey：groupByKey 会对每一个 RDD 中的 value 值进行聚合形成一个序列 (Iterator)，此操作发生在 reduce 端，所以势必会将所有的数据通过网络进行传输，造成不必要的浪费。同时如果数据量十分大，可能还会造成 OutOfMemoryError。

所以在进行大量数据的 reduce 操作时候建议使用 reduceByKey。不仅可以提高速度，还可以防止使用 groupByKey 造成的内存溢出问题。

六、尽量避免使用 shuffle 类算子
--------------------

shuffle 过程中，各个节点上的相同 key 都会先写入本地磁盘文件中，然后其他节点需要通过网络传输拉取各个节点上的磁盘文件中的相同 key。而且相同 key 都拉取到同一个节点进行聚合操作时，还有可能会因为一个节点上处理的 key 过多，导致内存不够存放，进而溢写到磁盘文件中。因此在 shuffle 过程中，可能会发生大量的磁盘文件读写的 IO 操作，以及数据的网络传输操作。磁盘 IO 和网络数据传输也是 shuffle 性能较差的主要原因。

因此在我们的开发过程中，能避免则尽可能避免使用 reduceByKey、join、distinct、repartition 等会进行 shuffle 的算子，尽量使用 map 类的非 shuffle 算子。这样的话，没有 shuffle 操作或者仅有较少 shuffle 操作的 Spark 作业，可以大大减少性能开销。

七、广播大变量，使用 map join 代替 join
---------------------------

在算子函数中使用到外部变量时，默认情况下，Spark 会将该变量复制多个副本，通过网络传输到 task 中，此时每个 task 都有一个变量副本。如果变量本身比较大的话（比如 100M，甚至 1G），那么大量的变量副本在网络中传输的性能开销，以及在各个节点的 Executor 中占用过多内存导致的频繁 GC，都会极大地影响性能。

此时建议使用 Spark 的广播功能，对该变量进行广播。广播后的变量，会保证每个 Executor 的内存中，只驻留一份变量副本，Executor 中的 task 共享该 Executor 中的广播副本，可以大大减少变量副本的数量，从而减少网络传输的性能开销，并减少对 Executor 内存的占用开销，降低 GC 的频率。

其次将小表 broadcast 至 executor 内存中，对大表进行 map 操作的时候根据 key 拉取 broadcast 的小表数据进行连接操作，减少 shuffle 过程产生的性能资源。

如果广播的变量过大，可能会造成 Executor 的 OOM。

八、使用 Kryo 序列化
-------------

在 Spark 中，主要有三个地方涉及到了序列化：

*   在算子函数中使用到外部变量时，该变量会被序列化后进行网络传输

*   将自定义的类型作为 RDD 的泛型类型时（比如 JavaRDD，Student 是自定义类型），所有自定义类型对象，都会进行序列化。因此这种情况下，也要求自定义的类必须实现 Serializable 接口。

*   使用可序列化的持久化策略时（比如 MEMORYONLYSER），Spark 会将 RDD 中的每个 partition 都序列化成一个大的字节数组。

Spark 默认使用的是 Java 的序列化机制，使用方便不需要额外的配置，但是 Java 序列化机制的效率不高，序列化速度慢并且序列化后的数据所占用的空间依然较大。

但是 Spark 同时支持使用 Kryo 序列化库，Kryo 序列化类库的性能比 Java 序列化类库的性能要高很多。

对于这三种出现序列化的地方，我们都可以通过使用 Kryo 序列化类库，来优化序列化和反序列化的性能。Kryo 序列化机制比 Java 序列化机制，性能高 10 倍左右。Spark 之所以默认没有使用 Kryo 作为序列化类库，是因为 Kryo 要求最好要注册所有需要进行序列化的自定义类型，比较麻烦。但从 Spark 2.0 开始，简单类型以及数组、字符串都默认使用 Kryo。

九、适当调大 map 和 reduce 端缓冲区
------------------------

在 shuffle 过程中，如果 map 端处理的数据量比较大，但是 map 端缓冲大小是固定的，可能会出现 map 端数据频繁溢写到磁盘文件中的情况，使得性能非常低下，通过调节 map 端缓冲的大小，可以避免频繁的磁盘 IO 操作，进而提升 Spark 任务的整体性能。map 端缓冲配置是 32KB

reduce task 的 buffer 缓冲区大小决定了 reduce task 每次能够缓冲的数据量，也就是每次能够拉取的数据量，如果内存资源较为充足，适当增加拉取数据缓冲区的大小，可以减少拉取数据的次数，也就可以减少网络传输的次数，进而提升性能。reduce 端缓冲默认为 48MB

# 21、内存管理机制

脑图地址：https://kdocs.cn/l/ccxGUq8Lbhzp

手机长按选中链接点击搜一搜

![](http://oss.powerdata.top/hub-image/0812-04spark01.png)]

[搞懂 Spark 系列之 深入理解 Spark 内存管理](http://mp.weixin.qq.com/s?__biz=MzUyMTA1NTcyOA==&mid=2247484288&idx=1&sn=006f68d26281b6c73d047eaf781904e0&chksm=f9e1bf1fce96360927f7fbf93989e505e183f20d4dbd87fe1e309b2540acbaf5dcff97058300&scene=21#wechat_redirect)  

# 22、Spark Shuffle 详解


脑图地址：https://kdocs.cn/l/crrSwf02HkMf

手机长按选中链接点击搜一搜

[![](http://oss.powerdata.top/hub-image/0812-04spark02.png)](http://mp.weixin.qq.com/s?__biz=MzUyMTA1NTcyOA==&mid=2247484118&idx=1&sn=b2bf7a2372be94cadcadfc4af12fcb38&chksm=f9e1be49ce96375fba2f32ab66ba710b5c1a3a9f9dec545794b3eb805af49f10d0add3a39c8e&scene=21#wechat_redirect)  

[搞懂 Spark 系列之 Spark Shuffle 的前世今生](http://mp.weixin.qq.com/s?__biz=MzUyMTA1NTcyOA==&mid=2247484118&idx=1&sn=b2bf7a2372be94cadcadfc4af12fcb38&chksm=f9e1be49ce96375fba2f32ab66ba710b5c1a3a9f9dec545794b3eb805af49f10d0add3a39c8e&scene=21#wechat_redirect)  

# 23、Saprk 数据倾斜


脑图地址：https://kdocs.cn/l/ceigPOMLzAVB







想要加入社区或对本文有任何疑问，可直接添加作者微信交流。

![图：作者微信](http://oss.powerdata.top/hub-image/93639331.png)