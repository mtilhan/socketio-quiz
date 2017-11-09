// creating global parameters and start
// listening to 'port', we are creating an express
// server and then we are binding it with socket.io
var express 	= require('express'),
	app			= express(),
    server  	= require('http').createServer(app),
    io      	= require('socket.io').listen(server),
    port    	= 8080,
    // hash object to save clients data,
    // { socketid: { clientid, nickname }, socketid: { ... } }
    chatClients = new Object();

// listening to port...
server.listen(port);

var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : ':/cloudsql/meteilhan-wp:europe-west1:meteilhan-sql2',
  user     : '',
  password : '',
  database : 'quiz'
});

/*

*/

connection.connect();

// configure express, since this server is
// also a web server, we need to define the
// paths to the static files
app.use("/styles", express.static(__dirname + '/public/styles'));
app.use("/", express.static(__dirname + '/'));
//app.use("/images", express.static(__dirname + '/images'));

// serving the main applicaion file (index.html)
// when a client makes a request to the app root
// (http://localhost:8080/)
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

// sets the log level of socket.io, with
// log level 2 we wont see all the heartbits
// of each socket but only the handshakes and
// disconnections
io.set('log level', 2);

// setting the transports by order, if some client
// is not supporting 'websockets' then the server will
// revert to 'xhr-polling' (like Comet/Long polling).
// for more configurations got to:
// https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
io.set('transports', [ 'websocket','flashsocket', 'xhr-polling' ]);

// socket.io events, each connection goes through here
// and each event is emited in the client.
// I created a function to handle each event
io.sockets.on('connection', function(socket){
	
	// after connection, the client sends us the 
	// nickname through the connect event
	
	socket.on('connect', function(data){
			connect(socket, data);
	});

	// when a client sends a messgae, he emits
	// this event, then the server forwards the
	// message to other clients in the same room
	socket.on('chatmessage', function(data){
		chatmessage(socket, data);
	});
	
	// client subscribtion to a room
	socket.on('loginGame', function(data){
		loginGame(socket, data);
	});
	
	// client subscribtion to a room
	socket.on('selectAnswer', function(data){
		selectAnswer(socket, data);
	});
	
	// when a client calls the 'socket.close()'
	// function or closes the browser, this event
	// is built in socket.io so we actually dont
	// need to fire it manually
	socket.on('disconnect', function(){
		disconnect(socket);
	});
});

// create a client for the socket
function connect(socket, data){
	//generate clientId
	data.clientId = generateId();
	
	// save the client to the hash object for
	// quick access, we can save this data on
	// the socket with 'socket.set(key, value)'
	// but the only way to pull it back will be
	// async
	
	//chatClients[socket.id] = data;
	
	socket.nickname=data.nickname;
	socket.clientId=data.clientId;
	socket.roomID=0;
	// now the client objtec is ready, update
	// the client
	socket.emit('ready', { clientId: socket.id,clientName:data.nickname });
	
	// auto subscribe the client to the 'lobby'
	//subscribe(socket, { room: 'lobby' });

	// sends a list of all active rooms in the
	// server
	//socket.json.emit('roomslist', { rooms: getRooms2() });
	

	//socket.emit('roomslist', { rooms: getRooms() });
}



// when a client disconnect, unsubscribe him from
// the rooms he subscribed to
function disconnect(socket){

	var game=io.sockets.manager.rooms['/' +socket.roomID];
	//oda kontrol
	if(game==undefined || game.cancel==1){
		console.log("oda kapatılmış");
		clearTimeout(this);
		return;
	}
	
	if(game.answeredQuestion!=game.maxQuestion){
		game.cancel=1;
		if(socket.id==game.player1.id){
			io.sockets.in(socket.roomID).json.emit('onPlayerOut', {playerType:"1"});
		}
		if(socket.id==game.player2.id){
			io.sockets.in(socket.roomID).json.emit('onPlayerOut', {playerType:"2"});
		}
	}
	
	// get a list of rooms for the client
	
	/*
	var rooms = io.sockets.manager.roomClients[socket.id];
	
	// unsubscribe from the rooms
	for(var room in rooms){
		if(room && rooms[room]){
			unsubscribe(socket, { room: room.replace('/','') });
		}
	}*/

	// client was unsubscribed from the rooms,
	// now we can selete him from the hash object
}

function loginGame(socket, data){
	//var olan oyunlarda dolu olmayanlar񠢵l
	var roomID;
	
	var rooms    = Object.keys(io.sockets.manager.rooms), roomMap = []; 

    rooms.forEach(function (room, i) {
		if(io.sockets.manager.rooms[room].ready==0){
			roomMap.push({ value: room,count:io.sockets.manager.rooms[room].ready});
		}
    });

	if(roomMap.length!=0){
		console.log("v1");
		var parts = roomMap[0].value.split('/');
		roomID=parts[1];
	}else{
		console.log("v2");
		roomID=generateId();
	}
	
	//bo򠯤a yoksa yeni oda a犊	socket.join(roomID);
	var game=io.sockets.manager.rooms['/' + roomID];
	game.currentQues={};//soru nesnesi
	game.enableAnswer=0;//0 cevap verilemez 1 cevap verilebilir
	game.timerID=0;//sorunun timer idsi
	game.p1_answer="";//1. oyuncu cevab񊉧ame.p2_answer="";//2. oyuncu cevab񊉧ame.p1_score=0;//1. oyuncu puan񊉧ame.p2_score=0;//2. oyuncu puan񊉧ame.maxQuestion=3;
	game.answeredQuestion=0;
	game.cancel=0;//Kullanıcılardan herhangi biri oyun bitmeden çıkarsa 1 olur
	
	if(game.player1==null){
		game.player1=socket;
		game.player2={id:null,nickname:null};
		game.ready=0;
	}else{
		game.player2=socket;
		game.ready=1;
	}
	/*
	if(game.player1!=undefined && game.player2!=null){
		game.ready=1;
	}else{
		game.ready=1;
	}*/
	
	
	socket.roomID=roomID;
	//game.ready=1;
	
	//socket.emit('ready', { clientId: data.clientId,clientName:data.nickname });
	
	io.sockets.in(roomID).json.emit('onGameLogin', { roomID: roomID, player1_id:game.player1.id, player1_name:game.player1.nickname, player2_id:game.player2.id,player2_name: game.player2.nickname,ready:game.ready });
	
	//setInterval(startGame(roomID), 3000);
	if(game.ready==1){
		setInterval(startGame, 6000,roomID);
	}
	//generateId
}


function startGame(roomID){
	askQuestion(roomID);
	clearTimeout(this);
	//console.log("It's been one second!"+roomID);

}

function askQuestion(roomID){
	var game=io.sockets.manager.rooms['/' + roomID];
	//oda kontrol
	if(game==undefined || game.cancel==1){
		console.log("oda kapatılmış");
		clearTimeout(this);
		return;
	}
	var question={id:0,text:"",ansA:"",ansB:"",ansC:"",ansD:"",correct:""};
	
	//test soru
	/*
	question.id=123;
	question.text="Fenerbahçe kuruluş yılı aşağıdakilerden hangisidir?";
	question.ansA="1903";
	question.ansB="1905";
	question.ansC="1907";
	question.ansD="1901";
	question.correct="C";
	*/
	//***
	
	//mysql soru
	
	connection.query('SELECT * FROM `mtquestions` WHERE id >= (SELECT FLOOR( MAX(id) * RAND()) FROM `mtquestions` ) ORDER BY id LIMIT 1;', function(err, rows, fields) {
	  if (err) throw err;
	    //console.log('The solution is: ', rows[0].qText);
		question.id=123;
		question.text=rows[0].qText;
		question.ansA=rows[0].ansA;
		question.ansB=rows[0].ansB;
		question.ansC=rows[0].ansC;
		question.ansD=rows[0].ansD;
		question.correct=rows[0].correct;
		
		game.question=question;
		game.enableAnswer=1;
		game.p1_answer="";
		game.p2_answer="";

		io.sockets.in(roomID).json.emit('getQuestion', {qText:question.text,ansA:question.ansA,ansB:question.ansB,ansC:question.ansC,ansD:question.ansD});
		game.timerID=setInterval(questionTimer, 10000,roomID);
		//connection.destroy();
	});
	
	//****
	/*
	game.question=question;
	game.enableAnswer=1;
	game.p1_answer="";
	game.p2_answer="";

	io.sockets.in(roomID).json.emit('getQuestion', {qText:question.text,ansA:question.ansA,ansB:question.ansB,ansC:question.ansC,ansD:question.ansD});
	game.timerID=setInterval(questionTimer, 10000,roomID);*/
	clearTimeout(this);
}

function questionTimer(roomID){
	var game=io.sockets.manager.rooms['/' +roomID];
	//oda kontrol
	if(game==undefined || game.cancel==1){
		console.log("oda kapatılmış");
		clearTimeout(this);
		return;
	}
	var winner=0;
	var gameEnd=0;
	

	//kim kazandı
	if(game.p1_answer==game.question.correct && game.p2_answer!=game.question.correct){
		winner=1;
		game.p1_score++;
	}
	if(game.p1_answer!=game.question.correct && game.p2_answer==game.question.correct){
		winner=2;
		game.p2_score++;
	}
	if(game.p1_answer==game.question.correct && game.p2_answer==game.question.correct){
		winner=0;
	}
	
	//Oyun bittimi yoksa devammı edecek
	game.answeredQuestion++;
	if(game.answeredQuestion==game.maxQuestion){
		gameEnd=1;
		gameOver(roomID);
	}else{
		game.timerID=setInterval(askQuestion, 10000,roomID);
	}
	
	io.sockets.in(roomID).json.emit('questionTimeUp', {winner:winner,correct:game.question.correct,p1_answer:game.p1_answer,p2_answer:game.p2_answer,gameEnd:gameEnd,p1_score:game.p1_score,p2_score:game.p2_score});
	clearTimeout(this);
}

function selectAnswer(socket, data){
	var game=io.sockets.manager.rooms['/' +socket.roomID];
	//oda kontrol
	if(game==undefined || game.cancel==1){
		console.log("oda kapatılmış");
		clearTimeout(this);
		return;
	}
	var answer="";
	
	if(data.choice==0){
		answer="A";
	}
	if(data.choice==1){
		answer="B";
	}
	if(data.choice==2){
		answer="C";
	}
	if(data.choice==3){
		answer="D";
	}
	
	if(socket.id==game.player1.id){
		//console.log("player 1");
		game.p1_answer=answer;
		
	}else if(socket.id==game.player2.id){
		//console.log("player 2");
		game.p2_answer=answer;
	}
}

function gameOver(roomID){

}


// unsubscribe a client from a room, this can be
// occured when a client disconnected from the server
// or he subscribed to another room
function unsubscribe(socket, data){
	// update all other clients about the offline
	// presence
	updatePresence(data.room, socket, 'offline');
	
	// remove the client from socket.io room
	socket.leave(data.room);

	// if this client was the only one in that room
	// we are updating all clients about that the
	// room is destroyed
	if(!countClientsInRoom(data.room)){

		// with 'io.sockets' we can contact all the
		// clients that connected to the server
		io.sockets.emit('removeroom', { room: data.room });
	}
}


// unique id generator
function generateId(){
	var S4 = function () {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

// show a message in console
console.log('Chat server is running and listening to port %d...', port);
