ui <- fluidPage(
  fluidRow(
    column(
      6,
      h1("Polished Example 01"),
      br()
    ),
    column(
      6,
      br(),
      actionButton(
        "sign_out",
        "Sign Out",
        icon = icon("sign-out-alt"),
        class = "pull-right"
      ),
      h3("SHINY_HOSTING:"),
      Sys.getenv("SHINY_HOSTING")
    ),
    column(
      12,
      verbatimTextOutput("secure_content"),
      h1("Hello"),
      DTOutput("my_table")
    )
  )
)

secure_ui(ui)
