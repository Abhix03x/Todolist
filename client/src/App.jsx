import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";


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
        <h2 className="log">{isLogin ? "Login" : "Signup"}</h2>

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

        <p style={{ marginTop: "10px" }}>
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

function Todos({ token, logout }) {
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({ title: "", description: "" });
  const [editingTodo, setEditingTodo] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "pending",
  });

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/todos", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTodos(res.data));
  }, [token]);

  const addTodo = async () => {
    const res = await axios.post("http://localhost:5000/api/todos", form, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTodos([...todos, res.data]);
    setForm({ title: "", description: "" });
  };

  const deleteTodo = async (id) => {
    await axios.delete(`http://localhost:5000/api/todos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTodos(todos.filter((t) => t.id !== id));
  };

  const startEdit = (todo) => {
    setEditingTodo(todo.id);
    setEditForm({
      title: todo.title,
      description: todo.description,
      status: todo.status,
    });
  };

  const saveEdit = async () => {
    const res = await axios.put(
      `http://localhost:5000/api/todos/${editingTodo}`,
      editForm,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setTodos(todos.map((t) => (t.id === editingTodo ? res.data : t)));
    setEditingTodo(null);
  };

  const toggleStatus = async (todo) => {
    const newStatus = todo.status === "pending" ? "completed" : "pending";
    const res = await axios.put(
      `http://localhost:5000/api/todos/${todo.id}`,
      { ...todo, status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setTodos(todos.map((t) => (t.id === todo.id ? res.data : t)));
  };

  return (
    <div className="container">
      <div className="todos-card">
        <h2>Todo-List</h2>
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
        <button onClick={addTodo}>Add</button>

        <ul>
          {todos.map((t) => (
            <li key={t.id}>
              {editingTodo === t.id ? (
                <>
                  <input
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                  />
                  <input
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                  />
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={saveEdit}>Save</button>
                  <button onClick={() => setEditingTodo(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <div>
                    <input
                      type="checkbox"
                      checked={t.status === "completed"}
                      onChange={() => toggleStatus(t)}
                    />
                    {t.title} - {t.description} ({t.status})
                  </div>
                  <div>
                    <button onClick={() => startEdit(t)}>Edit</button>
                    <button onClick={() => deleteTodo(t.id)}>Delete</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const logout = () => {
    setToken(null);
  };

  return (
    <BrowserRouter>
      {token ? (
        <>
          <nav>
            <h3 style={{ color: "white" }}>Todos</h3>
            <button
              style={{
                marginLeft: "auto",
                background: "#f44336",
                color: "white",
              }}
              onClick={logout}
            >
              Logout
            </button>
          </nav>
          <Routes>
            <Route path="/*" element={<Todos token={token} logout={logout} />} />
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
