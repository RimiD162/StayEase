import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve static files
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/home", (req, res) => {
  res.render("home");
});
app.get('/home/hotel',(req,res)=>{
  res.render("hotel");
})
app.get('/home/Rentals',(req,res)=>{
  res.render("Rentals");
})
app.get('/home/Lodges',(req,res)=>{
  res.render("Lodges");
})
app.listen(port, () => {
  console.log(`app is listening on port ${port}`);
});