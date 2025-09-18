import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

// Auth Component
function Auth({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email: form.email,
        password: form.password,
      });
      setToken(res.data.token);
      localStorage.setItem("userId", res.data.userId);
      navigate("/todos");
    } else {
      await axios.post("http://localhost:5000/api/auth/signup", form);
      alert("Signup successful! Please log in.");
      setIsLogin(true);
    }
  };

  return (
    <div className="container">
      <form className="card" onSubmit={handleSubmit}>
        <h2>{isLogin ? "Login" : "Signup"}</h2>
        {!isLogin && (
          <input
            placeholder="Username"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        )}
        <input
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button>{isLogin ? "Login" : "Signup"}</button>
        <p>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span
            style={{ color: "blue", cursor: "pointer" }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Signup" : "Login"}
          </span>
        </p>
      </form>
    </div>
  );
}

// Todos Component
function Todos({ token }) {
  const [todos, setTodos] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "" });
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    loadTodos();
    axios
      .get("http://localhost:5000/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data));
  }, [token]);

  const loadTodos = () => {
    axios
      .get("http://localhost:5000/api/todos", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTodos(res.data));
  };

  const addTodo = async () => {
    const res = await axios.post("http://localhost:5000/api/todos", form, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTodos([...todos, res.data]);
    setForm({ title: "", description: "", assignedTo: "" });
  };

  const deleteTodo = async (id) => {
    await axios.delete(`http://localhost:5000/api/todos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTodos(todos.filter((t) => t.id !== id));
  };

  const updateTodo = async (id, updates) => {
    const res = await axios.put(`http://localhost:5000/api/todos/${id}`, updates, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTodos(todos.map((t) => (t.id === id ? res.data : t)));
  };

  const toggleStatus = (todo) => {
    const newStatus = todo.status === "pending" ? "completed" : "pending";
    updateTodo(todo.id, { status: newStatus });
  };

  const myTasks = todos.filter((t) => t.creatorId == userId && t.assignedTo == userId);
  const assignedTasks = todos.filter(
    (t) => t.creatorId == userId || t.assignedTo == userId
  ).filter((t) => !(t.creatorId == userId && t.assignedTo == userId));

  return (
    <div className="container">
      <div className="todos-card">
        <h2>Create Task</h2>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
        />
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
        />
        <select
          value={form.assignedTo}
          onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
        >
          <option value="">Assign to yourself</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
        <button onClick={addTodo}>Add</button>

        {/* My Tasks */}
        <h2>My Tasks</h2>
        <ul>
          {myTasks.map((t) => (
            <li key={t.id}>
              <div>
                {t.title} - {t.description} ({t.status})
              </div>
              <div>
                <button onClick={() => toggleStatus(t)}>
                  {t.status === "pending" ? "Mark Completed" : "Mark Pending"}
                </button>
                <button
                  onClick={() =>
                    updateTodo(t.id, {
                      title: prompt("Edit Title", t.title),
                      description: prompt("Edit Description", t.description),
                    })
                  }
                >
                  Edit
                </button>
                <button onClick={() => deleteTodo(t.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>

        {/* Assigned Tasks */}
        <h2>Assigned Tasks</h2>
        <ul>
          {assignedTasks.map((t) => (
            <li key={t.id}>
              <div>
                {t.title} - {t.description} ({t.status}) <br />
                {t.creatorId == userId
                  ? `To: ${t.Assignee?.username}`
                  : `From: ${t.Creator?.username}`}
              </div>
              <div>
                {/* If I gave the task */}
                {t.creatorId == userId && (
                  <>
                    <button
                      onClick={() =>
                        updateTodo(t.id, {
                          title: prompt("Edit Title", t.title),
                          description: prompt("Edit Description", t.description),
                        })
                      }
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteTodo(t.id)}>Delete</button>
                  </>
                )}

                {/* If task was given to me */}
                {t.assignedTo == userId && (
                  <button onClick={() => toggleStatus(t)}>
                    {t.status === "pending" ? "Mark Completed" : "Mark Pending"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// App Wrapper
function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  return (
    <BrowserRouter>
      {token ? (
        <>
          <nav>
            <h3>Task Management</h3>
            <button onClick={() => setToken(null)}>Logout</button>
          </nav>
          <Routes>
            <Route path="/*" element={<Todos token={token} />} />
          </Routes>
        </>
      ) : (
        <Routes>
          <Route path="/*" element={<Auth setToken={setToken} />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
