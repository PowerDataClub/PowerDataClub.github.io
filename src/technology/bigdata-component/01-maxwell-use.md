---
title: "Maxwell使用指南"
date: 2022-12-16 09:00
description: "目前 MySQL 的同步工具有很多，Maxwell 也是其中比较好的一个选择，本文就同步工具的优略，以及 Maxwell 的使用做一个较为详细的说明。"
head:
  - - meta
    - name: keywords
      content: Maxwell,maxwell,大数据,PowerData
tag: [大数据组件]
order: -1
---


> 目前 MySQL 的同步工具有很多，Maxwell 也是其中比较好的一个选择，本文就同步工具的优略，以及 Maxwell 的使用做一个较为详细的说明。

## 1.Maxawell 简介
=============

Maxwell 是一个能实时读取 MySQL 的 binlog 日志，并生成 JSON 格式的消息，发送给 Kafka，Kinesis、RabbitMQ、Redis 或其他平台的应用程序。常见应用场景有 ETL、维护缓存、为搜索引擎构建索引等。

官网 (http://maxwells-daemon.io)、GitHub(https://github.com/zendesk/maxwell)

Maxwell 的主要特色：

*   支持以 `select * FROM table` 的方式全量同步数据；
    
*   支持断点续传；
    
*   可以根据 database、table、column 等级别的数据进行分区，用于解决数据倾斜问题；
    
*   轻量级应用；
    

### 1.1 常见 MySQL 同步工具对比
-------------------

![](http://oss.powerdata.top/hub-image/55791558.png)

Maxwell 相比于 Canal、Flink CDC 更加轻量级，不依赖其他组件。Canal 需要自己编写客户端来消费解析到的数据，而 Maxwell 直接输出 JSON 格式的数据，不需要再用客户端单独解析。同时 Maxwell 支持全量数据同步，虽然高可用没有直接支持，但是可以断点续传。

###  1.2 Maxwell 原理解析
----------------

Maxwell 的工作原理非常简单：

1.  伪装成 MySQL 的一个 slave，然后接收 binlog
    
2.  对 binlog 进行解析，封装成 Maxwell 的 JSON 数据格式
    
3.  记录读取到的 binlog 位移信息，保存到 MySQL 中，用于断点续传
    
4.  将封装的 JSON 数据，发送至 Kafka、RabbitMQ 等下游
    

而 Maxwell 的全量同步则是通过`select * FROM table` 的方式，分页查出全量数据，然后发送到下游。全量和增量可以通过配置同步、或异步进行。

## 2.快速开始
=======

###  2.1. 下载 Maxwell
---------------

下载 Maxwell: https://github.com/zendesk/maxwell/releases/download/v1.39.2/maxwell-1.39.2.tar.gz

解压缩：

```
tar zxvf  maxwell-1.39.2.tar.gz
cd maxwell-1.39.2


```

也可以用 docker

```
docker pull zendesk/maxwell


```

###  2.2. 配置 MySQL
-------------

MySQL 开启 binlog

```
# /etc/my.cnf

[mysqld]
binlog_format=row
server_id=1 
log-bin=master



```

创建 Maxwell 用户，并赋予 maxwell 库的一些权限

```
mysql> CREATE USER 'maxwell'@'%' IDENTIFIED BY 'XXXXXX';
mysql> CREATE USER 'maxwell'@'localhost' IDENTIFIED BY 'XXXXXX';

mysql> GRANT ALL ON maxwell.* TO 'maxwell'@'%';
mysql> GRANT ALL ON maxwell.* TO 'maxwell'@'localhost';

mysql> GRANT SELECT, REPLICATION CLIENT, REPLICATION SLAVE ON *.* TO 'maxwell'@'%';
mysql> GRANT SELECT, REPLICATION CLIENT, REPLICATION SLAVE ON *.* TO 'maxwell'@'localhost';



```

创建一个测试表

```
CREATE TABLE `maxwell_test` (  `id` bigint(11) NOT NULL AUTO_INCREMENT,  `test_key` int(11) DEFAULT NULL,  `test_value` varchar(255) DEFAULT NULL,  `test_time` datetime NULL DEFAULT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;


```

###  2.3. 运行 Maxwell
---------------

可以用命令行输出的形式进行测试：

`bin/maxwell --user='maxwell' --password='XXXXXX' --host='127.0.0.1' --producer=stdout`

> 注意：如果是 **1.30 及以上**版本需要 JDK11， 否则会报错![](http://oss.powerdata.top/hub-image/72500685.png)![](http://oss.powerdata.top/hub-image/33437197.png)
> 
> 这里我们通过修改执行脚本，指定 JDK11 路径即可，也可以安装多个版本 jdk 采用`alternatives`命令来动态切换，不过还是建议升级到 JDK11 来解决。
> 
> 修改运行脚本
> 
> `vim bin/maxwell`
> 
> ![](http://oss.powerdata.top/hub-image/27837999.png)

输出到 Kafka:

`bin/maxwell --user='maxwell' --password='XXXXXX' --host='127.0.0.1' \ --producer=kafka --kafka.bootstrap.servers=localhost:9092 --kafka_topic=maxwell`

使用过滤器，只显示测试表的数据：

`bin/maxwell --user='maxwell' --password='XXXXXX' --host='127.0.0.1' --producer=stdout --filter='exclude: *.*, include: db_test.maxwell_test'`

执行测试 SQL

```
insert into maxwell_test values(1,22,"hello","2022-01-01 12:00:00");
update maxwell_test set test_value='hello22' where id=1;
delete from maxwell_test where id=1;


```

###  2.4 结果格式说明
----------

执行测试 SQL 后可以在控制台看到输出

**新增**

`insert into maxwell_test values(1,22,"hello","2022-01-01 12:00:00");`

```
{
    "database":"db_test",
    "table":"maxwell_test",
    "type":"insert",
    "ts":1667897460,
    "xid":1410361478,
    "commit":true,
    "data":{
        "id":1,
        "test_key":22,
        "test_value":"hello",
        "test_time":"2022-01-01 12:00:00"
    }
}


```

*   type: 大多数是 insert/update/delete， 如果采用全量同步，会看到 bootstrap-insert 类型；
    
*   ts: 秒级别的时间戳
    
*   xid：MySQL 事务 id
    
*   commit: 一个 xid, 只有一个事务，可以根据这个字段重组事务
    
*   data: 新数据
    

**更新**`update maxwell_test set test_value='hello22' where id=1;`

```
{
    "database":"db_test",
    "table":"maxwell_test",
    "type":"update",
    "ts":1667897460,
    "xid":1410361479,
    "commit":true,
    "data":{
        "id":1,
        "test_key":22,
        "test_value":"hello22",
        "test_time":"2022-01-01 12:00:00"
    },
    "old":{
        "test_value":"hello"
    }
}



```

和新增相比，增加了一个 old 字段，代表旧值

**删除**`delete from maxwell_test where id=1;`

```
{
    "database":"db_test",
    "table":"maxwell_test",
    "type":"delete",
    "ts":1667897460,
    "xid":1410361480,
    "commit":true,
    "data":{
        "id":1,
        "test_key":22,
        "test_value":"hello22",
        "test_time":"2022-01-01 12:00:00"
    }
}


```

删除的数据依旧会在 data 中显示一遍。

## 3. 进阶使用
=======

###  3.1 基本配置
--------

<table><thead><tr><th>选项</th><th>参数值</th><th>描述</th><th>默认值</th></tr></thead><tbody><tr><td>config</td><td>String</td><td>配置文件 config.properties 的路径</td><td>$PWD/config.properties</td></tr><tr><td>log_level</td><td>debug|info|warn|error</td><td>日志等级</td><td>info</td></tr><tr><td>daemon</td><td><br></td><td>运行 Maxwell 作为守护进程</td><td><br></td></tr><tr><td>env_config_prefix</td><td>STRING</td><td>匹配该前缀的环境变量将被视为配置值</td><td><br></td></tr></tbody></table>

Maxwell 的配置可以通过命令命令行、配置文件、环境变量来指定，配置的优先级为：

**命令行 > 环境变量 > 配置文件 > 默认值**

一般通过配置文件进行配置即可，通过 `--config`指定，或者在当前工作目录中命名为`config.properties`。

```
mkdir config
vim dev.properties


```

粘贴下面的配置

```
# mysql
user=maxwell
password=123456
host=127.0.0.1
jdbc_options=serverTimezone=Asia/Shanghai

filter=exclude: *.*, include: db_test.maxwell_test 

--producer=stdout


```

重新运行 maxwell:

`bin/maxwell --config config/dev.properties`

###  3.2 MySQL 配置
------------

Maxwell 中的角色被划分为：host、replication_host、schema_host 三种。一般情况下，这三个角色都在一个主机上，也可以分开指定。

*   host: Maxwell 维护信息的主机，存储了捕获到的 schema、binlog 偏移位置、全量同步数据等信息，一共有六张表：
    
*   bootstrap： 全量数据同步记录，如果不想用客户端操作全量同步，也可以通过 SQL，向这个表里插入记录。
    
*   columns： 所有的字段信息
    
*   databases： 所有的数据库信息
    
*   tables：所有的表信息
    
*   schemas： 所有的 binlog 文件信息
    
*   positions：读取到的 binlog 的位移信息，用于断点续传
    
*   heartbeats：Maxwell 的心跳信息
    
*   replication_host： 需要采集 binlog 信息的主机，将 host 和 replication_host 分开，可以避免 maxwell 的数据写入生产数据库。
    
*   shcema_host: 捕获 schema 的主机，一般用不到，不用单独配置。
    

常用的 MySQL 配置项如下：

<table><thead><tr><th>选项</th><th>参数值</th><th>描述</th><th>默认值</th></tr></thead><tbody><tr><td>host</td><td>STRING</td><td>mysql 地址</td><td>localhost</td></tr><tr><td>user</td><td>STRING</td><td>mysql username</td><td><br></td></tr><tr><td>password</td><td>STRING</td><td>mysql password</td><td>(no password)</td></tr><tr><td>port</td><td>INT</td><td>mysql port</td><td>3306</td></tr><tr><td>jdbc_options</td><td>STRING</td><td>mysql jdbc 连接选项</td><td><br></td></tr><tr><td>schema_database</td><td>STRING</td><td>Maxwell 用于维护的 schema 和 position 将使用的数据库</td><td>maxwell</td></tr><tr><td>client_id</td><td>STRING</td><td>用于标识 Maxwell 实例的唯一字符串</td><td>maxwell</td></tr><tr><td>replica_server_id</td><td>LONG</td><td>用于标识 Maxwell 实例的唯一数字</td><td>6379</td></tr><tr><td>gtid_mode</td><td>BOOLEAN</td><td>是否开启 GTID 复制</td><td>false</td></tr><tr><td>replication_host</td><td>STRING</td><td>复制的服务器</td><td><em>schema-store host</em></td></tr><tr><td>replication_password</td><td>STRING</td><td>password on replication server</td><td>(none)</td></tr><tr><td>replication_port</td><td>INT</td><td>port on replication server</td><td>3306</td></tr><tr><td>replication_user</td><td>STRING</td><td>user on replication server</td><td><br></td></tr><tr><td>replication_jdbc_options</td><td>STRING</td><td>mysql jdbc connection options for replication server</td><td>[DEFAULT_JDBC_OPTS]</td></tr></tbody></table>

SSL_OPTION: [DISABLED | PREFERRED | REQUIRED | VERIFY_CA | VERIFY_IDENTITY]

###  3.3 生产者配置
---------

大数据领域常用的生产者就是 Kafka， Maxwelll 还支持 Rabbitmq、Redis 等，可以参考官方文档，有两点需要注意：

*   Topic： Maxwell 默认向 Kafka 写入的 topic 是 **maxwell**，可以通过`--kafka_topic`来指定，当然也可以动态配置，例如`namespace_%{database}_%{table}`, 这个 topic 将会根据发送的数据动态改变。
    
*   Partition:  Maxwell 默认分区是根据数据库进行 hash，同一个库的数据会被放到同一个 partition, 这可能会导致数据倾斜问题，如果要解决可以通过配置`producer_partition_by`, 指定 database、table、primary_key 来解决。
    

生产者的通用配置：

<table><thead><tr><th>选项</th><th>参数值</th><th>描述</th><th>默认值</th></tr></thead><tbody><tr><td>producer</td><td>[PRODUCER_TYPE]</td><td>生产者类型</td><td>stdout</td></tr><tr><td>custom_producer.factory</td><td>CLASS_NAME</td><td>自定义消费者的工厂类</td><td><br></td></tr><tr><td>producer_ack_timeout</td><td><br></td><td>异步消费认为消息丢失的超时时间（毫秒 ms）</td><td><br></td></tr><tr><td>producer_partition_by</td><td>[PARTITION_BY]</td><td>输入到 kafka/kinesis 的分区函数</td><td>database</td></tr><tr><td>producer_partition_columns</td><td>STRING</td><td>若按列分区，以逗号分隔的列名称</td><td><br></td></tr></tbody></table>

PRODUCER_TYPE: [stdout | file | kafka | kinesis | pubsub | sqs | rabbitmq | redis]

PARTITION_BY_FALLBACK: [database | table | primary_key | transaction_id]

Kafka 配置：

<table><thead><tr><th>option</th><th>argument</th><th>description</th><th>default</th></tr></thead><tbody><tr><td>kafka.bootstrap.servers</td><td>STRING</td><td>kafka 集群列表, 格式 <code>HOST:PORT[,HOST:PORT]</code></td><td><br></td></tr><tr><td>kafka_topic</td><td>STRING</td><td>要写入的 kafka topic</td><td>maxwell</td></tr><tr><td>kafka_version</td><td>[KAFKA_VERSION]</td><td>指定 maxwell 的 kafka 生产者客户端版本，不可在 config.properties 中配置</td><td>0.11.0.1</td></tr></tbody></table>

KAFKA_VERSION: [0.8.2.2 | 0.9.0.1 | 0.10.0.1 | 0.10.2.1 | 0.11.0.1]

###  3.4 过滤器配置
---------

Maxwell 可以配置只输出指定表的 binlog， 通过`--filter` 命令，也可以对列进行过滤，一些官网的例子：

**案例 1：**

`--filter = 'exclude: foodb.*, include: db_test.maxwell_test, include: db_test./table_\d+/'`

这个案例会让 Maxwell 采集排除`db_test`的所有变更，除了 `maxwell_test`表 和符合正则表达式 `/table_\d+/` 的所有表。

**案例 2：**

`--filter = 'exclude: *.*, include: db1.*'`

这个案例会让 Maxwell 采集排除所有数据库的采集，除了 db1 库的所有表。

**案例 3:**

`--filter = 'exclude: db.tbl.col = reject'`

这会排除对 db.tb1 表中，col 列数据的采集。

###  3.5 数据初始化
---------

MySQL 的 binlog 是会被清除的，如果需要历史数据，在没有 binlog，且同步不能影响业务的情况下，我们怎么才能同步整张表的数据呢？

可以通过 `maxwell-bootstrap` 命令开启数据初始化，原理就是通过 `select * from table` 查询把结果输出到流中。

具体参数为：

<table><thead><tr><th>选项</th><th>描述</th></tr></thead><tbody><tr><td>--log_level LOG_LEVEL</td><td>日志等级 (DEBUG, INFO, WARN or ERROR)</td></tr><tr><td>--user USER</td><td>mysql username</td></tr><tr><td>--password PASSWORD</td><td>mysql password</td></tr><tr><td>--host HOST</td><td>mysql host</td></tr><tr><td>--port PORT</td><td>mysql port</td></tr><tr><td>--database DATABASE</td><td>mysql 中需要初始化的数据库</td></tr><tr><td>--table TABLE</td><td>mysql 中需要初始化的表</td></tr><tr><td>--where WHERE_CLAUSE</td><td>where 语句，可以筛选需要输出的数据</td></tr><tr><td>--client_id CLIENT_ID</td><td>需要执行的 Maxwell 实例的 client_id</td></tr><tr><td>--comment COMMENT</td><td>初始化的描述</td></tr></tbody></table>

#### 3.5.1 案例

1.  可以直接对整个表初始化
    

`bin/maxwell-bootstrap --user root --password 123456 --host 127.0.0.1 --client_id maxwell --database db_test --table maxwell_test`

2.  通过 where 来筛选数据
    

`bin/maxwell-bootstrap --user root --password 123456 --host 127.0.0.1 --client_id maxwell --database db_test --table maxwell_test --where "my_date >= '2022-01-01 00:00:00'"`

**也可以通过 SQL 执行：**

在生产环境，偶尔会遇到命令行初始化没有响应的现象，这种一般在数据量比较大的情况下容易出现。还有的同学可能有第三方系统需要和 Maxwell 初始进行对接，那解决方法就是操作 `Maxwell` 数据存储库的 `bootstrap` 表， 这里需要指定一下 `client_id`。

```
mysql> insert into maxwell.bootstrap (database_name, table_name, client_id) values ('db_test', 'maxwell_test', 'maxwell_client_id');


```

如果需要定时启动 Maxwell 的数据初始化，可以配置 `started_at` 列。

```
mysql> insert into maxwell.bootstrap (database_name, table_name, client_id, started_at) values ('db_test', 'maxwell_test', 'maxwell_client_id', '2022-01-01 12:30:00');


```

#### 3.5.2 异步与非异步

通过 `bootstrapper` 指定是否异步，`--bootstrapper=sync` 时，在处理全量数据同步时，会阻塞正常的 binlog 解析； `--bootstrapper=async` 时，不会阻塞

#### 3.5.3 初始化数据格式

*   bootstrap  以`type = "bootstrap-start"` 事件开始， 以`type = "bootstrap-complete"` 事件结束，这两个事件的 data 字段为空，只是个标志事件。
    
*   在 bootstrap 执行过程中，每行数据的事件为`type = "bootstrap-insert"`
    
*   同时会穿插着其他标准事件，`type = "insert", type = "update", type = "delete"`
    

**案例**执行如下 SQL:

```
mysql> create table db_test.maxwell_test(content varchar(255));
mysql> insert into db_test.maxwell_test (content) values ("hello"), ("test");
mysql> insert into maxwell.bootstrap (database_name, table_name) values ("db_test", "maxwell_test");


```

输出结果：

```
{"database":"db_test","table":"maxwell_test","type":"insert","ts":1450557598,"xid":13,"data":{"content":"hello"}}
{"database":"db_test","table":"maxwell_test","type":"insert","ts":1450557598,"xid":13,"data":{"content":"test"}}
{"database":"db_test","table":"maxwell_test","type":"bootstrap-start","ts":1450557744,"data":{}}
{"database":"db_test","table":"maxwell_test","type":"bootstrap-insert","ts":1450557744,"data":{"content":"hello"}}
{"database":"db_test","table":"maxwell_test","type":"bootstrap-insert","ts":1450557744,"data":{"content":"test"}}
{"database":"db_test","table":"maxwell_test","type":"bootstrap-complete","ts":1450557744,"data":{}}


```

#### 3.5.4 失败处理

如果在运行 bootstrap 的过程中 maxwell 崩溃或重启，那么 bootstrap 会重新开始，无论之前的进度是多少。也可以通过修改数据库中 `bootstrap` 表`is_complete` 字段为 1，表示完成。

## 3.6 高可用
-------

从 1.29.1 版本开始，maxwell 包含了高可用模块，但是还在 alpha 版本，选举算法采用 RAFT，所以最少需要 3 个节点。

创建`raft.xml`, 并写入配置（官方文档写的复制，但是发行版里并没有示例文件）

```
mkdir raft.xml

<?xml version='1.0' encoding='utf-8'?>
<config xmlns="urn:org:jgroups"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="urn:org:jgroups http://www.jgroups.org/schema/jgroups.xsd">
    <UDP mcast_addr="228.8.8.8" mcast_port="${jgroups.udp.mcast_port:45588}"/>
    <PING />
    <MERGE3 />
    <FD_SOCK/>
    <FD_ALL/>
    <VERIFY_SUSPECT timeout="1500"/>
    <pbcast.NAKACK2 xmit_interval="500"/>
    <UNICAST3 xmit_interval="500"/>
    <pbcast.STABLE desired_avg_gossip="50000" max_bytes="4M"/>
    <raft.NO_DUPES/>
    <pbcast.GMS print_local_addr="true" join_timeout="2000"/>
    <UFC max_credits="2M" min_threshold="0.4"/>
    <MFC max_credits="2M" min_threshold="0.4"/>
    <FRAG2 frag_size="60K"/>
    <raft.ELECTION election_min_interval="500" election_max_interval="1000" heartbeat_interval="250"/>
    <raft.RAFT members="A,B,C" raft_id="${raft_id:undefined}"/>
    <raft.REDIRECT/>
</config>


```

然后开启每个高可用节点

```
 bin/maxwell --ha --raft_member_id=A --config config/dev.properties --log_level=DEBUG
 bin/maxwell --ha --raft_member_id=B --config config/dev.properties --log_level=DEBUG
 bin/maxwell --ha --raft_member_id=C --config config/dev.properties --log_level=DEBUG


```

可以看到输出：

![](http://oss.powerdata.top/hub-image/49557178.png)

当关闭 leader 后，会重新进行选举保证高可用。

需要注意的是，每个节点需要保证 `--replica_server_id` 和 `--client_id` 一致。

## 4. 常见问题及注意事项
============

### 4.1 binlog 丢失导致的异常
------------------

Maxwell 在 maxwell 库中维护了 binlog 的位移等信息，如果 maxwell 库中 binlog 的信息和实际的无法匹配，则会导致 maxwell 异常，这时候需要手动修改 binlog 位移或者重建 maxwell 库。

如果你采集阿里云、腾讯云等云数据库上的 MySQL 需要注意，服务方通常会定时清理 binlog, 这时候可能会导致 Maxwell 异常。如： https://github.com/zendesk/maxwell/issues/1298

解决方案就是：

1.  修改清理方案策略，保留最近 XXX 小时的数据。
    
2.  出现异常后清空 maxwell 库，并重启 Maxwell, 会自动重建数据库。
    

###  4.2 多个 Maxwell
--------------

如果需要采集多个数据库、表，或者发送到多个 Topic， 可以在同一个节点上，部署多个 Maxwell。但是每个 Maxwell 实例都必须配置一个唯一的 client_id，以便对应不用的 binlog。

## 参考文档
====

Maxwell 官方文档

MySQL Binlog 解析工具 Maxwell 详解

我们是由一群数据从业人员，因为热爱凝聚在一起，以开源精神为基础，组成的 PowerData 数据之力社区。

可关注下方二维码点击 “加入我们”，与 PowerData 一起成长