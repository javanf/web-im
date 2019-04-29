var ws = require("nodejs-websocket");
var moment = require('moment');

console.log("开始建立连接...")

let users = [];
let conns = {};

function boardcast(obj) {
  if(obj.bridge && obj.bridge.length){
    obj.bridge.forEach(item=>{
      conns[item].sendText(JSON.stringify(obj));
    })
    return;
  }
  server.connections.forEach((conn, index) => {
      conn.sendText(JSON.stringify(obj));
  })
}

var server = ws.createServer(function(conn){
  conn.on("text", function (obj) {
    obj = JSON.parse(obj);
    conns[''+obj.uid+''] = conn;
    if(obj.type===1){
      let isuser = users.some(item=>{
        return item.uid === obj.uid
      })
      if(!isuser){
        users.push({
          nickname: obj.nickname,
          uid: obj.uid
        });
      }
      boardcast({
        type: 1,
        date: moment().format('YYYY-MM-DD HH:mm:ss'),
        msg: obj.nickname+'加入聊天室',
        users: users,
        uid: obj.uid,
        nickname: obj.nickname,
        bridge: obj.bridge
      });
    } else {
      boardcast({
        type: 2,
        date: moment().format('YYYY-MM-DD HH:mm:ss'),
        msg: obj.msg,
        uid: obj.uid,
        nickname: obj.nickname,
        bridge: obj.bridge
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