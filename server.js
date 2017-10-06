var express       = require('express');        // call express
var cors          = require('cors')
var bodyParser    = require('body-parser');
var multer        = require('multer');
var app           = express();        
var upload        = multer();        
var KEYS          = require('./keys.json');

// whitelist the CORS's origin
// cors setup 
var whitelist = ['http://hipmunk.github.io', 'http://hipmunk.github.io/hipproblems/lessenger']

var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

app.post('/chat/messages', cors(corsOptions), upload.fields([]), function (req, res, next) {
  console.log('this is /chat/messages');
})

app.listen(9000, function () {
  console.log('CORS-enabled web server listening on port 9000')
})