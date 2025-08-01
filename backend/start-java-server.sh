#!/bin/bash
echo "编译Java服务器..."
javac -cp sqlite-jdbc-3.50.3.0.jar Server.java
if [ $? -eq 0 ]; then
    echo "编译成功，启动Java服务器..."
    java -cp ".:sqlite-jdbc-3.50.3.0.jar" Server
else
    echo "编译失败！"
fi
