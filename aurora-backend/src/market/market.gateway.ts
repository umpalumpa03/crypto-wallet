import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import WebSocket from 'ws'; 

@WebSocketGateway({ cors: { origin: '*' } }) 
export class MarketGateway implements OnGatewayInit {
  @WebSocketServer() 
  public server: Server;

  
  private livePrices = {
    BTC: 0,
    ETH: 0,
    SOL: 0
  };

  public afterInit() {
    
    const streams = 'btcusdt@ticker/ethusdt@ticker/solusdt@ticker';
    const binanceUrl = `wss://stream.binance.com:9443/ws/${streams}`;
    
    const ws = new WebSocket(binanceUrl);

    ws.on('message', (data: WebSocket.RawData) => {
      const parsedData = JSON.parse(data.toString());

      
      const symbol = parsedData.s;
      const currentPrice = parseFloat(parsedData.c);

      
      if (symbol === 'BTCUSDT') this.livePrices.BTC = currentPrice;
      if (symbol === 'ETHUSDT') this.livePrices.ETH = currentPrice;
      if (symbol === 'SOLUSDT') this.livePrices.SOL = currentPrice;

      
      if (this.livePrices.BTC > 0) {
        this.server.emit('market-tick', {
          BTC: this.livePrices.BTC,
          ETH: this.livePrices.ETH,
          SOL: this.livePrices.SOL,
          timestamp: new Date().toISOString()
        });
      }
    });

    ws.on('error', (error) => {
      
    });
  }
}