package eventbus

import (
	"context"
	"sync"
)

// subscriberBuffer bounds how many undelivered events a slow SSE client can
// queue before events are dropped for that client — prevents one stalled
// connection from blocking Publish for everyone else.
const subscriberBuffer = 32

// InMemory is a single-process Broadcaster backed by Go channels. Sufficient
// for the current single-instance VPS deployment (see plan §5c). If
// multi-instance horizontal scaling is ever needed, write a Redis-backed
// implementation of Broadcaster and swap it in at wiring time in main.go —
// no service or handler changes required.
type InMemory struct {
	mu          sync.Mutex
	subscribers map[chan Event]struct{}
}

func NewInMemory() *InMemory {
	return &InMemory{
		subscribers: make(map[chan Event]struct{}),
	}
}

func (b *InMemory) Publish(_ context.Context, e Event) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for ch := range b.subscribers {
		select {
		case ch <- e:
		default:
			// subscriber is too slow / buffer full — drop for this client
			// rather than blocking every publisher.
		}
	}
}

func (b *InMemory) Subscribe(_ context.Context) (<-chan Event, func()) {
	ch := make(chan Event, subscriberBuffer)

	b.mu.Lock()
	b.subscribers[ch] = struct{}{}
	b.mu.Unlock()

	unsubscribe := func() {
		b.mu.Lock()
		defer b.mu.Unlock()
		if _, ok := b.subscribers[ch]; ok {
			delete(b.subscribers, ch)
			close(ch)
		}
	}
	return ch, unsubscribe
}
