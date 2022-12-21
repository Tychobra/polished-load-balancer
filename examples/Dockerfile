FROM rocker/r-ver:latest

EXPOSE 8080

# install polished-proxy
# install node
RUN apt-get update && apt-get install -y sudo curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
RUN apt-get update && apt-get install -y nodejs

# Copy proxy server into docker image
ENV MAX_SESSIONS=5
COPY './proxy_server_gh' '/srv/proxy_server'



# start installing shiny app deps
COPY './shiny_app/sys_deps.txt' '/srv/sys_deps.txt'
RUN apt-get update && xargs apt-get install -y </srv/sys_deps.txt

RUN R -e 'install.packages("remotes")'

# Copy app into shiny server `shiny_app` directory
COPY './shiny_app/deps.json' '/srv/deps.json'

RUN R -e 'remotes::install_github("tychobra/polisheddeploy", ref="7008435e9b647fefba623b29daa28f7b2f4f6fb1")'
RUN R -e 'polisheddeploy::install_packages("/srv/deps.json", Ncpus=4)'

COPY './shiny_app' '/srv/shiny_app'


CMD ["node", "/srv/proxy_server/proxy.js"]
