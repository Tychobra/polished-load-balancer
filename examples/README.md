

# Polished Proxy Installation
```terminal
cd examples/shiny_min/proxy_server
npm install
```

# Run Polished Proxy

```terminal
node ./proxy.js
```

kill open ports

```terminal
npx kill-port 8080
```

shiny::runApp("../shiny_app")

```
docker stop $(docker ps -q)
```



```terminal

docker build -t polished_proxy_eg .

docker run -p 8080:8080 polished_proxy_eg

```