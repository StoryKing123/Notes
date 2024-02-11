

 ssh -i ecs.pem root@8.138.57.218


hotload
systemfd --no-pid -s http::8080 -- cargo watch -x run


更新ORM entity
sea-orm-cli generate entity \                                                   1m 29s
    -u mysql://root:firengxuan@8.138.57.218/pet \
    -o src/entities


docker 执行
 docker run -p 8080:8080 --env-file .env -d


