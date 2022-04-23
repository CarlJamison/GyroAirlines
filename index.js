const app = require('express')();
/*var fs = require("fs");
const http = require('https').createServer(
  {
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.cert"),
  },
  app
);*/
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

var players = 1;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.get('/master', (req, res) => {
  res.sendFile(__dirname + '/CanvasTest.html');
});
app.get('/settings', (req, res) => {
  res.sendFile(__dirname + '/settings.html');
});

app.get('/canvasSocket.js', (req, res) => {
  res.sendFile(__dirname + '/canvasSocket.js');
});
app.get('/plane.png', (req, res) => {
  res.sendFile(__dirname + '/plane.png');
});
app.get('/nosleep.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/nosleep.js/dist/nosleep.js');
});

var view = io.of("/view");
var controllers = io.of("/controller")
var settings = io.of("/settings")

controllers.on('connection', (socket) => {

  var playerNumber = players;
  players++;

  socket.on('fire', msg => {
    view.emit('fire', playerNumber);
  });

  socket.on('orient-update', msg => {
    msg.player = playerNumber;
    view.emit('turn', msg);
    console.log(msg.message)
  });

  socket.on('disconnect', msg => {
    console.log("Player " + playerNumber + " disconnected: " + socket.client.conn.remoteAddress);
    view.emit('remove player', playerNumber);
  });

});

settings.on('connection', (socket) => {

  socket.on('update settings', msg => {
    view.emit('update settings', msg);
  });

  socket.on('start game', msg => {
    view.emit('start game', msg);
  });

  socket.on('reset game', msg => {
    view.emit('reset game', msg);
  });
});

http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
  });
