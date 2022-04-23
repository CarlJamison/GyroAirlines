var image
var radians = [];
var planeLocations = [];
var actualPlaneVectors = [];
var planeControls = [];
var planeSpeed = [];
var planeAcceleration = [];
var bullets = [];
var playerColors = [
	"#32a852",
	"#00d5ff",
	"#ff00fb",
	"#ff0000",
	"#f2ff00",
	"#ff9d00",
	"#1500ff",
	"#c300ff"
];

var SIZE = 100;
var SPEED = 2;
var MAX_SPEED = 5;
var MAN_DEN = 1;
var BULLET_SPEED = 30;
var MAX_BULLETS = 1000;
var game = {active: false, players: []};

window.onload = function init(){
	var noSleep = new NoSleep();
	var socket = io("/view");
	
	noSleep.enable();
	var canvas = document.getElementById("myCanvas");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 10;
	var ctx = canvas.getContext("2d");
	ctx.lineWidth = 0;
	ctx.font = '40px segoe ui black';

	image = new Image();
	image.src = 'plane.png';
	image.onload = window.setInterval(runFrame, 10);

	socket.on('remove player', function(player) {
		bullets[player] = null;
		planeLocations = planeLocations.filter(p => p.index != player);
	});

	socket.on('start game', function(length) {
		game.START_TIME = (new Date()).getTime() + 3000;
		game.END_TIME = game.START_TIME + (length * 1000);
		game.players = [];
		game.active = true;
		game.started = false;
		game.completed = false;
	});

	socket.on('reset game', function(length) {
		game.active = false;
	});

	socket.on('turn', function(event) {
		if(!planeLocations.some(l => l.index == event.player)){
			planeLocations.push({x: 500, y: 500, index: event.player});
			planeSpeed[event.player] = SPEED;
			actualPlaneVectors[event.player] = {x: 0, y: 0};
			if(!playerColors[event.player]){
				playerColors[event.player] = '#' + Math.floor(Math.random()*16777215).toString(16);
			}
			bullets[event.player] = [];
		}
		planeControls[event.player] = event.direction;
		planeAcceleration[event.player] = event.acceleration;
	});

	socket.on('fire', function(player) {
		if(!bullets[player]){
			bullets[player] = [];
		}

		if(bullets[player].length < MAX_BULLETS){
			bullets[player].push({
				xL: planeLocations.find(x => x.index == player).x,
				yL: planeLocations.find(x => x.index == player).y,
				xV: actualPlaneVectors[player].x * BULLET_SPEED,
				yV: actualPlaneVectors[player].y * BULLET_SPEED
			});
		}
	});

	socket.on('update settings', function(settings) {
		SIZE = settings.SIZE;
		SPEED = settings.SPEED;
		MAX_SPEED = settings.MAX_SPEED;
		MAN_DEN = settings.MAN_DEN;
		BULLET_SPEED = settings.BULLET_SPEED;
		MAX_BULLETS = settings.MAX_BULLETS;
	});
}

function runFrame(){
	
	var canvas = document.getElementById("myCanvas");
	var ctx = canvas.getContext("2d");
	ctx.fillStyle = '#f0f0f0'
  	ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

	if(game.active){
		ctx.fillStyle = '#2e2e2e';
		var currentTime = (new Date()).getTime()

		if(!game.started){
			var timeTillStart = game.START_TIME - currentTime;

			ctx.fillText("GAME START IN " + Math.ceil(timeTillStart / 1000) + " . . .", 50, 75, 1000);

			if(timeTillStart < 0){
				game.started = true;
			}
		}else if(!game.completed){
			var timeRemaining = game.END_TIME - currentTime;
			ctx.fillText(Math.ceil(timeRemaining / 1000), 50, 75, 1000);
			
			displayScores();
			if(timeRemaining < 0){
				game.completed = true;
			}
		}else{
			ctx.fillText("GAME OVER", 50, 75, 1000);
			displayScores();
		}
	}

	planeLocations.forEach(player => {
		bullets[player.index] = bullets[player.index].filter(b => 
			b.xL < canvas.clientWidth && b.xL > 0 &&
			b.yL < canvas.clientHeight && b.yL > 0);

		bullets[player.index].forEach(b => {
			
			planeLocations.forEach(p => {
				if(p.index != player.index && Math.pow(p.x - b.xL, 2) + Math.pow(p.y - b.yL, 2) < Math.pow(SIZE / 2, 2)){
					killPlane(p.index, player.index);
				}
			});

			ctx.fillStyle = playerColors[player.index];
			b.xL += b.xV;
			b.yL -= b.yV;
			
			ctx.beginPath();
			ctx.arc(b.xL, b.yL, 3, 0, 2 * Math.PI, false);
			ctx.fill()

		});
	});

	planeLocations.forEach(location =>{
		location.x += actualPlaneVectors[location.index].x;
		location.y -= actualPlaneVectors[location.index].y;

		var speed = planeSpeed[location.index];
		speed += planeAcceleration[location.index] * 0.1;
		if(speed > MAX_SPEED) speed = MAX_SPEED;
		if(speed < 0.01) speed = 0.01;
		planeSpeed[location.index] = speed;
		
		var oldX = actualPlaneVectors[location.index].x;
		var oldY = actualPlaneVectors[location.index].y;
		if(!oldX && !oldY){
			oldX = 1;
			oldY = 1;
		}
		
		var newX = oldX + (oldY * 0.001 * planeControls[location.index] * MAN_DEN);
		var newY = oldY + (-oldX * 0.001 * planeControls[location.index] * MAN_DEN);
		//Normalize Vector
		var ratio = Math.sqrt(((newX * newX) + (newY * newY)) / (speed * speed));
		
		newX /= ratio;
		newY /= ratio;

		actualPlaneVectors[location.index].x = newX;
		actualPlaneVectors[location.index].y = newY;

		if(location.x > canvas.clientWidth){
			location.x -= canvas.clientWidth;
		}else if(location.x < 0){
			location.x += canvas.clientWidth
		}

		if(location.y > canvas.clientHeight){
			location.y -= canvas.clientHeight;
		}else if(location.y < 0){
			location.y += canvas.clientHeight
		}

		ctx.translate(location.x, location.y);
		ctx.rotate(-Math.atan2(actualPlaneVectors[location.index].y, actualPlaneVectors[location.index].x)); 
		
		ctx.drawImage(image, -(SIZE / 2), -(SIZE / 2), SIZE, SIZE);
		ctx.fillStyle = playerColors[location.index];
		ctx.beginPath();
		ctx.arc(SIZE * .42, 0, SIZE / 20, 0, 2 * Math.PI, false);
		ctx.fill();
		ctx.fillRect(-(SIZE * 0.4), -(SIZE / 20), (SIZE * 0.8), SIZE / 10);

		ctx.rotate(Math.atan2(actualPlaneVectors[location.index].y, actualPlaneVectors[location.index].x)); 
		ctx.translate(-location.x, -location.y);
	});

	function killPlane(victim, killer){
		var plane = planeLocations.find(p => p.index == victim)
		var canvas = document.getElementById("myCanvas");
		plane.x = Math.random() * canvas.clientWidth;
		plane.y = Math.random() * canvas.clientHeight;

		if(game.active && game.started && !game.completed){
			if(!game.players[victim]){
				game.players[victim] = {player: victim, kills: 0, deaths: 0}
			}
			if(!game.players[killer]){
				game.players[killer] = {player: killer, kills: 0, deaths: 0}
			}

			game.players[victim].deaths++;
			game.players[killer].kills++;
		}
	}

	function displayScores(){
		var ranking = 1;
		var scores = game.players.slice().sort((a, b) => b.kills - a.kills);
		scores.forEach(score => {
			ctx.fillStyle = playerColors[score.player];
			ctx.fillText(ranking + ": Player " + score.player
				 + " (" + score.kills + " Kills, " + score.deaths
				 + " Deaths) ", 50, 75 + (ranking * 50), 1000);
			ranking++;
		})
	}
	
}