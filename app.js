const express = require('express') // loads the express package
const { engine } = require('express-handlebars'); // loads handlebars for Express
const port = 8080 // defines the port
const app = express() // creates the Express application

// defines handlebars engine
app.engine('handlebars', engine());
// defines the view engine to be handlebars
app.set('view engine', 'handlebars');
// defines the views directory
app.set('views', './views');

// define static directory "public" to access css/ and img/
app.use(express.static('public'))

// MODEL (DATA)
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database('mydatabase.db')

const humans = [
    {"id": "0", "name": "Jerome"}, 
    {"id": "1", "name": "Mira"},
    {"id": "2", "name": "Linus"}, 
    {"id": "3", "name": "Susanne"}, 
    {"id": "4", "name": "Jasmin"}, 
]

// CONTROLLER (THE BOSS)
// defines route "/"
app.get('/', function(request, response){
  response.render('home.handlebars')
})

// defines route "/contact"
app.get('/contact', function(request, response){
  const model = { listHumans: humans } // defines the model
  // in the next line, you should send the abovedefined 
  // model to the page and not an empty object {}...
  response.render('contact.handlebars', model)
})


// defines route "/about"
app.get('/about', function(request, response){
  const model = humans[1] // defines the model
  // in the next line, you should send the abovedefined 
  // model to the page and not an empty object {}...
  response.render('about.handlebars', model)
})

// defines the final default route 404 NOT FOUND
app.use(function(req,res){
  res.status(404).render('404.handlebars');
});


// runs the app and listens to the port
app.listen(port, () => {
    console.log(`Server running and listening on port ${port}...`)
})

