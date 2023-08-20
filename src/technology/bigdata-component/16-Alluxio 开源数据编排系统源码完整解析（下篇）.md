---
title: "Alluxio 开源数据编排系统源码完整解析（下篇）"
date: 2023-07-05 13:01:00
description: "Alluxio 开源数据编排系统源码完整解析（下篇）"
head:
  - - meta
    - name: keywords
      content: 大数据,PowerData
tag: [大数据组件]
order: -16
---

本文转载至PowerData的新朋友Alluxio

___

全文共 7632 个字，建议阅读 30 分钟

    回顾

在《Alluxio-源码解析-上》主要讲述了Alluxio本地环境搭建，源码项目结构，服务进程的启动流程和服务间RPC调用。

本篇将在上篇的基础上，继续为大家讲述Alluxio中重点类详解，Alluxio中Block底层读写流程，Alluxio Client调用流程和 Alluxio内置的轻量级调度框架。

  

Part

1

# 1.重点类讲述

## 1.1 Journaled

Journaled接口定义可被Journaled持久化维护的通用方法，通过**JournalEntryIterable#getJournalEntryIterator获取Journal**元素遍历信息，该接口提供默认checkpoint方法。Journaled接口继承Checkpointed、JournalEntryIterable，定义的方法包括：

-   getJournalEntryIterator：获取Journal所有元素；
    
-   getCheckpointName：获取checkpoint class类名称；
    
-   writeToCheckpoint：持久化写入所有状态的checkpoint；
    
-   restoreFromCheckpoint：checkpoint恢复；
    
-   **processJournalEntry**：处理指定的Journal元素，**Journal处理核心方法**；
    
-   resetState：重置Journal状态；
    
-   applyAndJournal：对Journal元素执行和应用Journal操作。
    

![图片](http://oss.powerdata.top/hub-image/640-230815225513.png)

## 1.2 UnderFileSystem

Alluxio管理和适配数据在底层各个存储系统执行操作，实现UnderFileSystem接口的底层存储可以作为Alluxio的合法UFS。

### 1.2.1. 类图

UnderFileSystem的类图如下所示，主要由抽象类**BaseUnderFileSystem**实现，而BaseUnderFileSystem下主要分为两大类：

-   **ConsistentUnderFileSystem**：具备一致性的UFS实现，主要包括：LocalUnderFileSystem、HdfsUnderFileSystem、CephFSUnderFileSystem等；
    
-   **ObjectUnderFileSystem**：对象存储UFS实现，主要包括：S3AUnderFileSystem、COSUnderFileSystem、OSSUnderFileSystem等。
    

![图片](http://oss.powerdata.top/hub-image/640-169211049583322.png)

### 1.2.2.  接口方法

在UnderFileSystem中有两类接口API：

-   存储系统通用操作，如：创建/删除文件，文件重命名；
    
-   处理数据持久化最终一致性的操作(eventual consistency)，如：解决当AlluxioMaster维护元数据成功时，但执行UFS操作失败的问题。
    

**1.2.2.1. 存储系统操作**

-   create：指定path路径，在UFS中创建数据文件(父目录不存在会自动创建)，可通过CreateOptions设置创建文件的用户组和ACL策略；
    
-   deleteDirectory：删除指定目录，可通过DeleteOptions设置删除的策略和遍历方式；
    
-   deleteFile：删除指定文件；
    
-   getDirectoryStatus：获取UFS指定目录状态，需传入已存在的目录文件；
    
-   getFileStatus：获取UFS指定文件状态；
    
-   getStatus：获取UFS状态，可指定目录或文件；
    
-   isDirectory：判断指定路径在UFS是否是目录；
    
-   open：打开UFS上指定文件，可通过OpenOptions设置文件打开参数；
    
-   renameDirectory：UFS上指定目录重命名；
    
-   renameFile：UFS上指定文件重命名；
    
-   exists：判断指定的文件或目录是否存在；
    
-   getAclPair：获取UFS的ACL策略；
    
-   getBlockSizeByte：获取指定目录下UFS的每个Block文件大小，单位bytes；
    
-   getFileLocations：获取指定路径在UFS关联的存储Location列表；
    
-   getFingerprint：计算并获取指定路径的文件标识(指纹)，文件标识(指纹)的计算必须是确定且不可变的；
    
-   getOperationMode：获取底层UFS的操作模式，Alluxio的底层存储可以由多种类型UFS组成，该方法用来确定底层UFS的操作模式，例子：底层UFS为：hdfs://ns1/,hdfs://ns2/，则返回结果：{hdfs://ns1/:NO\_ACCESS,hdfs://ns2/:READ\_WRITE}；
    
-   getPhysicalStores：获取所有UFS类型，包括数据结构和对应权限
    
-   getSpace：通过制定SpaceType获取UFS中指定路径的存储空间信息，SpaceType包括：SPACE\_TOTAL、SPACE\_FREE、SPACE\_USED；
    
-   getUnderFSType：获取UFS类型，如hdfs；
    
-   isFile：判断文件文件在UFS是否存在；
    
-   isObjectStorage：判断UFS是否是对象存储；
    
-   isSeekable：判断UFS是否支持搜索；
    
-   listStatus：指定UFS路径下的文件状态列表，该列表不保证顺序，可通过ListOptions设置是否支持遍历；
    
-   mkdirs：在UFS上创建指定目录，可通过MkdirsOptions设置目录创建规则，如ACL和递归父目录创建；
    
-   setAclEntries：指定路径，设置UFS的ALC策略集合；
    
-   setMode：指定路径，设置UFS ALC Mode，如0777；
    
-   setOwner：指定路径，设置UFS ALC的user和group；
    
-   supportsFlush：判断UFS是否支持文件Flush；
    
-   supportsActiveSync：判断UFS是否支持ActiveSync(访问内部文件共享)，ActiveSync相关的接口包括：getActiveSyncInfo、startSync、stopSync、startActiveSyncPolling、stopActiveSyncPolling。
    

**1.2.2.2.  最终一致性操作**

-   createNonexistingFile：创建不存在的文件，若文件存在，则退出；
    
-   deleteExistingDirectory：删除指定目录；
    
-   deleteExistingFile：删除指定文件；
    
-   getExistingDirectoryStatus：获取UFS指定目录状态；
    
-   getExistingFileStatus：获取UFS指定文件状态；
    
-   getExistingStatus：获取UFS状态，可指定目录或文件；
    
-   isExistingDirectory：判断指定路径在UFS是否是目录；
    
-   openExistingFile：打开UFS上指定文件，可通过OpenOptions设置文件打开参数；
    
-   renameRenamableDirectory：UFS上指定目录重命名；
    
-   renameRenamableFile：UFS上指定文件重命名。
    

**1.2.2.3. 其他操作**

-   cleanup：当数据文件创建时没有正常的成功结束或被抛弃处理，则对底层UFS清理；
    
-   connectFromMaster：指定AlluxioMaster主机地址，建立指定Master与UFS连接；
    
-   connectFromWorker：指定AlluxioWorker主机地址，建立指定Worker与UFS连接；
    
-   resolveUri：给定Alluxio基础URI和路径，返回拼装后的Alluxio路径。
    

## 1.3 UfsManager

Alluxio中对底层**UFS**(Under FileSystem)管理操作的通用统一接口类定义，定义的接口方法包括：

-   addMount：UFS挂载到Alluxio，该方法仅针对Alluxio处理，不对底层UFS操作；
    
-   removeMount：移除Alluxio中的UFS挂载；
    
-   get：根据mountId获取挂载的UFS信息；
    
-   getRoot：获取Alluxio上挂载的根目录信息；
    
-   getJournal：获取Journal的Location地址；
    

其中AbstractUfsManager抽象类对UFS管理接口进行基本实现。

![图片](http://oss.powerdata.top/hub-image/640-169211049890625.png)

### 1.3.1. UfsClient

维护底层UFS的Client连接信息和其他相关UFS的描述信息，基于UfsClient实现Alluxio对UnderFileSystem的操作。

![图片](http://oss.powerdata.top/hub-image/640-169211050581128.png)

## 1.4 BlockClient

**BlockClient抽象类定义调用方对Block基本的读写操作**，其类图示意如下，主要包括：**BlockWriter、BlockReader**。

![图片](http://oss.powerdata.top/hub-image/640-169211050799531.png)

读写Block的定义的方法类：

![图片](http://oss.powerdata.top/hub-image/640-169211050992834.png)

## 1.5 DefaultFileSystemMaster

Master服务维护所有FileSystem(文件系统)元数据变更的管理操作，DefaultFileSystemMaster内部基于InodeTree维护文件系统结构，并将**InodeTree**持久化到日志文件(journal)；除此之外，其内部维护多个管理操作，如：InodeLockManager、MasterUfsManager、MountTable等；

**备注**：DefaultFil1.5.  DefaultFileSystemMastereSystemMaster的启动start方法详情前面所述内容。

### 1.5.1. 接口方法  


FileSystemMaster接口定义master中针对FS的操作方法，DefaultFileSystemMaster继承FileSystemMaster，其接口方法主要包括：

-   cleanupUfs：周期性清理底层UFS；
    
-   getFileId：基于Alluxio路径URI 获取文件ID，若文件不缓存Alluxio，则调用UFS获取；
    
-   getFileInfo：根据文件ID获取文件详情，该接口仅对内部服务开放，不对用户直接开放；
    
-   getPersistenceState：根据文件ID，获取该文件的持久化状态；
    
-   listStatus：指定Alluxio路径，获取文件状态列表；
    
-   checkAccess：校验指定Alluxio路径的权限；
    
-   checkConsistency：校验指定Alluxio路径的文件数据一致性；
    
-   completeFile：关闭/结束指定Alluxio路径，关闭后，则该文件不可写；
    
-   createFile：基于指定Alluxio文件路径，创建文件FileInfo；
    
-   getNewBlockIdForFile：指定Alluxio文件路径，获取下个待操作Block文件的Block ID；
    
-   getMountPointInfoSummary：获取Alluxio中mount(挂载)路径的快照信息；
    
-   getDisplayMountPointInfo：获取Alluxio用户展示的Mount信息；
    
-   delete：删除指定Alluxio路径的文件元信息；
    
-   getFileBlockInfoList：获取指定Alluxio路径下的所有Block列表信息；
    
-   getInAlluxioFiles：获取Alluxio中所有的文件列表路径；
    
-   getInMemoryFiles：获取Alluxio中所有缓存在内存的文件列表路径；
    
-   createDirectory：创建Alluxio对应的目录，并返回目录ID；
    
-   rename：Alluxio中文件重命名操作的元数据变更；
    
-   free：指定Alluxio目录下，释放所有alluxio缓存的block文件信息，支持目录下遍历的文件释放；
    
-   getPath：根据指定FileId获取Alluxio URI路径；
    
-   getPinIdList：获取被固定的inode id列表；
    
-   getUfsAddress：获取master所需的UFS地址；
    
-   getUfsInfo：根据挂载ID获取对应UFS信息；
    
-   getLostFiles：获取worker节点丢失的文件列表；
    
-   mount：核心操作，将UFS路径挂载在Alluxio指定路径；
    
-   unmount：取消指定Alluxio路径上的UFS挂载；
    
-   updateMount：更新指定Alluxio路径挂载信息；
    
-   setAcl：设置Alluxio路径ACL；
    
-   updateUfsMode：设置底层UFS Mode；
    
-   validateInodeBlocks：验证inode block信息是否具备完整性；
    
-   workerHeartbeat：指定worker ID，通知对应worker进行文件的存储持久化；
    
-   getWorkerInfoList：获取所有worker节点信息列表；
    
-   getTimeSeries：获取alluxio master中元数据存储的时间版本信息；
    

## 1.6 DefaultBlockWorker

### 1.6.1. 接口

Worker Server针对Block的管理操作，实现接口类：**BlockWorker**，其接口方法主要包括：

-   getWorkerId：获取worker id；
    
-   abortBlock：丢弃session中临时创建的block文件；
    
-   accessBlock：访问指定session和block id下的block信息，该方法可能会在block缓存释放被访问；
    
-   commitBlock：提交block到Alluxio的管理空间，待提交的block必须是临时的，当block提交成功之前，block是不支持读写访问；
    
-   commitBlockInUfs：将block提交到UFS持久化；
    
-   createBlock：在Alluxio管理空间创建block，基于BlockWriter类可对block进行写操作，在block commit提交之前都是临时的；
    
-   getTempBlockMeta：获取临时block元数据；
    
-   createBlockWriter：基于session和block id创建BlockWriter，用于block的写操作；
    
-   getReport：获取worker与master周期性心跳的报告；
    
-   getStoreMeta：获取整个block存储的元数据信息，包括block中每个存储目录映射和每层存储的容量情况；
    
-   getStoreMetaFull：与getStoreMeta相似，但包括完整的blockId列表，获取代价更高；
    
-   getVolatileBlockMeta：根据指定blockId获取block元数据信息；
    
-   lockBlock：对block进行加锁操作；
    
-   moveBlock：将block从当前存储Location移动到目标Location；当前仅支持分层存储移动；
    
-   moveBlockToMedium：block移动并指定对应的存储介质类型(MediumType)；
    
-   createBlockReader：创建BlockReader进行Block读操作，可读取Alluxio Block和 UFS Block；
    
-   createUfsBlockReader：创建BlockReader进行UFS Block读操作；
    
-   removeBlock：从Allxuio管理空间移除Block；
    
-   requestSpace：为指定block获取存储空间，该block必须为临时block；
    
-   unlockBlock：对block去除锁操作；
    
-   asyncCache：提交异步缓存请求进行异步的缓存管理；
    
-   updatePinList：更新底层block存储占用的pin列表；
    
-   getFileInfo：基于指定file id获取文件信息。
    

### 1.6.2. TieredBlockStore

**BlockStore**定义block的存储接口，用于管理本地block存储，其接口核心目的：具体实现**BlockWorker**中定义的方法类，接口如下：

![图片](http://oss.powerdata.top/hub-image/640-169211051336137.png)

**TieredBlockStore**是BlockStore的实现类，实现了Alluxio中核心功能点：分层存储，使得对应的存储对象可基于block形式进行分层存储管理，并对外暴露提供API进行block管理。**TieredBlockStore**中内置分配算法确定新block的存取和旧block的释放，基于**BlockMetadataManager**维护分层存储状态、block读写锁管理等元数据信息。

**TieredBlockStore**是线程安全的，所有基于block级别的操作都需要调用**BlockLockManager**来获取对应的读写锁，保证该block下的元数据操作和I/O操作是线程安全的。任何block的元数据操作都需要基于**BlockMetadataManager**来获取元数据的**ReentrantReadWriteLock** 读写锁。

Allocator接口定义Alluxio中数据管理的分配策略，接口方法：allocateBlockWithView，目前内部有三种实现类：

-   RoundRobinAllocator：基于round-robin轮训分配，默认从最高层开始分配，当最高层存储空间不足则会到下一层，该分配策略不支持指定存储具体的分层。
    
-   MaxFreeAllocator：分配到存储中最大剩余空间，当没有指定具体存储分层，默认从最高层开始分配；
    
-   GreedyAllocator：返回满足存储block大小的第一层存储空间，是存储分配的示例类；
    

其中**BlockStoreLocation定义**存储block的location地址和分层信息，描述了三个存储维度：存储层别名、对应存储层目录地址，存储层介质信息。

**1.6.2.1. createBlock**

当存在可用空间(space)时，基于block分配算法创建临时block；特别的：创建block不会触发其他block的销毁释放，通过**BlockMetadataAllocatorView** 获取只读的Block元数据信息，为**Allocator**调度提供数据来源，**Allocator**分配调度后返回**StorageDirView**对象并创建**TempBlockMeta** 并通过**BlockMetadataManager**管理。存储分配后的元数据会基于createBlockFile方法持久化到Block元文件。

![图片](http://oss.powerdata.top/hub-image/640-169211051613140.png)

**Allocator**接口定义Alluxio中数据管理的分配策略，接口方法：allocateBlockWithView，目前内部有三种实现类：

-   RoundRobinAllocator：基于round-robin轮询分配，默认从最高层开始分配，当最高层存储空间不足则会到下一层，该分配策略不支持指定存储具体的分层。
    
-   MaxFreeAllocator：分配到存储中最大剩余空间，当没有指定具体存储分层，默认从最高层开始分配;
    
-   GreedyAllocator：返回满足存储block大小的第一层存储空间，是存储分配的示例类；
    

其中**BlockStoreLocation**定义存储block的location地址和分层信息，描述了三个存储维度：存储层别名、对应存储层目录地址，存储层介质信息。

**1.6.2.2.  freeSpace**

同步方法执行Block缓存存储空间执行立刻删除释放，当所有存储分层的空间释放操作结束后才能支持新Block创建。根据**BlockMetadataEvictorView** 获取Block存储中可移除的Block信息。判断当前缓存存储中是否满足最小连续空间和最小可用空间，若同时满足，则不进行后续空间清理操作；若不满足，则遍历Block信息，判断是否可清理，若可以清理，则删除对应的Block文件及元数据，通过**BlockStoreEventListener**事件监听器同步Block释放操作。

![图片](http://oss.powerdata.top/hub-image/640-169211051847543.png)

**BlockStoreEventListener** 监听BlockStore中元数据变化成功结束的触发事件，主要包括的接口方法类：

-   onAccessBlock：访问Block 事件触发；
    
-   onAbortBlock：清理和释放临时Block 事件触发；
    
-   onCommitBlock：提交临时Block并关联Block的存储信息BlockStoreLocation 事件触发；
    
-   onMoveBlockByClient：基于Client移动Block的BlockStoreLocation 事件触发；
    
-   onMoveBlockByWorker：基于Worker移动Block的BlockStoreLocation 事件触发；
    
-   onRemoveBlockByClient：基于Client移除并释放Block的BlockStoreLocation 事件触发；
    
-   onRemoveBlock：移除并释放Block 事件触发；
    
-   onBlockLost：Block丢失 事件触发；
    
-   onStorageLost：存储目录丢失 事件触发。
    

![图片](http://oss.powerdata.top/hub-image/640-169211052105046.png)

## 1.7 PlanDefinition

Alluxio中内置轻量级角度系统的Job执行计划定义，有两个核心部分，1. PlanDefinition#**selectExecutors**：该方法在Master节点调用，用于选择执行任务的AlluxioJobWorker，2.PlanDefinition#**runTask**：在JobWorker中运行指定作业计划。PlanDefinition 主要包括的作业定义实现有：

MoveDefinition：在FileSystemMaster校验层级上触发Block的移动操作；

-   ReplicateDefinition：在FileSystemMaster校验层级上触发Block的复制操作；
    
-   EvictDefinition：在FileSystemMaster校验层级上触发Block释放操作；
    
-   PersistDefinition：将Alluxio Block缓存存储持久化到底层UFS；
    
-   CompactDefinition：在指定目录下降结构化表的数据文件进行压缩；
    
-   MigrateDefinition：Block移动，源和目标Block可以挂载在不同的UFS节点；
    
-   LoadDefinition：实现简单的Block文件的Load操作。
    

![图片](http://oss.powerdata.top/hub-image/640-169211052347349.png)

### 1.7.1. TaskExecutorManager

管理JobWorker Task执行器，真正的执行任务通过线程池调用**TaskExecutor#run**，而TaskExecutor#run底层通过**PlanDefinition#runTask** 实现；同时TaskExecutorManager内部也管理Task的执行容量和Task生命周期管理，如：获取执行的线程池，对任务执行限流/解除限流，任务启停。

![图片](http://oss.powerdata.top/hub-image/640-169211052512352.png)

Part 2

# 2.Block读写操作

## 2.1 读操作

BlockWorker RPC服务提供的客户端的读操作，大致流程如下：

-   BlockWorkerClientServiceHandler.readBlock方法定义Block读取，默认创建请求参数StreamObserverresponseObserver 创建 CallStreamObserver；若支持零拷贝，则使用DataMessageServerStreamObserver
    
-   基于CallStreamObserver 创建BlockReadHandler，并调用BlockReadHandler#onReady 开启数据读取，基于线程池提交创建DataReader线程执行；
    
-   DataReader是Alluxio用于I/O数据读取的线程类，封装了核心的Alluxio读操作逻辑，(1).获取Alluxio数据输入流DataBuffer；(2)调用CallStreamObserver.onNext触发和监听数据流读取；
    
-   DataReader获取DataBuffer是整个读取处理的核心逻辑，判断数据读取来源：Local、UFS，是否进行Block移动实现短路读；
    
    \- 创建打开Block，若请求需要加速(promote=true)则操作BlockWorker.moveBlock，将Block移动到存储更高层；
    
    \- 调用DefaultBlockWorker#createBlockReader 创建BlockReader，判断本地Worker是否可以直接访问，若支持则返回LocalFileBlockReader；若为UFS中，则调用**UnderFileSystemBlockReader**；
    
    \- 调用BlockReader.transferTo 读取数据，并将I/O封装为NettyDataBuffer返回。
    

![图片](http://oss.powerdata.top/hub-image/640-169211052780855.png)

### 2.1.1. UnderFileSystemBlockReader

UnderFileSystemBlockReader 类实现直接从UFS读取并将读取的信息缓存到读取的Worker Block中，大致流程如下：

-   UfsInputStreamCache.acquire 根据ufs、路径、blockId获取输入流InputStream，若InputStream在缓存中直接获取，若不存在，则根据ufs.openExistingFile 获取底层UFS的文件输入流InputStream；
    
-   获取并更新BlockWriter，判断是否存在有对应Block存在，不存在则调用BlockStore.createBlock新建临时Block，并返回对应BlockWriter；
    
-   根据第一步骤获取的输入流InputStream和参数offset读取文件，读取的数据：(1).通过BlockWriter写入Block缓存对应Worker；(2).返回调用方读取信息。
    

![图片](http://oss.powerdata.top/hub-image/640-169211053002858.png)

**备注：**

-   LocalFileBlockReader：基于FileChannel.map方法的I/O操作读取文本文件信息
    
-   RemoteBlockReader：基于远端的Worker(非本地Worker)读取，暂不支持；
    
-   DelegatingBlockReader根据不同的使用场景，判断和选择使用的BlockReader实现类。
    

**2.1.2. ShortCircuitBlockReadHandler**

ShortCircuitBlockReadHandler类是RPC服务实现提供短路读能力，首先Grpc的StreamObserver(观察者模式)，一次onNext调用说明一次消息读取，大致的执行流程：

-   根据OpenLocalBlockRequest获取是否进行加速读取，若加速(promote=true)则调用BlockWorker.moveBlock将存储移动更高层存储分层；
    
-   调用BlockWorker.lockBlock 获取Block的读写操作锁，最后BlockWorker.accessBlock获取访问Block
    

## 2.2 写操作

BlockWorker RPC服务提供的客户端的写操作，大致流程如下：

-   BlockWorkerClientServiceHandler.writeBlock方法定义Block写入，默认创建请求参数StreamObserverresponseObserver 创建 CallStreamObserver；若支持零拷贝，则使用  BlockWorkerClientServiceHandler；
    
-   基于CallStreamObserver 创建DelegationWriteHandler，并调用DelegationWriteHandler#onCancel关闭数据写操作；调用onNext方法进行数据流监听写操作；
    
-   DelegationWriteHandler 根据请求Command类型获取对应的**AbstractWriteHandler** 实现类：
    
    \- ALLUXIO\_BLOCK：**BlockWriteHandler**，数据仅写入Alluxio Block，基于BlockWriter实现写操作；
    
    \- UFS\_FILE：**UfsFileWriteHandler**，数据仅写入UFS，基于UFS Client创建目录文件并进行I/O操作；
    
    \- UFS\_FALLBACK\_BLOCK：**UfsFallbackBlockWriteHandler**，先基于BlockWriteHandler写入Alluxio Block再写入UFS；
    

![图片](http://oss.powerdata.top/hub-image/640-169211053250861.png)

AbstractWriteHandler 抽象类关系如下：

![图片](http://oss.powerdata.top/hub-image/640-169211053456964.png)

### 2.2.1.  LocalFileBlockWriter

基于本地Worker写入Block文件信息，调用FileChannel.map

### 2.2.2.  ShortCircuitBlockWriteHandler

ShortCircuitBlockWriterHandler实现短路读的创建本地Block能力，基于onNext调用，大致执行流程：

-   若仅申请空间资源，则基于BlockWorker.requestSpace 获取Block创建的请求空间资源；
    
-   若需创建临时Block，则调用BlockWorker.createBlock创建Block并返回对应Block路径。
    

Part 3

# 3.Catalog管理

AlluxioCatalog进行Alluxio中Catalog管理对象，封装和维护了Alluxio中注册的DB信息及各个DB下的Table等元数据信息，其基本的方法操作如下，包括：获取数据库db信息，db元数据同步，db绑定/解绑等操作。

![图片](http://oss.powerdata.top/hub-image/640-169211053688367.png)

-   attachDatabase：将绑定的db元数据信息维护在内存中并同步持久化到Journal中；
    
-   syncDatabase：会基于底层udb获取最新元数据database信息，如Hive则调用HMS客户端接口方法IMetaStoreClient#getDatabase获取数据库信息。
    

Part 4

# 4.Client操作

## 4.1 Client

**Client接口**抽象定义Alluxio中Client操作，其继承和实现类如下所示，**封装了对接各个组件的RPC接口**：

-   FileSystemMasterClient：封装 FileSystemMasterClientServiceHandler 相关RPC调用，进行元数据管理操作
    
-   BlockMasterClient：封装 BlockMasterClientServiceHandler相关RPC调用，进行Block管理操作
    
-   TableMasterClient：封装 TableMasterClientServiceHandler 相关RPC调用，进行Alluxio Table Catalog管理操作
    
-   MetaMasterClient：封装 MetaMasterClientServiceHandler 相关RPC调用
    
-   MetaMasterConfigClient：封装 MetaMasterConfigurationServiceHandler 相关RPC调用
    
-   JobMasterClient：封装JobMasterClientServiceHandler 相关RPC调用，进行Alluxio Job的调用操作；
    

![图片](http://oss.powerdata.top/hub-image/640-169211053937570.png)

### 4.1.1. FileSystem

**Client**中定义的**文件系统操作接口类**，用于元数据管理和数据管理，用户可根据其实现类**BaseFileSystem** 扩展Client文件操作行为。

![图片](http://oss.powerdata.top/hub-image/640-169211054092473.png)

FileSystem 中定义的接口方法主要包括以下几类：

-   checkAccess：检查指定路径权限；
    
-   createDirectory：基于AlluxioURI 创建文件目录；
    
-   createFile：基于AlluxioURI 创建数据文件；
    
-   delete：基于AlluxioURI 删除指定文件/目录；
    
-   exists：基于AlluxioURI判断指定文件/目录是否存在；
    
-   free：基于AlluxioURI 释放Alluxio空间，但不删除UFS数据文件了；
    
-   listStatus：列出AlluxioURI文件/目录信息；
    
-   **mount/updateMount/unmount**：挂载/更新/取消挂载指定AlluxioURI目录；
    
-   openFile：打开并读取AlluxioURI文件输入流；
    
-   persist：将Alluxio中缓存的数据异步持久化底层UFS；
    
-   rename：Alluxio文件重命名。
    

### 4.1.2. FileSystemContext

维护Alluxio基于Client进行文件系统操作的上下文信息，通常的，一个Client JVM进程会使用同个FileSystem连接Alluxio，因此Client对象会在不同线程中共享。FileSystemContext 只有当用户需要个性化配置和认证时才被创建，线程共享的Client会针对FileSystemContext维护独立的线程空间，FileSystemContext 线程不共享(线程安全)会增加Client连接的资源使用，因此当用户停止Alluxio操作后，需要关闭FileSystemContext释放资源。

### 4.1.3. FileInStream/FileOutStream

Client中定义基于Alluxio文件操作的输入/输出流，如下所示：

-   输出流：AlluxioFileOutStream，Alluxio输出流写入，底层操作**BlockOutStream**
    
-   输入流：AlluxioFileInStream：Alluxio输入流读取，封装了本地/远端节点数据读取，或者直接基于底层UFS；底层操作**BlockInStream**，LocalCacheFileInStream，AlluxioHdfsInputStream
    

![图片](http://oss.powerdata.top/hub-image/640-169211054336676.png)

## 4.2 AbstractShell

Client的功能可以通过Shell对外提供操作，AbstractShell抽象类定义Alluxio中Shell命令操作，其继承子类包括：

-   FileSystemShell：Alluxio Shell文件操作入口类；
    
-   FileSystemAdminShell：Alluxio文件系统管理操作；
    
-   CollectInfo：Alluxio中从所有Woker节点采集信息命令；
    
-   TableShell：Alluxio表管理操作；
    
-   JobShell：Alluxio执行job管理操作。
    

![图片](http://oss.powerdata.top/hub-image/640-169211054530879.png)

### 4.2.1. CatCommand

以CatCommand为例，简述Alluxio Client进行文件读取的大致流程如：

-   FileSystemShell接收shell命令，执行"cat"打开文件操作，调用CatCommand.run命令，shell命令支持正则和多目录，对每个指定目录执行自定义实现的runPlainPath操作；
    
-   CatCommand#runPlainPath 方法通过getStatus判断文件类型，若为目录则退出，若为文件则基于FileSystem打开文件获取客户端输入流对象FileInStream(AlluxioFileInStream)；
    
-   基于AlluxioFileInStream#read读取文件内容，**URIStatus**维护Alluxio中目录和文件元数据快照信息，基于URIStatus获取指定Alluxio文件对应Block信息，通过Client **AlluxioBlockStore**中维护的Block信息获取BlockInStream(Block输入流)；
    
-   基于BlockInStream调用输入流读取操作，底层基于Block的数据读取接口**DataReader**实现，基于DataReader读取Block详情下述的Block读操作。
    

![图片](http://oss.powerdata.top/hub-image/640-169211054724482.png)

### 4.2.2. TouchCommand

以TouchCommand为例，简述Alluxio Client进行文件写入的大致流程如：

-   FileSystemShell接收shell命令，执行"touch"打开文件操作，调用TouchCommand.run命令，shell命令支持正则和多目录，对每个指定目录执行自定义实现的runPlainPath操作；
    
-   TouchCommand#runPlainPath 方法调用**FileSystem.createFile** 创建文件并在结束后关闭该连接；
    
-   **FileSystem.createFile**的方法详解如下：
    
    \- 基于FileSystemMasterClient获取FileSystemMasterClientServiceHandler 远程的RPC连接信息；
    
    \- 基于FileSystemMasterClient 调用RPC接口创建数据文件(createFile)，将新建Alluxio文件元数据信息同步Alluxio Master；
    
    \- FileSystem新建Client端的Alluxio文件输出流对象：AlluxioFileOutStream，其底层调用Block的DataWriter对象进行文件处理；
    
    \- 输出流完成后，执行AlluxioFileOutStream#close方法，调用FileSystemMasterClient#completeFile 判断是否已执行完成，最终基于RPC接口实现completeFile；
    

![图片](http://oss.powerdata.top/hub-image/640-169211054960885.png)

Part 5

# 5轻量级调度

Alluxio内部基于AlluxioJobMaster和AlluxioJobWoker实现轻量级内置的Alluxio操作调度，Master负责作业的调度管理，而Worker真正执行作业操作。

## 5.1 调度管理

由前文AlluxioJobMaster启动流程可知，AlluxioJobMaster在启动时会触发JobMaster Server启动，JobMaster内部维护执行计划(plan)的管理追踪器：**PlanTracker**，用于创建、移除、访问任务作业集合，每个作业都有对应的**PlanCoordinator**用于分布式作业执行协调。外部服务可通过HTTP和RPC方式调用**JobMaster.run** 方法根据作业配置(**JobConfig**)启动并进行作业调度(同步/线程安全的)。JobConfig 定义作业配置接口，分为两类：PlanConfig(单作业执行)、WorkflowConfig(一组作业流执行)。

JobMaster中作业调度管理的大致流程如下：

-   外部接口可调用JobMaster.run方法触发作业执行，以Plan作业类型为例，调用PlanTracker执行run方法；
    
-   PlanTracker先校验并移除已完成的作业，并基于PlanCoordinator创建新的作业实例并启动该作业实例；
    
-   PlanCoordinator作业启动流程：
    
    \- 基于JobConfig获取对应的PlanDefinition；
    
    \- 根据可用的Worker列表和PlanDefinition，调用selectExecutors方法获取待执行作业Worker列表；
    
    \- 调用CommandManager提交作业，将作业及待执行作业worker列表信息维护在内存队列中；
    
-   最后，Job Master和Job Worker节点通过RPC心跳检测，下发具体的作业信息给Worker执行。
    

![图片](http://oss.powerdata.top/hub-image/640-169211055245388.png)

## 5.2 作业执行

由前文AlluxioJobWorker启动流程可知，AlluxioJobWorker启动时会触发心跳检测线程**CommandHandlingExecutor**，对接收到的作业执行调度处理，每个作业启动一个线程执行，作业执行大致流程如下：

-   CommandHandlingExecutor线程启动与JobMaster进行心跳检测，基于JobMasterClient.heartbeat方法获取所有的待执行作业列表；
    
-   遍历待执行作业列表，从线程池调用CommandHandler.run线程类执行作业调度，包括的作业类型：启动、取消、注册作业；
    
-   CommandHandler启动作业会调用TaskExecutorManager 执行作业，以Future执行TaskExecutor 进行线程级别作业调度；
    
-   TaskExecutor真正执行作业调度：
    
    \- 对应作业参数进行反序列化操作；
    
    \- 根据PlanDefinitionRegistry 获取执行Job的PlanDefinition并调动runTask执行作业；
    

![图片](http://oss.powerdata.top/hub-image/640-169211055546891.png)

以**PersistDefinition**为例，大致说明Job Executor操作，将Alluxio Block存储持久化到底层UFS：

-   获取Alluxio的数据存储URI，读取对应的数据输入流in；
    
-   获取指定的UFS目标路径，根据UfsClient判断该路径是否存在，若不存在则创建，并基于UnderFileSystem创建输出流out；
    
-   根据I/O操作工具类，将数据从数据流拷贝输出流，持久化到UFS。