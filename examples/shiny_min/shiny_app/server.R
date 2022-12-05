server <- function(input, output, session) {

  #output$secure_content <- renderPrint({
  # session$userData$user()
  #})


  #observeEvent(input$sign_out, {
#
#   sign_out_from_shiny(session)
#   session$reload()
#
#  })

  output$my_table <- renderDT({
    datatable(iris)
  })

  invisible(NULL)
}

server
