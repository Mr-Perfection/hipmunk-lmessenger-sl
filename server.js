// https://darksky.net/dev/docs/forecast
// http://hipmunk.github.io/hipproblems/lessenger/
// https://www.npmjs.com/package/node-geocoder
 

var express       = require('express');        // call express
var multer        = require('multer');
var cors          = require('cors')
var bodyParser    = require('body-parser');
var fetch         = require('node-fetch');
var app           = express();                 // define our app using express
var upload        = multer();
var KEYS          = require('./keys.json');
// whitelist the CORS's origin (in this case, only this website)
var NodeGeocoder  = require('node-geocoder');

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

// node geocoder setup 
var options = {
  provider: 'google',

  // Optional depending on the providers
  httpAdapter: 'https', // Default
  apiKey: KEYS.google, // for Mapquest, OpenCage, Google Premier
  formatter: null         // 'gpx', 'string', ...
};

var geocoder = NodeGeocoder(options);

// keywords maps the keyword and the index that location string is at.
var keywords = new Set([
  "what's the weather in",
  "weather in",
  "weather",
]);

// helper method to get error message
function getErrorMessage(comment="Sorry, I don't understand. It seems like you didn't use our commands!") {
  return [
    {
      "type": "rich",
      "html": "<img src='https://i1.wp.com/wp-blog.hipmunk.com/wp-content/uploads/2016/08/blog-faq.gif?fit=646%2C431' width='250px'>"
    },
    {
      "type": "text",
      "text": comment,
    },
    {
      "type": "rich",
      "html": "<p><b>Ask us starting with these commands:</b></p><p>what's the weather in &lt;your Location&gt;</p><p>weather in &lt;your Location&gt;</><p>&lt;your Location&gt; weather</p>"
    },
    {
      "type": "text",
      "text": "Please, contact us at 424-212--2846 for further assistance if the problem still persists.",
    },
  ]
} 

// helper function to get commands and locations
function getCommandAndLocation(textData, start, end, reversed=false) {
  const n       = textData.length;
  let command   = '';
  let location  = ''; // location string
  
  if (reversed) {
    command = textData[n-1];
    if (keywords.has(command)) {
      location = textData.slice(start, end-1).join(' ');
    }
  } else {
    command = textData.slice(start, end-1).join(' ');
    if (keywords.has(command)) {
      location = textData.slice(end-1, n).join(' ');
    }
  }
  // console.log('command and location', command, location);
  // location will be '' if command does not exist. 
  return [command, location];  
} 

app.post('/chat/messages', cors(corsOptions), upload.fields([]), function (req, res, next) {
  console.log('this is /chat/messages');
  let formData = req.body;
  let action   = formData.action;
  let response = {};
  
  const messages = [];
  console.log('form data', formData);
  console.log('----------------------------------------------------------');

  // if action is join, welcome user!
  if (action === 'join') {
    const joinMessages = [
      {
        "type": "text",
        "text": "Hello " + formData.name + " :D"
      },
      {
        "type": "text",
        "text": "Welcome to Hipmunk. How can I assist you today?"
      },
      {
        "type": "rich",
        "html": "<p><b>Ask us starting with these commands:</b></p><p>what's the weather in &lt;your Location&gt;</p><p>weather in &lt;your Location&gt;</><p>&lt;your Location&gt; weather</p>"
      },
    ];

    response["messages"] = joinMessages;
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
  } else {
    
    // based on the challenge description, there are three possibilities:
    // case 1: (what's the weather in, <Location>)
    // case 2: (weather in, <Location>)
    // case 3: (<Location>, weather).
    // case 1, case 2, case 3
    const text      = formData.text; 
    const textData  = text.split(' ').filter(word => word.trim() != '' );
    const n         = textData.length;
    let   pair      = ['','']; // (command, location) pair

    if (n <= 1) {
      response["messages"] = getErrorMessage();
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response));
      return;
    }

    // case 1
    if (n >= 5) {
      pair = pair[1] ? pair : getCommandAndLocation(textData, 2, 4);
      pair = pair[1] ? pair : getCommandAndLocation(textData, 1, 4); // user might just say the waether in <location>
      pair = pair[1] ? pair : getCommandAndLocation(textData, 2, 4); // user might just say waether in <location>
    }

    // case 2
    if (n >= 3) {
      pair = pair[1] ? pair : getCommandAndLocation(textData, 0, 3);
    }

    // case 3
    pair = pair[1] ? pair : getCommandAndLocation(textData, 0, textData.length, true);
    
    // command is invalid?
    if (!pair[1]) {
      response["messages"] = getErrorMessage();
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response));
      return;
    }

    // command is valid! 
    geocoder.geocode(pair[1])
      .then(function(data) {
        // console.log(data);
        // const test = `${data[0].latitude} ${data[0].longitude}`
        // messages.push(
        //   {
        //     "type": "text",
        //     "text": test
        //   }
        // );
        let info = {
          "type": "rich",
          "html": "",
        };
        
        fetch(`https://api.darksky.net/forecast/${KEYS.darksky}/${data[0].latitude},${data[0].longitude}`)
        .then(function(data) {
          return data.json();
        }).then(function(data) {
          
          const currentData = data.currently;
          console.log(currentData);
          info['html'] = `<p><b>The current weather</b> is ${currentData.summary}.</p> <p><b>Temperature</b> is ${currentData.temperature}</p>`;
          response["messages"] = [info];
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify(response));
        });
    })
    .catch(function(err) {
      console.log(err);
      
      response["messages"] = getErrorMessage('Hmm, it seems like you have entered a wrong address! Please, enter a valid address or contact us at 424-212-2846.');
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response));
    });
  }
});


app.listen(9000, function () {
  console.log('CORS-enabled web server listening on port 9000')
})