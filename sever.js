const crypto = require('crypto');
const { name } = require('ejs');
const e = require('express');
const express = require('express');
const { createServer } = require('http');
const { type } = require('os');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

const server = createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = [];

wss.on('connection', function(ws) {
  console.log("client joined.");

  ws.on('message', message => {
    try {
      const jsonString = message.toString();
      const jsonObject = JSON.parse(jsonString);
      switch (jsonObject.type) {
        case "CreateRoom": {
          createRoom(ws, jsonObject.playerId, jsonObject.roomName, jsonObject.maxPlayers);  
          break;
        }
        case "JoinRoom": {
            joinRoom(ws, jsonObject.playerId, jsonObject.roomName);
          break;
        }
        case "LeaveRoom": {
          leaveRoom(ws, jsonObject.playerId, jsonObject.roomName);
        }
      }
    }
    catch (e) {
      console.log(e);
    }    
  });

  ws.on('close', function() {
    console.log("client left.");
  });
});

function createRoom(ws, playerId, roomName, maxNumber) {
  const room = rooms.find(item => item.name === roomName);
  if (room)
  {
    //Create responce for room creation failled
    const responce = {
      type : "Room_Create_Failed",
      name : roomName,
      roomPlayers : 0,
      maxPlayers : 0,
      isRoomFull : false,
    };

    //sedn data to client
    const jsonString = JSON.stringify(responce);
    const binaryData = Buffer.from(jsonString);
    ws.send(binaryData);
  }
  else
  {
    //Add room to collection
    rooms.push({
      name: roomName,
      numberOfPeople: 1,
      maxNumberOfPeople: maxNumber,
      full: false,
      players: {
        [playerId]: ws
      }
    });

    //Create responce for success room creation
    const responce = {
      type : "Room_Create_Success",
      name : roomName,
      roomPlayers : 1,
      maxPlayers : maxNumber,
      isRoomFull : false,
    };
    
    //Send data to client
    const jsonString = JSON.stringify(responce);
    const binaryData = Buffer.from(jsonString);
    ws.send(binaryData);
  }
}

function joinRoom(ws, playerId, roomName) {
  
  const room = rooms.find(item => item.name === roomName);
  
  if(room && room.full == false)
  {  
    //Add player to the room
    room.numberOfPeople += 1;    
    room.players[playerId] = ws;
    if(room.numberOfPeople == room.maxNumberOfPeople) room.full = true;

    //Create responce for success join room
    const responce = {
      type : "Room_Join_Success",
      name : roomName,
      roomPlayers : room.numberOfPeople,
      maxPlayers : room.maxNumberOfPeople,
      isRoomFull : room.full, 
    }
    
    //Send data to client
    const jsonString = JSON.stringify(responce);
    const binaryData = Buffer.from(jsonString);
    ws.send(binaryData);

    //Request for room update
    updateRoom(roomName);
  }
  else if(room && room.full == true)
  {
    const responce = {
      type: "Room_Join_Failed_Full",
      name: roomName,
      roomPlayers : room.numberOfPeople,
      maxPlayers : room.maxNumberOfPeople,
      isRoomFull : room.full,
    };
    const jsonString = JSON.stringify(responce);
    const binaryData = Buffer.from(jsonString);
    ws.send(binaryData);
  }
  else
  {
    const responce = {
      type: "Room_Join_Failed_Error",
      name: roomName,
      roomPlayers : 0,
      maxPlayers : 0,
      isRoomFull : false,
    };
    const jsonString = JSON.stringify(responce);
    const binaryData = Buffer.from(jsonString);
    ws.send(binaryData);
  }
}

function leaveRoom(ws, playerId, roomName) {
  const room = rooms.find(item => item.name === roomName);
  if (room) {
    room.numberOfPeople -= 1;
    room.full = false;
    delete room.players[playerId];
    if (room.numberOfPeople == 0)
    {
      const index = rooms.indexOf(room);
      rooms.splice(index, 1);
    }

    const responce = {
      type: "Room_Leave_Success",
      name: roomName,
      roomPlayers: 0,
      maxPlayers: 0,
      isRoomFull: false
    };
    const jsonString = JSON.stringify(responce);
    const binaryData = Buffer.from(jsonString);
    ws.send(binaryData);

    updateRoom(roomName);
  }
  else {
    const responce = {
      type: "Room_Leave_Failed",
      name: roomName,
      roomPlayers: 0,
      maxPlayers: 0,
      isRoomFull: false
    };
    const jsonString = JSON.stringify(responce);
    const binaryData = Buffer.from(jsonString);
    ws.send(binaryData);
  }
}

function updateRoom(roomName) {
  const room = rooms.find(item => item.name === roomName)
  if(!room) {
    console.log("ROOM NOT FOUND");
    return;
  }
  Object.keys(room.players).forEach(client => {
    const responce = {
      type: "Room_Updated",
      name: roomName,
      roomPlayers : room.numberOfPeople,
      maxPlayers : room.maxNumberOfPeople,
      isRoomFull : room.full,
    };

    const jsonString = JSON.stringify(responce);
    const binaryData = Buffer.from(jsonString);
    room.players[client].send(binaryData);
  });
}

server.listen(port, function() {
  console.log(`Listening on http://localhost:${port}`);
});