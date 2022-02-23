var ws_huobi_url = "wss://api-aws.huobi.pro/ws";
window.onload = function(){
    var ws_huobi = new WebSocket(ws_huobi_url);
    ws_huobi.onopen = function(){
      console.log("連接成功");
      ws_huobi.send(JSON.stringify({"sub": "market.btcusdt.trade.detail","id": "orderbook"}));
    }
  
    ws_huobi.onclose = function(e) {
      console.log("連線關閉");
    }
  
    ws_huobi.onmessage = function(evt) {
      if(evt.data instanceof Blob){
        var result = '';
        var reader = new FileReader();
        reader.onload = function() {
          result = JSON.parse(pako.inflate(reader.result,{to:'string'}));
          
          if(result.ping){
            ws_huobi.send(JSON.stringify({pong:result.ping}));
          }

          if(result.ch == 'market.btcusdt.trade.detail'){
            const orderbook = result.tick.data;
            const orderbookdata = orderbook.map(d=>{
              console.log(result.tick.data);
              //console.log('訂單種類：'+d.direction + '\n交易量：'+d.amount + '\tBTC\n成交時間：'+timestamp(d.ts) + '\n成交價格：'+d.price);
            });
          }
        }
      }
      reader.readAsBinaryString(evt.data);
    }
  }
function timestamp(ts){
  const timestamp = ts;
  const date=new Date(timestamp);
  Y = date.getFullYear() + '-';
  M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
  D = date.getDate() + ' ';
  h = date.getHours() + ':';
  m = date.getMinutes() + ':';
  s = date.getSeconds();
  if(h=='0:'&m=='0:'&s==0){
    const time = Y+M+D;
    return time;
  }
  else{
    const time = Y+M+D+h+m+s;
    return time;
  }
}