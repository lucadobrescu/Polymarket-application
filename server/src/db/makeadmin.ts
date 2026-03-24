import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");

// Set your user as admin
db.run("UPDATE users SET role = 'admin' WHERE id =72");

const user = db.query("SELECT id, username, role FROM users WHERE id = 72").get();
console.log(user);