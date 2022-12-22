import express from 'express'
import plb, { get_sessions_data } from '../../index.js'
import htmlExpress from 'html-express-js'

const app = express()

const proxy = await polishedProxy({
  appDir: '../shiny_w_polished',
  maxSessions: 2
})

// set up engine
app.engine(
  'js',
  htmlExpress({
    includesDir: 'includes', // where all includes reside
  })
);
// use engine
app.set('view engine', 'js');

// set directory where all index.js pages are served
app.set('views', './public')

app.get("/polished-proxy", (req, res) => {
  
  // TODO: could check that user is an admin here

  const dat = get_sessions_data(proxy.shinyApp)
  
  res.render('dashboard', dat);
  
  
})

app.use(proxy.middleware)

app.listen(8080)
