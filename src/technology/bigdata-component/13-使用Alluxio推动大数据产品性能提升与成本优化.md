---
title: "使用Alluxio推动大数据产品性能提升与成本优化"
date: 2023-06-30 08:30:00
description: "使用Alluxio推动大数据产品性能提升与成本优化"
head:
  - - meta
    - name: keywords
      content: Alluxio,大数据,PowerData
tag: [大数据组件]
order: -13
---

本文转载至PowerData的新朋友Alluxio

___

全文共 2607 个字，建议阅读 12 分钟

**内容简介**

随着数字化不断发展，各行各业数据呈现海量增长的趋势。存算分离将存储系统和计算框架拆分为独立的模块，**Alluxio作为如今主流云数据编排软件之一，为计算型应用（如 Apache Spark、Presto）和存储系统（如 Amazon S3、Alibaba OSS）的数据访问构建了桥梁。**

本文使用亚马逊云、阿里云服务商产品，对Presto、Hive等计算框架与不同UFS直连时的关键性能指标进行测评，同时给出集成Alluxio组件后的性能评估，得出以下结论：

√

**Alluxio 可减少任务运行时间**（低带宽情况下甚至可以减少一个数量级）**和 CPU时间**；这表明 Alluxio 一定程度上可以节省带宽并减轻服务器运算压力。

√

**Alluxio 可更好地兼容众多底层存储系统**，这表明在不损失性能的前提下，选择价格更为低廉的对象存储系统（如Alibaba OSS, Amazon S3）。

简而言之，集成数据驱动软件 Alluxio 既能提升性能，又能降低运营成本。

**实验设计**

本实验采用 TPC-DS 生成的 1GB 数据集，选择19条SQL作为该实验工作负载。<sup>[1]</sup>

<table><tbody><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:0" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:0.td@@0"><section powered-by="xiumi.us"><p><strong>Type</strong></p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:0.td@@1"><section powered-by="xiumi.us"><p><strong>Queries</strong></p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:1" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:1.td@@0"><section powered-by="xiumi.us"><p>Interactive</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:1.td@@1"><section powered-by="xiumi.us"><p>Q19, Q42, Q52, Q55, Q63,Q65, Q68, Q73, Q98</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:2" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:2.td@@0"><section powered-by="xiumi.us"><p>Reporting</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:2.td@@1"><section powered-by="xiumi.us"><p>Q3, Q7, Q27, Q43, Q53, Q89<br></p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:3" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:3.td@@0"><section powered-by="xiumi.us"><p>Deep Analytics</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:4.col1:3.classicTable1:3.td@@1"><section powered-by="xiumi.us"><p>Q34, Q46, Q79, SS_MAX</p></section></td></tr></tbody></table>

我们将原始数据存到底层存储系统中，使用Hive管理原始数据和元数据，将Presto作为计算应用，形成 **Presto → Hive → (Alluxio →) HDFS/OSS/S3** 的连接模式，并进行Presto直接读UFS和Presto通过Alluxio缓存读UFS两种对比测试。我们采用挂钟时间（WallTime，执行查询花费的总时间）和CPU时间（ProcessCpuTime，处理查询所花费的总CPU时间）两组测量指标进行对比测试。

\[1\] 我们选择和《SQL-on-Hadoop: Full Circle Back to Shared-Nothing Database Architectures》（Proceedings of the VLDB Endowment, Vol. 7, No. 12）相同的20条SQL作为该实验工作负载。Q59 由于过于复杂，运行时间过长，内存消耗过大，测试难度较大，故该实验仅对其他19个SQL进行测试。

**实验结果与意义**

**实验结果分析**

通过TPC-DS测试的对比后，可得出以下几点结论：

**（1）Alluxio 可减少挂钟时间，在低带宽下尤为明显。**

√

图1-1是在AWS上，使用HDFS作为存储系统，统计挂钟时间均值（AWS实例带宽最高可达10G/s，性能小幅度提升）：

![图片](http://oss.powerdata.top/hub-image/13-%E4%BD%BF%E7%94%A8Alluxio%E6%8E%A8%E5%8A%A8%E5%A4%A7%E6%95%B0%E6%8D%AE%E4%BA%A7%E5%93%81%E6%80%A7%E8%83%BD%E6%8F%90%E5%8D%87%E4%B8%8E%E6%88%90%E6%9C%AC%E4%BC%98%E5%8C%9601.png)

图1-1

√

图1-2是在阿里云上，使用HDFS作为存储系统，统计挂钟时间均值（选择阿里云按量付费最高带宽200M/s）：

![图片](http://oss.powerdata.top/hub-image/xw5ubsc6EZTnPmc60tb6aGKXtIbF8PSyrQBINibLhOwU5bduahMkGKyM6kiaaowRxTgBO4IM6p7ic9botseydVXAQ.png)

图1-2

√s

图1-3是在阿里云上，使用HDFS作为存储系统，统计挂钟时间均值（低带宽模式，带宽15M/s），可以看到性能提升一个数量级。

![图片](http://oss.powerdata.top/hub-image/xw5ubsc6EZTnPmc60tb6aGKXtIbF8PSyET1Jb7jfEBVsunTAywc7m5YKBSF8IUiauYKHWOGgybqmwA4fxSvRCAw.png)

图1-3

（2）**Alluxio 可节省带宽。**由图1-2和图1-3可知，若想在无Alluxio的情况下达到有Alluxio的效果，需要设法进一步提升公网带宽。

（3）**Alluxio 一定程度上可减轻服务器运算压力**，CPU时间较短。

图2-1是在阿里云上使用HDFS作为存储系统，统计CPU时间。

![图片](http://oss.powerdata.top/hub-image/xw5ubsc6EZTnPmc60tb6aGKXtIbF8PSy8KoljUzZvWbNsjjFEADNfiaRricLq28oWgWzvIiaWbwKyIt1DILeh9bXQ.png)

图2-1

图2-2是在AWS上使用S3作为存储系统，统计CPU时间。

![图片](http://oss.powerdata.top/hub-image/xw5ubsc6EZTnPmc60tb6aGKXtIbF8PSyhKkvmdhrk6qDL2ebKIbLedCmLnqd0F14YfVOf8rIcibJH4kfqG9xAXg.png)

图2-2

（4）**Alluxio 为计算框架和存储系统的数据访问搭建桥梁，大大降低运行环境配置难度。**目前 Presto 对 S3 兼容性较好，但对 OSS 和 COS 兼容性较差，目前尚无Presto直接访问OSS数据的方案。但用Alluxio则无需考虑计算框架和底层存储系统的兼容性问题，因为Presto对Alluxio、Alluxio对OSS兼容性很好，配置环境很容易。

（5）由于无需考虑计算框架与底层存储系统兼容性，则可使用价格更为低廉的对象存储系统，其带宽成本与维护成本均比 Hadoop 低。并且由图3-1和图3-2得知Alluxio缓存读情况下性能差别并不明显，但对象存储系统价格更为低廉，因此对象存储可作为存储系统更好的选择。

图3-1为使用AWS服务器，分别对 HDFS 和 S3 进行测试，统计挂钟时间。

![图片](http://oss.powerdata.top/hub-image/xw5ubsc6EZTnPmc60tb6aGKXtIbF8PSyXk7KK0zOr6hVbWWPR6wnCPCObD63ibibzkpYMqF9Ch2OHeq7PZ5aVLicw.png)

图3-1

图3-2为使用阿里云服务器，分别对 HDFS 和 OSS 进行测试，统计挂钟时间。

![图片](http://oss.powerdata.top/hub-image/xw5ubsc6EZTnPmc60tb6aGKXtIbF8PSyMzfOEAicGP99PNYeTGUDtsTnicmffTUcGAx8aryGLGErVfPkDPNyicic3Q.png)

图3-2

**对象存储与HDFS存储成本对比**

由于云服务产品种类繁杂、使用相同产品不同的应用场景下开销差异较大。以本实验为例，云服务主要开销由存储、数据传输和云服务器三个部分构成，故我们仅对本实验使用云服务产品及其他常用云服务产品进行上述指标的定量分析（忽略诸如数据请求、对象清单等极低成本服务的指标），扩展服务及其详细价格详情请参考云服务产品价格页面。

**亚马逊云**

亚马逊服务器使用 S3 和 HDFS 作为存储系统时（HDFS 使用 EBS 存储，因此以美国东部俄亥俄2023年1月6日 S3 Standard 和 EBS 为例），价格对比如下（数据来源：Amazon S3 价格、Amazon EC2 实例价格、Amazon EBS 定价 ）：

**（1）存储**

<table><tbody><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:0" powered-by="xiumi.us"><td colspan="1" rowspan="3" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:0.td@@0"><section powered-by="xiumi.us"><p>S3</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:0.td@@1"><section powered-by="xiumi.us"><p>每月前 50TB</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:0.td@@2"><section powered-by="xiumi.us"><p>每 GB 0.023 USD</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:1" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:1.td@@0"><section powered-by="xiumi.us"><p>每月随后的 450 TB</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:1.td@@1"><section powered-by="xiumi.us"><p>每 GB 0.022 USD</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:2" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:2.td@@0"><section powered-by="xiumi.us"><p>每月超出 500TB 的部分</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:2.td@@1"><section powered-by="xiumi.us"><p>每 GB 0.021 USD</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:3" powered-by="xiumi.us"><td colspan="1" rowspan="4" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:3.td@@0"><section powered-by="xiumi.us"><p>EBS</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:3.td@@1"><section powered-by="xiumi.us"><p>通用型 SSD (gp3)&nbsp;</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:3.td@@2"><section powered-by="xiumi.us"><p>每月每 GB 的价格：0.08 USD</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:4" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:4.td@@0"><section powered-by="xiumi.us"><p>通用型 SSD (gp2)&nbsp;</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:4.td@@1"><section powered-by="xiumi.us"><p>每月每 GB 预置存储的价格：0.10 USD</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:5" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:5.td@@0"><section powered-by="xiumi.us"><p>快照 (标准)</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:5.td@@1"><section powered-by="xiumi.us"><p>0.05 USD/GB/月</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:6" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:6.td@@0"><section powered-by="xiumi.us"><p>快照 (归档)</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:34.classicTable1:6.td@@1"><section powered-by="xiumi.us"><p>0.0125 USD/GB/月</p></section></td></tr></tbody></table>

本实验采用S3 Standard 、通用型SSD (gp2) 和一张普通快照，S3 每 GB 存储价格仅为 gp2 的 1/7~1/6。即使数据量增大，使得运行环境占用存储忽略不计，在不考虑快照的情况下，S3 Standard 数据存储价格仅为 gp2 的1/4~1/3。

**（2）数据传输**

<table><tbody><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:0" powered-by="xiumi.us"><td colspan="1" rowspan="4" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:0.td@@0"><section powered-by="xiumi.us"><p>S3</p><p>(以数据自 Amazon S3 传出至互联网为例)</p><p>HDFS</p><p>(以弹性IP为例)</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:0.td@@1"><section powered-by="xiumi.us"><p>每月前 10 TB</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:0.td@@2"><section powered-by="xiumi.us"><p>每 GB 0.09 USD</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:1" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:1.td@@0"><section powered-by="xiumi.us"><p>每月随后的 40TB</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:1.td@@1"><section powered-by="xiumi.us"><p>每 GB 0.085 USD</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:2" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:2.td@@0"><section powered-by="xiumi.us"><p>每月随后的 100TB</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:2.td@@1"><section powered-by="xiumi.us"><p>每 GB 0.07 USD</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:3" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:3.td@@0"><section powered-by="xiumi.us"><p>每月超出 150TB 的部分</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:38.classicTable1:3.td@@1"><section powered-by="xiumi.us"><p>每 GB 0.05 USD</p></section></td></tr></tbody></table>

AWS两者公网流出流量价格一致，公网流入流量均免费。

**（3）服务器成本**

服务器成本请参考 Amazon EC2 实例价格，S3 并无此项成本，而 EC2 成本很高，以本实验存储系统用到的实例为例（美国东部俄亥俄2023年1月6日 r5a.large 价格）。

<table><tbody><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:0" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:0.td@@0"><section powered-by="xiumi.us"><p>实例名称</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:0.td@@1"><section powered-by="xiumi.us"><p>按需每小时速率</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:0.td@@2"><section powered-by="xiumi.us"><p>vCPU</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:0.td@@3"><section powered-by="xiumi.us"><p>内存</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:1" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:1.td@@0"><section powered-by="xiumi.us"><p>r5a.large</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:1.td@@1"><section powered-by="xiumi.us"><p>0.113 USD</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:1.td@@2"><section powered-by="xiumi.us"><p>2</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:42.classicTable1:1.td@@3"><section powered-by="xiumi.us"><p>16G</p></section></td></tr></tbody></table>

**阿里云**

以2023年1月12日华北1（青岛）区域的 OSS 标准型存储和块存储 (EBS) 为例（数据来源：对象存储OSS 定价详情、块存储定价详情）。

**（1）存储**

<table><tbody><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:0" powered-by="xiumi.us"><td colspan="1" rowspan="2" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:0.td@@0"><section powered-by="xiumi.us"><p>OSS</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:0.td@@1"><section powered-by="xiumi.us"><p>数据存储（本地冗余存储）</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:0.td@@2"><section powered-by="xiumi.us"><p>0.12元/GB/月</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:1" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:1.td@@0"><section powered-by="xiumi.us"><p>数据存储（同城冗余存储）</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:1.td@@1"><section powered-by="xiumi.us"><p>0.15元/GB/月</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:2" powered-by="xiumi.us"><td colspan="1" rowspan="5" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:2.td@@0"><section powered-by="xiumi.us"><p>EBS</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:2.td@@1"><section powered-by="xiumi.us"><p>ESSD云盘PL0</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:2.td@@2"><section powered-by="xiumi.us"><p>0.5 元/GB/月</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:3" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:3.td@@0"><section powered-by="xiumi.us"><p>ESSD云盘PL1</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:3.td@@1"><section powered-by="xiumi.us"><p>1.0 元/GB/月</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:4" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:4.td@@0"><section powered-by="xiumi.us"><p>ESSD云盘PL2</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:4.td@@1"><section powered-by="xiumi.us"><p>2.0 元/GB/月</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:5" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:5.td@@0"><section powered-by="xiumi.us"><p>ESSD云盘PL3</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:5.td@@1"><section powered-by="xiumi.us"><p>0.5 元/GB/月</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:6" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:6.td@@0"><section powered-by="xiumi.us"><p>普通快照</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:47.classicTable1:6.td@@1"><section powered-by="xiumi.us"><p>0.12 元/GB/月</p></section></td></tr></tbody></table>

本实验采用 OSS 标准存储（本地冗余）、ESSD 云盘 PL0 和一个普通快照，可见在 Alluxio 缓存读性能相近情况下，OSS 每 GB 存储价格仅为 EBS 的 1/6~1/5。

**（2）数据传输**

<table><tbody><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:0" powered-by="xiumi.us"><td colspan="1" rowspan="2" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:0.td@@0"><section powered-by="xiumi.us"><p>OSS</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:0.td@@1"><section powered-by="xiumi.us"><p>外网流出流量</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:0.td@@2"><section powered-by="xiumi.us"><p>00:00-08:00：0.25元/GB</p><p>08:00-24:00：0.50元/GB</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:1" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:1.td@@0"><section powered-by="xiumi.us"><p>CDN回源流出流量</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:1.td@@1"><section powered-by="xiumi.us"><p>0.15元/GB</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:2" powered-by="xiumi.us"><td colspan="1" rowspan="2" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:2.td@@0"><section powered-by="xiumi.us"><p>弹性IP</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:2.td@@1"><section powered-by="xiumi.us"><p>配置费用</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:2.td@@2"><section powered-by="xiumi.us"><p>0.02元/小时</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:3" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:3.td@@0"><section powered-by="xiumi.us"><p>公网流量费用</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:51.classicTable1:3.td@@1"><section powered-by="xiumi.us"><p>0.72元/GB</p></section></td></tr></tbody></table>

本实验采用按量付费带宽。可见 OSS 带宽成本比 HDFS 带宽成本要低一些。倘若OSS开启CDN加速，理论上可进一步提升带宽速度并降低带宽成本。

**（3）服务器成本**

服务器成本请参考 云服务器 ECS，OSS 并无此项成本，而 ECS 成本很高，以本实验存储系统用到的实例为例（华北1青岛2023年1月12日 ecs.r6.large 价格）。

<table><tbody><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:0" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:0.td@@0"><section powered-by="xiumi.us"><p>实例名称</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:0.td@@1"><section powered-by="xiumi.us"><p>按需每小时速率</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:0.td@@2"><section powered-by="xiumi.us"><p>vCPU</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:0.td@@3"><section powered-by="xiumi.us"><p>内存</p></section></td></tr><tr opera-tn-ra-comp="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:1" powered-by="xiumi.us"><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:1.td@@0"><section powered-by="xiumi.us"><p>ecs.r6.large</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:1.td@@1"><section powered-by="xiumi.us"><p>0.680 元</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:1.td@@2"><section powered-by="xiumi.us"><p>2</p></section></td><td colspan="1" rowspan="1" opera-tn-ra-cell="_$.pages:0.layers:0.comps:6.col1:55.classicTable1:1.td@@3"><section powered-by="xiumi.us"><p>16G</p></section></td></tr></tbody></table>

**总结**

综合亚马逊云、阿里云的存储、数据传输和服务器成本，使用对象存储系统的开销要比HDFS低很多，而使用 Alluxio 可十分方便地接入各种存储系统，这无疑意味着可大大降低企业运营成本。

我们是由一群数据从业人员，因为热爱凝聚在一起，以开源精神为基础，组成的PowerData数据之力社区。

可关注下方公众号后点击“加入我们”，与PowerData一起成长。