---
title: "Alluxio 开源数据编排系统源码完整解析（上篇）"
date: 2023-07-04 08:52:00
description: "Alluxio 开源数据编排系统源码完整解析（上篇）"
head:
  - - meta
    - name: keywords
      content: 大数据,PowerData
tag: [大数据组件]
order: -15
---

本文转载至PowerData的新朋友Alluxio，内容为Allxuio源码解析【上篇】

___

全文共 2607 个字，建议阅读 12 分钟

Part 1

# 1.前言

目前数据湖已成为大数据领域的最新热门话题之一，而什么是数据湖，每家数据平台和云厂商都有自己的解读。整体来看，数据湖主要的能力优势是：集中式存储原始的、海量的、多来源的、多类型的数据，支持数据的快速加工及计算。相比于传统的数据仓库，数据湖对数据有更大的包容性，支持结构化/半结构化/非结构化数据，能快速进行数据的落地和数据价值发掘。数据湖的技术体系可以分为三个子领域：数据湖存储、数据湖计算、数据湖统一元数据。  

数据湖存储提供海量异构数据的存储能力，支持多类型的底层存储系统，如分布式存储 HDFS、对象存储 AWS S3、腾讯云对象存储 COS 等，除此之外，在数据湖场景中计算和存储分离，使得计算的数据本地性不复存在。因此有必要在数据湖存储和计算之间引入统一的数据缓存层。


Alluxio是一款基于云原生开源的**数据编排技术**，为数据计算与数据存储构建了桥梁，支持将数据从原始存储层移动到**加速计算的****虚拟分布式存储系统**。Alluxio可为数据湖计算提供统一的数据湖存储访问入口，支持跨不同类型的底层存储并抽象出统一的数据访问命名空间，提供数据本地性、数据可访问性、数据伸缩性。


本文将对 Alluxio 底层源码进行简要分析，分上下两篇：主要包括本地环境搭建，源码项目结构，服务进程的启动流程，服务间RPC调用，Alluxio 中重点类详解，Alluxio 中 Block 底层读写流程，Alluxio Client调用流程和 Alluxio 内置的轻量级调度框架。

Part 2

环境准备

## 2.1 本地部署

从官方下载安装版本(下载地址)，以2.6.0安装为例，下载后解压安装包：

1    tar -zxvf alluxio-2.6.0-bin.tar.gz

修改基本的配置文件，(1). 修改alluxio-site.properties，设置master地址，设置默认Alluxio root挂载点：

1    cp conf/alluxio-site.properties.template  alluxio-site.properties

2    #放开注释：

3    alluxio.master.hostname=127.0.0.1

4    alluxio.master.mount.table.root.ufs=${alluxio.work.dir}/underFSStorage

(2). 修改masters、workers配置对应ip，本地安装，可都设置为127.0.0.1

1    vi conf/masters

2    vi conf/workers

修改完配置后，准备启动Alluxio服务，执行如下命令操作：

1    \# mount对应磁盘

2    bin/alluxio-mount.sh Mount workers

3    \# 进行环境校验

4    bin/alluxio validateEnv master

5    bin/alluxio validateEnv worker

服务启动命令操作，对于所有服务操作包括：master、worker、job\_master、job\_worker、proxy

1    \# 启动所有服务

2    bin/alluxio-start.sh all

3    \# 停止所有服务

4    bin/alluxio-stop.sh all  
5

6    \# 启动单个服务

7    bin/alluxio-start.sh -a master

8    bin/alluxio-start.sh -a worker

9    bin/alluxio-start.sh -a job\_master

10  bin/alluxio-start.sh -a job\_worker

11  bin/alluxio-start.sh -a proxy

启动后服务成功，也可通过JPS查看Java进程：AlluxioMaster、AlluxioWorker、AlluxioJobMaster、AlluxioJobWorker、AlluxioProxy。

![图片](http://oss.powerdata.top/hub-image/640-231815225339.jpeg)

-   http://localhost:19999，页面查看alluxio master ui界面，默认端口：19999
    
-   http://localhost:30000，页面查看alluxio worker ui界面，默认端口：30000
    

![图片](http://oss.powerdata.top/hub-image/640-16921104615555.jpeg)

## 2.2 IDEA调试

源码编译可参考官方说明文档：Building Alluxio From Source

1    mvn clean install -DskipTests

2    \# 加速编译

3    mvn -T 2C clean install -DskipTests -Dmaven.javadoc.skip -Dfindbugs.skip -Dcheckstyle.skip -Dlicense.skip -Dskip.protoc

通过IDEA启动Alluxio各个服务进程，其核心启动类包括：  

-   **AlluxioMaster**：Main函数入口，设置启动运行VM Options，alluxio.logger.type=MASTER\_LOGGER，RPC端口：19998，Web端口：19999；
    
-   **AlluxioJobMaster**：Main函数入口，设置启动运行VM Options，alluxio.logger.type=JOB\_MASTER\_LOGGER
    
-   **AlluxioWorker**：Main函数入口，设置启动运行VM Options，alluxio.logger.type=WORKER\_LOGGER，
    
-   **AlluxioJobWorker**：Main函数入口，设置启动运行VM Options，alluxio.logger.type=JOB\_WORKER\_LOGGER
    
-   **AlluxioProxy**：Main函数入口，设置启动运行VM Options，alluxio.logger.type=PROXY\_LOGGER
    

VM Options参数示例如下：

1    \-Dalluxio.home=/code/git/java/alluxio -Dalluxio.conf.dir=/code/git/java/alluxio/conf -Dalluxio.logs.dir=/code/git/java/alluxio/logs -Dlog4j.configuration=file:/code/git/java/alluxio/conf/log4j.properties -Dorg.apache.jasper.compiler.disablejsr199=true -Djava.net.preferIPv4Stack=true -Dalluxio.logger.type=MASTER\_LOGGER -Xmx2g -XX:MaxDirectMemorySize=516M

操作示例如下：

![图片](http://oss.powerdata.top/hub-image/640-16921104664778.jpeg)

在项目根目录 logs下可查看服务启动的日志文件：

![图片](http://oss.powerdata.top/hub-image/640-169211046891211.jpeg)

DEBUG远程调试，在alluxio-env.sh 配置环境变量，可增加如下配置属性

1    export ALLUXIO\_WORKER\_JAVA\_OPTS="$ALLUXIO\_JAVA\_OPTS -agentlib:jdwp=transport=dt\_socket,server=y,suspend=n,address=6606"

2    export ALLUXIO\_MASTER\_JAVA\_OPTS="$ALLUXIO\_JAVA\_OPTS -agentlib:jdwp=transport=dt\_socket,server=y,suspend=n,address=6607"

3    export ALLUXIO\_USER\_DEBUG\_JAVA\_OPTS="-agentlib:jdwp=transport=dt\_socket,server=y,suspend=y,address=6609"

如下图所示，增加远程的监控端口，监控Alluxio Worker 6606：

![图片](http://oss.powerdata.top/hub-image/640-169211047176114.jpeg)

调用Alluxio Shell命令时开启DEBUG的输出，使用参数：**\-debug**，示例如下：

1    bin/alluxio fs -debug ls /

Part 3

# 3.项目结构

Alluxio源码的项目结构可简化如下几个核心模块：  

-   alluxio-core：实现Alluxio系统的核心模块，其中alluxio-core-server内实现Alluxio Master、Alluxio Worker、Alluxio Proxy；alluxio-core-client定义Alluxio Clien操作；alluxio-core-transport 实现服务间RPC通信；
    
-   alluxio-job：Alluxio内部轻量级作业调度实现，alluxio-job-server内实现 Alluxio Job Master、Alluxio Job Worker；
    
-   alluxio-underfs：适配对接不同的底层存储，如hdfs、cephfs、local、s3等；
    
-   alluxio-table：实现Alluxio Catalog功能，基于table引擎读取元数据并支持关联Alluxio存储，目前catalog的底层UDB支持hive metastore和aws glue catalog；
    
-   alluxio-shell：封装Alluxio shell工具；
    

![图片](http://oss.powerdata.top/hub-image/640-169211047619817.jpeg)

Part 4

# 4.服务进程

Alluxio服务内部的5个核心进程：AlluxioMaster、AlluxioWorker、AlluxioProxy、AlluxioJobMaster、AlluxioJobWorker 都是基于**Process**(进程)接口类扩展实现的，定义组件进程的生命周期管理操作。


类图实现继承关系如下所示：

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

## 4.1 AlluxioMaster 

### 4.1.1. 启动流程

-   基于JournalSystem维护Master元数据持久化信息，便于服务宕机后，从最新的Journal File恢复，详见Journal Management；
    
-   进行AlluxioMaster选举，Master选举支持两种方式：ZK、Raft(RaftJournalSystem)；
    
-   基于ProcessUtils进行进程启停管理触发，执行**AlluxioMasterProcess** 启动
    
    \- JournalSystem 启动/设置主要执行模式(gainPrimacy)
    
    \- AlluxioMasterProcess#startMasters：**启动所有Master相关服务**，包括block master、FileSystem master等；若是leader，则调用BackupManager#initFromBackup初始化所有注册**master server**组件，若不是leader则仅启动Master的RPC/UI服务
    
    \- AlluxioMasterProcess#startServing：启动指标相关服务，包括Web、JVM、RPC相关的指标；
    


启动时序图简化如下所示：

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

### 4.1.2. Server接口类


**特别的**，初始化并启动的**Ser****ver接口类**组件，主要包括**Master**类和**Worker**类，Server会从**线程池获取线程**，启动执行各个Server定义的操作，server中定义服务线程的生命周期操作，定义的接口方法如下：  

-   getName：获取该Server名称；
    
-   getDependencies：该Server依赖的其他前置Server；
    
-   getServices：获取Server定义的GrpcService集合；
    
-   start：Server启动；
    
-   stop：Server停止；
    
-   close：Server关闭；
    

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

### 4.1.3. Master Server


定义Master组件中封装的各个线程Server服务，包括Block元数据管理，文件系统管理等，其细化类图如下所示：

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

**4.1.3.1. DefaultFileSystemMaster**


Alluxio Master处理系统中所有文件系统元数据管理的Server服务，基于DefaultFileSystemMaster可对文件执行Lock(加锁)操作，为了对任意inode进行读写操作，需要对 inode tree中的每个独立路径进行加锁。InodeTree对象提供加锁方法有：InodeTree#lockInodePath、InodeTree#lockFullInodePath，方法返回已被加锁处理的LockedInodePath 路径对象。


在DefaultFileSystemMaster中常用的上下文对象：JournalContext, BlockDeletionContext, RpcContext；用户对文件元数据的访问(方法调用)都有一个独立的线程进行审计日志记录及管理。


**备注**：当获取inode path时，可能存在并发操作对该path进行写变更操作，那么读取inode path会抛出异常，提示path的数据结构已变更。


**DefaultFileSystemMaster start启动流程概述：**

-   基于InodeTree初始化文件系统根目录(initializeRoot)并判断是否有该文件系统权限；
    
-   遍历MountTable，初始化MasterUfsManager并进行文件系统挂载Mount操作；
    
-   提交不同的HeartbeatThread(**心跳线程**) 进行各个检测校验，最终调用HeartbeatExecutor.heartbeat方法，其心跳检测包括：
    
    \- BlockIntegrityChecker：Block完整性校验
    
    \- InodeTtlChecker：File Inode TTL 生命周期校验
    
    \- LostFileDetector：丢失文件探测
    
    \- ReplicationChecker：副本数校验
    
    \- PersistenceSchedule：持久化调度
    
    \- PersistenceChecker：持久化校验
    
    \- TimeSeriesRecorder：时间序列记录
    
    \- UfsCleaner：UFS清理器
    

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

**附：HeartbeatExecutor**的类图概要

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

**4.1.3.2. DefaultBlockMaster**


Alluxio Master中管理所有Block和Worker映射元数据的Server服务。为保证并发请求，BlockMaster Server使用支持并发的数据结构，每个元数据都可以进行独立的加锁操作。在BlockMaster中有两大类元数据：block metadata(block块元数据)，worker metadata(worker节点元数据)：

-   block metadata 加锁操作：基于block执行任意的BlockStore操作，从mLostBlocks中移除元素；
    
-   worker metadata 加锁操作：校验/更新worker注册状态，读/写worker使用率，读/写worker上的block管理；
    

为避免死锁操作，如果block和worker元数据需要同时加锁，worker需要在block之前加锁，释放锁时则相反，block需要在worker之前释放锁。


**start启动流程概述**：提交HeartbeatThread(**心跳线程**) 进行检测校验，提交的线程是：LostWorkerDetectionHeartbeatExecutor，对worker的心跳进行检测。

## 4.2 AlluxioWorker

### 4.2.1. 启动流程

-   通过MasterInquireClient.Factory 获取Alluxio Master的地址和相关配置信息；
    
-   创建AlluxioWorkerProcess进程对象，并执行start方法，具体如下：
    
    \- 通过WorkerRegistry获取Worker上的所有Worker Server服务，**并启动相应的Server**；
    
    \- 注册WebServer Handler，并启动，包括通用指标和Prometheus指标；
    
    \- 注册JvmPauseMonitor，采集worker节点相关的JVM监控指标信息；
    
-   如果Worker内嵌FUSE服务，则启动FuseManager
    

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

### 4.2.2. Worker Server

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

### 4.2.2.1. DefaultBlockWorker


负责管理Worker节点中最高层级的Block抽象操作，包括：

-   周期性的BlockMasterSync，将当前Worker节点的Block信息周期定时上报同步给Master；
    
-   维护当前Worker所有Block信息与底层存储操作的逻辑关系；
    


**start启动流程概述：**通过BlockMasterClientPool获取BlockMaster RPC地址并注册，基于ExecutorService提交Worker节点的HeartbeatThread线程，包括：

-   BlockMasterSync：将Worker节点Block信息定时同步BlockMaster进行统一block元数据管理；
    
-   PinListSync：维护Alluxio与底层UFS的联通地址；
    
-   StorageChecker：校验存储地址；
    

## 4.3 AlluxioProxy

### 4.3.1. 启动流程

-   基于ProxyProcess.Factory 创建对应的进程对象：AlluxioProxyProcess；
    
-   创建AlluxioProxyProcess进程对象后，执行start方法，调用ProxyWebServer执行start方法，启动Proxy Web服务；
    

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

## 4.4  AlluxioJobMaster

### 4.4.1. 启动流程

-   基于AlluxioJobMasterProcess.Factory创建对应的进程对象：AlluxioJobMasterProcess；
    
-   AlluxioJobMasterProcess执行start方法，调用细节如下：
    
    \- 启动AlluxioJobMaster关联的JournalSystem，并获取Master Leader；
    
    \- 启动Job的Server服务，调用JobMaster start；
    
    \- 分别启动JobMaster的Web Server和RPC Server，提供对外通信服务；
    

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

### 4.4.2. JobMaster  


Alluxio内置轻量级的作业调度框架，JobMaster处理AlluxioJobMaster中所有job管理相关操作。


**start启动流程概述：**基于PlanTracker获取上一次调度系统中遗留的所有运行中执行计划并停止，提交HeartbeatThread(**心跳线程**) 进行监测，提交的进程是：LostWorkerDetectionHeartbeatExecutor，用于检测心跳丢失的Worker节点；

## 4.5 AlluxioJobWorker

### 4.5.1. 启动流程

-   通过MasterInquireClient.Factory 获取Alluxio Master的地址和相关配置信息；
    
-   创建AlluxioJobWorkerProcess进程对象，并执行start方法，具体如下：
    
    \- 注册WebServer Handler并启动JobWorkerWebServer，提供Web服务；
    
    \- 启动JobWorker的Server服务 JobWorker，注册job worker节点，并提交心跳检测线程CommandHandlingExecutor；
    
    \- 启动RPC服务于外部通信。
    

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

### 4.5.2. JobWorker


负责管理Worker节点中执行任务相关的所有操作，通过**CommandHandlingExecutor** 心跳检测执行进程实现。


**start启动流程概述：**向JobWorkerIdRegistry注册当前worker节点信息，提交HeartbeatThread(**心跳线程**) 进行监测，提交的线程是：**CommandHandlingExecutor**，处理JobWorker节点所接受的Command命令。

Part 5

# 5.RPC框架

Alluxio是分布式存储缓存系统，服务之间的通信经过RPC调用，其内部采用了grpc框架实现，在子项目alluxio-core-transport中定义RPC的proto文件。以AlluxioMaster为例，详述RPC启动调用流程：AlluxioMaster进程启动的时候，会启动grpc server 对外提供接口服务，其中Server(Master服务)中定义各个Server待注册启动的RPC服务，所有RPC服务注册到GrpcServerBuilder后，基于GrpcServerBuilder.build生成GrpcServer并启动。

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

Master RPC和Worker RPC注册服务，都是基于Handler实现grpc定义的方法，如下所示：

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

《Alluxio-源码解析》下篇更精彩哦，敬请期待。