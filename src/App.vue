<template>
  <div id="app">
    <c-dialog
      ref="loginDialog"
      title='请输入你的昵称'
      confirmBtn="开始聊天"
      @confirm="login"
    >
      <input class="nickname" v-model="nickname" type="text" placeholder="请输入你的昵称">
    </c-dialog>

    <c-dialog
      ref="createGroupDialog"
      title='请输入群名称'
      confirmBtn="确认"
      @confirm="createGroup"
    >
      <input class="nickname" v-model="groupName" type="text" placeholder="请输入群名称">
    </c-dialog>

    <div class="web-im">
      <div class="dis-flex">
        <div class="user-list">
          <div class="user create-group-btn" @click="$refs.createGroupDialog.show()">新建群</div>
          <div class="user" @click="triggerGroup(item)" v-for="item in groups">
            {{item.name}}
            <span class="tips-num">{{getGroupMsgNum(item)}}</span>
            <span v-if="!checkUserIsGroup(item)" @click.stop="addGroup(item)" class="add-group">+</span>
          </div>
          <div class="user" @click="triggerPersonal(item)" v-if="item.uid!=uid" v-for="item in users">
            {{item.nickname}}
            <span class="tips-num">{{getUserMsgNum(item)}}</span>
          </div>
          
        </div>
        <div class="msg-content">
          <div class="header im-title">{{title}}</div>
            <div class="content im-record">
              <div class="li" :class="{user: item.uid == uid}" v-for="item in currentMessage">
                <template v-if="item.type===1">
                  <p class="join-tips">{{item.msg}}</p>
                </template>
                <template v-else>
                  <div class="img">{{item.nickname}}</div>
                  <p class="message-box">{{item.msg}}</p>
                </template>
              </div>
            </div>
            <div class="footer im-input">
              <input type="text" v-model="msg" placeholder="请输入内容">
              <button @click="send">发送</button>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'


export default {
  name: 'App',
  components: {
    'c-dialog': Vue.extend(require('@/components/dialog/index.vue').default)
  },
  data(){
    return {
      title: '请选择群或者人员进行聊天',
      uid: '',
      nickname: '',
      socket: '',
      msg: '',
      messageList: [],
      users: [],
      groups: [],
      groupId: '',
      bridge: []
    }
  },
  mounted() {
    let vm = this;
    let user = localStorage.getItem('WEB_IM_USER');
    user = user && JSON.parse(user) || {};
    vm.uid = user.uid;
    vm.nickname = user.nickname;

    if(!vm.uid){
      vm.$refs.loginDialog.show()
    } else {
      vm.conWebSocket();
    }

    document.onkeydown = function (event) {
        var e = event || window.event;
        if (e && e.keyCode == 13) { //回车键的键值为13
            vm.send()
        }
    }
    
  },
  computed: {
    currentMessage() {
      let vm = this;
      let data = vm.messageList.filter(item=>{
        if(this.groupId) {
          return item.groupId === this.groupId
        } else if(item.bridge.length){
          return item.bridge.sort().join(',') == vm.bridge.sort().join(',')
        }
      })
      data.map(item=>{
        item.status = 0
        return item;
      })
      return data;
    }
  },
  methods: {
    addGroup(item){
      this.socket.send(JSON.stringify({
        uid: this.uid,
        type: 20,
        nickname: this.nickname,
        groupId: item.id,
        groupName: item.name,
        bridge: []
      }));
      this.$message({type: 'success', message: `成功加入${item.name}群`})
    },
    checkUserIsGroup (item) {
      return item.users.some(item=>{
        return item.uid === this.uid
      })
    },
    createGroup(){
      this.socket.send(JSON.stringify({
        uid: this.uid,
        type: 10,
        nickname: this.nickname,
        groupName: this.groupName,
        bridge: []
      }));
    },
    getGroupMsgNum(group){
      return this.messageList.filter(item=>{
        return item.groupId === group.id && item.status === 1
      }).length
    },
    getUserMsgNum(user){
      return this.messageList.filter(item=>{
        return item.bridge.length && item.uid === user.uid && item.status === 1
      }).length
    },
    triggerGroup(item) {
      let issome = item.users.some(item=>{
        return item.uid === this.uid
      })
      if(!issome){
        this.$message({type: 'error', message: `您还不是${item.name}群成员`})
        return
      }
      this.bridge = [];
      this.groupId = item.id;
      this.title = `和${item.name}群成员聊天`;
    },
    triggerPersonal(item) {
      if(this.uid === item.uid){
        return;
      }
      this.groupId = '';
      this.bridge = [this.uid, item.uid];
      this.title = `和${item.nickname}聊天`;
    },
    send(){
      if(!this.msg){
        return
      }
      if(!this.bridge.length && !this.groupId){
        this.$message({type: 'error', message: '请选择发送人或者群'})
        return;
      }
      this.sendMessage(2, this.msg)
    },
    sendMessage(type, msg){
      this.socket.send(JSON.stringify({
        uid: this.uid,
        type: type,
        nickname: this.nickname,
        msg: msg,
        bridge: this.bridge,
        groupId: this.groupId
      }));
      this.msg = '';
    },
    conWebSocket(){
      let vm = this;
      if(window.WebSocket){
        vm.socket = new WebSocket('ws://localhost:8001');
        let socket = vm.socket;

        socket.onopen = function(e){
          console.log("连接服务器成功");
          vm.$message({type: 'success', message: '连接服务器成功'})
          if(!vm.uid){
            vm.uid = 'web_im_' + moment().valueOf();
            localStorage.setItem('WEB_IM_USER', JSON.stringify({
              uid: vm.uid,
              nickname: vm.nickname
            }))
          }
          vm.sendMessage(1)
        }
        socket.onclose = function(e){
          console.log("服务器关闭");
        }
        socket.onerror = function(){
          console.log("连接出错");
        }
        // 接收服务器的消息
        socket.onmessage = function(e){
          let message = JSON.parse(e.data);
          vm.messageList.push(message);
          if(message.users) {
            vm.users = message.users;
          }
          if (message.groups){
            vm.groups = message.groups;
          }
        }   
      }
    },
    login(){
      this.$refs.loginDialog.hide()
      this.conWebSocket();
    }
  }
}
</script>

<style lang='stylus'>
  @import './app.styl';
</style>
