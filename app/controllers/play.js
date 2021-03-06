import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default Controller.extend({
    connected: false,
    consoleText: '',
    text1: '',
    text2: '',
    gameSocket: service(),
    favicon: service(),
    messages: [],
    scrollPaused: false,
    
    idleKeepalive: function() {
        if (this.get('connected')) {
            this.sendInput("keepalive");
        }
        else {
            clearInterval(this.get('keepaliveInterval'));
        }
    },
    
    onMessage: function(evt) {
        var data;
        
        try
        {
           data = JSON.parse(evt.data);
        }
        catch(e)
        {
            data = null;
        }
        
        if (!data) {
            return;
        }
        
        var notification_type = data.args.notification_type;
        
        if (notification_type != "webclient_output") {
            return;
        }
        
        let html = ansi_up.ansi_to_html(data.args.message);
        this.get('messages').pushObject(html);
        this.scrollToBottom();  
        this.get('gameSocket').notify(null);
    },
    onConnect: function(self) {
        document.getElementById("sendMsg").focus();
        self.set('connected', true);   
        self.set('messages', []); 
        self.set('scrollPaused', false);
        
        let cmd = {
          'type': 'identify',
          'data': { 'id': this.get('charId'), 'webclient': true }
        };
        let json = JSON.stringify(cmd);
        this.get('websocket').send(json);
    },
    
    onDisconnect: function(self) {
        self.set('connected', false);
    },
    
    scrollToBottom: function() {
      // Unless scrolling paused 
      if (this.get('scrollPaused')) {
        return;
      }
      
      try {
        $('#console').stop().animate({
          scrollTop: $('#console')[0].scrollHeight
        }, 800);           
      }
      catch(error) {
        // This happens sometimes when transitioning away from play screen.
      }      
    },
    
    showDisconnect: function() {
        return this.get('connected');
    }.property('connected'),
    
    showConnect: function() {  
        return !this.get('connected');
    }.property('connected'),
    
    sendInput: function(msg) {
        var cmd, json;
        cmd = {
            'type': 'input',
            'message': msg.trim()
        };
        json = JSON.stringify(cmd);
        this.get('websocket').send(json);
    },
    
    
    actions: {
        connect() {
            var idle_keepalive_ms = 60000;
            var protocol = aresconfig.use_https ? 'wss' : 'ws';
            this.set('websocket', new WebSocket(`${protocol}://${aresconfig.host}:${aresconfig.websocket_port}/websocket`));
                var self = this;
                this.get('websocket').onmessage = function(evt) { 
                    self.onMessage(evt);
                };
                this.get('websocket').onclose = function() {
                    self.onDisconnect(self);
                };
                this.get('websocket').onopen = function() {
                    self.onConnect(self);
                };
                
                this.get('keepaliveInterval', window.setInterval(function(){ self.idleKeepalive() }, idle_keepalive_ms));

                
            },
            disconnect() {
                if (this.get('connected')){
                    this.sendInput('quit');                    
                }
            },
            sendMsg1() {
                this.sendInput(this.get('text1'));
                this.set('text1', '');
            },
            sendMsg2() {
                this.sendInput(this.get('text2'));
                this.set('text2', '');
            },
            pauseScroll() {
              this.set('scrollPaused', true);
            },
            unpauseScroll() {
              this.set('scrollPaused', false);
              this.scrollToBottom();
            }
        }
    });
