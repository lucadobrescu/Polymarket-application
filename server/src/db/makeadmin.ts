import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");

db.run("UPDATE users SET role = 'admin' WHERE id = 55");

const user = db.query("SELECT id, username, role FROM users WHERE id = 55").get();
console.log(user);