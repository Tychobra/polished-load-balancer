

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