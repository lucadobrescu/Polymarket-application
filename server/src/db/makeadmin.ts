import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");

// Set your user as admin
db.run("UPDATE users SET role = 'admin' WHERE id = 9");

const user = db.query("SELECT id, username, role FROM users WHERE id = 9").get();
console.log(user);