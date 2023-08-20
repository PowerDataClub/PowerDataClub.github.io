---
title: "搞懂Spark系列之深入理解Spark内存管理"
date: 2023-02-07 08:35:00
description: "Spark内存管理"
head:
  - - meta
    - name: keywords
      content: Spark,大数据,PowerData
tag: [大数据组件,Spark]
order: -3
---

本文由 PowerData 凌熙贡献  
姓名：徐振超  
花名：凌熙  
微信：Faith_xzc  
年龄：95 后  
工作经验：无  
工作内容：研究生  
自我介绍：大数据方向小硕一枚，热衷于大数据技术，拥抱开源，乐于分享



# Spark 内存概述

众所周知，Spark 是比 Hadoop 快近百倍（理想条件下，如下图所示）的大数据计算引擎，而这其中最主要突出的地方就是 Spark 是基于内存的计算引擎，相比于 Hadoop 来说，减少了 MR 过程中的磁盘 IO，通过将 map 端计算的中间结果存储到内存，reduce 端在拉取中间结果的时候避免了大量的磁盘 IO，从而提升了性能。因此，作为任务的所有计算都在内存中进行的引擎来说，深入了解 Spark 内存管理机制是非常重要的。

![Spark 和 Hadoop 速度对比图](http://oss.powerdata.top/hub-image/70770783.png)

在进行分析 Spark 内存管理前，我们先看下 Spark 的架构图：

![Spark 的架构图](http://oss.powerdata.top/hub-image/83546187.png)

从上图可以看出，Spark Application 中包括两个 JVM 进程：Driver 和 Executor

*   Driver 是主控进程，负责创建 SparkSession/SparkContext，提交 Job，将 Job 转化为 Task，协调执行器之间的 Task 执行。

*   Executor 主要负责执行具体的计算任务，并将结果返回给 Driver。

Spark 的内存管理在这两个部分中也是有所不同的，其中 Driver 内存管理比较简单，这里不做讲解，我们主要分析的是 Executor 的内存管理。

Executor 内存分为两种（如下图所示）：In-Heap memory 和 External memory

*   On-Heap 内存（In-Heap memory）：对象在 JVM Heap 上分配并由 GC 绑定

*   Off-Heap 内存（External memory）：对象通过序列化的方式分配在 JVM 之外的内存中，由应用程序管理，不受 GC 约束

![Executor 内存图](http://oss.powerdata.top/hub-image/53120361.png) 

下面先对这两种内存进行详细的介绍。

## On-Heap 内存
----------

On-Heap 内存即为堆内内存，它的大小由提交作业时指定 --excutor-memory 参数配置。Spark 对内存的管理是一种逻辑上的规划管理，具体内存的申请和释放由 JVM 完成，Spark 只是在 JVM 内存申请后和释放前记录这些内存（这是因为 Spark 的内存管理是基于 JVM 内存管理的），对于序列化对象可以精确计算实际占用内存，对于非序列化对象，占用内存采用周期采样估算得出，这样就导致实际可用内存小于 spark 记录的可用内存，容易导致 OOM 异常，但通过划分不同区域进行管理，可一定程度上减少了异常的出现。下图为 Spark 堆内内存的分配图（图例为统一内存管理）：

![Spark 堆内内存的分配图（图例为统一内存管理）](http://oss.powerdata.top/hub-image/68990359.png)

从上图我们可以看出，Spark 堆内内存分为四个部分：

*   Storage：用于缓存分布式数据集，比如 RDD Cache、广播变量等等

*   Execution：用来执行分布式任务。分布式任务的计算，主要包括数据的转换、过滤、映射、排序、聚合、归并等环节

*   Other：提供 Spark 内部对象、用户自定义对象的内存空间

*   System Reserved：不受开发者控制，它是 Spark 预留的、用来存储各种 Spark 内部对象的内存区域；

## Off-Heap 内存
-----------

为了进一步优化内存的使用以及提高 Shuffle 时排序的效率，Spark 引入了堆外（Off-heap）内存，使之可以直接在工作节点的系统内存中开辟空间，存储经过序列化的二进制数据。利用 JDK Unsafe API（从 Spark 2.0 开始，在管理堆外的存储内存时不再基于 Tachyon，而是与堆外的执行内存一样，基于 JDK Unsafe API 实现），Spark 可以直接操作系统堆外内存，减少了不必要的内存开销，以及频繁的 GC 扫描和回收，提升了处理性能。堆外内存可以被精确地申请和释放，而且序列化的数据占用的空间可以被精确计算，所以相比堆内内存来说降低了管理的难度，也降低了误差。

下图为 Spark 堆外内存的分配图（图例为统一内存管理）：

![Spark 堆外内存的分配图（图例为统一内存管理）](http://oss.powerdata.top/hub-image/03sparkmemeory02.png)

在默认情况下堆外内存并不启用，可通过配置 spark.memory.offHeap.enabled 参数启用，并由 spark.memory.offHeap.size 参数设定堆外空间的大小。除了没有 other 空间，堆外内存与堆内内存的划分方式基本相同，所有运行中的并发任务共享存储内存和执行内存。

# 内存管理机制

了解了 Spark 的内存分类后，我们就来看下 Spark 内存的管理机制。Spark 的内存管理机制分为两种（如下图所示）：静态内存管理和统一内存管理

*   静态内存管理（Static Memory Management）：将内存静态地分成两个固定的分区，用户在启动前可对其进行配置

*   统一内存管理（Unified Memory Manager）：将内存进行统一管理，支持 Storage 和 Execution 内存动态占用

![Spark 的内存管理机制](http://oss.powerdata.top/hub-image/42154016.png) 

下面对这两种内存管理机制进行详细的介绍。

## 静态内存管理
------

Spark 的静态内存管理将内存静态地分成两个固定的分区，Storage Memory 和 Execution Memory 等内存的大小在应用程序处理过程中是固定的，但用户可以在应用程序启动前对其进行配置。设置参数如下可参考：

![](http://oss.powerdata.top/hub-image/23317490.png)

**静态内存管理图示 - 堆内**

![](http://oss.powerdata.top/hub-image/20036940.png)

**静态内存管理图示 - 堆外**

![](http://oss.powerdata.top/hub-image/59344370.png)

作为传统的内存管理模型，它的优缺点还是很明显的：

优点：

*   实现比较简单

缺点：

*   尽管存储内存有可用空间，但无法使用，并且由于执行程序内存已满而会导致磁盘溢出。（反之亦然）。

*   静态内存管理不支持使用堆外内存进行存储，所以全部分配给执行空间。

**注：从 Spark 1.6.0 开始，采用新的内存管理器替代静态内存管理器，静态管理方式任然被保留，可通过 spark.memory.useLegacyMode 参数启用。但静态内存分配方法在 Spark 3.0 中被淘汰了，不能使用了**

## 动态内存管理
------

Spark 从 1.6.0 版本开始，采用新的内存管理器代替了静态内存管理器，为 Spark 提供动态内存分配。它分配一个内存区域作为存储和执行共享的统一内存容器。当不使用执行内存时，存储内存可以获得所有可用内存，反之亦然。如果任何存储或执行内存需要更多空间，一个名为 acquireMemory() 的函数将扩展其中一个内存池并缩小另一个内存池。借用的存储内存可以在任何给定时间被逐出。然而，由于实现的复杂性，借用的执行内存不会在第一个设计中被逐出。

动态内存管理机制的动态占用规则如下：

*   只有在 Execution memory 中没有使用 blocks 时，Storage memory 才能从 Execution memory 中借用空间。

*   如果 Storage memory 中没有使用 blocks，执行内存也可以从 Storage memory 中借用空间。

*   如果 Execution memory 中的 blocks 被 Storage memory 占用，而 Execution 需要更多的内存，可以强制驱逐 Storage Memory 占用的多余 blocks

*   如果 Storage Memory 中的 blocks 被 Execution memory 使用，Storage 需要更多的内存，则不能强行驱逐 Execution Memory 占用的多余 blocks；它最终将拥有更少的内存区域。它会等到 Spark 释放掉 Execution memory 存储的多余 block，然后占用它们。动态内存占用图示如下：

![](http://oss.powerdata.top/hub-image/65617378.png)

**图：动态内存管理图示 - 堆内**

![](http://oss.powerdata.top/hub-image/03sparkmemeory01.png)

****图：**动态内存管理图示 - 堆外**

![](http://oss.powerdata.top/hub-image/10207094.png)

动态内存管理机制是用来解决静态内存管理机制不够灵活的问题的，它的优点如下：

*   存储内存和执行内存之间的边界不是静态的，在内存压力的情况下，边界会移动，即一个区域会通过从另一个区域借用空间来增长。

*   当应用程序没有缓存和传播时，执行会使用所有内存以避免不必要的磁盘溢出。

*   当应用程序有缓存时，它会保留最小的存储内存，这样数据块就不会受到影响。

*   这种方法为各种工作负载提供了合理的开箱即用性能，而无需用户了解内存如何在内部划分方面的专业知识。

# 深入底层源码

Spark 内存管理相关类都在 spark core 模块的 org.apache.spark.memory 包下。

在 Spark3.0 之前，Spark 有两种内存管理模式，静态内存管理 (Static MemoryManager) 和动态（统一）内存管理（Unified MemoryManager）

![Spark3.0 之前源码模块截图](http://oss.powerdata.top/hub-image/86069469.png)

这个包实现了 Spark 的内存管理系统。该系统由两个主要组件的组成，即 JVM 范围内的内存管理和单个任务的内存管理：

*   MemoryManager：管理 Spark 在 JVM 中的总体内存使用情况。此组件实现了在任务之间划分可用内存以及在存储（缓存和数据传输使用的内存）和执行（计算使用的内存，如混洗、联接、排序和聚合）之间分配内存的策略。

*   TaskMemoryManager：管理各个任务分配的内存。任务与 TaskMemoryManager 交互，从不直接与 JVM 范围的 MemoryManager 进行交互。

在内部，这些组件中的每一个都有额外的内存记账抽象：

*   MemoryConsumer：是 TaskMemoryManager 的客户端，对应于任务中的单个运算符和数据结构。TaskMemoryManager 从 MemoryConsumers 接收内存分配请求，并向使用者发出回调，以便在内存不足时触发溢出。

*   MemoryPool：是 MemoryManager 用来跟踪存储和执行之间的内存分配的记账抽象。

示意图：

![示意图](http://oss.powerdata.top/hub-image/53708413.png)

MemoryManager 有两种实现，它们处理内存池大小的方式各不相同：

*   UnifiedMemoryManager：Spark 1.6 + 中的默认设置强制执行存储和执行内存之间的软边界，允许通过从另一个区域借用内存来满足一个区域中的内存请求。

*   StaticMemoryManager：通过静态划分 Spark 的内存并防止存储和执行相互借用内存，在存储和执行内存之间实施硬边界。仅出于传统兼容性目的保留此模式。

在 Spark3.0 之后，静态内存管理被淘汰了，因此只剩下动态（统一）内存管理（Unified MemoryManager），因此内存管理源码有了较大改动。

![Spark3.0 值之后源码模块截图](http://oss.powerdata.top/hub-image/81611794.png)

*   MemoryConsumer：是 TaskMemoryManager 的客户端，对应于任务中的单个运算符和数据结构。TaskMemoryManager 从 MemoryConsumers 接收内存分配请求，并向使用者发出回调，以便在内存不足时触发溢出。

*   MemoryMode：Spark 的内存类型有两种：堆内和堆外

*   SparkOutOfMemoryError：当任务无法从内存管理器获取内存时，会引发此异常。我们应该使用 throw this 异常，而不是抛出 OutOfMemoryError，这会杀死执行器，这只会杀死当前任务。

*   TaskMemoryManager：管理单个任务分配的内存

*   TooLargePageException：页面过大异常

**本部分仅仅介绍 Memory 包中各模块的功能，详细内容见后续介绍。**

想要加入社区或对本文有任何疑问，可直接添加作者微信交流。

![图：作者微信](http://oss.powerdata.top/hub-image/14688247.png)




我们是由一群数据从业人员，因为热爱凝聚在一起，以开源精神为基础，组成的 PowerData 数据之力社区。