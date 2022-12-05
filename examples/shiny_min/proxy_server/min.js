import express from 'express'

const app = express()



app.get("/favicon.ico", (req, res) => {
  res.status(404).json({message: "not found"})
})


app.get("/", (req, res) => {

  res.json({message: "hi"})
})

app.listen(8081)

