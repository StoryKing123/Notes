
# Docker基本操作

## 删除容器


```
docker container rm contrainerid
docker rm containerid
```


## 删除镜像

删除镜像之前，要把当前镜像下面的容器都给删除了，才可以去删除镜像

```
docker rmi imageid
```


查看容器
```
docker ps 查看当前运行的容器
docker ps -a 查看当前所有容器，包括已经停止掉的
```


## 查看容器日志
```
docker logs containerid
```

# 制作node环境镜像
创建Dockerfile
```dockerfile
FROM node:18-alpine3.14

WORKDIR /app

COPY . .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install -g http-server

EXPOSE 8080

VOLUME /app

CMD ["http-server", "-p", "8080"]

```
这些指令的含义如下：

- FROM：基于一个基础镜像来修改
- WORKDIR：指定当前工作目录
- COPY：把容器外的内容复制到容器内
- EXPOSE：声明当前容器要访问的网络端口，比如这里起服务会用到 8080
- VOLUME: 要被挂载的目录
- RUN：在容器内执行命令
- CMD：容器启动的时候执行的命令

然后使用docker build去构建镜像
`docker build -t aaa:ccc .`
aaa是镜像名 ccc是标签名

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231001221734.png)


这里buld完之后用docker images可以输出所有镜像，可以看到刚刚build的镜像hserver，这里使用的镜像是node:18-alpine3.14，这个是使用更新的linux镜像所构建的node，所以占用的空间更小
![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231001222714.png)




创建完镜像之后，我们可以根据镜像去执行对应的容器
使用docker run去创建容器
``` zsh
 docker run  -p 3000:8080 7e1
```

这里使用参数-p，是建立端口映射，当我们运行上面的镜像的时候，可以从配置文件看到EXPOSE 8080，暴露的只是容器的端口，所以需要把我们本机ip的端口给映射过去，这样才在外部进行访问，这里我们用本机的3000端口进行映射
![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231001222621.png)
可以看到现在已经可以通过url访问到对应的内容


如果想要在后台运行该服务，可以加一个-d的参数
``` zsh
 docker run -d -p 3000:8080 7e1
```

这样子启动之后，当前容器就会后台化，可以通过docker ps查看当前所有的容器
![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231001223403.png)



这里访问的html是镜像里面的文件，如果我们想要修改的话得修改镜像，非常麻烦，所以我们可以使用volumn进行站点挂载

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231001224349.png)

添加-v参数，使用:进行分割，前面的是要挂载的本机目录，后面的时候挂载到的镜像里面的目录
这里我们在测试目录创建了一个html文件
```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document</title>
    </head>
    <body>

        hello world!!
    </body>
</html>

```
然后我们访问3001，
![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231001224545.png)
可以看到页面读取的是我们挂载的目录里面的文件了，而不是镜像里面的文件了，：前面的目录会覆盖后面的目录

# 停止容器

使用docker stop containerID进行停止容器
![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231001223633.png)



# 制作nest项目的镜像


当初始化完一个nest项目之后，在目录下创建Dockerfile文件
```dockerfile
FROM node:18

WORKDIR /app

COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD [ "node", "./dist/main.js" ]

```
这样可以把nest项目构建成镜像，但是这样也是把源码之类的文件也给复制进去镜像，制动之后可以看到
![](https://raw.githubusercontent.com/StoryKing123/pics/main/202310021738413.png)

镜像内容也包含了src，test等文件夹，我们容器运行的时候并不需要这些，所以我们可以使用二次构建
```dockerfile
# build stage
FROM node:18-alpine3.14 as build-stage

WORKDIR /app

COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:18-alpine3.14 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json

WORKDIR /app

RUN npm install --production

EXPOSE 3000

CMD ["node", "/app/main.js"]

```


然后执行build操作

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231002175005.png)


从上面可以看到，构建了两次，最终会保留最后一次构建的阶段





# Docker compose

在一个项目里面，有后台nest，也有数据库mysql或者redis，这些都是可以容器化的东西，那我们启动一个项目，就需要容器化mysql，容器和nest，每次都需要docker run对应的项目，是很繁琐的，但是有了docker compose，就可以就这些镜像组合起来。

要使用docker compose，需要先创建docker-compose.yml文件
```yml
services:
  nest-app:
    build:
      context: ./
      dockerfile: ./Dockerfile
    depends_on:
      - mysql-container
    ports:
      - '3000:3000'
  mysql-container:
    image: mysql
    ports:
      - '3306:3306'
    volumes:
      - /Users/guang/mysql-data:/var/lib/mysql


```


然后执行docker-compose up


![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231003130222.png)


![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231003130425.png)



可以看到容器已经被创建起来了

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231003214159.png)
也可以访问到对应的url，说明nest已经启动成功了

![image.png](https://raw.githubusercontent.com/StoryKing123/pics/main/20231003214225.png)
nest服务日志也已经连接到mysql了，第一次失败是因为mysql还在启动，第二次就已经连接成功了