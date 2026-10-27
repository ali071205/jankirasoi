import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';

export interface OrderStreamEvent {
  type: 'ORDER_CREATED' | 'ORDER_UPDATED' | 'RIDER_ASSIGNED' | 'PING' | 'CATALOG_UPDATED';
  orderId?: string;
  orderNumber?: string;
  status?: string;
  riderId?: string;
  timestamp: number;
}

@Injectable()
export class OrdersEventsService {
  private readonly logger = new Logger(OrdersEventsService.name);
  private readonly stream$ = new Subject<{ data: OrderStreamEvent }>();

  emitOrderEvent(type: OrderStreamEvent['type'], payload: Partial<OrderStreamEvent>) {
    const event: OrderStreamEvent = {
      type,
      orderId: payload.orderId || '',
      orderNumber: payload.orderNumber,
      status: payload.status,
      riderId: payload.riderId,
      timestamp: Date.now(),
    };
    this.logger.log(`⚡ Real-time Event Emitted: ${type} for order ${payload.orderNumber || payload.orderId}`);
    this.stream$.next({ data: event });
  }

  getOrdersStream(): Observable<{ data: OrderStreamEvent }> {
    // 15-second heartbeat keeps the HTTP/2 connection alive through reverse proxies and browsers
    const heartbeat$ = interval(15000).pipe(
      map(() => ({
        data: {
          type: 'PING' as const,
          timestamp: Date.now(),
        },
      })),
    );
    return merge(this.stream$.asObservable(), heartbeat$);
  }
}
