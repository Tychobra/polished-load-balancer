import express from 'express'
import plb, { get_sessions_data } from '../../index.js'

const app = express()

const proxy = await plb({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})


// set the view engine to ejs
app.set('view engine', 'ejs');


app.get("/polished-proxy", (req, res) => {
  
  // TODO: could check that user is an admin here

  //const dat = get_sessions_data(proxy.shinyApp)
  //console.log("dat: ", dat)
  res.render('dashboard')
  
})

app.use(proxy.middleware)

app.listen(8080)
