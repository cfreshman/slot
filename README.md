# slot

single file upload/download for [yxorp](https://yxorp.app) users

## install

```bash
git clone <this-repo> slot
cd slot
npm install

# allow port through firewall
sudo ufw allow 8767

# run server
PORT=8767 node server.js
```

configure in [yxorp](https://yxorp.app): `slot.yourdomain.com → localhost:8767`

## what you get

- single file slot
- upload replaces existing file
- download current file
- synced in real-time across all open devices
- password protected
- high file size limit (1GB default)

## security

on first visit, you'll be prompted to create a password. it's hashed (sha256) and stored in `data/password.txt`.

**reset password:** delete `data/password.txt` and restart the server.

## optional: keep it running

```bash
npm install -g pm2
PORT=8767 pm2 start server.js --name slot
pm2 save
```

## configuration

```bash
PORT=8767 node server.js                    # custom port (default: 8767)
DATA_DIR=~/slot node server.js              # custom data location (default: ./data)
MAX_SIZE=2147483648 node server.js          # max file size in bytes (default: 1GB)
THEME=beyondcool PORT=8767 node server.js   # use beyondcool theme (orange on black with glow)
THEME=warm PORT=8767 node server.js         # use warm theme (cream background, brown text)
THEME=hue120 PORT=8767 node server.js       # use hue-based theme (0-360, e.g. 120=green, 240=blue)
```

---

single file slot. drag, drop, replace. synced everywhere.

