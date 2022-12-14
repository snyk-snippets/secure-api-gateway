// import all the required packages
const cors = require("cors");
const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const expressWinston = require("express-winston");
const helmet = require("helmet");
const { createProxyMiddleware } = require("http-proxy-middleware");
const responseTime = require("response-time");
const winston = require("winston");
const config = require("./config");

// functionality moved to config.js
// require("dotenv").config();

// configure the application
const app = express();
const port = config.serverPort;
const secret = config.sessionSecret;
const store = new session.MemoryStore();

// functionality moved to config.js
// const secret = process.env.SESSION_SECRET;
// const port = 3000;

const alwaysAllow = (_1, _2, next) => {
  next();
};
const protect = (req, res, next) => {
  const { authenticated } = req.session;

  if (!authenticated) {
    res.sendStatus(401);
  } else {
    next();
  }
};

app.disable("x-powered-by");

app.use(helmet());

app.use(responseTime());

app.use(
  expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.json(),
    statusLevels: true,
    meta: false,
    level: "debug",
    msg: "HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
    expressFormat: true,
    ignoreRoute() {
      return false;
    },
  })
  );

app.use(cors());

app.use(rateLimit(config.rate));

// functionality moved to config.js
// app.use(
//  rateLimit({
//    windowMs: 15 * 60 * 1000, // 15 minutes
//    max: 5, // 5 calls
//  })
//);

app.use(
  session({
    secret,
    resave: false,
    saveUninitialized: true,
    store,
  })
  );

app.get("/login", (req, res) => {
  const { authenticated } = req.session;

  if (!authenticated) {
    req.session.authenticated = true;
    res.send("Successfully authenticated");
  } else {
    res.send("Already authenticated");
  }
});

Object.keys(config.proxies).forEach((path) => {
  const { protected, ...options } = config.proxies[path];
  const check = protected ? protect : alwaysAllow;
  app.use(path, check, createProxyMiddleware(options));
});

// functionality moved to config.js
// app.use(
//   "/search",
//   createProxyMiddleware({
//     target: "http://api.duckduckgo.com/",
//     changeOrigin: true,
//     pathRewrite: {
//       [`^/search`]: "",
//     },
//   })
// );

app.get("/logout", protect, (req, res) => {
  req.session.destroy(() => {
    res.send("Successfully logged out");
  });
});

// app.get("/", (req, res) => {
//   const { name = "user" } = req.query;
//   res.send(`Hello ${name}!`);
// });

// app.get("/protected", protect, (req, res) => {
//   const { name = "user" } = req.query;
//   res.send(`Hello ${name}!`);
// });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
