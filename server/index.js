var ws = require("nodejs-websocket");
var moment = require('moment');

console.log("开始建立连接...")

let users = [];

function boardcast(obj) {
  server.connections.forEach(function(conn) {
      conn.sendText(JSON.stringify(obj));
  })
}

var server = ws.createServer(function(conn){
  conn.on("text", function (obj) {
    obj = JSON.parse(obj);
    if(obj.type===1){
      users.push({
        nickname: obj.nickname,
        uid: obj.uid
      });
      boardcast({
        type: 1,
        date: moment().format('YYYY-MM-DD HH:mm:ss'),
        msg: obj.nickname+'加入聊天室',
        users: users,
        uid: obj.uid,
        nickname: obj.nickname
      });
    } else {
      boardcast({
        type: 2,
        date: moment().format('YYYY-MM-DD HH:mm:ss'),
        msg: obj.msg,
        uid: obj.uid,
        nickname: obj.nickname
      });
    }
  })
  conn.on("close", function (code, reason) {
    console.log("关闭连接")
  });
  conn.on("error", function (code, reason) {
    console.log("异常关闭")
  });
}).listen(8001)
console.log("WebSocket建立完毕")