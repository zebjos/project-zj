const express = require('express') // loads the express package
const { engine } = require('express-handlebars'); // loads handlebars for Express
const port = 8080 // defines the port
const app = express() // creates the Express application
const bodyParser = require('body-parser')
const session = require('express-session')
const sqlite3 = require('sqlite3')
const connectSqlite3 = require('connect-sqlite3')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')

// defines handlebars engine
app.engine('handlebars', engine());
// defines the view engine to be handlebars
app.set('view engine', 'handlebars');
// defines the views directory
app.set('views', './views');

// define static directory "public" to access css/ and img/
app.use(express.static('public'))

// Middleware to parse JSON and urlencoded data
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json())






// MODEL (DATA)
const db = new sqlite3.Database('mydatabase.db', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to mydatabase.db')
  }
});

//store sessions in the database
const SQLiteStore = connectSqlite3(session)

//define the session
app.use(session({
  store: new SQLiteStore({db: "session-db.db"}),
  "saveUninitialized": false,
  "resave": false,
  "secret": "123secret@sentence"
}));

db.serialize(() => {
  // Create the USER table
  db.run(`
    CREATE TABLE IF NOT EXISTS USER (
      "userID" INTEGER UNIQUE,
      "username" VARCHAR UNIQUE,
      "password" TEXT,
      PRIMARY KEY("userID" AUTOINCREMENT)
    )
  `);

  // Insert default users
  // Insert default users with hashed passwords
  const users = [
    { username: 'admin', password: 'pass' },
    { username: 'zeb', password: 'pass' },
    { username: 'bez', password: 'pass' },
    { username: 'zyzz', password: 'pass' },
    { username: 'zebra', password: 'pass' },
  ];

  users.forEach((user) => {
    bcrypt.hash(user.password, 10, function (err, hash) {
      if (err) {
        console.error('Error hashing password:', err);
      } else {
        db.run(
          'INSERT INTO USER (username, password) VALUES (?, ?)',
          [user.username, hash],
          (error) => {
            if (error) {
              console.log('ERROR: ', error);
            } else {
              console.log('User added!');
            }
          }
        );
      }
    });
  });


  // Create the COMMENTS table
  db.run(`
    CREATE TABLE IF NOT EXISTS COMMENTS (
      commentID INTEGER PRIMARY KEY AUTOINCREMENT,
      userID INTEGER,
      commentText TEXT,
      FOREIGN KEY (userID) REFERENCES USER(userID)
    )
  `);

  // Insert comments made by a user
  const someonesUserID = 4;
  const userComments = [
    'This is the first comment made on this site.',
    'Another comment.',
    'Commenting again.',
    'Fourth comment on this site.',
    'The comments keep coming in..'
  ];

  userComments.forEach((comment) => {
    db.run(`
      INSERT INTO COMMENTS (userID, commentText)
      VALUES (?, ?)
    `, [someonesUserID, comment], (error) => {
      if (error) {
        console.log("ERROR: ", error);
      } else {
        console.log("Comment added!");
      }
    });
  });

  // Create Skills Table
  db.run(`
    CREATE TABLE IF NOT EXISTS SKILLS (
      sID INTEGER PRIMARY KEY,
      sname TEXT NOT NULL,
      sdesc TEXT NOT NULL,
      stype TEXT NOT NULL
    )
  `);

// Insert initial skills
  const skills = [
    { sID: 1, sname: 'Programming', sdesc: 'Programming in C++.', stype: 'Programming language' },
    { sID: 2, sname: 'Programming', sdesc: 'Programming in C.', stype: 'Programming language' },
    { sID: 3, sname: 'Databases', sdesc: 'Aced the query part of the database exam.', stype: 'Database/SQL' },
    { sID: 4, sname: 'Maths', sdesc: 'Have taken Linear Algebra class.', stype: 'Math' },
    { sID: 5, sname: 'Maths', sdesc: 'Have taken Discrete Math class.', stype: 'Math' }
  ];

  skills.forEach((skill) => {
    db.run(`
      INSERT INTO SKILLS (sid, sname, sdesc, stype)
      VALUES (?, ?, ?, ?)
    `, [skill.sID, skill.sname, skill.sdesc, skill.stype], (error) => {
      if (error) {
        console.log("ERROR: ", error);
      } else {
        console.log("Skill added!");
      }
    });
  });
});
//DB init ends here


// CONTROLLER (THE BOSS)
// defines route "/"
app.get('/', function(request, response){
  console.log("SESSION: ", request.session);
  const model = {
    isLoggedIn: request.session.isLoggedIn,
    name: request.session.name,
    isAdmin: request.session.isAdmin,
    loggedInUser: {
      userID: request.session.userID,
      isAdmin: request.session.isAdmin  // Include userID in the model
      // Add other properties if needed
    }
  };
  response.render('home.handlebars', model);
});


app.post('/submit-comment', (req, res) => {
  const { userID, commentText } = req.body;

  // Insert the comment into the database
  db.run('INSERT INTO COMMENTS (userID, commentText) VALUES (?, ?)', [userID, commentText], (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error submitting comment');
    } else {
      res.redirect('/about');
    }
  });
});

// defines route "/about"
app.get('/about', (req, res) => {
  let comments, skills;

  // Retrieve comments from the database
  db.all('SELECT COMMENTS.commentID, USER.username, COMMENTS.commentText FROM COMMENTS INNER JOIN USER ON COMMENTS.userID = USER.userID', (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).render('about.handlebars', { errorMessage: 'Error retrieving comments' });
      return;
    }

    comments = rows;

    // Retrieve skills from the database
    db.all('SELECT * FROM SKILLS', (err, rows) => {
      if (err) {
        console.error(err.message);
        res.status(500).render('about.handlebars', { errorMessage: 'Error retrieving skills' });
        return;
      }

      skills = rows;

      const loggedInUser = {
        userID: req.session.userID,
        isAdmin: req.session.isAdmin, // Include isAdmin in the model
        // Other properties if needed...
      };

      // Render the about page with both comments and skills
      res.render('about.handlebars', { comments, skills, loggedInUser });
    });
  });
});

// Delete comment route
app.post('/delete-comment', (req, res) => {
  const { commentID } = req.body;

  // Check if the logged-in user is an admin
  if (req.session.isAdmin) {
    // Delete the comment from the database
    db.run('DELETE FROM COMMENTS WHERE commentID = ?', [commentID], (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('Error deleting comment');
      } else {
        res.redirect('/about'); // Redirect to the about page after successful deletion
      }
    });
  } else {
    res.status(403).send('Permission denied'); // Return a 403 Forbidden status if the user is not an admin
  }
});

// Update comment route
app.post('/edit-comment', (req, res) => {
  const { commentID, editedCommentText } = req.body;

  // Update the comment in the database
  db.run('UPDATE COMMENTS SET commentText = ? WHERE commentID = ?', [editedCommentText, commentID], (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error updating comment');
    } else {
      res.redirect('/about'); // Redirect to the about page after successful update
    }
  });
});


app.get('/contact', function(request, response){
  response.render('contact.handlebars')
})


app.get('/login', (req, res) => {
  res.render('login.handlebars');
});

app.get('/Maths-skill', (req, res) => {
  res.render('Maths-skill.handlebars');
});

app.get('/Databases-skill', (req, res) => {
  res.render('Databases-skill.handlebars');
});

app.get('/Programming-skill', (req, res) => {
  res.render('Programming-skill.handlebars');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM USER WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).render('login.handlebars', { errorMessage: 'Error during authentication' });
    } else if (row) {
      bcrypt.compare(password, row.password, function (compareErr, result) {
        if (compareErr) {
          console.error('Error comparing passwords:', compareErr);
          res.status(500).render('login.handlebars', { errorMessage: 'Error during authentication' });
        } else if (result) {
          req.session.isLoggedIn = true;
          req.session.name = row.username;
          req.session.isAdmin = row.username === 'admin';
          req.session.userID = row.userID;
          res.status(200).render('login.handlebars', { username: row.username });
        } else {
          console.log('Authentication failed for user:', username);
          res.status(401).render('login.handlebars', { errorMessage: 'Invalid username or password.' });
        }
      });
    } else {
      console.log('User not found:', username);
      res.status(404).render('login.handlebars', { errorMessage: 'User not found.' });
    }
  });
});

// Logout route
app.post('/logout', (req, res) => {
  // Destroy the session to log the user out
  req.session.destroy((err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error during logout');
    } else {
      res.redirect('/'); //take back to home/page to log in
    }
  });
});

// defines the final default route 404 NOT FOUND
app.use(function(req,res){
  res.status(404).render('404.handlebars');
});



// runs the app and listens to the port
app.listen(port, () => {
    console.log(`Server running and listening on port ${port}...`)
})

