const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://b588358e3187193025aeeec2037bd494@o4509442009071616.ingest.us.sentry.io/4509442026766336",
  sendDefaultPii: true,
}); 