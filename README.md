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

[x] re-implement pre-roll
[x] component for clock display

### controls

[ ] seek: two editable number boxes with up/down buttons (min, sec)
[ ] only start / stop ?

### scores 

[ ] define some kind of score (cue, jump)
[ ] allow several different score
[ ] online edit score client

## License

BSD-3-Clause
