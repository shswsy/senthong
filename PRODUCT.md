# Product

<!-- impeccable:product-schema 1 -->

Shared studio rules (audiences, positioning, Thai-first, honesty, layout and font preferences) live in `../PRODUCT.md` (`E:\fastwork\PRODUCT.md`). Read it too. This file adds only what is specific to เส้นทอง.

## Platform

web

## Users

- **Diners:** Thai customers at a noodle and made-to-order shop. They scan the table QR code on their phone, order with options, call staff, and pay at the counter.
- **Kitchen and front staff:** they watch `/kitchen` during a busy service and move orders through their statuses.
- **Owner:** uses `/admin` to edit the menu, print QR codes and see sales.
- Fastwork buyers are the secondary audience. They try the realtime flow live.

## Product Purpose

QR table ordering for เส้นทอง (senthong), a **fictional** noodle shop. It shows realtime full-stack work. Success means orders reach the kitchen instantly and correctly, and staff never miss one.

## Operating Context

- Live at https://senthong.shswsy.workers.dev. Staff password is `demo1234`.
- Demo data re-seeds itself when it is stale (more than 30 minutes old) and idle (more than 10 minutes).
- Payment happens at the counter. There is no online payment.

## Capabilities and Constraints

- React SPA plus a Hono Worker on Cloudflare Workers and D1, with a `Hub` Durable Object for WebSocket hibernation. Live events are only hints, and clients refetch over HTTP.
- Pricing is decided by the server (`checkPicks()`). Status changes use compare-and-set.
- Never use `window.alert` or `confirm`. Use two-step inline confirms.
- Keep the "fictional business" note.
- Portfolio piece #4.
