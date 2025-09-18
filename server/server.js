import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import { Sequelize, DataTypes } from "sequelize";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());


const sequelize = new Sequelize( process.env.DB_NAME, process.env.DB_USER,process.env.DB_PASS, {
  host: process.env.DB_HOST,
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

User.hasMany(Todo, { as: "CreatedTasks", foreignKey: "creatorId" });
User.hasMany(Todo, { as: "AssignedTasks", foreignKey: "assignedTo" });
Todo.belongsTo(User, { as: "Creator", foreignKey: "creatorId" });
Todo.belongsTo(User, { as: "Assignee", foreignKey: "assignedTo" });

const auth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
  res.json({ token, userId: user.id });
});

app.get("/api/auth/users", auth, async (req, res) => {
  const users = await User.findAll({ attributes: ["id", "username"] });
  res.json(users);
});

app.get("/api/todos", auth, async (req, res) => {
  const todos = await Todo.findAll({
    where: {
      [Sequelize.Op.or]: [
        { creatorId: req.userId },
        { assignedTo: req.userId },
      ],
    },
    include: [
      { model: User, as: "Creator", attributes: ["id", "username"] },
      { model: User, as: "Assignee", attributes: ["id", "username"] },
    ],
  });
  res.json(todos);
});

app.post("/api/todos", auth, async (req, res) => {
  const { title, description, assignedTo } = req.body;
  const todo = await Todo.create({
    title,
    description,
    creatorId: req.userId,
    assignedTo: assignedTo || req.userId, 
  });
  const fullTodo = await Todo.findByPk(todo.id, {
    include: [
      { model: User, as: "Creator", attributes: ["id", "username"] },
      { model: User, as: "Assignee", attributes: ["id", "username"] },
    ],
  });
  res.json(fullTodo);
});


app.put("/api/todos/:id", auth, async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);
  if (!todo) return res.status(404).json({ message: "Not found" });

 
  if (todo.creatorId !== req.userId && todo.assignedTo !== req.userId) {
    return res.status(403).json({ message: "Not allowed" });
  }

  Object.assign(todo, req.body);
  await todo.save();
  const updatedTodo = await Todo.findByPk(todo.id, {
    include: [
      { model: User, as: "Creator", attributes: ["id", "username"] },
      { model: User, as: "Assignee", attributes: ["id", "username"] },
    ],
  });
  res.json(updatedTodo);
});

app.delete("/api/todos/:id", auth, async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);
  if (!todo) return res.status(404).json({ message: "Not found" });

  if (todo.creatorId !== req.userId) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await todo.destroy();
  res.json({ message: "Deleted" });
});

sequelize.sync().then(() => {

  app.listen(5000, () =>
    console.log("✅ Backend running on http://localhost:5000")
  );

});
