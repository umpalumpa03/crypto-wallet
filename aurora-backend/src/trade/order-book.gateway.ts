import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: true } }) // Allows Angular to connect
export class OrderBookGateway implements OnGatewayInit {
  @WebSocketServer() public server: Server;

  // Base prices to anchor the order book around
  private currentPrices = { BTC: 64281.04, ETH: 3412.55, SOL: 145.22 };

  public afterInit() {
    console.log('📈 Order Book WebSocket Gateway Initialized');
    // Push new order book depth every 800ms
    setInterval(() => this.streamLiveDepth(), 800);
  }

  private streamLiveDepth() {
    // Randomly tick the base prices up or down slightly
    this.currentPrices.BTC *= 1 + (Math.random() * 0.0004 - 0.0002);
    this.currentPrices.ETH *= 1 + (Math.random() * 0.0006 - 0.0003);
    this.currentPrices.SOL *= 1 + (Math.random() * 0.0008 - 0.0004);

    const payload = {
      BTC: this.generateDepth(this.currentPrices.BTC),
      ETH: this.generateDepth(this.currentPrices.ETH),
      SOL: this.generateDepth(this.currentPrices.SOL),
    };

    // Broadcast to all connected Angular clients
    this.server.emit('order-book-tick', payload);
  }

  private generateDepth(centerPrice: number) {
    let askSum = 0;
    let bidSum = 0;

    // Generate 6 Asks (Red - selling above market price)
    const asks = Array.from({ length: 3 })
      .map((_, i) => {
        const price = centerPrice * (1 + (i + 1) * 0.0005); // Price goes up
        const size = Math.random() * 2;
        askSum += size;
        return {
          p: price,
          size,
          sum: askSum,
          width: `${Math.min((askSum / 10) * 100, 100)}%`,
        };
      })
      .reverse(); // Asks display highest to lowest at the top

    // Generate 6 Bids (Green - buying below market price)
    const bids = Array.from({ length: 3 }).map((_, i) => {
      const price = centerPrice * (1 - (i + 1) * 0.0005); // Price goes down
      const size = Math.random() * 2;
      bidSum += size;
      return {
        p: price,
        size,
        sum: bidSum,
        width: `${Math.min((bidSum / 10) * 100, 100)}%`,
      };
    }); // Bids display highest to lowest at the bottom

    return { asks, bids, price: centerPrice };
  }
}
