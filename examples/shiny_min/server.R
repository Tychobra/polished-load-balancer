function(input, output, session) {


  output$my_table <- renderDT({
    datatable(iris)
  })

  invisible(NULL)
}
