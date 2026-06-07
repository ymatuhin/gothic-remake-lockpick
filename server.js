const express = require("express");
const path = require("path");

const port = process.env.PORT || 3000;
const root = path.resolve(__dirname, "public");

const app = express();
const locales = ["de", "pl", "ru", "es", "fr"];

app.enable("strict routing");

locales.forEach((locale) => {
  app.get(`/${locale}`, (req, res) => {
    res.redirect(301, `/${locale}/`);
  });

  app.get(`/${locale}/`, (req, res) => {
    res.sendFile(path.join(root, `${locale}.html`));
  });
});

app.use(express.static(root, {
  extensions: ["html"],
}));

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
