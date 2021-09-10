# `shared-clock`

## Install and Run

```
git clone https://github.com/ircam-ismm/shared-clock.git
npm install
npm run dev
```

## Run in production mode (port 80)

```
sudo PORT=80 npm run start
```

## Clients

- normal clients: `http://m.y.i.p/`
- client with controls: `http://m.y.i.p/#controller`

## Todos

- re-implement pre-roll
- component for clock display

- clean controls
  + two editable number boxes with up/down buttons, replacing the slider
  + only start / stop

- define some kind of score (cue, jump)
- allow several different score

- online edit score client

## License

BSD-3-Clause
