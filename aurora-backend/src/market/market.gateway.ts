import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import WebSocket from 'ws'; 

@WebSocketGateway({ cors: { origin: '*' } }) 
export class MarketGateway implements OnGatewayInit {
  @WebSocketServer() 
  server: Server;

  // We keep a local cache of the prices so we can emit them all together
  private livePrices = {
    BTC: 0,
    ETH: 0,
    SOL: 0
  };

  afterInit() {
    console.log('🟢 Connecting to Real Binance Live Stream...');

    // We connect to Binance's raw "ticker" stream for our three specific assets
    const streams = 'btcusdt@ticker/ethusdt@ticker/solusdt@ticker';
    const binanceUrl = `wss://stream.binance.com:9443/ws/${streams}`;
    
    const ws = new WebSocket(binanceUrl);

    ws.on('message', (data: WebSocket.RawData) => {
      const parsedData = JSON.parse(data.toString());

      // Binance sends the symbol as 's' and the current price as 'c'
      const symbol = parsedData.s;
      const currentPrice = parseFloat(parsedData.c);

      // Update our local cache based on which coin just updated
      if (symbol === 'BTCUSDT') this.livePrices.BTC = currentPrice;
      if (symbol === 'ETHUSDT') this.livePrices.ETH = currentPrice;
      if (symbol === 'SOLUSDT') this.livePrices.SOL = currentPrice;

      // Only emit to Angular if we have actually captured the BTC price
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
      console.error('Binance Connection Error:', error);
    });
  }
}