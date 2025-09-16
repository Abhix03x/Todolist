import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors" ;
import { Sequelize, DataTypes } from "sequelize";
import env from "dotenv";

const app = express();
app.use(express.json());
app.use(cors());

const sequelize = new Sequelize( "Todo","postgres", "*******", {
  host: "localhost",
  dialect: "postgres",
});


const User = sequelize.define("User", {
  username: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
});

const Todo = sequelize.define("Todo", {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: "pending" },
});

User.hasMany(Todo, { onDelete: "CASCADE" });
Todo.belongsTo(User);

const auth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token,"secret123");
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};


app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ username, email, password: hashed });
    res.json({ message: "User created" });
  } catch {
    res.status(400).json({ message: "User already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(400).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: user.id }, "secret123");
  res.json({ token });
});

app.get("/api/todos", auth, async (req, res) => {
  const todos = await Todo.findAll({ where: { UserId: req.userId } });
  res.json(todos);
});

app.post("/api/todos", auth, async (req, res) => {
  const todo = await Todo.create({ ...req.body, UserId: req.userId });
  res.json(todo);
});

app.put("/api/todos/:id", auth, async (req, res) => {
 

  const todo = await Todo.findOne({ where: { id: req.params.id, UserId: req.userId } });
  if (!todo) return res.status(404).json({ message: "Not found" });

  Object.assign(todo, req.body);
  await todo.save();
  res.json(todo);
});

app.delete("/api/todos/:id", auth, async (req, res) => {
  await Todo.destroy({ where: { id: req.params.id, UserId: req.userId } });
  res.json({ message: "Deleted" });
});
sequelize.sync().then(() => {
  app.listen(5000, () => console.log("✅ Backend running on http://localhost:5000"));
});
