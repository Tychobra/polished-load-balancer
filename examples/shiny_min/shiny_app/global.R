library(shiny)
library(polished)
library(config)


app_config <- config::get()

polished:::set_api_url(
  api_url = "https://auth-api-dev.polished.tech/v1",
  host_api_url = "https://host-dev.polished.tech/v1"
)

# configure polished
polished_config(
  app_name = "polished_example_01",
  api_key = app_config$api_key
)