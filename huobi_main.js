//設定chart的屬性
const chartProperties = {
  timeScale:{
    //time可見
    timeVisible:true,
    //seconds不可見
    secondsVisible:false,
  }
}

const kchart = document.getElementById('kchart');
const chart = LightweightCharts.createChart(kchart,chartProperties);
const candleSeries = chart.addCandlestickSeries();

//--------------------------------------------------------------------------------------------------------------
//歷史數據

fetch(`https://api.huobi.pro/market/history/kline/?period=1day&size=200&symbol=btcusdt`)
  .then(response => response.json())
  .then(result =>{  
    //data內的資料
    const cdata = result.data.map(d=>{
      return {time:d.id,open:d.open,high:d.high,low:d.low,close:d.close}
    });
    //console.log(result.data[0].id);
    candleSeries.setData(cdata.reverse());
  })
  .catch(err => console.log(err))


//--------------------------------------------------------------------------------------------------------------
//實時報價

var ws_huobi_url = "wss://api-aws.huobi.pro/ws";
window.onload = function(){
  var ws_huobi = new WebSocket(ws_huobi_url);

  //訂閱頻道
  ws_huobi.onopen = function(){
    console.log("連接成功");
    ws_huobi.send(JSON.stringify({"sub": "market.btcusdt.kline.1min","id":"BTC"}));
    ws_huobi.send(JSON.stringify({"sub": "market.btcusdt.trade.detail","id":"MarketTrade"}));
    ws_huobi.send(JSON.stringify({"sub": "market.btcusdt.detail","id":"24hMarketInfo"}));
    ws_huobi.send(JSON.stringify({"sub": "market.btcusdt.depth.step1","id":"Orderbook"}));
  }

  //ws關閉
  ws_huobi.onclose = function(e) {
    console.log("連線關閉");
  }

  //解壓縮後提取個別所需的info
  ws_huobi.onmessage = function(evt) {
    if(evt.data instanceof Blob){
      var result = '';
      var reader = new FileReader();
      //載入 request info 後使用 pako 解壓縮
      reader.onload = function() {
        result = JSON.parse(pako.inflate(reader.result,{to:'string'}));
        const candlestick=result.tick;
        //console.log(result);

        //ping pong
        if(result.ping){
          ws_huobi.send(JSON.stringify({pong:result.ping}));
        }

        //回報是否是否訂閱成功
        if(result.id == 'BTC' ||result.id == 'ETH'||result.id == 'DOGE'){
          console.log('ws sub success')
        }     

        //更新實時報價
        if(typeof(result.ch)=='string'){
          const ts=result.ts;
          const time = timestamp(ts);
          //console.log(time);
          candleSeries.update({
            time: time,
            open: candlestick.open,
            close: candlestick.close,
            low: candlestick.low,
            high: candlestick.high,
          })
        }

        //即時成交交易
        if(result.ch == 'market.btcusdt.trade.detail'){
          const trade = result.tick.data;
          //console.log(trade);
          const tradedata = trade.map(d=>{
            document.getElementById('tradedata').innerHTML = '實時成交<br>' + '交易量：'+d.amount + '\tBTC<br>成交時間：'+timestamp(d.ts) + '<br>成交價格：'+d.price;
            //console.log('訂單種類：'+d.direction + '\n交易量：'+d.amount + '\tBTC\n成交時間：'+timestamp(d.ts) + '\n成交價格：'+d.price);
          });
        }

        //24H 市場行情 market trade
        if(result.ch == 'market.btcusdt.detail'){
          const marketinfo = result.tick;
          document.getElementById('marketinfo').innerHTML = '24H最高價：' + marketinfo.high + ' 24H最低價：' + marketinfo.close + ' 24H收盤價：' + marketinfo.close + '  24H成交量：' + Math.floor(marketinfo.amount) + '  24H累計成交額：'+Math.floor(marketinfo.vol);
          //console.log('24H 最高價：' + marketinfo.high + '\n24H 最低價：' + marketinfo.close + '\n24H 收盤價：' + marketinfo.close + '\n24H 成交量：' + Math.floor(marketinfo.amount) + '\n24H 成交額：'+Math.floor(marketinfo.vol));
        }

        //即時訂單 orderbook
        if(result.ch == 'market.btcusdt.depth.step1'){
          const orderbookinfo = result.tick;
          for(i = 0;i < 20;i++){
            if(i == 0){
              //console.log('買單：\n');
            }
            for(j = 0;j < 2;j++){
              //console.log('買價：' + orderbookinfo.bids[i,i] + '\n買量：' + orderbookinfo.bids[i,j]);
            }
            //console.log(orderbookinfo.bids[i]);
          }

          for(i = 0;i < 20;i++){
            if(i == 0){
              //console.log('賣單：\n');
            }
            for(j = 0;j < 2;j++){
              //console.log('賣價：' + orderbookinfo.bids[i,i] + '\n賣量：' + orderbookinfo.bids[i,j]);
            }
            //console.log(orderbookinfo)
            //console.log(orderbookinfo.asks[i]);
          }
        }
      }
    }
    reader.readAsBinaryString(evt.data);
  }
  chart.subscribeCrosshairMove(kline_info);
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

//十字線移動取得info方法：http://aitrade.ga/books/lightweight-charts-docs-cn/book/event.html
function kline_info(param) {
  if (!param.point) {
    return;
  }
  //k棒的info
  var KInfo=param.seriesPrices.get(candleSeries);
  //k棒的時間
  time=new Date(param.time*1000);
  utcdate=time.toUTCString() //toUTCString()方法會傳回日期物件的UTC(世界協調時間)時間字串，此字串會以美國英文表示。
  date=utcdate.substring(12,17) + utcdate.substring(8,11) + utcdate.substring(4,8) + utcdate.substring(17,22)+'  '; //獲取utcdate分別要的字串(年月日時)
  //console.log(date);
  //console.log('開盤價：' + KInfo.open + '\n收盤價：' + KInfo.close + '\n最高價：' + KInfo.high + '\n最低價：' + KInfo.low);
}
