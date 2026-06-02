import { Inject, Injectable, inject } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api/api.config';
import { TokenStorageService } from '../auth/token-storage.service';
import { ColocEvent } from '../../features/coloc/data/coloc.models';

/**
 * Client STOMP temps réel coloc. Se connecte à {@code /ws} (handshake ouvert ; l'auth se fait au
 * CONNECT STOMP via le JWT en connectHeaders) et s'abonne à {@code /topic/coloc/{groupId}}.
 */
@Injectable({ providedIn: 'root' })
export class ColocRealtimeService {
  private readonly tokens = inject(TokenStorageService);

  constructor(@Inject(API_BASE_URL) private readonly baseUrl: string) {}

  /** Flux des événements du groupe. La désinscription ferme proprement la connexion STOMP. */
  events(groupId: string): Observable<ColocEvent> {
    return new Observable<ColocEvent>((subscriber) => {
      const token = this.tokens.getAccessToken();
      const client = new Client({
        brokerURL: this.wsUrl(),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 5000,
        onConnect: () => {
          client.subscribe(`/topic/coloc/${groupId}`, (message: IMessage) => {
            try {
              subscriber.next(JSON.parse(message.body) as ColocEvent);
            } catch {
              /* payload non parsable → ignoré */
            }
          });
        },
      });
      client.activate();
      return () => {
        void client.deactivate();
      };
    });
  }

  /** Dérive l'URL ws(s) du back depuis apiBaseUrl (.../api → .../ws). */
  private wsUrl(): string {
    const root = this.baseUrl.replace(/\/api\/?$/, '');
    return root.replace(/^http/, 'ws') + '/ws';
  }
}
